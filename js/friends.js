// Configuración de la API
// const API_URL = 'http://localhost:3000/api';

// Cargar lista de amigos
async function loadFriends() {
    try {
        const response = await fetch(`${API_URL}/friends`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar amigos');
        }

        const data = await response.json();
        displayFriends(data.friends);
        displayOnlineFriends(data.onlineFriends);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('friendsList').innerHTML = '<p class="text-muted">Error al cargar amigos</p>';
    }
}

// Cargar solicitudes de amistad
async function loadFriendRequests() {
    try {
        const response = await fetch(`${API_URL}/friends/requests`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar solicitudes');
        }

        const data = await response.json();
        displayFriendRequests(data.requests);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('friendRequests').innerHTML = '<p class="text-muted">Error al cargar solicitudes</p>';
    }
}

// Mostrar lista de amigos
function displayFriends(friends) {
    const friendsList = document.getElementById('friendsList');
    
    if (!friends || friends.length === 0) {
        friendsList.innerHTML = '<p class="text-muted">No tienes amigos agregados</p>';
        return;
    }

    friendsList.innerHTML = friends.map(friend => `
        <div class="d-flex align-items-center mb-3 p-3 border rounded">
            <div class="position-relative">
                <img class="rounded-circle" src="img/undraw_profile.svg" style="width: 50px; height: 50px;">
                <span class="position-absolute bottom-0 end-0 bg-${friend.online ? 'success' : 'secondary'} rounded-circle" 
                      style="width: 12px; height: 12px;"></span>
            </div>
            <div class="ml-3 flex-grow-1">
                <h6 class="mb-0">${friend.nombre_usuario}</h6>
                <small class="text-${friend.online ? 'success' : 'muted'}">
                    ${friend.online ? 'Online' : 'Offline'}
                </small>
            </div>
            <div class="ml-auto">
                <button class="btn btn-primary btn-sm mr-2" onclick="startChat(${friend.id})">
                    <i class="fas fa-comment"></i> Chatear
                </button>
                <button class="btn btn-danger btn-sm" onclick="removeFriend(${friend.id})">
                    <i class="fas fa-user-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Mostrar amigos online
function displayOnlineFriends(onlineFriends) {
    const onlineFriendsDiv = document.getElementById('onlineFriends');
    
    if (!onlineFriends || onlineFriends.length === 0) {
        onlineFriendsDiv.innerHTML = '<p class="text-muted">No hay amigos online</p>';
        return;
    }

    onlineFriendsDiv.innerHTML = onlineFriends.map(friend => `
        <div class="d-flex align-items-center mb-3">
            <div class="position-relative">
                <img class="rounded-circle" src="img/undraw_profile.svg" style="width: 40px; height: 40px;">
                <span class="position-absolute bottom-0 end-0 bg-success rounded-circle" 
                      style="width: 10px; height: 10px;"></span>
            </div>
            <div class="ml-3 flex-grow-1">
                <h6 class="mb-0">${friend.nombre_usuario}</h6>
                <small class="text-success">Online</small>
            </div>
            <div class="ml-auto">
                <button class="btn btn-primary btn-sm" onclick="startChat(${friend.id})">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Mostrar solicitudes de amistad
function displayFriendRequests(requests) {
    const friendRequests = document.getElementById('friendRequests');
    
    if (!requests || requests.length === 0) {
        friendRequests.innerHTML = '<p class="text-muted">No tienes solicitudes pendientes</p>';
        return;
    }

    friendRequests.innerHTML = requests.map(request => `
        <div class="d-flex align-items-center mb-3 p-3 border rounded" id="request-${request.id}">
            <img class="rounded-circle" src="img/undraw_profile.svg" style="width: 50px; height: 50px;">
            <div class="ml-3 flex-grow-1">
                <h6 class="mb-0">${request.nombre_usuario}</h6>
                <small class="text-muted">Enviado hace ${formatTimeAgo(request.fecha_solicitud)}</small>
            </div>
            <div class="ml-auto">
                <button class="btn btn-success btn-sm mr-2" onclick="acceptFriendRequest(${request.id})">
                    <i class="fas fa-check"></i> Aceptar
                </button>
                <button class="btn btn-danger btn-sm" onclick="rejectFriendRequest(${request.id})">
                    <i class="fas fa-times"></i> Rechazar
                </button>
            </div>
        </div>
    `).join('');
}

// Enviar solicitud de amistad
async function sendFriendRequest() {
    const username = document.getElementById('friendUsername').value.trim();
    
    if (!username) {
        alert('Por favor ingresa un nombre de usuario');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/friends/request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al enviar solicitud');
        }

        alert('Solicitud enviada exitosamente');
        $('#addFriendModal').modal('hide');
        document.getElementById('friendUsername').value = '';
        
        // Recargar solicitudes
        loadFriendRequests();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Aceptar solicitud de amistad
async function acceptFriendRequest(requestId) {
    try {
        const response = await fetch(`${API_URL}/friends/accept/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al aceptar solicitud');
        }

        alert('Solicitud aceptada');
        // Volver a cargar ambas listas para reflejar el cambio
        loadFriends();
        loadFriendRequests();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'No se pudo aceptar la solicitud.');
    }
}

// Rechazar solicitud de amistad
async function rejectFriendRequest(requestId) {
    try {
        const response = await fetch(`${API_URL}/friends/reject/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al rechazar solicitud');
        }

        alert('Solicitud rechazada');
        // Solo recargar la lista de solicitudes
        loadFriendRequests();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'No se pudo rechazar la solicitud.');
    }
}

// Eliminar amigo
async function removeFriend(friendId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este amigo?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/friends/remove/${friendId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al eliminar amigo');
        }

        alert('Amigo eliminado');
        loadFriends();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar amigo');
    }
}

// Iniciar chat con amigo
function startChat(friendId) {
    // Redirigir al chat con el amigo seleccionado
    window.location.href = `chat.html?chat=user&id=${friendId}`;
}

// Formatear tiempo transcurrido
function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds} segundos`;
    if (minutes < 60) return `${minutes} minutos`;
    if (hours < 24) return `${hours} horas`;
    return `${days} días`;
}

// Cargar datos al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que el código se ejecuta solo en la página de amigos
    if (document.getElementById('friendsList')) {
        loadFriends();
        loadFriendRequests();
    }
}); 