from rest_framework import serializers
from .models import Progress

class ProgressSerializer(serializers.ModelSerializer):
    lesson = serializers.CharField(source='lesson.title')
    subject = serializers.CharField(source='lesson.category.subject.name')
    accuracy = serializers.FloatField()

    class Meta:
        model = Progress
        fields = ['lesson', 'subject', 'accuracy', 'time_spent', 'completed_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Форматируем time_spent в "X min Y sec"
        time_spent_seconds = data['time_spent']
        data['time_spent'] = f"{time_spent_seconds // 60} min {time_spent_seconds % 60} sec"
        # Форматируем дату
        data['completed_at'] = instance.completed_at.strftime("%Y-%m-%d")
        return data