import uuid
from rest_framework import serializers
from core.constants import CanvasRole, WorkspaceVisibility
from permissions.checks import resolve_canvas_role
from .models import Canvas, CanvasComment, default_canvas_state


ALLOWED_COMPONENT_TYPES = {
    "CLIENT",
    "DNS",
    "CDN_EDGE_CACHE",
    "LOAD_BALANCER",
    "AUTHENTICATION_SERVICE",
    "AUTHORIZATION_SERVICE",
    "API_GATEWAY",
    "WEB_APPLICATION_FIREWALL",
    "SECRETS_MANAGER",
    "API_BACKEND_SERVICE",
    "MICROSERVICE",
    "BACKGROUND_WORKER",
    "SERVERLESS_FUNCTION",
    "BATCH_JOB",
    "RELATIONAL_DATABASE",
    "NOSQL_DATABASE",
    "OBJECT_STORAGE",
    "TIME_SERIES_DATABASE",
    "CACHE",
    "IN_MEMORY_STORE",
    "SEARCH_ENGINE",
    "MESSAGE_QUEUE",
    "EVENT_BUS",
    "STREAM_PROCESSOR",
    "INTERNAL_NETWORK",
    "SERVICE_MESH",
    "EXTERNAL_SERVICE",
    "LOGGING_SYSTEM",
    "METRICS_SYSTEM",
    "TRACING_SYSTEM",
    "ALERTING_SYSTEM",
    "CI_CD_PIPELINE",
    "CONTAINER_RUNTIME",
    "ORCHESTRATOR",
    "CONFIGURATION_SERVICE",
    "BACKUP_SERVICE",
    "REPLICATION_SYSTEM",
    "DISASTER_RECOVERY_SYSTEM",
    "AUDIT_LOG",
    "POLICY_ENGINE",
    "ACCESS_CONTROL_SYSTEM",
    "ANALYTICS_ENGINE",
    "FEATURE_STORE",
    "RECOMMENDATION_ENGINE",
}


def _validate_uuid(value, field_name):
    try:
        uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        raise serializers.ValidationError(f"{field_name} must be a valid UUID string.")


def _validate_position(position):
    if not isinstance(position, dict):
        raise serializers.ValidationError("position must be an object.")
    if "x" not in position or "y" not in position:
        raise serializers.ValidationError("position must contain x and y.")
    if not isinstance(position["x"], (int, float)) or not isinstance(position["y"], (int, float)):
        raise serializers.ValidationError("position.x and position.y must be numbers.")


def validate_canvas_state_shape(canvas_state):
    if not isinstance(canvas_state, dict):
        raise serializers.ValidationError("canvasState must be an object.")

    nodes = canvas_state.get("nodes")
    edges = canvas_state.get("edges")
    viewport = canvas_state.get("viewport")

    if not isinstance(nodes, list):
        raise serializers.ValidationError("canvasState.nodes must be an array.")
    if not isinstance(edges, list):
        raise serializers.ValidationError("canvasState.edges must be an array.")
    if not isinstance(viewport, dict):
        raise serializers.ValidationError("canvasState.viewport must be an object.")

    zoom = viewport.get("zoom")
    pan = viewport.get("pan")
    if not isinstance(zoom, (int, float)):
        raise serializers.ValidationError("canvasState.viewport.zoom must be a number.")
    if not isinstance(pan, dict):
        raise serializers.ValidationError("canvasState.viewport.pan must be an object.")
    if not isinstance(pan.get("x"), (int, float)) or not isinstance(pan.get("y"), (int, float)):
        raise serializers.ValidationError("canvasState.viewport.pan.x and pan.y must be numbers.")

    node_ids = set()
    for node in nodes:
        if not isinstance(node, dict):
            raise serializers.ValidationError("Each node must be an object.")
        node_id = node.get("id")
        _validate_uuid(node_id, "node.id")
        if node_id in node_ids:
            raise serializers.ValidationError("Node ids must be unique.")
        node_ids.add(node_id)

        node_type = node.get("type")
        if node_type not in ALLOWED_COMPONENT_TYPES:
            raise serializers.ValidationError(f"node.type must be one of {sorted(ALLOWED_COMPONENT_TYPES)}.")
        if not isinstance(node.get("label"), str):
            raise serializers.ValidationError("node.label must be a string.")
        _validate_position(node.get("position"))
        metadata = node.get("metadata")
        if metadata is None:
            node["metadata"] = {}
        elif not isinstance(metadata, dict):
            raise serializers.ValidationError("node.metadata must be an object.")

    edge_ids = set()
    for edge in edges:
        if not isinstance(edge, dict):
            raise serializers.ValidationError("Each edge must be an object.")
        edge_id = edge.get("id")
        _validate_uuid(edge_id, "edge.id")
        if edge_id in edge_ids:
            raise serializers.ValidationError("Edge ids must be unique.")
        edge_ids.add(edge_id)

        source = edge.get("source")
        target = edge.get("target")
        if source not in node_ids or target not in node_ids:
            raise serializers.ValidationError("edge.source and edge.target must reference existing node ids.")
    return canvas_state


