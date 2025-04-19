document.addEventListener('DOMContentLoaded', () => {
    const logoutModal = document.getElementById('logoutModal');

    // Функция получения CSRF-токена из формы
    const getCsrfToken = (form) => form.querySelector('input[name="csrfmiddlewaretoken"]').value;

    // Логирование открытия модального окна
    if (logoutModal) {
        logoutModal.addEventListener('show.bs.modal', () => console.log('Модальное окно выхода открыто'));
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
});