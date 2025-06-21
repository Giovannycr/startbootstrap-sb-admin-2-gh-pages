// Configuración
// const API_URL = 'http://localhost:3000/api';
// const SOCKET_URL = 'http://localhost:3000';

// let socket;  <-- Ya no es necesario, se usa el global de auth.js
let currentChat = null;
let currentChatType = null; // 'general' o 'user'
let conversations = [];
let groups = [];
let socketListenersInitialized = false; // Flag para evitar duplicación de listeners
let recentMessages = new Set(); // Para evitar mensajes duplicados

// Inicializar chat
function initializeChat() {
    // connectSocket(); <-- Ya no es necesario, se conecta globalmente
    loadConversations();
    
    // Listeners específicos del chat - solo inicializar una vez
    if (typeof socket !== 'undefined' && socket && !socketListenersInitialized) {
        // Remover listeners existentes para evitar duplicación
        socket.off('new_message');
        socket.off('typing');
        socket.off('stopTyping');
        
        // Agregar listeners
        socket.on('new_message', (data) => {
            handleNewMessage(data);
        });

        socket.on('typing', (data) => {
            handleTyping(data);
        });

        socket.on('stopTyping', (data) => {
            handleStopTyping(data);
        });
        
        socketListenersInitialized = true;
    }

    // Verificar si hay parámetros de URL para abrir un chat específico
    const urlParams = new URLSearchParams(window.location.search);
    const chatType = urlParams.get('chat');
    const chatId = urlParams.get('id');
    
    if (chatType && chatId) {
        // Esperar a que se carguen las conversaciones y luego abrir el chat
        setTimeout(() => {
            selectConversation(chatType, chatId);
        }, 1000);
    }
}

