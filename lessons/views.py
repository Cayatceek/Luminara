from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Subject, Category, Lesson, LevelTest, LessonPlan
from progress.models import Progress, CategoryProgress
from .serializers import LessonSerializer, CategorySerializer, SubjectSerializer
from core.utils.openai_client import OpenAIClient
from django.utils import timezone

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subject_list(request):
    subjects = Subject.objects.all()
    serializer = SubjectSerializer(subjects, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def category_list(request, subject_id):
    try:
        subject = Subject.objects.get(id=subject_id)
    except Subject.DoesNotExist:
        return Response({"error": "Subject not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        level_test = LevelTest.objects.get(user=request.user, subject=subject)
        user_level = level_test.assigned_level
    except LevelTest.DoesNotExist:
        user_level = 'Beginner'

    level_order = {
        'Beginner': 0,
        'Elementary': 1,
        'Intermediate': 2,
        'Upper-Intermediate': 3,
        'Advanced': 4
    }

    categories = Category.objects.filter(subject_id=subject_id).order_by('order')
    if not categories.exists():
        category_levels = [
            ('Beginner', 0, "Начните своё путешествие с основ!"),
            ('Elementary', 1, "Создайте прочную базу с ключевыми навыками."),
            ('Intermediate', 2, "Поднимите свои навыки на новый уровень."),
            ('Upper-Intermediate', 3, "Освойте сложные концепции с уверенностью."),
            ('Advanced', 4, "Достигните беглости с помощью сложных уроков.")
        ]
        for name, order, description in category_levels:
            Category.objects.create(
                subject=subject,
                name=name,
                description=description,
                order=order
            )
        categories = Category.objects.filter(subject_id=subject_id).order_by('order')

    serializer = CategorySerializer(categories, many=True)
    response_data = []
    for idx, category in enumerate(categories):
        lessons = Lesson.objects.filter(category=category)
        completed_lessons = Progress.objects.filter(
            lesson__category=category,
            is_completed=True,
            user=request.user
        ).count()
        is_unlocked = True
        if level_order[category.name] > level_order.get(user_level, 0):
            is_unlocked = False
        elif category.order > 0:
            prev_category = Category.objects.filter(
                subject_id=subject_id,
                order=category.order-1
            ).first()
            if prev_category:
                prev_lessons = Lesson.objects.filter(category=prev_category).count()
                prev_completed = Progress.objects.filter(
                    lesson__category=prev_category,
                    is_completed=True,
                    user=request.user
                ).count()
                is_unlocked = prev_completed == prev_lessons
        response_data.append({
            **serializer.data[idx],
            'is_unlocked': is_unlocked,
            'completed_lessons': completed_lessons,
            'total_lessons': lessons.count()
        })

    return Response(response_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lesson_view(request, lesson_id):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        return Response({"error": "Урок не найден"}, status=status.HTTP_404_NOT_FOUND)

    try:
        level_test = LevelTest.objects.get(user=request.user, subject=lesson.category.subject)
        user_level = level_test.assigned_level
    except LevelTest.DoesNotExist:
        user_level = 'Beginner'

    level_order = {
        'Beginner': 0,
        'Elementary': 1,
        'Intermediate': 2,
        'Upper-Intermediate': 3,
        'Advanced': 4
    }
    if level_order[lesson.category.name] > level_order.get(user_level, 0):
        return Response({"error": "Категория заблокирована из-за вашего уровня"}, status=status.HTTP_403_FORBIDDEN)

    category = lesson.category
    if category.order > 0:
        prev_category = Category.objects.filter(
            subject=category.subject,
            order=category.order-1
        ).first()
        if prev_category:
            prev_completed = Progress.objects.filter(
                lesson__category=prev_category,
                is_completed=True,
                user=request.user
            ).count()
            prev_total = Lesson.objects.filter(category=prev_category).count()
            if prev_completed < prev_total:
                return Response({"error": "Сначала завершите предыдущую категорию"}, status=status.HTTP_403_FORBIDDEN)

    if lesson.order > 1:
        prev_lesson = Lesson.objects.filter(category=category, order=lesson.order-1).first()
        if prev_lesson:
            prev_progress = Progress.objects.filter(lesson=prev_lesson, user=request.user).first()
            if not (prev_progress and prev_progress.is_completed):
                return Response({"error": "Сначала завершите предыдущий урок"}, status=status.HTTP_403_FORBIDDEN)

    serializer = LessonSerializer(lesson)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lesson_list(request, category_id):
    print(f"Запрос lesson_list для category_id={category_id}, user={request.user}")
    try:
        category = Category.objects.get(id=category_id)
        print(f"Категория найдена: {category.name}")
    except Category.DoesNotExist:
        print(f"Категория с id={category_id} не найдена")
        return Response({"error": "Категория не найдена"}, status=status.HTTP_404_NOT_FOUND)

    try:
        level_test = LevelTest.objects.get(user=request.user, subject=category.subject)
        user_level = level_test.assigned_level
        print(f"Уровень пользователя: {user_level}")
    except LevelTest.DoesNotExist:
        user_level = 'Beginner'
        print("Тест уровня не найден, установлен уровень Beginner")

    level_order = {
        'Beginner': 0,
        'Elementary': 1,
        'Intermediate': 2,
        'Upper-Intermediate': 3,
        'Advanced': 4
    }
    if level_order[category.name] > level_order.get(user_level, 0):
        print(f"Категория {category.name} заблокирована: уровень пользователя {user_level}")
        return Response({"error": "Категория заблокирована из-за вашего уровня"}, status=status.HTTP_403_FORBIDDEN)

    # Проверяем статус категории через CategoryProgress
    category_progress = CategoryProgress.objects.filter(user=request.user, category=category).first()
    if not category_progress or category_progress.status == 'locked':
        print(f"CategoryProgress: {category_progress.status if category_progress else 'не существует'}")
        return Response({"error": "Сначала завершите предыдущую категорию"}, status=status.HTTP_403_FORBIDDEN)

    lessons = Lesson.objects.filter(category_id=category_id).order_by('order')
    print(f"Найдено уроков: {lessons.count()}")
    if not lessons.exists():
        try:
            openai_client = OpenAIClient()
            lesson_plans = LessonPlan.objects.filter(category=category).order_by('order')
            print(f"Найдено планов уроков: {lesson_plans.count()}")
            if not lesson_plans.exists():
                return Response({"error": "План уроков для данной категории не найден"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            for lesson_plan in lesson_plans:
                lesson_type = lesson_plan.lesson_type
                lesson_topic = lesson_plan.topic
                lesson_subtopic = lesson_plan.subtopic
                prompt = lesson_plan.prompt
                print(f"Генерация урока: order={lesson_plan.order}, topic={lesson_topic}, type={lesson_type}")
                lesson_data = openai_client.generate_lesson(
                    category=category.name,
                    prompt=prompt,
                    level=category.name,
                    lesson_type=lesson_type,
                    lesson_topic=lesson_topic if lesson_subtopic is None else f"{lesson_topic}:{lesson_subtopic}"
                )
                print(f"Успешно сгенерирован урок #{lesson_plan.order}: {lesson_data['text'][:50]}...")

                title = f"{category.name} {lesson_topic.capitalize()}{f': {lesson_subtopic.capitalize()}' if lesson_subtopic else ''} {lesson_type.capitalize()} - Lesson {lesson_plan.order}"
                Lesson.objects.create(
                    category=category,
                    title=title,
                    text=lesson_data['text'],
                    explanations=lesson_data['explanations'],
                    questions=lesson_data['questions'],
                    question_explanations=lesson_data['question_explanations'],
                    answers={},
                    type=lesson_type,
                    topic=lesson_topic,
                    order=lesson_plan.order
                )
            lessons = Lesson.objects.filter(category_id=category_id).order_by('order')
            print(f"Создано уроков: {lessons.count()}")
        except Exception as e:
            print(f"Ошибка при генерации уроков для категории {category_id}: {str(e)}")
            return Response({"error": f"Не удалось сгенерировать уроки: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    serializer = LessonSerializer(lessons, many=True)
    response_data = []
    for idx, lesson in enumerate(lessons):
        progress = Progress.objects.filter(lesson=lesson, user=request.user).first()
        is_unlocked = True
        lesson_progress = 0
        if progress:
            total_questions = len(lesson.questions)
            answered_questions = len(lesson.answers)
            lesson_progress = (answered_questions / total_questions * 100) if total_questions > 0 else 0
        if lesson.order > 1:
            prev_lesson = Lesson.objects.filter(category=category, order=lesson.order-1).first()
            if prev_lesson:
                prev_progress = Progress.objects.filter(lesson=prev_lesson, user=request.user).first()
                is_unlocked = prev_progress and prev_progress.is_completed
        response_data.append({
            **serializer.data[idx],
            'is_unlocked': is_unlocked,
            'progress': lesson_progress
        })

    total_lessons = lessons.count()
    completed_lessons = Progress.objects.filter(
        lesson__category=category,
        is_completed=True,
        user=request.user
    ).count()
    category_progress = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
    print(f"Возвращается ответ: total_lessons={total_lessons}, completed_lessons={completed_lessons}")

    return Response({
        "lessons": response_data,
        "category_progress": category_progress,
        "total_lessons": total_lessons,
        "completed_lessons": completed_lessons
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_answer(request):
    lesson_id = request.data.get('lesson_id')
    question_key = request.data.get('question_key')
    answer = request.data.get('answer')
    time_spent = request.data.get('time_spent', 0)

    if not all([lesson_id, question_key, answer]):
        return Response({"error": "Отсутствует lesson_id, question_key или answer"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        return Response({"error": "Урок не найден"}, status=status.HTTP_404_NOT_FOUND)

    if question_key not in lesson.questions:
        return Response({"error": "Неверный ключ вопроса"}, status=status.HTTP_400_BAD_REQUEST)

    # Проверяем, можно ли ответить на этот вопрос
    question_keys = list(lesson.questions.keys())
    current_index = question_keys.index(question_key)
    for i in range(current_index):
        prev_key = question_keys[i]
        if prev_key not in lesson.answers:
            return Response({"error": "Сначала завершите предыдущие вопросы"}, status=status.HTTP_403_FORBIDDEN)

    try:
        openai_client = OpenAIClient()
        is_correct, feedback = openai_client.analyze_answer(
            question=lesson.questions[question_key],
            answer=answer
        )
    except Exception as e:
        feedback = f"Ошибка проверки ответа: {str(e)}"
        is_correct = False

    # Если ответ неправильный, не сохраняем его и не обновляем прогресс
    if not is_correct:
        return Response({
            "feedback": feedback,
            "is_correct": is_correct,
            "next_question_key": None
        }, status=status.HTTP_200_OK)

    # Обновляем прогресс урока
    progress, created = Progress.objects.get_or_create(
        lesson=lesson,
        user=request.user,
        defaults={
            'correct_answers': 1,
            'total_answers': 1,
            'time_spent': int(time_spent),
        }
    )
    if not created:
        progress.total_answers += 1
        progress.correct_answers += 1 if is_correct else 0
        progress.time_spent += int(time_spent)
        progress.save()

    lesson.time_spent += int(time_spent)
    if not isinstance(lesson.answers, dict):
        lesson.answers = {}
    lesson.answers[question_key] = {"answer": answer, "is_correct": is_correct}
    lesson.save()

    # Проверяем, завершён ли урок
    if progress.total_answers >= len(lesson.questions):
        accuracy = progress.accuracy
        progress.is_completed = accuracy >= 80
        progress.save()

        # Обновляем CategoryProgress
        category = lesson.category
        category_progress, _ = CategoryProgress.objects.get_or_create(
            user=request.user,
            category=category,
            defaults={
                'status': 'unlocked',
                'unlocked_at': timezone.now()
            }
        )
        category_progress.update_progress(lesson.topic)

        # Проверяем, завершена ли категория, и разблокируем следующую
        total_lessons = Lesson.objects.filter(category=category).count()
        completed_lessons = Progress.objects.filter(
            lesson__category=category,
            is_completed=True,
            user=request.user
        ).count()
        if completed_lessons == total_lessons and category_progress.status != 'completed':
            category_progress.status = 'completed'
            category_progress.save()

            # Разблокируем следующую категорию
            next_category = Category.objects.filter(
                subject=category.subject,
                order=category.order + 1
            ).first()
            if next_category:
                next_category_progress, _ = CategoryProgress.objects.get_or_create(
                    user=request.user,
                    category=next_category,
                    defaults={
                        'status': 'locked'
                    }
                )
                if next_category_progress.status == 'locked':
                    next_category_progress.status = 'unlocked'
                    next_category_progress.unlocked_at = timezone.now()
                    next_category_progress.save()

    # Определяем следующий вопрос
    next_question_key = None
    if current_index + 1 < len(question_keys):
        next_question_key = question_keys[current_index + 1]

    return Response({
        "feedback": feedback,
        "is_correct": is_correct,
        "next_question_key": next_question_key
    }, status=status.HTTP_200_OK)

def subjects_page(request):
    return render(request, 'lessons/subjects.html')

def categories_page(request, subject_id):
    return render(request, 'lessons/categories.html', {'subject_id': subject_id})

def lessons_page(request, subject_id, category_id):
    return render(request, 'lessons/lesson_list.html', {'subject_id': subject_id, 'category_id': category_id})

def lesson_detail_page(request, subject_id, category_id, lesson_id):
    return render(request, 'lessons/lesson_detail.html', {
        'subject_id': subject_id,
        'category_id': category_id,
        'lesson_id': lesson_id
    })