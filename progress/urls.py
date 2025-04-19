from django.urls import path
from . import views

urlpatterns = [
    path('api/progress/', views.progress_list, name='progress_list'),
    path('', views.progress_page, name='progress_page'),
]