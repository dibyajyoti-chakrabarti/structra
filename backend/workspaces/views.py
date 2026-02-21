from django.contrib.postgres.search import (
    SearchQuery,
    SearchRank,
    SearchVector,
    TrigramSimilarity,
)
from django.db.models import F, Q, FloatField, Value
from django.db.models.functions import Coalesce, Greatest
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import LimitOffsetPagination
from .models import Workspace
from permissions.models import WorkspaceMember
from permissions.checks import user_is_workspace_admin
from .serializers import WorkspaceSerializer, PublicWorkspaceSerializer
from core.constants import WorkspaceRole, WorkspaceVisibility


class PublicWorkspaceSearchPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 50

class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        workspace = serializer.save(owner=self.request.user)
        # Creator always becomes workspace ADMIN.
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=self.request.user,
            role=WorkspaceRole.ADMIN,
        )

class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Workspace.objects.filter(members__user=self.request.user).distinct()

    def _assert_admin(self, workspace):
        if not user_is_workspace_admin(workspace, self.request.user):
            raise PermissionDenied("Only workspace admins can modify workspace settings.")

    def perform_update(self, serializer):
        self._assert_admin(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_admin(instance)
        instance.delete()


class PublicWorkspaceSearchView(generics.ListAPIView):
    serializer_class = PublicWorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = PublicWorkspaceSearchPagination

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
