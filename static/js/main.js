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

document.addEventListener("DOMContentLoaded", () => {
    // Управление сайдбаром
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.querySelector(".sidebar-toggle");
    const contentWrapper = document.querySelector(".content-wrapper");

    if (sidebar && sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
            sidebar.classList.toggle("hidden");
            contentWrapper.classList.toggle("sidebar-hidden");
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