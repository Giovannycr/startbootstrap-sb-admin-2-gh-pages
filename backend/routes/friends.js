const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Obtener lista de amigos
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        // Consulta corregida para obtener todos los amigos, sin importar quién envió la solicitud
        const [friends] = await pool.query(
            `SELECT u.id, u.nombre_usuario,
                    (SELECT COUNT(*) FROM sesiones WHERE usuario_id = u.id AND fin IS NULL) > 0 as online
             FROM usuarios u
             INNER JOIN amigos a ON u.id = a.amigo_id
             WHERE a.usuario_id = ? AND a.estado = 'aceptado'`,
            [userId]
        );

        // Separar amigos online de la lista general
        const onlineFriends = friends.filter(f => f.online);

        res.json({ friends, onlineFriends });
    } catch (error) {
        console.error('Error al obtener lista de amigos:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Obtener solicitudes de amistad pendientes
router.get('/requests', async (req, res) => {
    try {
        const userId = req.userId;
        const [requests] = await pool.query(
            `SELECT a.id, u.nombre_usuario, a.fecha_solicitud
             FROM amigos a
             JOIN usuarios u ON (a.usuario_id = u.id)
             WHERE a.amigo_id = ? AND a.estado = 'pendiente'`,
            [userId]
        );
        res.json({ requests });
    } catch (error) {
        console.error('Error al obtener solicitudes de amistad:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Enviar solicitud de amistad por nombre de usuario (para frontend)
router.post('/request', async (req, res) => {
    try {
        const senderId = req.userId;
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ message: 'Nombre de usuario requerido' });
        }
        // Buscar el ID del usuario por nombre de usuario
        const [users] = await pool.query('SELECT id, nombre_usuario FROM usuarios WHERE nombre_usuario = ?', [username]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        const recipientId = users[0].id;
        const recipientUsername = users[0].nombre_usuario;

        if (recipientId === senderId) {
            return res.status(400).json({ message: 'No puedes enviarte una solicitud a ti mismo' });
        }
        // Verificar que no sean ya amigos o haya solicitud pendiente
        const [existingFriendship] = await pool.query(
            'SELECT * FROM amigos WHERE (usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?)',
            [senderId, recipientId, recipientId, senderId]
        );
        if (existingFriendship.length > 0) {
            return res.status(400).json({ message: 'Ya existe una relación de amistad o solicitud pendiente' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO amigos (usuario_id, amigo_id, estado) VALUES (?, ?, "pendiente")',
            [senderId, recipientId]
        );

        // Notificación por Socket.IO
        const io = req.app.get('socketio');
        const senderUser = await pool.query('SELECT nombre_usuario FROM usuarios WHERE id = ?', [senderId]);
        
        io.to(`user_${recipientId}`).emit('new_friend_request', {
            id: result.insertId,
            nombre_usuario: senderUser[0][0].nombre_usuario,
            fecha_solicitud: new Date().toISOString()
        });

        res.status(201).json({ message: 'Solicitud de amistad enviada' });
    } catch (error) {
        console.error('Error al enviar solicitud de amistad:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Aceptar solicitud de amistad
router.post('/accept/:requestId', async (req, res) => {
    try {
        const receiverId = req.userId;
        const { requestId } = req.params;

        const [requestResult] = await pool.query(
            'SELECT * FROM amigos WHERE id = ? AND amigo_id = ? AND estado = "pendiente"',
            [requestId, receiverId]
        );

        if (requestResult.length === 0) {
            return res.status(404).json({ message: 'Solicitud de amistad no encontrada o no dirigida a ti' });
        }
        const request = requestResult[0];
        const senderId = request.usuario_id;

        // Actualizar estado de la solicitud
        await pool.query(
            'UPDATE amigos SET estado = "aceptado", fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
            [requestId]
        );

        // Crear relación recíproca
        await pool.query(
            'INSERT INTO amigos (usuario_id, amigo_id, estado) VALUES (?, ?, "aceptado")',
            [receiverId, senderId]
        );
        
        // Notificación por Socket.IO al emisor
        const io = req.app.get('socketio');
        const receiverUser = await pool.query('SELECT nombre_usuario FROM usuarios WHERE id = ?', [receiverId]);
        
        io.to(`user_${senderId}`).emit('friend_request_accepted', {
            nombre_usuario: receiverUser[0][0].nombre_usuario
        });

        // Crear mensaje de bienvenida en el chat
        const welcomeMessage = `¡Ahora son amigos! Ya pueden empezar a chatear.`;
        await pool.query(
            'INSERT INTO mensajes (usuario_id, destinatario_id, mensaje, tipo) VALUES (?, ?, ?, "sistema")',
            [senderId, receiverId, welcomeMessage]
        );
        
        // Notificar a ambos usuarios que un nuevo chat está disponible
        io.to(`user_${senderId}`).to(`user_${receiverId}`).emit('new_chat_available');

        res.json({ message: 'Solicitud de amistad aceptada' });
    } catch (error) {
        console.error('Error al aceptar solicitud de amistad:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Rechazar solicitud de amistad
router.post('/reject/:requestId', async (req, res) => {
    try {
        const receiverId = req.userId;
        const { requestId } = req.params;

        await pool.query(
            'UPDATE amigos SET estado = "rechazado", fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ? AND amigo_id = ?',
            [requestId, receiverId]
        );

        res.json({ message: 'Solicitud de amistad rechazada' });
    } catch (error) {
        console.error('Error al rechazar solicitud de amistad:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Eliminar amigo
router.delete('/:userId', async (req, res) => {
    try {
        const userId = req.userId;
        const { userId: friendId } = req.params;

        await pool.query(
            'DELETE FROM amigos WHERE (usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?)',
            [userId, friendId, friendId, userId]
        );

        res.json({ message: 'Amistad eliminada' });
    } catch (error) {
        console.error('Error al eliminar amistad:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

module.exports = router; 