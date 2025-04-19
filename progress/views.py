from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Progress
from .serializers import ProgressSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def progress_list(request):
    progresses = Progress.objects.filter(user=request.user).order_by('-completed_at')
    serializer = ProgressSerializer(progresses, many=True)
    return Response(serializer.data)

def progress_page(request):
    return render(request, 'progress/progress.html')