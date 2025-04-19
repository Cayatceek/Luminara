from .basic import *

# Режим разработки
DEBUG = True

# Разрешенные хосты (локально)
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# База данных (PostgreSQL)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'luminara_db',
        'USER': 'postgres',
        'PASSWORD': os.getenv('DB_PASSWORD', 'f333f9de8e984d75bc2f8ffc6bda9314'),
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Логирование для отладки
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}