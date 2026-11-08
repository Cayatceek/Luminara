# Luminara

Учебная платформа на Django с уроками, планами обучения и отслеживанием прогресса. В проекте есть интеграция с OpenAI для учебных сценариев.

## Стек и структура

Python, Django 5.1, Django REST Framework, PostgreSQL, django-allauth и OpenAI SDK.

- [lessons](lessons/) — уроки и планы обучения.
- [progress](progress/) — прогресс пользователя.
- [user](user/) — пользовательская модель.
- [core/settings](core/settings/) — базовые настройки, разработка и production.
- [templates](templates/) — серверные HTML-шаблоны.

## Локальная настройка

Рекомендуемая отправная точка для существующих зависимостей — Python 3.11 или 3.12.

```bash
python -m venv .venv
# Активируйте .venv перед следующими командами
python -m pip install -r requirements.txt
```

1. Создайте локальную PostgreSQL-базу `luminara_db`.
2. Укажите свои параметры подключения в `core/settings/dev.py`.
3. Задайте собственные `SECRET_KEY` и `OPENAI_API_KEY` в локальном окружении или `.env`. Не используйте опубликованные значения и не коммитьте новые секреты.
4. Примените миграции и создайте администратора:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Откройте `http://127.0.0.1:8000/`. По умолчанию `manage.py` использует `core.settings.dev`.

## Проверки

```bash
python manage.py check
python manage.py test
```

Для запуска нужны установленные зависимости и доступная БД. Эти команды приведены для проверки в вашем окружении; успешный запуск здесь не подтверждён.

## Интеграции

Социальный вход требует регистрации OAuth-приложений и настройки django-allauth. AI-функции требуют действующего ключа OpenAI. Почта в режиме разработки выводится в консоль.

## Статус

Учебный проект. Перед размещением в интернете требуется отдельная проверка production-настроек, обработки данных и внешних интеграций.

Условия использования: [LICENSE](LICENSE).
