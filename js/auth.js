// Configuración de la API
// const API_URL = 'http://localhost:3000/api';

let socket; // Declara el socket globalmente

// Función para registrar un nuevo usuario
async function register(username, password) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_usuario: username,
                contraseña: password
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error en el registro');
        }

        // Guardar el token en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        
        // Redirigir al chat
        window.location.href = 'chat.html';
    } catch (error) {
        console.error('Error en el registro:', error);
        throw error;
    }
}

// Función para iniciar sesión
async function login(username, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_usuario: username,
                contraseña: password
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error en el inicio de sesión');
        }

        // Guardar el token en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        
        // Redirigir al chat
        window.location.href = 'chat.html';
    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        throw error;
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Limpiar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        
        // Redirigir al login
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Redirigir al login de todas formas
        window.location.href = 'login.html';
    }
}

// Función para verificar si el usuario está autenticado
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
}

// Función para obtener el token
function getToken() {
    return localStorage.getItem('token');
}

// Función para obtener el ID del usuario
function getUserId() {
    return localStorage.getItem('userId');
}

// Función para obtener el ID del usuario actual desde el token JWT
function getCurrentUserId() {
    const token = getToken();
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    } catch (error) {
        console.error('Error al decodificar token:', error);
        return null;
    }
}

// Proteger rutas que requieren autenticación
function protectRoute() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Función para conectar al socket (si no está ya conectado)
function connectSocket() {
    if (socket && socket.connected) {
        return;
    }

    const token = getToken();
    if (!token) {
        console.error('No hay token de autenticación para el socket');
        return;
    }

    socket = io(SOCKET_URL, {
        auth: {
            token: token
        }
    });

    socket.on('connect', () => {
        console.log('Conectado al servidor de notificaciones y chat');
    });

    socket.on('disconnect', () => {
        console.log('Desconectado del servidor');
    });

    // Listeners de notificaciones globales
    socket.on('new_friend_request', (data) => {
        showNotification(`¡Nueva solicitud de amistad de ${data.nombre_usuario}!`);
        updateNotificationCounter(true);
    });

    socket.on('friend_request_accepted', (data) => {
        showNotification(`¡${data.nombre_usuario} aceptó tu solicitud!`);
        if (window.location.pathname.includes('friends.html')) {
            loadFriends();
        }
    });

    // Listener para cuando se crea un nuevo chat
    socket.on('new_chat_available', () => {
        showNotification('Nuevo chat disponible. Refresca la lista de chats.');
        if (window.location.pathname.includes('chat.html')) {
            loadConversations();
        }
    });
}

// Cargar y mostrar datos del usuario en la UI (navbar, etc.)
async function loadUserDataInUI() {
    if (!isAuthenticated()) return;

    // Conectar al socket después de confirmar que el usuario está autenticado
    connectSocket();

    try {
        const response = await fetch(`${API_URL}/profile`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            // Si el token es inválido (ej. expirado), desloguear
            if (response.status === 401 || response.status === 403) {
                logout();
            }
            throw new Error('No se pudo cargar el perfil del usuario');
        }

        const data = await response.json();
        const profile = data.profile;

        if (profile) {
            // Actualizar nombre en la barra de navegación
            const usernameElements = document.querySelectorAll('#userDropdown .small');
            usernameElements.forEach(element => {
                element.textContent = profile.nombre_usuario || 'Usuario';
            });

            // Actualizar imagen de perfil en la barra de navegación
            const profileImages = document.querySelectorAll('.img-profile');
            profileImages.forEach(img => {
                // Asumiendo que tienes una columna 'profile_photo_url' en la tabla de usuarios
                img.src = profile.profile_photo_url || 'img/undraw_profile.svg';
            });
        }
    } catch (error) {
        console.error('Error al cargar datos del usuario en la UI:', error);
    }
}

// Ejecutar en todas las páginas protegidas
document.addEventListener('DOMContentLoaded', () => {
    const protectedPages = ['chat.html', 'friends.html', 'groups.html', 'profile.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (protectedPages.includes(currentPage)) {
        protectRoute();
        loadUserDataInUI();
    }
});

// Funciones de notificación movidas aquí para ser globales
function showNotification(message) {
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1050';
        document.body.appendChild(notificationContainer);
    }

    const alert = document.createElement('div');
    alert.className = 'alert alert-info alert-dismissible fade show';
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    notificationContainer.appendChild(alert);

    setTimeout(() => {
        if (alert.parentElement) {
            $(alert).alert('close');
        }
    }, 5000);
}

function updateNotificationCounter(increment) {
    const counter = document.querySelector('#alertsDropdown .badge-counter');
    if (counter) {
        let count = parseInt(counter.textContent) || 0;
        if (increment) {
            count++;
            counter.textContent = count > 9 ? '9+' : count;
            counter.style.display = 'inline-block';
        } else if (count > 0) {
            count--;
            counter.textContent = count;
            if (count === 0) {
                counter.style.display = 'none';
            }
        }
    }
} 