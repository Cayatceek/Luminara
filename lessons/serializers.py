from rest_framework import serializers
from .models import Subject, Category, Lesson

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'description']

class CategorySerializer(serializers.ModelSerializer):
    subject = SubjectSerializer()

    class Meta:
        model = Category
        fields = ['id', 'subject', 'name', 'description', 'order']

class LessonSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    def validate_questions(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Поле 'questions' должно быть словарем.")
        return value

    def validate_answers(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Поле 'answers' должно быть словарем.")
        return value

    class Meta:
        model = Lesson
        fields = [
            'id', 'category', 'title', 'text', 'explanations', 'questions', 'answers',
            'question_explanations', 'type', 'topic', 'order', 'created_at', 'updated_at', 'time_spent'
        ]