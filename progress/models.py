from django.db import models

class Progress(models.Model):
    user = models.ForeignKey('user.User', on_delete=models.CASCADE)
    lesson = models.ForeignKey('lessons.Lesson', on_delete=models.CASCADE)
    correct_answers = models.IntegerField(default=0)
    total_answers = models.IntegerField(default=0)
    time_spent = models.IntegerField(default=0)
    completed_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'lesson')
        indexes = [
            models.Index(fields=['user', 'lesson']),
            models.Index(fields=['completed_at']),
        ]

    def __str__(self):
        return f"Progress for {self.lesson} by {self.user}"

    @property
    def accuracy(self):
        return (self.correct_answers / self.total_answers * 100) if self.total_answers > 0 else 0

class CategoryProgress(models.Model):
    user = models.ForeignKey('user.User', on_delete=models.CASCADE)
    category = models.ForeignKey('lessons.Category', on_delete=models.CASCADE)
    status = models.CharField(
        max_length=20,
        choices=[
            ('locked', 'Locked'),
            ('unlocked', 'Unlocked'),
            ('completed', 'Completed')
        ],
        default='locked'
    )
    unlocked_at = models.DateTimeField(null=True, blank=True)
    grammar_completed = models.IntegerField(default=0)
    vocabulary_completed = models.IntegerField(default=0)
    reading_completed = models.IntegerField(default=0)

    class Meta:
        unique_together = ('user', 'category')
        indexes = [
            models.Index(fields=['user', 'category']),
        ]

    def __str__(self):
        return f"{self.user}: {self.category} ({self.status})"

    def update_progress(self, topic):
        """Обновляет завершённые уроки по теме."""
        if topic == 'grammar':
            self.grammar_completed += 1
        elif topic == 'vocabulary':
            self.vocabulary_completed += 1
        elif topic == 'reading':
            self.reading_completed += 1
        if self.grammar_completed >= 8 and self.vocabulary_completed >= 8 and self.reading_completed >= 8:
            self.status = 'completed'
        self.save()