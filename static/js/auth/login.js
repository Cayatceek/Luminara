document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');

    // Функция получения CSRF-токена из формы
    const getCsrfToken = (form) => form.querySelector('input[name="csrfmiddlewaretoken"]').value;

    // Закрытие модального окна входа
    window.closeLoginModal = () => {
        const modal = bootstrap.Modal.getInstance(loginModal);
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

    // Логирование открытия модального окна
    if (loginModal) {
        loginModal.addEventListener('show.bs.modal', () => console.log('Модальное окно входа открыто'));
    }

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

    // Обработка кнопок входа через социальные сети
    document.querySelectorAll('#loginModal .google-btn').forEach(btn => {
        btn.addEventListener('click', () => window.location.href = '/accounts/google/login/');
    });
    document.querySelectorAll('#loginModal .facebook-btn').forEach(btn => {
        btn.addEventListener('click', () => window.location.href = '/accounts/facebook/login/');
    });
    document.querySelectorAll('#loginModal .apple-btn').forEach(btn => {
        btn.addEventListener('click', () => window.location.href = '/accounts/apple/login/');
    });
});