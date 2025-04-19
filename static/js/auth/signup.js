document.addEventListener('DOMContentLoaded', () => {
    const signupModal = document.getElementById('signupModal');

    // Функция получения CSRF-токена из формы
    const getCsrfToken = (form) => form.querySelector('input[name="csrfmiddlewaretoken"]').value;

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

    // Логирование открытия модального окна
    if (signupModal) {
        signupModal.addEventListener('show.bs.modal', () => console.log('Модальное окно регистрации открыто'));
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

    // Обработка кнопок входа через социальные сети
    document.querySelectorAll('#signupModal .google-btn').forEach(btn => {
        btn.addEventListener('click', () => window.location.href = '/accounts/google/login/');
    });
    document.querySelectorAll('#signupModal .facebook-btn').forEach(btn => {
        btn.addEventListener('click', () => window.location.href = '/accounts/facebook/login/');
    });
    document.querySelectorAll('#signupModal .apple-btn').forEach(btn => {
        btn.addEventListener('click', () => window.location.href = '/accounts/apple/login/');
    });
});