// Cargar conversaciones
async function loadConversations() {
    try {
        const response = await fetch(`${API_URL}/messages/conversations`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar conversaciones');
        }

        const data = await response.json();
        conversations = data.conversations;
        
        // Cargar grupos del usuario
        const groupsResponse = await fetch(`${API_URL}/groups`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (groupsResponse.ok) {
            const groupsData = await groupsResponse.json();
            const groupConversations = groupsData.groups.map(group => ({
                id: group.id,
                nombre: group.nombre,
                tipo: 'group',
                online: false,
                ultimo_mensaje: null,
                ultima_actividad: group.fecha_creacion
            }));
            
            // Combinar conversaciones privadas, chat general y grupos
            conversations = [...conversations, ...groupConversations];
        }
        
        displayConversations(conversations);
    } catch (error) {
        console.error('Error:', error);
        const conversationsList = document.getElementById('conversationsList');
        if (conversationsList) {
            conversationsList.innerHTML = '<p class="text-muted">Error al cargar conversaciones</p>';
        }
    }
}

// Mostrar conversaciones (agregar data attributes para selectConversation)
function displayConversations(conversations) {
    const conversationsList = document.getElementById('conversationsList');
    
    if (!conversationsList) {
        console.error('Elemento conversationsList no encontrado');
        return;
    }
    
    if (!conversations || conversations.length === 0) {
        conversationsList.innerHTML = '<p class="text-muted">No hay conversaciones</p>';
        return;
    }

    conversationsList.innerHTML = conversations.map(conv => `
        <div class="conversation-item" data-type="${conv.tipo}" data-id="${conv.id}" onclick="selectConversation('${conv.tipo}', '${conv.id}', event)">
            <div class="conversation-header">
                <div class="d-flex align-items-center">
                    <div class="conversation-avatar position-relative">
                        ${conv.tipo === 'general' ? '<i class="fas fa-globe"></i>' : 
                          conv.tipo === 'group' ? '<i class="fas fa-users"></i>' : 
                          conv.nombre.charAt(0).toUpperCase()}
                        ${conv.tipo === 'user' ? `<span class="${conv.online ? 'online-indicator' : 'offline-indicator'}"></span>` : ''}
                    </div>
                    <div class="ml-3">
                        <div class="conversation-name">${conv.nombre}</div>
                        <div class="conversation-preview">${conv.ultimo_mensaje || 'Sin mensajes'}</div>
                    </div>
                </div>
                <div class="conversation-time">${conv.ultima_actividad ? formatTime(conv.ultima_actividad) : ''}</div>
            </div>
        </div>
    `).join('');
}

// Seleccionar conversación
async function selectConversation(type, id, event = null) {
    currentChat = id;
    currentChatType = type;
    
    // Actualizar UI
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    // Si hay evento y target, usarlo; si no, buscar el elemento por data-id
    let conversationElement = null;
    if (event && event.target) {
        conversationElement = event.target.closest('.conversation-item');
    } else {
        conversationElement = document.querySelector(`.conversation-item[data-type='${type}'][data-id='${id}']`);
    }
    if (conversationElement) {
        conversationElement.classList.add('active');
        // Actualizar título
        const conversationName = conversationElement.querySelector('.conversation-name').textContent;
        document.getElementById('chatTitle').textContent = conversationName;
    }
    
    // Cargar mensajes
    await loadMessages(type, id);
    
    // Mostrar input de mensaje
    const messageInputDiv = document.getElementById('messageInput');
    if (messageInputDiv) messageInputDiv.style.display = 'block';
}

// Cargar mensajes
async function loadMessages(type, id) {
    try {
        let response;
        if (type === 'group') {
            response = await fetch(`${API_URL}/groups/${id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
        } else if (type === 'user') {
            response = await fetch(`${API_URL}/messages/user/${id}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
        } else if (type === 'general') {
            response = await fetch(`${API_URL}/messages/general`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
        }

        if (!response.ok) {
            throw new Error('Error al cargar mensajes');
        }

        const data = await response.json();
        displayMessages(data.messages);
    } catch (error) {
        console.error('Error:', error);
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<p class="text-muted">Error al cargar mensajes</p>';
        }
    }
}

// Mostrar mensajes
function displayMessages(messages) {
    const messagesContainer = document.getElementById('messagesContainer');
    const currentUserId = getCurrentUserId();
    
    if (!messagesContainer) {
        console.error('Elemento messagesContainer no encontrado');
        return;
    }
    
    if (!messages || messages.length === 0) {
        messagesContainer.innerHTML = '<div class="no-messages"><i class="fas fa-comments"></i><p>No hay mensajes</p></div>';
        return;
    }

    messagesContainer.innerHTML = messages.map(message => {
        if (message.tipo === 'sistema') {
            return `
                <div class="message system-message">
                    <span>${message.mensaje}</span>
                </div>
            `;
        }
        
        const isOwnMessage = message.usuario_id === currentUserId;
        return `
            <div class="message ${isOwnMessage ? 'sent' : 'received'}">
                <div class="message-content">
                    ${!isOwnMessage ? `<div class="message-sender">${message.nombre_usuario}</div>` : ''}
                    <div class="message-text">${message.mensaje}</div>
                    <div class="message-info">
                        ${formatTime(message.fecha)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Scroll al final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Enviar mensaje
async function sendMessage() {
    const messageText = document.getElementById('messageText').value.trim();
    
    if (!messageText || !currentChat) {
        return;
    }

    try {
        let response;
        
        if (currentChatType === 'group') {
            // Enviar mensaje a grupo
            response = await fetch(`${API_URL}/groups/${currentChat}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contenido: messageText
                })
            });
        } else {
            // Enviar mensaje privado o general
            response = await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tipo: currentChatType,
                    destinatario_id: currentChatType === 'user' ? currentChat : null,
                    contenido: messageText
                })
            });
        }

        if (!response.ok) {
            throw new Error('Error al enviar mensaje');
        }

        const sentMessage = await response.json();

        // Limpiar input
        document.getElementById('messageText').value = '';
        
        // No agregar mensaje inmediatamente, esperar el evento de Socket.IO
        // appendMessage(sentMessage, true);

        // No recargar conversaciones aquí, se hará automáticamente cuando llegue el evento de Socket.IO
        // loadConversations();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al enviar mensaje');
    }
}

