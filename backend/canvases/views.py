from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Canvas
from .serializers import CanvasSerializer

class CanvasListCreateView(generics.ListCreateAPIView):
    serializer_class = CanvasSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only returns systems belonging to the specific workspace in the URL
        workspace_id = self.kwargs['workspace_id']
        return Canvas.objects.filter(workspace_id=workspace_id)

    def perform_create(self, serializer):
        # Automatically links the system to the workspace from the URL
        # and tracks who created it
        serializer.save(
            workspace_id=self.kwargs['workspace_id'],
            last_modified_by=self.request.user
        )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )


class CanvasDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CanvasSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        # Only returns systems belonging to the specific workspace
        workspace_id = self.kwargs['workspace_id']
        return Canvas.objects.filter(workspace_id=workspace_id)
    
    def perform_update(self, serializer):
        # Track who last modified the canvas
        serializer.save(last_modified_by=self.request.user)