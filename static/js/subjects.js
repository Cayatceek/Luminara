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

    const subjectList = document.getElementById("subject-list");

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
                            <a href="/lessons/categories/${subject.id}/" class="btn btn-primary" data-subject-id="${subject.id}">Посмотреть категории</a>
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
});