const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Obtener todas las conversaciones del usuario (chat general + chats privados)
router.get('/conversations', async (req, res) => {
    try {
        const userId = req.userId;
        
        // Obtener chats privados (conversaciones con amigos)
        const [privateChats] = await pool.query(
            `SELECT DISTINCT 
                u.id,
                u.nombre_usuario as nombre,
                'user' as tipo,
                (SELECT COUNT(*) FROM sesiones WHERE usuario_id = u.id AND fin IS NULL) > 0 as online,
                (SELECT m.mensaje 
                 FROM mensajes m 
                 WHERE ((m.usuario_id = ? AND m.destinatario_id = u.id) 
                    OR (m.usuario_id = u.id AND m.destinatario_id = ?))
                    AND m.grupo_id IS NULL
                 ORDER BY m.fecha DESC 
                 LIMIT 1) as ultimo_mensaje,
                (SELECT m.fecha 
                 FROM mensajes m 
                 WHERE ((m.usuario_id = ? AND m.destinatario_id = u.id) 
                    OR (m.usuario_id = u.id AND m.destinatario_id = ?))
                    AND m.grupo_id IS NULL
                 ORDER BY m.fecha DESC 
                 LIMIT 1) as ultima_actividad
             FROM usuarios u
             INNER JOIN amigos a ON (a.usuario_id = ? AND a.amigo_id = u.id) 
                OR (a.usuario_id = u.id AND a.amigo_id = ?)
             WHERE a.estado = 'aceptado' AND u.id != ?
             ORDER BY ultima_actividad DESC`,
            [userId, userId, userId, userId, userId, userId, userId]
        );

        // Obtener información del chat general
        const [generalChat] = await pool.query(
            `SELECT 
                'general' as id,
                'Chat General' as nombre,
                'general' as tipo,
                false as online,
                (SELECT m.mensaje 
                 FROM mensajes m 
                 WHERE m.destinatario_id IS NULL AND m.grupo_id IS NULL
                 ORDER BY m.fecha DESC 
                 LIMIT 1) as ultimo_mensaje,
                (SELECT m.fecha 
                 FROM mensajes m 
                 WHERE m.destinatario_id IS NULL AND m.grupo_id IS NULL
                 ORDER BY m.fecha DESC 
                 LIMIT 1) as ultima_actividad`
        );

        // Combinar chat general con chats privados
        const conversations = generalChat.length > 0 ? [generalChat[0], ...privateChats] : privateChats;

        res.json({ conversations });
    } catch (error) {
        console.error('Error al obtener conversaciones:', error);
        res.status(500).json({ message: 'Error al cargar las conversaciones' });
    }
});

// Obtener mensajes del chat general
router.get('/general', async (req, res) => {
    try {
        const [messages] = await pool.query(
            `SELECT m.*, u.nombre_usuario 
             FROM mensajes m 
             JOIN usuarios u ON m.usuario_id = u.id 
             WHERE m.destinatario_id IS NULL AND m.grupo_id IS NULL 
             ORDER BY m.fecha ASC`,
            []
        );

        res.json({ messages });
    } catch (error) {
        console.error('Error al obtener mensajes del chat general:', error);
        res.status(500).json({ message: 'Error al cargar los mensajes' });
    }
});

// Obtener mensajes de una conversación específica
router.get('/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const userId = req.userId;

        let messages;
        
        if (type === 'general') {
            // Mensajes del chat general
            [messages] = await pool.query(
                `SELECT m.*, u.nombre_usuario 
                 FROM mensajes m 
                 JOIN usuarios u ON m.usuario_id = u.id 
                 WHERE m.destinatario_id IS NULL AND m.grupo_id IS NULL 
                 ORDER BY m.fecha ASC`,
                []
            );
        } else if (type === 'user') {
            // Verificar que son amigos
            const [friendship] = await pool.query(
                `SELECT * FROM amigos 
                 WHERE ((usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?))
                 AND estado = 'aceptado'`,
                [userId, id, id, userId]
            );

            if (friendship.length === 0) {
                return res.status(403).json({ message: 'No tienes permiso para ver esta conversación' });
            }

            // Mensajes privados con el usuario
            [messages] = await pool.query(
                `SELECT m.*, u.nombre_usuario 
                 FROM mensajes m 
                 JOIN usuarios u ON m.usuario_id = u.id 
                 WHERE ((m.usuario_id = ? AND m.destinatario_id = ?) 
                    OR (m.usuario_id = ? AND m.destinatario_id = ?))
                    AND m.grupo_id IS NULL
                 ORDER BY m.fecha ASC`,
                [userId, id, id, userId]
            );
        } else {
            return res.status(400).json({ message: 'Tipo de conversación no válido' });
        }

        res.json({ messages });
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ message: 'Error al cargar los mensajes' });
    }
});

