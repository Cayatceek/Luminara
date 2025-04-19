from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    level = models.CharField(
        max_length=20,
        choices=[
            ('Beginner', 'Beginner'),
            ('Elementary', 'Elementary'),
            ('Intermediate', 'Intermediate'),
            ('Upper-Intermediate', 'Upper-Intermediate'),
            ('Advanced', 'Advanced')
        ],
        blank=True,
        help_text="Текущий уровень пользователя"
    )
    weak_areas = models.JSONField(
        blank=True,
        null=True,
        help_text="Слабые места, например, {'beginner-grammar': 40}"
    )
    preferred_subjects = models.ManyToManyField(
        'lessons.Subject',
        blank=True,
        help_text="Предпочитаемые предметы"
    )
    total_lessons_completed = models.IntegerField(
        default=0,
        help_text="Количество завершённых уроков"
    )
    total_time_spent = models.IntegerField(
        default=0,
        help_text="Общее время обучения (в минутах)"
    )
    accuracy = models.FloatField(
        default=0,
        help_text="Средняя точность по урокам (%)"
    )
    streak = models.IntegerField(
        default=0,
        help_text="Серия дней с уроками"
    )
    last_lesson_date = models.DateField(
        null=True,
        blank=True,
        help_text="Дата последнего урока"
    )
    is_premium = models.BooleanField(
        default=False,
        help_text="Премиум-статус"
    )
    premium_expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Дата окончания премиум-подписки"
    )
    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
        help_text="Аватар пользователя"
    )
    bio = models.TextField(
        blank=True,
        help_text="О пользователе"
    )
    email_notifications = models.BooleanField(
        default=True,
        help_text="Получать уведомления по email"
    )
    push_notifications = models.BooleanField(
        default=False,
        help_text="Получать push-уведомления"
    )
    language = models.CharField(
        max_length=10,
        choices=[('en', 'English'), ('ru', 'Russian')],
        default='en',
        help_text="Язык интерфейса"
    )

    def update_progress(self, lesson, correct, total, time_spent):
        """Обновляет прогресс пользователя после урока."""
        self.total_lessons_completed += 1
        self.total_time_spent += time_spent
        self.accuracy = ((self.accuracy * (self.total_lessons_completed - 1)) + (correct / total * 100)) / self.total_lessons_completed
        today = timezone.now().date()
        if self.last_lesson_date == today - timezone.timedelta(days=1):
            self.streak += 1
        elif self.last_lesson_date != today:
            self.streak = 1
        self.last_lesson_date = today
        self.save()

    def __str__(self):
        return self.username