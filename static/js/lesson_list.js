document.addEventListener("DOMContentLoaded", () => {
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

    // Функция для обновления списка уроков
    async function updateLessonList(categoryId, subjectId) {
        const lessonList = document.getElementById("lesson-list");
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            const response = await fetchWithAuth(`/lessons/api/lessons/${categoryId}/`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.lessons || !Array.isArray(response.lessons)) {
                console.error("Неверная структура ответа:", response);
                throw new Error(response.error || 'Неизвестная ошибка от сервера');
            }

            const lessons = response.lessons;
            console.log("Обновлённый список уроков:", lessons);
            lessonList.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2>Уроки</h2>
                    <a href="/lessons/categories/${subjectId}/" class="btn btn-outline-secondary btn-sm">
                        <i class="bi bi-arrow-left"></i> Назад к категориям
                    </a>
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
                            <a href="/lessons/lesson/${subjectId}/${categoryId}/${lesson.id}/" class="btn btn-primary" 
                                ${lesson.is_unlocked ? '' : 'disabled'}>Начать урок</a>
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

    const lessonList = document.getElementById("lesson-list");

    // Извлекаем subjectId и categoryId из URL
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const subjectId = pathParts[pathParts.length - 2]; // Предпоследний элемент
    const categoryId = pathParts[pathParts.length - 1]; // Последний элемент

    // Отладочные логи
    console.log("pathParts:", pathParts);
    console.log("subjectId:", subjectId);
    console.log("categoryId:", categoryId);

    // Загрузка списка уроков
    if (lessonList && categoryId && subjectId) {
        console.log("Загрузка уроков для категории:", categoryId);
        lessonList.innerHTML = `
            <div class="text-center my-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <p class="text-muted mt-2">Генерация уроков...</p>
            </div>
        `;
        updateLessonList(categoryId, subjectId);
    }
});