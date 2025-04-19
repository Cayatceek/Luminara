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

    const categoryList = document.getElementById("category-list");
    // Извлекаем subjectId из URL
    const subjectId = window.location.pathname.split('/').filter(Boolean).pop();

    // Загрузка списка категорий
    if (categoryList && subjectId) {
        console.log("Загрузка категорий для предмета:", subjectId);
        categoryList.innerHTML = `
            <div class="text-center my-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <p class="text-muted mt-2">Генерация категорий...</p>
            </div>
        `;
        fetchWithAuth(`/lessons/api/categories/${subjectId}/`)
            .then(categories => {
                console.log("Категории:", categories);
                categoryList.innerHTML = categories.map(category => `
                    <div class="card mb-3 ${category.is_unlocked ? '' : 'opacity-50'} fade-in">
                        <div class="card-body">
                            <h5 class="card-title d-flex align-items-center">
                                <i class="bi bi-folder me-2"></i> ${category.name}
                            </h5>
                            <p class="card-text">${category.description || ''}</p>
                            <p>Прогресс: ${category.completed_lessons}/${category.total_lessons}</p>
                            <a href="/lessons/lessons/${subjectId}/${category.id}/" class="btn btn-primary" data-category-id="${category.id}" 
                                ${category.is_unlocked ? '' : 'disabled'}>Посмотреть уроки</a>
                            ${category.is_unlocked ? '' : '<p class="text-warning mt-2">Завершите предыдущий уровень или пройдите тест, чтобы разблокировать.</p>'}
                        </div>
                    </div>
                `).join("");
            })
            .catch(error => {
                if (error.message !== "Unauthorized") {
                    console.error("Ошибка загрузки категорий:", error);
                    categoryList.innerHTML = `<p class="text-danger">Ошибка загрузки категорий: ${error.message || 'Неизвестная ошибка'}</p>`;
                }
            });
    }
});