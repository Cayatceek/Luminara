from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('lessons/', include('lessons.urls')),
    path('progress/', include('progress.urls')),
    path('', TemplateView.as_view(template_name='main.html'), name='home'),
]