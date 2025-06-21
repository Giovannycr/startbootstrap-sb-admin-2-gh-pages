// Configuración de la API
// const API_URL = 'http://localhost:3000/api';

// Cargar información del perfil
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/profile`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar perfil');
        }

        const data = await response.json();
        displayProfile(data.profile);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el perfil');
    }
}

// Mostrar información del perfil
function displayProfile(profile) {
    if (profile) {
        document.getElementById('username').value = profile.nombre_usuario || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('department').value = profile.departamento || '';
        
        // Actualizar foto de perfil
        const profileImages = document.querySelectorAll('.img-profile');
        const photoUrl = profile.profile_photo_url || 'img/undraw_profile.svg';
        profileImages.forEach(img => {
            img.src = photoUrl;
        });
        
        // Actualizar el nombre de usuario en la barra superior
        const usernameElements = document.querySelectorAll('#username');
        usernameElements.forEach(element => {
            if (element.tagName === 'SPAN') {
                element.textContent = profile.nombre_usuario || 'Usuario';
            }
        });
    }
}

// Cargar estadísticas del usuario
async function loadStatistics() {
    try {
        const response = await fetch(`${API_URL}/profile/statistics`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar estadísticas');
        }

        const data = await response.json();
        displayStatistics(data.statistics);
    } catch (error) {
        console.error('Error:', error);
        // No mostrar error, solo usar valores por defecto
        displayStatistics({
            totalFriends: 0,
            totalGroups: 0,
            totalMessages: 0,
            onlineStatus: 'Online'
        });
    }
}

// Mostrar estadísticas
function displayStatistics(stats) {
    document.getElementById('totalFriends').textContent = stats.totalFriends || 0;
    document.getElementById('totalGroups').textContent = stats.totalGroups || 0;
    document.getElementById('totalMessages').textContent = stats.totalMessages || 0;
    document.getElementById('onlineStatus').textContent = stats.onlineStatus || 'Online';
}

// Manejar envío del formulario de perfil
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateProfile();
        });
    }

    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await changePassword();
        });
    }
});

// Actualizar perfil
async function updateProfile() {
    const email = document.getElementById('email').value.trim();
    const department = document.getElementById('department').value.trim();

    // Validar email si se proporciona
    if (email && !isValidEmail(email)) {
        alert('Por favor ingresa un email válido');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                departamento: department
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al actualizar perfil');
        }

        alert('Perfil actualizado exitosamente');
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Cambiar contraseña
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Por favor completa todos los campos');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    if (newPassword.length < 6) {
        alert('La nueva contraseña debe tener al menos 6 caracteres');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/profile/password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al cambiar contraseña');
        }

        alert('Contraseña cambiada exitosamente');
        
        // Limpiar formulario
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Cambiar foto de perfil
function changeProfilePhoto() {
    // Crear input de archivo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamaño del archivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('El archivo es demasiado grande. Máximo 5MB');
            return;
        }

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        let originalText = '';
        let uploadButton = null;
        try {
            // Mostrar indicador de carga
            uploadButton = document.querySelector('button[onclick="changeProfilePhoto()"]');
            if (uploadButton) {
                originalText = uploadButton.innerHTML;
                uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
                uploadButton.disabled = true;
            }

            const formData = new FormData();
            formData.append('profilePhoto', file);

            const response = await fetch(`${API_URL}/profile/photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                // Si la respuesta no es JSON, mostrar error genérico
                throw new Error('Error inesperado al subir la foto. Intenta de nuevo.');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Error al subir foto');
            }

            // Actualizar la imagen en la página
            const profileImages = document.querySelectorAll('.img-profile');
            profileImages.forEach(img => {
                img.src = data.photoUrl + '?t=' + new Date().getTime();
                img.onerror = function() {
                    this.src = 'img/undraw_profile.svg';
                };
            });

            alert('Foto de perfil actualizada exitosamente');
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        } finally {
            // Restaurar botón
            if (uploadButton) {
                uploadButton.innerHTML = originalText;
                uploadButton.disabled = false;
            }
        }
    };

    input.click();
}

// Función auxiliar para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
} 