// Añadir mensaje a la UI
function appendMessage(message, isSent) {
    const messagesContainer = document.getElementById('messagesContainer');
    const currentUserId = getCurrentUserId();
    
    if (!messagesContainer) {
        console.error('Elemento messagesContainer no encontrado');
        return;
    }
    
    // Remover mensaje de "no hay mensajes" si existe
    const noMessages = messagesContainer.querySelector('.no-messages');
    if (noMessages) {
        noMessages.remove();
    }
    
    const messageElement = document.createElement('div');
    
    if (message.tipo === 'sistema') {
        messageElement.className = 'message system-message';
        messageElement.innerHTML = `<span>${message.mensaje}</span>`;
    } else {
        const isOwnMessage = message.usuario_id === currentUserId;
        messageElement.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <div class="message-content">
                ${!isOwnMessage ? `<div class="message-sender">${message.nombre_usuario}</div>` : ''}
                <div class="message-text">${message.mensaje}</div>
                <div class="message-info">
                    ${formatTime(message.fecha)}
                </div>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Manejar nuevo mensaje recibido
function handleNewMessage(data) {
    // Crear un identificador único para el mensaje
    const messageId = `${data.id}_${data.usuario_id}_${data.fecha}`;
    
    // Verificar si ya procesamos este mensaje
    if (recentMessages.has(messageId)) {
        return; // Ya procesado, ignorar
    }
    
    // Agregar a mensajes recientes
    recentMessages.add(messageId);
    
    // Limpiar mensajes antiguos después de 5 segundos
    setTimeout(() => {
        recentMessages.delete(messageId);
    }, 5000);
    
    // Solo mostrar si estamos en la conversación correcta
    if ((currentChatType === 'general' && data.tipo === 'general') ||
        (currentChatType === 'user' && data.tipo === 'user' && 
         ((currentChat == data.usuario_id) || (currentChat == data.destinatario_id))) ||
        (currentChatType === 'group' && data.grupo_id == currentChat)) {
        appendMessage(data, false);
    }
    
    // Actualizar lista de conversaciones con un pequeño delay para evitar conflictos
    setTimeout(() => {
        loadConversations();
    }, 100);
}

// Manejar indicador de escritura
function handleTyping(data) {
    if (currentChat === data.userId) {
        showTypingIndicator(data.username);
    }
}

// Manejar fin de escritura
function handleStopTyping(data) {
    if (currentChat === data.userId) {
        hideTypingIndicator();
    }
}

// Mostrar indicador de escritura
function showTypingIndicator(username) {
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (!messagesContainer) {
        console.error('Elemento messagesContainer no encontrado');
        return;
    }
    
    let typingIndicator = messagesContainer.querySelector('.typing-indicator');
    
    if (!typingIndicator) {
        typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        messagesContainer.appendChild(typingIndicator);
    }
    
    typingIndicator.innerHTML = `<em>${username} está escribiendo...</em>`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Ocultar indicador de escritura
function hideTypingIndicator() {
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (!messagesContainer) {
        console.error('Elemento messagesContainer no encontrado');
        return;
    }
    
    const typingIndicator = messagesContainer.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Mostrar/ocultar lista de chats
function showChatList() {
    const chatList = document.getElementById('chatList');
    const chatMessages = document.getElementById('chatMessages');
    
    if (chatList.style.display === 'none') {
        chatList.style.display = 'block';
        chatMessages.className = 'col-lg-8';
    } else {
        chatList.style.display = 'none';
        chatMessages.className = 'col-lg-12';
    }
}

// Formatear tiempo
function formatTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        return `Hace ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
        return `Hace ${Math.floor(diffInHours)}h`;
    } else {
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    }
}

// Obtener ID del usuario actual
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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Proteger la ruta
    protectRoute();

    // Manejar envío de mensajes
    const messageInput = document.getElementById('messageText');
    const sendButton = document.getElementById('sendButton');

    if (messageInput && sendButton) {
        // Enviar mensaje con Enter
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });

        // Enviar mensaje con el botón
        sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            sendMessage();
        });
    }

    // Cargar datos iniciales - solo usar loadConversations que funciona
    loadConversations();
});

// Función para iniciar chat desde otras páginas
function startChat(friendId) {
    // Buscar la conversación en la lista
    const conversation = conversations.find(conv => conv.tipo === 'user' && conv.id == friendId);
    
    if (conversation) {
        // Simular click en la conversación
        const conversationElement = document.querySelector(`[onclick*="selectConversation('user', '${friendId}')"]`);
        if (conversationElement) {
            conversationElement.click();
        }
    } else {
        // Si no existe la conversación, crear una nueva
        selectConversation('user', friendId);
    }
} 