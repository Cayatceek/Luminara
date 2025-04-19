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

    const response = await fetch(url, options);
    if (response.status === 401) {
        handleAuthError();
        throw new Error("Unauthorized");
    }
    if (!response.ok) throw new Error(`Ошибка запроса: ${response.statusText}`);
    return response.json();
}

// Функция для обновления списка уроков
async function updateLessonList(categoryId) {
    const lessonList = document.getElementById("lesson-list");
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        const response = await fetchWithAuth(`/lessons/api/lessons/${categoryId}/`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!Array.isArray(response)) {
            throw new Error(response.error || 'Неизвестная ошибка от сервера');
        }

        const lessons = response;
        console.log("Обновлённый список уроков:", lessons);
        lessonList.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h2>Уроки</h2>
                <button id="back-to-categories" class="btn btn-outline-secondary btn-sm">
                    <i class="bi bi-arrow-left"></i> Назад к категориям
                </button>
            </div>
            ${lessons.map(lesson => `
                <div class="card mb-3 ${lesson.is_unlocked ? '' : 'opacity-50'} fade-in">
                    <div class="card-body">
                        <h5 class="card-title d-flex align-items-center">
                            <i class="bi bi-file-earmark-text me-2"></i> ${lesson.title}
                        </h5>
                        <p class="text-muted">Тип: ${lesson.type}, Тема: ${lesson.topic}</p>
                        <div class="progress mb-2" style="height: 5px;">
                            <div class="progress-bar bg-success" style="width: ${lesson.progress || 0}%;"></div>
                        </div>
                        <button class="btn btn-primary" data-lesson-id="${lesson.id}" 
                            ${lesson.is_unlocked ? '' : 'disabled'}>Начать урок</button>
                        ${lesson.is_unlocked ? '' : '<p class="text-warning mt-2">Завершите предыдущий урок, чтобы разблокировать.</p>'}
                    </div>
                </div>
            `).join("")}
        `;
    } catch (error) {
        console.error("Ошибка обновления списка уроков:", error);
        let errorMessage = error.message || 'Неизвестная ошибка';
        if (error.name === 'AbortError') {
            errorMessage = "Превышено время ожидания. Сервер слишком долго отвечает.";
        } else if (error.message === "Failed to fetch") {
            errorMessage = "Не удалось подключиться к серверу. Проверьте соединение.";
        }
        lessonList.innerHTML = `<p class="text-danger">Ошибка обновления уроков: ${errorMessage}</p>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const subjectList = document.getElementById("subject-list");
    const categoryList = document.getElementById("category-list");
    const lessonList = document.getElementById("lesson-list");
    const lessonContent = document.getElementById("lesson-content");
    const answerForm = document.getElementById("answer-form");
    const feedbackDiv = document.getElementById("feedback");
    const progressTable = document.getElementById("progress-table");

    let lessonStartTime = null;
    let currentCategoryId = null;

    // Загрузка списка предметов
    if (subjectList) {
        console.log("Загрузка предметов...");
        fetchWithAuth("/lessons/api/subjects/")
            .then(subjects => {
                console.log("Предметы:", subjects);
                subjectList.innerHTML = subjects.map(subject => `
                    <div class="card mb-3 fade-in">
                        <div class="card-body">
                            <h5 class="card-title d-flex align-items-center">
                                <i class="bi bi-book me-2"></i> ${subject.name}
                            </h5>
                            <p class="card-text">${subject.description || ''}</p>
                            <a href="#" class="btn btn-primary" data-subject-id="${subject.id}">Посмотреть категории</a>
                        </div>
                    </div>
                `).join("");
            })
            .catch(error => {
                if (error.message !== "Unauthorized") {
                    console.error("Ошибка загрузки предметов:", error);
                    subjectList.innerHTML = `<p class="text-danger">Ошибка загрузки предметов: ${error.message || 'Неизвестная ошибка'}</p>`;
                }
            });
    }

    // Обработка клика по предмету для загрузки категорий
    subjectList?.addEventListener("click", (e) => {
        const subjectButton = e.target.closest("[data-subject-id]");
        if (subjectButton) {
            e.preventDefault();
            const subjectId = subjectButton.dataset.subjectId;
            console.log("Загрузка категорий для предмета:", subjectId);

            categoryList.innerHTML = `
                <div class="text-center my-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                    <p class="text-muted mt-2">Генерация категорий...</p>
                </div>
            `;
            categoryList.style.display = "block";
            subjectList.style.display = "none";
            lessonList.style.display = "none";
            lessonContent.style.display = "none";

            fetchWithAuth(`/lessons/api/categories/${subjectId}/`)
                .then(categories => {
                    console.log("Категории:", categories);
                    categoryList.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2>Категории</h2>
                            <button id="back-to-subjects" class="btn btn-outline-secondary btn-sm">
                                <i class="bi bi-arrow-left"></i> Назад к предметам
                            </button>
                        </div>
                        ${categories.map(category => `
                            <div class="card mb-3 ${category.is_unlocked ? '' : 'opacity-50'} fade-in">
                                <div class="card-body">
                                    <h5 class="card-title d-flex align-items-center">
                                        <i class="bi bi-folder me-2"></i> ${category.name}
                                    </h5>
                                    <p class="card-text">${category.description || ''}</p>
                                    <p>Прогресс: ${category.completed_lessons}/${category.total_lessons}</p>
                                    <button class="btn btn-primary" data-category-id="${category.id}" 
                                        ${category.is_unlocked ? '' : 'disabled'}>Посмотреть уроки</button>
                                    ${category.is_unlocked ? '' : '<p class="text-warning mt-2">Завершите предыдущий уровень или пройдите тест, чтобы разблокировать.</p>'}
                                </div>
                            </div>
                        `).join("")}
                    `;
                })
                .catch(error => {
                    if (error.message !== "Unauthorized") {
                        console.error("Ошибка загрузки категорий:", error);
                        categoryList.innerHTML = `<p class="text-danger">Ошибка загрузки категорий: ${error.message || 'Неизвестная ошибка'}</p>`;
                    }
                });
        }
    });

    // Обработка клика по категории для загрузки уроков
    categoryList?.addEventListener("click", (e) => {
        const categoryButton = e.target.closest("[data-category-id]");
        if (categoryButton) {
            const categoryId = categoryButton.dataset.categoryId;
            currentCategoryId = categoryId;
            console.log("Загрузка уроков для категории:", categoryId);

            lessonList.innerHTML = `
                <div class="text-center my-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                    <p class="text-muted mt-2">Генерация уроков...</p>
                </div>
            `;
            lessonList.style.display = "block";
            subjectList.style.display = "none";
            categoryList.style.display = "none";
            lessonContent.style.display = "none";

            updateLessonList(categoryId);
        }

        if (e.target.closest("#back-to-subjects")) {
            subjectList.style.display = "block";
            categoryList.style.display = "none";
            lessonList.style.display = "none";
            lessonContent.style.display = "none";
        }
    });

    // Обработка клика по уроку для загрузки его содержимого
    lessonList?.addEventListener("click", (e) => {
        const lessonButton = e.target.closest("[data-lesson-id]");
        if (lessonButton) {
            const lessonId = lessonButton.dataset.lessonId;
            console.log("Загрузка урока:", lessonId);
            fetchWithAuth(`/lessons/api/lesson/${lessonId}/`)
                .then(data => {
                    console.log("Данные урока:", data);
                    document.getElementById("lesson-title").innerText = data.title;
                    document.getElementById("lesson-text").innerText = data.text;
                    const questionSelect = document.getElementById("question");
                    questionSelect.innerHTML = "";
                    const questionKeys = Object.entries(data.questions);
                    let firstUnansweredIndex = 0;

                    // Находим первый неотвеченный вопрос
                    for (let i = 0; i < questionKeys.length; i++) {
                        const [key] = questionKeys[i];
                        if (!(key in data.answers)) {
                            firstUnansweredIndex = i;
                            break;
                        }
                        firstUnansweredIndex = i + 1;
                    }

                    // Заполняем селект с переводом вопросов
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

                    // Если есть неотвеченные вопросы, выбираем первый из них
                    if (firstUnansweredIndex < questionKeys.length) {
                        questionSelect.value = questionKeys[firstUnansweredIndex][0];
                    }

                    lessonContent.style.display = "block";
                    subjectList.style.display = "none";
                    categoryList.style.display = "none";
                    lessonList.style.display = "none";
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

        if (e.target.closest("#back-to-categories")) {
            categoryList.style.display = "block";
            subjectList.style.display = "none";
            lessonList.style.display = "none";
            lessonContent.style.display = "none";
        }
    });

    // Обработка кнопки "Назад" к списку уроков
    lessonContent?.addEventListener("click", (e) => {
        if (e.target.closest("#back-to-lessons")) {
            lessonList.style.display = "block";
            subjectList.style.display = "none";
            categoryList.style.display = "none";
            lessonContent.style.display = "none";
        }
    });

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

                            // Обновляем список уроков
                            if (currentCategoryId) {
                                updateLessonList(currentCategoryId);
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

    // Загрузка данных прогресса пользователя
    if (progressTable) {
        console.log("Загрузка данных прогресса...");
        fetchWithAuth("/progress/api/progress/")
            .then(data => {
                console.log("Данные прогресса:", data);
                window.progressData = data;

                progressTable.innerHTML = data.map(item => `
                    <tr>
                        <td>${item.lesson}</td>
                        <td>${item.subject}</td>
                        <td>${item.accuracy.toFixed(2)}%</td>
                        <td>${item.time_spent}</td>
                        <td>${item.completed_at}</td>
                    </tr>
                `).join("");

                const ctx = document.getElementById("progress-chart")?.getContext("2d");
                if (ctx) {
                    new Chart(ctx, {
                        type: "line",
                        data: {
                            labels: data.map(item => item.completed_at),
                            datasets: [{
                                label: "Точность (%)",
                                data: data.map(item => item.accuracy),
                                borderColor: "#6e8efb",
                                backgroundColor: "rgba(110, 142, 251, 0.2)",
                                fill: true,
                                tension: 0.3
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: { beginAtZero: true, max: 100, title: { display: true, text: "Точность (%)" } },
                                x: { title: { display: true, text: "Дата" } }
                            }
                        }
                    });
                }
            })
            .catch(error => {
                console.error("Ошибка загрузки данных прогресса:", error);
                progressTable.innerHTML = `<tr><td colspan="5" class="text-danger">Ошибка загрузки прогресса: ${error.message || 'Неизвестная ошибка'}</td></tr>`;
            });

        // Сортировка таблицы прогресса
        document.querySelectorAll(".sortable").forEach(header => {
            header.addEventListener("click", () => {
                const sortKey = header.dataset.sort;
                const isAscending = !header.classList.contains("asc");

                document.querySelectorAll(".sortable").forEach(h => h.classList.remove("asc", "desc"));
                header.classList.add(isAscending ? "asc" : "desc");

                const sortedData = [...window.progressData].sort((a, b) => {
                    let valA = a[sortKey];
                    let valB = b[sortKey];

                    if (sortKey === "accuracy") {
                        valA = parseFloat(valA);
                        valB = parseFloat(valB);
                    }
                    if (sortKey === "time_spent") {
                        valA = parseInt(valA.split(" ")[0]);
                        valB = parseInt(valB.split(" ")[0]);
                    }

                    return isAscending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
                });

                progressTable.innerHTML = sortedData.map(item => `
                    <tr>
                        <td>${item.lesson}</td>
                        <td>${item.subject}</td>
                        <td>${item.accuracy.toFixed(2)}%</td>
                        <td>${item.time_spent}</td>
                        <td>${item.completed_at}</td>
                    </tr>
                `).join("");
            });
        });
    }

    // Анимация отображения статистики
    const animateStats = () => {
        const stats = document.querySelectorAll(".stat-number");
        stats.forEach(stat => {
            const target = parseInt(stat.getAttribute("data-target"));
            let count = 0;
            const increment = target / 100;
            const updateCount = () => {
                count += increment;
                if (count >= target) {
                    stat.innerText = target;
                } else {
                    stat.innerText = Math.ceil(count);
                    requestAnimationFrame(updateCount);
                }
            };
            updateCount();
        });
    };

    const statsSection = document.querySelector(".stat-number");
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                animateStats();
                observer.disconnect();
            }
        }, { threshold: 0.5 });
        observer.observe(statsSection);
    }

    // Инициализация карусели на главной странице
    const carousel = document.getElementById("hero-carousel");
    if (carousel) {
        console.log("Карусель найдена, инициализация...");
        const bsCarousel = new bootstrap.Carousel(carousel, {
            interval: 3000,
            ride: "carousel"
        });
        console.log("Карусель инициализирована:", bsCarousel);
    }
});

// Настройки модальных окон для аутентификации
document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const logoutModal = document.getElementById('logoutModal');

    // Функция получения CSRF-токена из формы
    const getCsrfToken = (form) => form.querySelector('input[name="csrfmiddlewaretoken"]').value;

    // Закрытие модального окна входа
    window.closeLoginModal = () => {
        const modal = bootstrap.Modal.getInstance(loginModal);
        if (modal) modal.hide();
    };

    // Закрытие модального окна регистрации
    window.closeSignupModal = () => {
        const modal = bootstrap.Modal.getInstance(signupModal);
        if (modal) modal.hide();
    };

    // Переключение видимости пароля
    window.togglePassword = (fieldId) => {
        const field = document.getElementById(fieldId);
        const icon = field.nextElementSibling.querySelector('i');
        if (field.type === 'password') {
            field.type = 'text';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        } else {
            field.type = 'password';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        }
    };

    // Логирование открытия модальных окон
    if (loginModal) loginModal.addEventListener('show.bs.modal', () => console.log('Модальное окно входа открыто'));
    if (signupModal) signupModal.addEventListener('show.bs.modal', () => console.log('Модальное окно регистрации открыто'));
    if (logoutModal) signupModal.addEventListener('show.bs.modal', () => console.log('Модальное окно выхода открыто'));

    // Обработка формы входа
    const loginForm = document.querySelector('#loginModal .auth-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const errorDiv = loginForm.querySelector('.form-errors') || document.createElement('div');
            errorDiv.className = 'form-errors text-danger mb-3';
            loginForm.prepend(errorDiv);

            try {
                const response = await fetch(loginForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCsrfToken(loginForm),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (response.ok) {
                    closeLoginModal();
                    window.location.reload();
                } else {
                    errorDiv.innerHTML = 'Ошибка входа. Проверьте email или пароль.';
                }
            } catch (error) {
                console.error('Ошибка при входе:', error);
                errorDiv.innerHTML = 'Произошла ошибка. Попробуйте снова.';
            }
        });
    }

    // Обработка формы регистрации
    const signupForm = document.querySelector('#signupModal .auth-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(signupForm);
            const errorDiv = signupForm.querySelector('.form-errors') || document.createElement('div');
            errorDiv.className = 'form-errors text-danger mb-3';
            signupForm.prepend(errorDiv);

            try {
                const response = await fetch(signupForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCsrfToken(signupForm),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (response.ok) {
                    closeSignupModal();
                    window.location.reload();
                } else {
                    errorDiv.innerHTML = 'Ошибка регистрации. Проверьте данные.';
                }
            } catch (error) {
                console.error('Ошибка при регистрации:', error);
                errorDiv.innerHTML = 'Произошла ошибка. Попробуйте снова.';
            }
        });
    }

    // Обработка формы выхода
    const logoutForm = document.querySelector('#logoutModal .auth-form');
    if (logoutForm) {
        logoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(logoutForm);
            try {
                const response = await fetch(logoutForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCsrfToken(logoutForm),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (response.ok) window.location.reload();
                else console.error('Ошибка выхода');
            } catch (error) {
                console.error('Ошибка при выходе:', error);
            }
        });
    }

    // Обработка кнопок входа через социальные сети
    document.querySelectorAll('.google-btn').forEach(btn => {
        btn.addEventListener('click', () => window.location.href = '/accounts/google/login/');
    });
    document.querySelectorAll('.facebook-btn').forEach(btn => {
        btn.addEventListener('click', () => window.location.href = '/accounts/facebook/login/');
    });
    document.querySelectorAll('.apple-btn').forEach(btn => {
        btn.addEventListener('click', () => window.location.href = '/accounts/apple/login/');
    });
});