# lessons/models.py
from django.db import models
from django.core.exceptions import ValidationError
from user.models import User
from django.utils import timezone

class Subject(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Category(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(
        max_length=20,
        choices=[
            ('Beginner', 'Beginner'),
            ('Elementary', 'Elementary'),
            ('Intermediate', 'Intermediate'),
            ('Upper-Intermediate', 'Upper-Intermediate'),
            ('Advanced', 'Advanced')
        ]
    )
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)  

    def __str__(self):
        return f"{self.subject}: {self.name}"

    class Meta:
        verbose_name_plural = "categories"
        ordering = ['order']
        unique_together = ('subject', 'name')

class Lesson(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    text = models.TextField()
    explanations = models.TextField(blank=True)  
    questions = models.JSONField(default=dict)
    answers = models.JSONField(default=dict)
    question_explanations = models.TextField(blank=True)
    type = models.CharField(
        max_length=20,
        choices=[
            ('theory', 'Theory'),
            ('practice', 'Practice'),
            ('test', 'Test'),
            ('final_test', 'Final Test')
        ]
    )
    topic = models.CharField(
        max_length=20,
        choices=[
            ('grammar', 'Grammar'),
            ('vocabulary', 'Vocabulary'),
            ('reading', 'Reading')
        ]
    )
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    time_spent = models.IntegerField(default=0, help_text="Общее время, проведённое на уроке (в секундах)")  # Новое поле

    def clean(self):
        """Проверяет соответствие урока категории."""
        if self.category.name not in ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced']:
            raise ValidationError("Category name must be a valid level.")
        if not self.title:
            self.title = f"{self.topic.capitalize()} {self.type.capitalize()} ({self.category.name})"

    def __str__(self):
        return f"{self.title} ({self.category})"

    class Meta:
        ordering = ['order']
        indexes = [
            models.Index(fields=['category', 'topic', 'type']),
        ]

class LevelTest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    questions = models.JSONField()
    answers = models.JSONField(null=True, blank=True)
    score = models.FloatField(default=0)
    level_scores = models.JSONField(default=dict)  # {'Beginner': 80, 'Elementary': 90}
    assigned_level = models.CharField(
        max_length=20,
        choices=[
            ('Beginner', 'Beginner'),
            ('Elementary', 'Elementary'),
            ('Intermediate', 'Intermediate'),
            ('Upper-Intermediate', 'Upper-Intermediate'),
            ('Advanced', 'Advanced')
        ],
        blank=True
    )
    completed_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        """Проверяет уникальность теста."""
        if LevelTest.objects.filter(user=self.user, subject=self.subject).exclude(pk=self.pk).exists():
            raise ValidationError("User has already completed a test for this subject.")

    def __str__(self):
        return f"Test for {self.user} in {self.subject}"

    class Meta:
        unique_together = ('user', 'subject')

class FinalTest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    topic = models.CharField(
        max_length=20,
        choices=[
            ('grammar', 'Grammar'),
            ('vocabulary', 'Vocabulary'),
            ('reading', 'Reading')
        ]
    )
    questions = models.JSONField()
    answers = models.JSONField(null=True, blank=True)
    score = models.FloatField(default=0)
    passed = models.BooleanField(default=False)
    attempt_number = models.IntegerField(default=1)
    completed_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        """Лимит попыток: 5 в день."""
        today = timezone.now().date()
        if FinalTest.objects.filter(
            user=self.user,
            category=self.category,
            topic=self.topic,
            completed_at__date=today
        ).count() >= 5:
            raise ValidationError("Daily attempt limit reached")

    def __str__(self):
        return f"Final Test for {self.user} in {self.category} ({self.topic})"

    class Meta:
        unique_together = ('user', 'category', 'topic', 'attempt_number')

    
class LessonPlan(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='lesson_plans')
    order = models.IntegerField()  # Порядок урока в категории
    lesson_type = models.CharField(max_length=50)  # Тип урока (theory, practice, test, reading, listening)
    topic = models.CharField(max_length=50)  # Основная тема (grammar, vocabulary, reading, listening)
    subtopic = models.CharField(max_length=50, blank=True, null=True)  # Подтема (nouns, verbs, colors, family)
    prompt = models.TextField()  # Промпт для OpenAI

    class Meta:
        unique_together = ('category', 'order')  # Уникальность комбинации category и order

    def __str__(self):
        return f"{self.category.name} Lesson Plan #{self.order} ({self.topic}{f': {self.subtopic}' if self.subtopic else ''} - {self.lesson_type})"