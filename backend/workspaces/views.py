from django.contrib.postgres.search import (
    SearchQuery,
    SearchRank,
    SearchVector,
    TrigramSimilarity,
)
from django.utils import timezone
from django.db.models import F, Q, FloatField, Value
from django.db.models.functions import Coalesce, Greatest
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView
from audit.services import record_workspace_event
from .models import Workspace, WorkspaceStar
from permissions.models import WorkspaceMember
from permissions.checks import user_is_workspace_admin
from .serializers import WorkspaceSerializer, PublicWorkspaceSerializer, WorkspaceDetailSerializer
from core.constants import WorkspaceRole, WorkspaceVisibility
from core.pricing import (
    PLAN_CORE,
    get_workspace_limit_for_user_plan,
    normalize_plan,
)
from .throttles import AnonymousPublicWorkspaceSearchThrottle


class PublicWorkspaceSearchPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 50

class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(
            members__user=self.request.user,
            members__left_at__isnull=True,
        ).distinct().order_by("-updated_at")

    def perform_create(self, serializer):
        owner_plan = normalize_plan(self.request.user.current_plan)
        workspace_limit = get_workspace_limit_for_user_plan(owner_plan)
        existing_owned_count = Workspace.objects.filter(owner=self.request.user).count()
        if workspace_limit is not None and existing_owned_count >= workspace_limit:
            raise PermissionDenied(
                f"Your {owner_plan} plan supports up to {workspace_limit} workspace(s)."
            )

        requested_visibility = serializer.validated_data.get("visibility", WorkspaceVisibility.PRIVATE)
        if owner_plan == PLAN_CORE and requested_visibility == WorkspaceVisibility.PUBLIC:
            existing_public_count = Workspace.objects.filter(
                owner=self.request.user,
                visibility=WorkspaceVisibility.PUBLIC,
            ).count()
            if existing_public_count >= 1:
                raise PermissionDenied(
                    "Core plan supports only one public workspace."
                )

        workspace = serializer.save(owner=self.request.user)
        # Creator always becomes workspace ADMIN.
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=self.request.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        record_workspace_event(
            workspace=workspace,
            actor=self.request.user,
            request=self.request,
            category="workspace",
            action="Workspace Created",
            target_name=workspace.name,
            target_id=workspace.id,
            message="Workspace created.",
        )

class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        if self.request.method in SAFE_METHODS:
            return Workspace.objects.filter(
                Q(members__user=self.request.user, members__left_at__isnull=True)
                | Q(visibility=WorkspaceVisibility.PUBLIC)
            ).distinct()
        return Workspace.objects.filter(
            members__user=self.request.user,
            members__left_at__isnull=True,
        ).distinct()

    def _assert_admin(self, workspace):
        if not user_is_workspace_admin(workspace, self.request.user):
            raise PermissionDenied("Only workspace admins can modify workspace settings.")

    def perform_update(self, serializer):
        workspace = serializer.instance
        self._assert_admin(workspace)

        previous_name = workspace.name
        previous_description = workspace.description or ""
        previous_visibility = workspace.visibility

        updated_workspace = serializer.save()

        changed_fields = []
        if previous_name != updated_workspace.name:
            changed_fields.append("name")
        if previous_description != (updated_workspace.description or ""):
            changed_fields.append("description")
        if previous_visibility != updated_workspace.visibility:
            changed_fields.append("visibility")

        if changed_fields:
            record_workspace_event(
                workspace=updated_workspace,
                actor=self.request.user,
                request=self.request,
                category="workspace",
                action="Workspace Updated",
                target_name=updated_workspace.name,
                target_id=updated_workspace.id,
                message=f"Updated fields: {', '.join(changed_fields)}.",
                metadata={"changed_fields": changed_fields},
            )

    def perform_destroy(self, instance):
        self._assert_admin(instance)
        instance.delete()


class PublicWorkspaceSearchView(generics.ListAPIView):
    serializer_class = PublicWorkspaceSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = PublicWorkspaceSearchPagination
    throttle_classes = [AnonymousPublicWorkspaceSearchThrottle]

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()
        queryset = (
            Workspace.objects.filter(visibility=WorkspaceVisibility.PUBLIC)
            .select_related("owner")
        )

        if not query:
            return queryset.order_by("-updated_at")

        search_vector = (
            SearchVector("name", weight="A", config="english")
            + SearchVector("description", weight="C", config="english")
        )
        search_query = SearchQuery(query, config="english", search_type="websearch")

        return (
            queryset.annotate(
                rank=SearchRank(search_vector, search_query, normalization=32),
                trigram_name=TrigramSimilarity("name", query),
                trigram_description=TrigramSimilarity(
                    Coalesce("description", Value("")),
                    query,
                ),
            )
            .annotate(
                trigram_score=Greatest("trigram_name", "trigram_description"),
                score=(
                    F("rank") * Value(0.75, output_field=FloatField())
                    + F("trigram_score") * Value(0.25, output_field=FloatField())
                ),
            )
            .filter(Q(rank__gte=0.05) | Q(trigram_score__gte=0.2))
            .order_by("-score", "-updated_at")
        )


class StarredWorkspaceListView(generics.ListAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Workspace.objects.filter(stars__user=self.request.user)
            .filter(
                Q(members__user=self.request.user, members__left_at__isnull=True)
                | Q(visibility=WorkspaceVisibility.PUBLIC)
            )
            .distinct()
            .order_by("-stars__created_at")
        )


class WorkspaceStarToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, id):
        workspace = Workspace.objects.filter(id=id).first()
        if not workspace:
            return Response({"detail": "Workspace not found."}, status=404)

        is_member = WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
        ).exists()
        is_public = workspace.visibility == WorkspaceVisibility.PUBLIC
        if not (is_member or is_public):
            raise PermissionDenied("You can only star your own/member workspaces or public workspaces.")

        requested_state = request.data.get("is_starred", None)
        star_exists = WorkspaceStar.objects.filter(
            workspace=workspace,
            user=request.user,
        ).exists()

        if requested_state is None:
            target_state = not star_exists
        elif isinstance(requested_state, bool):
            target_state = requested_state
        else:
            return Response(
                {"detail": "`is_starred` must be a boolean value."},
                status=400,
            )

        if target_state and not star_exists:
            WorkspaceStar.objects.create(workspace=workspace, user=request.user)
            record_workspace_event(
                workspace=workspace,
                actor=request.user,
                request=request,
                category="user",
                action="Workspace Starred",
                target_name=workspace.name,
                target_id=workspace.id,
            )
        if not target_state and star_exists:
            WorkspaceStar.objects.filter(workspace=workspace, user=request.user).delete()
            record_workspace_event(
                workspace=workspace,
                actor=request.user,
                request=request,
                category="user",
                action="Workspace Unstarred",
                target_name=workspace.name,
                target_id=workspace.id,
            )

        return Response(
            {
                "id": workspace.id,
                "is_starred": target_state,
            },
            status=200,
        )
