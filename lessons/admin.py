from django.contrib import admin
from .models import Subject, Category, Lesson, LevelTest, LessonPlan, FinalTest

admin.site.register(Subject)
admin.site.register(Category)
admin.site.register(Lesson)
admin.site.register(LevelTest)
admin.site.register(FinalTest)
admin.site.register(LessonPlan)