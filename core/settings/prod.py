"""
Production settings for luminaria project.
"""

from .basic import *
import dj_database_url

# Режим продакшена
DEBUG = False

# Разрешенные хосты (настрой для Heroku)
ALLOWED_HOSTS = ['your-heroku-app.herokuapp.com', 'localhost']

# База данных (Heroku PostgreSQL)
DATABASES = {
    'default': dj_database_url.config(conn_max_age=600, ssl_require=True)
}

# Безопасность для продакшена
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Статические файлы на Heroku
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'