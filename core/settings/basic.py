"""
Django settings for luminaria project (base settings).
"""

from pathlib import Path
import os
from dotenv import load_dotenv

# Загружаем переменные окружения из .env
load_dotenv()

# Секретный ключ (используем значение из .env или значение по умолчанию)
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-_yce)i8w(*8tjt+@_q9_*r3&42qsg*9hu#19d^i&zwnqlc16lx')

# Базовая директория проекта
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Приложения
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',  # Требуется для django-allauth

    'rest_framework',
    'rest_framework_simplejwt',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.facebook',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.apple',
    
    'lessons',
    'progress',
    'user',
]

# Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

# Главный файл маршрутов
ROOT_URLCONF = 'core.urls'

# Шаблоны
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI
WSGI_APPLICATION = 'core.wsgi.application'

# Валидаторы паролей
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Интернационализация
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Статические файлы
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Default primary key
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# OpenAI API ключ
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Настройки REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# Кастомная модель пользователя
AUTH_USER_MODEL = 'user.User'

# Аутентификация
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

# Настройки django-allauth
SITE_ID = 1  # Добавлено для django.contrib.sites

ACCOUNT_LOGIN_METHODS = {'email'}  
ACCOUNT_SIGNUP_FIELDS = ['email*', 'username', 'password']
ACCOUNT_AUTHENTICATED_LOGIN_REDIRECTS = True  
ACCOUNT_EMAIL_VERIFICATION = 'optional'  
ACCOUNT_LOGOUT_ON_GET = True
LOGIN_REDIRECT_URL = '/'  
ACCOUNT_LOGOUT_REDIRECT_URL = '/'
SOCIALACCOUNT_LOGIN_ON_GET = True

# Email настройки (для разработки используем консоль)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Настройки социальных провайдеров
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
    },
    'facebook': {
        'METHOD': 'oauth2',
        'SCOPE': ['email', 'public_profile'],
        'AUTH_PARAMS': {'auth_type': 'reauthenticate'},
    },
    # Удалены настройки Apple, так как они не настроены
}