// Enviar mensaje
router.post('/', async (req, res) => {
    try {
        const { tipo, destinatario_id, contenido } = req.body;
        const senderId = req.userId;

        let result;
        
        if (tipo === 'general') {
            // Mensaje al chat general
            [result] = await pool.query(
                'INSERT INTO mensajes (usuario_id, mensaje, tipo) VALUES (?, ?, "general")',
                [senderId, contenido]
            );
        } else if (tipo === 'user') {
            // Verificar que son amigos
            const [friendship] = await pool.query(
                `SELECT * FROM amigos 
                 WHERE ((usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?))
                 AND estado = 'aceptado'`,
                [senderId, destinatario_id, destinatario_id, senderId]
            );

            if (friendship.length === 0) {
                return res.status(403).json({ message: 'No puedes enviar mensajes a este usuario' });
            }

            // Mensaje privado
            [result] = await pool.query(
                'INSERT INTO mensajes (usuario_id, destinatario_id, mensaje, tipo) VALUES (?, ?, ?, "privado")',
                [senderId, destinatario_id, contenido]
            );
        } else {
            return res.status(400).json({ message: 'Tipo de mensaje no válido' });
        }

        // Obtener el mensaje completo con información del usuario
        const [messageData] = await pool.query(
            `SELECT m.*, u.nombre_usuario 
             FROM mensajes m 
             JOIN usuarios u ON m.usuario_id = u.id 
             WHERE m.id = ?`,
            [result.insertId]
        );

        const message = messageData[0];

        // Emitir evento de Socket.IO
        const io = req.app.get('socketio');
        
        if (tipo === 'general') {
            // Emitir a todos los usuarios conectados
            io.emit('new_message', {
                ...message,
                tipo: 'general',
                destinatario_id: null
            });
        } else if (tipo === 'user') {
            // Emitir solo al destinatario
            io.to(`user_${destinatario_id}`).emit('new_message', {
                ...message,
                tipo: 'user',
                destinatario_id: destinatario_id
            });
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ message: 'Error al enviar el mensaje' });
    }
});

// Obtener lista de chats del usuario (para compatibilidad)
router.get('/chats', async (req, res) => {
    try {
        const userId = req.userId;

        const [chats] = await pool.query(
            `SELECT DISTINCT 
                u.id,
                u.nombre_usuario,
                (SELECT m.mensaje 
                 FROM mensajes m 
                 WHERE (m.usuario_id = ? AND m.destinatario_id = u.id) 
                    OR (m.usuario_id = u.id AND m.destinatario_id = ?)
                 ORDER BY m.fecha DESC 
                 LIMIT 1) as lastMessage
             FROM usuarios u
             WHERE u.id IN (
                 SELECT DISTINCT 
                     CASE 
                         WHEN usuario_id = ? THEN destinatario_id
                         WHEN destinatario_id = ? THEN usuario_id
                     END
                 FROM mensajes 
                 WHERE (usuario_id = ? OR destinatario_id = ?) 
                    AND destinatario_id IS NOT NULL 
                    AND grupo_id IS NULL
             )
             AND u.id != ?`,
            [userId, userId, userId, userId, userId, userId, userId]
        );

        res.json({ chats });
    } catch (error) {
        console.error('Error al obtener chats:', error);
        res.status(500).json({ message: 'Error al cargar los chats' });
    }
});

module.exports = router; 