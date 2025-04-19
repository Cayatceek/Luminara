from django.urls import path
from . import views

urlpatterns = [
    path('subjects/', views.subjects_page, name='subjects'),
    path('categories/<int:subject_id>/', views.categories_page, name='categories'),
    path('lessons/<int:subject_id>/<int:category_id>/', views.lessons_page, name='lessons'),
    path('lesson/<int:subject_id>/<int:category_id>/<int:lesson_id>/', views.lesson_detail_page, name='lesson_detail'),
    path('api/subjects/', views.subject_list, name='subject_list'),
    path('api/categories/<int:subject_id>/', views.category_list, name='category_list'),
    path('api/lessons/<int:category_id>/', views.lesson_list, name='lesson_list'),
    path('api/lesson/<int:lesson_id>/', views.lesson_view, name='lesson_view'),
    path('api/lesson/submit/', views.submit_answer, name='submit_answer'),
]