class CanvasSerializer(serializers.ModelSerializer):
    canvas_state = serializers.JSONField(required=False)
    current_user_canvas_role = serializers.SerializerMethodField()

    class Meta:
        model = Canvas
        fields = [
            "id",
            "workspace",
            "name",
            "description",
            "visibility",
            "canvas_state",
            "current_user_canvas_role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workspace", "created_at", "updated_at"]

    def validate(self, attrs):
        workspace = (
            attrs.get("workspace")
            or self.context.get("workspace")
            or getattr(self.instance, "workspace", None)
        )
        name = (attrs.get("name") or getattr(self.instance, "name", "") or "").strip()

        if workspace and name:
            existing_canvases = Canvas.objects.filter(workspace=workspace, name=name)
            if self.instance:
                existing_canvases = existing_canvases.exclude(pk=self.instance.pk)
            if existing_canvases.exists():
                raise serializers.ValidationError(
                    {"name": "A canvas with this name already exists in this workspace."}
                )

        requested_visibility = attrs.get("visibility", getattr(self.instance, "visibility", None))
        if requested_visibility is None:
            requested_visibility = WorkspaceVisibility.PRIVATE

        if workspace and workspace.visibility == WorkspaceVisibility.PRIVATE:
            if requested_visibility == WorkspaceVisibility.PUBLIC:
                raise serializers.ValidationError(
                    {"visibility": "Canvases must be private within a private workspace."}
                )
            attrs["visibility"] = WorkspaceVisibility.PRIVATE

        if "canvas_state" in attrs:
            attrs["canvas_state"] = validate_canvas_state_shape(attrs["canvas_state"])
        elif not self.instance:
            attrs["canvas_state"] = default_canvas_state()

        return attrs

    def get_current_user_canvas_role(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        role = resolve_canvas_role(obj, request.user)
        if role is None:
            return None
        if role not in {CanvasRole.EDITOR, CanvasRole.COMMENTER, CanvasRole.VIEWER}:
            return CanvasRole.VIEWER
        return role


class CanvasAutosaveSerializer(serializers.Serializer):
    canvasState = serializers.JSONField()

    def validate_canvasState(self, value):
        return validate_canvas_state_shape(value)


class CanvasCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source="author.full_name")
    is_author = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = CanvasComment
        fields = [
            "id",
            "system",
            "author_name",
            "body",
            "parent",
            "is_author",
            "replies",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_is_author(self, obj):
        request = self.context.get("request")
        if not request or request.user.is_anonymous:
            return False
        return obj.author_id == request.user.user_id

    def get_replies(self, obj):
        replies = obj.replies.select_related("author").order_by("created_at")
        return CanvasCommentSerializer(
            replies,
            many=True,
            context=self.context,
        ).data


class CanvasCommentCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=5000, trim_whitespace=True)
    parent = serializers.UUIDField(required=False, allow_null=True)
