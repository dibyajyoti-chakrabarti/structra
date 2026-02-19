import uuid
from rest_framework import serializers
from .models import Canvas, default_canvas_state


ALLOWED_COMPONENT_TYPES = {
    "CLIENT",
    "API",
    "DATABASE",
    "CACHE",
    "QUEUE",
    "AUTH",
    "EXTERNAL_SERVICE",
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
    canvas_data = serializers.JSONField(required=False, write_only=True)

    class Meta:
        model = Canvas
        fields = [
            "id",
            "workspace",
            "name",
            "description",
            "canvas_state",
            "canvas_data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workspace", "created_at", "updated_at"]

    def validate(self, attrs):
        # Backward-compatible alias from old field name.
        if "canvas_data" in attrs and "canvas_state" not in attrs:
            attrs["canvas_state"] = attrs.pop("canvas_data")
        if "canvas_state" not in attrs:
            attrs["canvas_state"] = default_canvas_state()
        attrs["canvas_state"] = validate_canvas_state_shape(attrs["canvas_state"])
        return attrs


class CanvasAutosaveSerializer(serializers.Serializer):
    canvasState = serializers.JSONField()

    def validate_canvasState(self, value):
        return validate_canvas_state_shape(value)
