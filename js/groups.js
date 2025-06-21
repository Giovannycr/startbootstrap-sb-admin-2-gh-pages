// Configuración de la API
// const API_URL = 'http://localhost:3000/api';

// Cargar grupos del usuario
async function loadGroups() {
    try {
        const response = await fetch(`${API_URL}/groups`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar grupos');
        }

        const data = await response.json();
        displayGroups(data.groups);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('myGroups').innerHTML = '<p class="text-muted">Error al cargar grupos</p>';
    }
}

// Cargar invitaciones a grupos
async function loadGroupInvitations() {
    try {
        const response = await fetch(`${API_URL}/groups/invitations`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar invitaciones');
        }

        const data = await response.json();
        displayGroupInvitations(data.invitations);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('groupInvitations').innerHTML = '<p class="text-muted">Error al cargar invitaciones</p>';
    }
}

// Cargar grupos públicos
async function loadPublicGroups() {
    try {
        const response = await fetch(`${API_URL}/groups/public`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar grupos públicos');
        }

        const data = await response.json();
        displayPublicGroups(data.groups);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('publicGroups').innerHTML = '<p class="text-muted">Error al cargar grupos públicos</p>';
    }
}

// Mostrar grupos del usuario
function displayGroups(groups) {
    const myGroups = document.getElementById('myGroups');
    
    if (!groups || groups.length === 0) {
        myGroups.innerHTML = '<p class="text-muted">No perteneces a ningún grupo</p>';
        return;
    }

    myGroups.innerHTML = groups.map(group => `
        <div class="d-flex align-items-center mb-4 p-3 border rounded">
            <div class="flex-shrink-0">
                <i class="fas fa-users fa-2x text-gray-300"></i>
            </div>
            <div class="flex-grow-1 ml-3">
                <h5 class="mb-1">${group.nombre}</h5>
                <p class="mb-1 text-gray-600">${group.total_miembros} miembros · Creado por ${group.creador_nombre}</p>
                <small class="text-muted">${group.descripcion || 'Sin descripción'}</small>
                <div class="mt-2">
                    <span class="badge badge-${group.rol === 'admin' ? 'primary' : 'secondary'}">${group.rol === 'admin' ? 'Administrador' : 'Miembro'}</span>
                </div>
            </div>
            <div class="ml-auto">
                <button class="btn btn-primary btn-sm mr-2" onclick="joinGroupChat(${group.id})">
                    <i class="fas fa-comment"></i> Chat
                </button>
                ${group.rol === 'admin' ? `
                    <button class="btn btn-info btn-sm mr-2" onclick="manageGroup(${group.id})">
                        <i class="fas fa-cog"></i> Gestionar
                    </button>
                ` : `
                    <button class="btn btn-warning btn-sm" onclick="leaveGroup(${group.id})">
                        <i class="fas fa-sign-out-alt"></i> Salir
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

// Mostrar invitaciones a grupos
function displayGroupInvitations(invitations) {
    const groupInvitations = document.getElementById('groupInvitations');
    
    if (!invitations || invitations.length === 0) {
        groupInvitations.innerHTML = '<p class="text-muted">No tienes invitaciones pendientes</p>';
        return;
    }

    groupInvitations.innerHTML = invitations.map(invitation => `
        <div class="d-flex align-items-center mb-3 p-3 border rounded">
            <div class="flex-shrink-0">
                <i class="fas fa-users fa-lg text-gray-300"></i>
            </div>
            <div class="flex-grow-1 ml-3">
                <h6 class="mb-0">${invitation.nombre}</h6>
                <small class="text-muted">Invitado por ${invitation.invitado_por}</small>
                <br>
                <small class="text-muted">${invitation.descripcion || 'Sin descripción'}</small>
            </div>
            <div class="ml-auto">
                <button class="btn btn-success btn-sm mr-2" onclick="acceptGroupInvitation(${invitation.id})">
                    <i class="fas fa-check"></i> Aceptar
                </button>
                <button class="btn btn-danger btn-sm" onclick="rejectGroupInvitation(${invitation.id})">
                    <i class="fas fa-times"></i> Rechazar
                </button>
            </div>
        </div>
    `).join('');
}

// Mostrar grupos públicos
function displayPublicGroups(groups) {
    const publicGroups = document.getElementById('publicGroups');
    
    if (!groups || groups.length === 0) {
        publicGroups.innerHTML = '<p class="text-muted">No hay grupos públicos disponibles</p>';
        return;
    }

    publicGroups.innerHTML = groups.map(group => `
        <div class="d-flex align-items-center mb-3 p-3 border rounded">
            <div class="flex-shrink-0">
                <i class="fas fa-users fa-lg text-gray-300"></i>
            </div>
            <div class="flex-grow-1 ml-3">
                <h6 class="mb-0">${group.nombre}</h6>
                <p class="mb-1 text-gray-600">${group.total_miembros} miembros · Creado por ${group.creador_nombre}</p>
                <small class="text-muted">${group.descripcion || 'Sin descripción'}</small>
            </div>
            <div class="ml-auto">
                <button class="btn btn-primary btn-sm" onclick="joinPublicGroup(${group.id})">
                    <i class="fas fa-user-plus"></i> Unirse
                </button>
            </div>
        </div>
    `).join('');
}

// Crear nuevo grupo
async function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    
    if (!name) {
        alert('Por favor ingresa un nombre para el grupo');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/groups`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre: name, descripcion: description })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al crear grupo');
        }

        alert('Grupo creado exitosamente');
        $('#createGroupModal').modal('hide');
        document.getElementById('groupName').value = '';
        document.getElementById('groupDescription').value = '';
        
        // Recargar grupos
        loadGroups();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Aceptar invitación a grupo
async function acceptGroupInvitation(invitationId) {
    try {
        const response = await fetch(`${API_URL}/groups/invitations/${invitationId}/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al aceptar invitación');
        }

        alert('Invitación aceptada exitosamente');
        loadGroupInvitations();
        loadGroups();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Rechazar invitación a grupo
async function rejectGroupInvitation(invitationId) {
    try {
        const response = await fetch(`${API_URL}/groups/invitations/${invitationId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al rechazar invitación');
        }

        alert('Invitación rechazada');
        loadGroupInvitations();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Unirse a grupo público
async function joinPublicGroup(groupId) {
    if (!confirm('¿Estás seguro de que quieres unirte a este grupo?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/groups/${groupId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al unirse al grupo');
        }

        alert('Te has unido al grupo exitosamente');
        loadGroups();
        loadPublicGroups();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Salir de un grupo
async function leaveGroup(groupId) {
    if (!confirm('¿Estás seguro de que quieres salir de este grupo?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/groups/${groupId}/leave`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al salir del grupo');
        }

        alert('Has salido del grupo exitosamente');
        loadGroups();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Ir al chat del grupo
function joinGroupChat(groupId) {
    window.location.href = `chat.html?chat=group&id=${groupId}`;
}

// Gestionar grupo (para administradores)
async function manageGroup(groupId) {
    try {
        // Cargar detalles del grupo
        const response = await fetch(`${API_URL}/groups/${groupId}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar detalles del grupo');
        }

        const groupData = await response.json();
        
        // Llenar el modal con los datos actuales
        document.getElementById('editGroupName').value = groupData.nombre;
        document.getElementById('editGroupDescription').value = groupData.descripcion || '';
        document.getElementById('editGroupId').value = groupId;
        
        // Cargar miembros del grupo
        await loadGroupMembers(groupId);
        
        // Mostrar modal
        $('#manageGroupModal').modal('show');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar detalles del grupo');
    }
}

// Cargar miembros del grupo
async function loadGroupMembers(groupId) {
    try {
        const response = await fetch(`${API_URL}/groups/${groupId}/members`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar miembros');
        }

        const data = await response.json();
        displayGroupMembers(data.members, groupId);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('groupMembersList').innerHTML = '<p class="text-muted">Error al cargar miembros</p>';
    }
}

// Mostrar miembros del grupo
function displayGroupMembers(members, groupId) {
    const membersList = document.getElementById('groupMembersList');
    const currentUserId = getCurrentUserId();
    
    if (!members || members.length === 0) {
        membersList.innerHTML = '<p class="text-muted">No hay miembros en el grupo</p>';
        return;
    }

    membersList.innerHTML = members.map(member => `
        <div class="d-flex align-items-center justify-content-between mb-2 p-2 border rounded">
            <div class="d-flex align-items-center">
                <div class="mr-3">
                    <i class="fas fa-user-circle fa-lg text-gray-300"></i>
                </div>
                <div>
                    <div class="font-weight-bold">${member.nombre_usuario}</div>
                    <small class="text-muted">
                        ${member.rol === 'admin' ? 'Administrador' : 'Miembro'}
                        ${member.online ? ' · <span class="text-success">En línea</span>' : ''}
                    </small>
                </div>
            </div>
            ${member.id != currentUserId && member.rol !== 'admin' ? `
                <button class="btn btn-danger btn-sm" onclick="removeGroupMember(${groupId}, ${member.id})">
                    <i class="fas fa-user-minus"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

// Actualizar información del grupo
async function updateGroup() {
    const groupId = document.getElementById('editGroupId').value;
    const name = document.getElementById('editGroupName').value.trim();
    const description = document.getElementById('editGroupDescription').value.trim();
    
    if (!name) {
        alert('Por favor ingresa un nombre para el grupo');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre: name, descripcion: description })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al actualizar grupo');
        }

        alert('Grupo actualizado exitosamente');
        $('#manageGroupModal').modal('hide');
        
        // Recargar grupos
        loadGroups();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Eliminar miembro del grupo
async function removeGroupMember(groupId, memberId) {
    if (!confirm('¿Estás seguro de que quieres eliminar a este miembro del grupo?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/groups/${groupId}/members/${memberId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al eliminar miembro');
        }

        alert('Miembro eliminado exitosamente');
        loadGroupMembers(groupId);
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Invitar amigo al grupo
async function inviteFriendToGroup() {
    const groupId = document.getElementById('editGroupId').value;
    const friendUsername = document.getElementById('inviteFriendUsername').value.trim();
    
    if (!friendUsername) {
        alert('Por favor ingresa el nombre de usuario del amigo');
        return;
    }

    try {
        const success = await inviteUserToGroup(groupId, friendUsername);
        if (success) {
            document.getElementById('inviteFriendUsername').value = '';
            // Recargar miembros para mostrar el nuevo miembro si se unió automáticamente
            loadGroupMembers(groupId);
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Invitar usuario a grupo (función para usar en modales)
async function inviteUserToGroup(groupId, username) {
    try {
        const response = await fetch(`${API_URL}/groups/${groupId}/invite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al invitar usuario');
        }

        alert('Usuario invitado exitosamente');
        return true;
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
        return false;
    }
}

// Escuchar notificaciones de Socket.IO
if (socket) {
    socket.on('new_group_invitation', (data) => {
        // Mostrar notificación de nueva invitación
        const notification = `
            <div class="alert alert-info alert-dismissible fade show" role="alert">
                <strong>Nueva invitación a grupo:</strong> ${data.grupo_nombre}
                <br>
                <small>Invitado por: ${data.invitado_por}</small>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        
        // Agregar notificación al inicio de la página
        const container = document.querySelector('.container-fluid');
        if (container) {
            container.insertAdjacentHTML('afterbegin', notification);
        }
        
        // Recargar invitaciones
        loadGroupInvitations();
    });
}

// Cargar datos al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que el código se ejecuta solo en la página de grupos
    if (document.getElementById('myGroups')) {
        loadGroups();
        loadGroupInvitations();
        loadPublicGroups();
    }
}); 