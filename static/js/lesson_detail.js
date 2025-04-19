document.addEventListener("DOMContentLoaded", () => {
    // Функция обновления прогресс-бара
    function updateProgress(answered, total) {
        const progress = total > 0 ? (answered / total) * 100 : 0;
        const progressBar = document.getElementById("lesson-progress");
        const progressText = document.getElementById("progress-text");
        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute("aria-valuenow", progress);
            progressText.innerText = `${Math.round(progress)}%`;
        }
    }

    // Функция обработки ошибок аутентификации
    function handleAuthError() {
        const loginModal = new bootstrap.Modal(document.getElementById("loginModal"));
        loginModal.show();
        console.warn("Пользователь не аутентифицирован. Открывается модальное окно входа.");
    }

    // Универсальная функция для выполнения запросов с учётом сессионной аутентификации
    async function fetchWithAuth(url, options = {}) {
        if (!options.headers) options.headers = {};
        options.headers["X-Requested-With"] = "XMLHttpRequest";
        options.credentials = "include";

        try {
            const response = await fetch(url, options);
            if (response.status === 401) {
                handleAuthError();
                throw new Error("Unauthorized");
            }
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.error("Ответ сервера не является JSON:", response);
                throw new Error("Сервер вернул невалидный ответ");
            }
            const data = await response.json();
            if (!response.ok) {
                console.error("Ошибка сервера:", data);
                throw new Error(data.error || `Ошибка запроса: ${response.statusText}`);
            }
            console.log(`Ответ от ${url}:`, data);
            return data;
        } catch (error) {
            console.error(`Ошибка в fetchWithAuth (${url}):`, error);
            throw error;
        }
    }

    const lessonContent = document.getElementById("lesson-content");
    const answerForm = document.getElementById("answer-form");
    const feedbackDiv = document.getElementById("feedback");

    let lessonStartTime = null;

    // Функция для загрузки и отображения содержимого урока
    function loadLesson(lessonId) {
        console.log("Загрузка урока:", lessonId);
        fetchWithAuth(`/lessons/api/lesson/${lessonId}/`)
            .then(data => {
                console.log("Данные урока:", data);
                document.getElementById("lesson-title").innerText = data.title;
                document.getElementById("lesson-text").innerHTML = `
                    <p><strong>Text:</strong></p>
                    <p>${data.text}</p>
                    <p><strong>Explanations:</strong></p>
                    <p>${data.explanations}</p>
                `;
                const questionSelect = document.getElementById("question");
                questionSelect.innerHTML = "";
                const questionKeys = Object.entries(data.questions);
                let firstUnansweredIndex = 0;

                for (let i = 0; i < questionKeys.length; i++) {
                    const [key] = questionKeys[i];
                    if (!(key in data.answers)) {
                        firstUnansweredIndex = i;
                        break;
                    }
                    firstUnansweredIndex = i + 1;
                }

                for (let i = 0; i < questionKeys.length; i++) {
                    const [key, value] = questionKeys[i];
                    const isAnswered = key in data.answers;
                    const isCorrect = isAnswered ? data.answers[key].is_correct : false;
                    const label = value.translation 
                        ? `${value.question} (${value.translation})${isAnswered ? (isCorrect ? ' ✅' : ' ❌') : ''}` 
                        : `${value.question}${isAnswered ? (isCorrect ? ' ✅' : ' ❌') : ''}`;
                    const option = new Option(label, key);
                    questionSelect.options.add(option);
                }

                if (firstUnansweredIndex < questionKeys.length) {
                    questionSelect.value = questionKeys[firstUnansweredIndex][0];
                }

                lessonContent.dataset.lessonId = lessonId;
                feedbackDiv.style.display = "none";

                const totalQuestions = Object.keys(data.questions).length;
                let answeredQuestions = Object.keys(data.answers || {}).length;
                updateProgress(answeredQuestions, totalQuestions);

                lessonStartTime = performance.now();
            })
            .catch(error => {
                if (error.message !== "Unauthorized") {
                    console.error("Ошибка загрузки урока:", error);
                    feedbackDiv.innerText = error.message || 'Неизвестная ошибка';
                    feedbackDiv.className = "mt-3 alert alert-danger";
                    feedbackDiv.style.display = "block";
                }
            });
    }

    // Обработка отправки ответа на вопрос урока
    answerForm?.addEventListener("submit", (e) => {
        e.preventDefault();

        const submitBtn = answerForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Проверка...`;

        const lessonId = lessonContent.dataset.lessonId;
        const answer = document.getElementById("answer").value;
        const questionKey = document.getElementById("question").value;
        const timeSpent = lessonStartTime ? Math.round((performance.now() - lessonStartTime) / 1000) : 0;

        // Проверяем, отвечен ли уже вопрос
        fetchWithAuth(`/lessons/api/lesson/${lessonId}/`)
            .then(lessonData => {
                const isAnswered = questionKey in lessonData.answers;
                if (isAnswered) {
                    feedbackDiv.innerText = "Этот вопрос уже был отвечен.";
                    feedbackDiv.className = "mt-3 alert alert-info";
                    feedbackDiv.style.display = "block";
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="bi bi-check-circle me-2"></i>Отправить`;
                    return;
                }

                fetchWithAuth("/lessons/api/lesson/submit/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
                    },
                    body: JSON.stringify({ 
                        lesson_id: lessonId, 
                        question_key: questionKey, 
                        answer: answer,
                        time_spent: timeSpent 
                    }),
                })
                .then(data => {
                    console.log("Ответ сервера:", data);
                    feedbackDiv.innerText = data.feedback;
                    feedbackDiv.className = "mt-3 alert " + (data.is_correct ? "alert-success" : "alert-warning");
                    feedbackDiv.style.display = "block";
                    document.getElementById("answer").value = "";

                    if (!data.is_correct) {
                        // Если ответ неправильный, не обновляем список вопросов
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = `<i class="bi bi-check-circle me-2"></i>Отправить`;
                        return;
                    }

                    // Обновляем прогресс текущего урока
                    return fetchWithAuth(`/lessons/api/lesson/${lessonId}/`)
                        .then(lessonData => {
                            const totalQuestions = Object.keys(lessonData.questions).length;
                            const answeredQuestions = Object.keys(lessonData.answers || {}).length;
                            updateProgress(answeredQuestions, totalQuestions);

                            const questionSelect = document.getElementById("question");
                            const questionKeys = Object.entries(lessonData.questions);
                            let firstUnansweredIndex = 0;

                            // Находим первый неотвеченный вопрос
                            for (let i = 0; i < questionKeys.length; i++) {
                                const [key] = questionKeys[i];
                                if (!(key in lessonData.answers)) {
                                    firstUnansweredIndex = i;
                                    break;
                                }
                                firstUnansweredIndex = i + 1;
                            }

                            // Обновляем список вопросов
                            questionSelect.innerHTML = "";
                            for (let i = 0; i < questionKeys.length; i++) {
                                const [key, value] = questionKeys[i];
                                const isAnswered = key in lessonData.answers;
                                const isCorrect = isAnswered ? lessonData.answers[key].is_correct : false;
                                const label = value.translation 
                                    ? `${value.question} (${value.translation})${isAnswered ? (isCorrect ? ' ✅' : ' ❌') : ''}` 
                                    : `${value.question}${isAnswered ? (isCorrect ? ' ✅' : ' ❌') : ''}`;
                                const option = new Option(label, key);
                                questionSelect.options.add(option);
                            }

                            // Если есть неотвеченные вопросы, выбираем первый из них
                            if (firstUnansweredIndex < questionKeys.length) {
                                questionSelect.value = questionKeys[firstUnansweredIndex][0];
                            }

                            // Если все вопросы отвечены, отключаем форму
                            if (answeredQuestions === totalQuestions) {
                                document.getElementById("answer").disabled = true;
                                document.querySelector("#answer-form button[type='submit']").disabled = true;
                                feedbackDiv.innerText = "Урок завершён!";
                                feedbackDiv.className = "mt-3 alert alert-success";
                                feedbackDiv.style.display = "block";
                            }
                        });
                })
                .then(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="bi bi-check-circle me-2"></i>Отправить`;
                })
                .catch(error => {
                    if (error.message !== "Unauthorized") {
                        console.error("Ошибка отправки ответа:", error);
                        feedbackDiv.innerText = `Ошибка отправки ответа: ${error.message || 'Неизвестная ошибка'}`;
                        feedbackDiv.className = "mt-3 alert alert-danger";
                        feedbackDiv.style.display = "block";
                    }
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="bi bi-check-circle me-2"></i>Отправить`;
                });
            });
    });

    // Инициализация урока
    if (lessonContent && lessonContent.dataset.lessonId) {
        loadLesson(lessonContent.dataset.lessonId);
    }
});