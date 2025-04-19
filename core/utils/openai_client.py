from openai import OpenAI
from django.conf import settings
import json

class OpenAIClient:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def generate_lesson(self, category, prompt, level, lesson_type, lesson_topic):
        # Определяем, на каком языке и как объяснять материал
        level_instructions = {
            "Beginner": "Объясняй всё полностью на русском языке, чтобы материал был максимально понятен. Текст урока и вопросы должны быть на английском, но после каждого предложения или вопроса добавляй подробное объяснение на русском.",
            "Elementary": "Текст урока и вопросы должны быть на английском, но после каждого абзаца текста и каждого вопроса добавляй подробное объяснение на русском языке, чтобы помочь понять материал.",
            "Intermediate": "Текст урока и вопросы полностью на английском. Объясняй материал преимущественно на английском, но для сложных моментов добавляй краткие пояснения на русском.",
            "Upper-Intermediate": "Текст урока и вопросы полностью на английском. Объясняй материал полностью на английском, но если встречаются очень сложные концепции, добавляй минимальные пояснения на русском.",
            "Advanced": "Текст урока и вопросы полностью на английском. Объясняй материал полностью на английском, без использования русского языка."
        }

        instruction = level_instructions.get(level, "Текст урока и вопросы полностью на английском. Объясняй материал полностью на английском, без использования русского языка.")

        # Используем lesson_type и lesson_topic в промпте
        topic_info = f"Тема урока: {lesson_topic}, тип урока: {lesson_type}. "

        # Определяем количество вопросов и слов в зависимости от темы урока
        num_questions = 7
        num_words = 30 if lesson_topic == "vocabulary" else None

        # Формируем промпт для генерации урока
        full_prompt = f"""
        Ты - преподаватель английского языка. Создай урок по категории '{category}' на основе следующего запроса: {prompt}.
        Уровень пользователя: {level}.
        {topic_info}Инструкции: {instruction}

        Урок должен включать:
        1. Короткий объяснительный текст (250-300 слов) на английском языке по заданной теме.
        2. Ровно {num_questions} вопросов на английском языке для проверки понимания, каждый с правильным ответом.

        Форматируй ответ следующим образом:
        Text: [здесь объяснительный текст на английском с учётом инструкций по уровню]
        Explanations: [объяснения текста урока в соответствии с инструкциями по уровню]
        Questions:
        {"".join([f"- Q{i+1}: [вопрос {i+1} на английском] (Correct answer: [правильный ответ {i+1} на английском])\n" for i in range(num_questions)])}
        Question Explanations: [объяснения вопросов в соответствии с инструкциями по уровню]
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Ты - преподаватель английского языка."},
                    {"role": "user", "content": full_prompt},
                ],
                max_tokens=1200,
                temperature=0.7,
            )
            content = response.choices[0].message.content.strip()
            print(f"Сырой ответ от OpenAI для урока (category={category}, level={level}, topic={lesson_topic}, type={lesson_type}):\n{content}\n")

            # Проверяем наличие ожидаемых секций
            required_sections = ["Text:", "Explanations:", "Questions:", "Question Explanations:"]
            for section in required_sections:
                if section not in content:
                    raise ValueError(f"Ответ от OpenAI не содержит ожидаемой секции '{section}'")

            # Парсим ответ от OpenAI
            text_section = content.split("Text:")[1].split("Explanations:")[0].strip()
            explanations_section = content.split("Explanations:")[1].split("Questions:")[0].strip()
            questions_section = content.split("Questions:")[1].split("Question Explanations:")[0].strip()
            question_explanations_section = content.split("Question Explanations:")[1].strip()

            # Формируем словарь вопросов
            questions = {}
            question_lines = [line.strip() for line in questions_section.split("\n") if line.strip().startswith("- Q")]
            if len(question_lines) != num_questions:
                raise ValueError(f"Ожидалось ровно {num_questions} вопросов, но получено {len(question_lines)}")

            for idx, line in enumerate(question_lines, 1):
                if not line.startswith(f"- Q{idx}:"):
                    raise ValueError(f"Ожидался вопрос Q{idx}, но получена строка: {line}")
                parts = line.split("(Correct answer:")
                if len(parts) < 2:
                    raise ValueError(f"Некорректный формат вопроса: {line}")
                question_part = parts[0].replace(f"- Q{idx}:", "").strip()
                answer_part = parts[1].split(")")[0].strip()
                question_key = f"q{idx}"
                questions[question_key] = {
                    "question": question_part,
                    "correct_answer": answer_part,
                }

            return {
                "text": text_section,
                "explanations": explanations_section,
                "questions": questions,
                "question_explanations": question_explanations_section
            }
        except Exception as e:
            raise Exception(f"Не удалось сгенерировать урок с помощью OpenAI: {str(e)}")
    def analyze_answer(self, question, answer):
        prompt = f"""
        Ты - преподаватель английского языка. Оцени лояльно, ответ не зацикливаясь на мелочах и верни результат строго в формате JSON и без дополнительных комментариев:
        {{
            "is_correct": true/false,
            "feedback": "Обратная связь на английском языке"
        }}
        Вопрос: {question['question']}
        Правильный ответ: {question['correct_answer']}
        Ответ: {answer}
        Если ответ правильный или близок к верному, укажи это в "is_correct": true и дай положительную обратную связь.
        Если ответ неправильный, укажи "is_correct": false, объясни, почему, и укажи правильный ответ.
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Ты - преподаватель английского языка."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=200,
                temperature=0.7,
            )
            result = response.choices[0].message.content.strip()
            print(f"Сырой ответ от OpenAI при проверке ответа:\n{result}\n")

            # Парсим JSON-ответ от OpenAI
            result_dict = json.loads(result)
            if "is_correct" not in result_dict or "feedback" not in result_dict:
                raise ValueError("Ответ от OpenAI не содержит ожидаемых полей 'is_correct' или 'feedback'")
            return result_dict["is_correct"], result_dict["feedback"]
        except json.JSONDecodeError as e:
            raise Exception(f"Не удалось разобрать JSON-ответ от OpenAI: {str(e)}")
        except Exception as e:
            raise Exception(f"Не удалось проанализировать ответ с помощью OpenAI: {str(e)}")