const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Obtener grupos del usuario
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const [groups] = await pool.query(
            `SELECT g.*, u.nombre_usuario as creador_nombre,
                    COUNT(DISTINCT mg.usuario_id) as total_miembros,
                    mg2.rol
             FROM grupos g
             JOIN usuarios u ON g.creador_id = u.id
             JOIN miembros_grupo mg ON g.id = mg.grupo_id
             JOIN miembros_grupo mg2 ON g.id = mg2.grupo_id AND mg2.usuario_id = ?
             WHERE g.id IN (SELECT grupo_id FROM miembros_grupo WHERE usuario_id = ?)
             GROUP BY g.id`,
            [userId, userId]
        );
        res.json({ groups });
    } catch (error) {
        console.error('Error al obtener grupos:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Obtener grupos públicos (para unirse)
router.get('/public', async (req, res) => {
    try {
        const userId = req.userId;
        const [groups] = await pool.query(
            `SELECT g.*, u.nombre_usuario as creador_nombre,
                    COUNT(DISTINCT mg.usuario_id) as total_miembros
             FROM grupos g
             JOIN usuarios u ON g.creador_id = u.id
             LEFT JOIN miembros_grupo mg ON g.id = mg.grupo_id
             WHERE g.id NOT IN (SELECT grupo_id FROM miembros_grupo WHERE usuario_id = ?)
             GROUP BY g.id`,
            [userId]
        );
        res.json({ groups });
    } catch (error) {
        console.error('Error al obtener grupos públicos:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Obtener invitaciones a grupos
router.get('/invitations', async (req, res) => {
    try {
        const userId = req.userId;
        const [invitations] = await pool.query(
            `SELECT gi.*, g.nombre, g.descripcion, u.nombre_usuario as invitado_por
             FROM grupo_invitaciones gi
             JOIN grupos g ON gi.grupo_id = g.id
             JOIN usuarios u ON gi.invitado_por = u.id
             WHERE gi.usuario_id = ? AND gi.estado = 'pendiente'`,
            [userId]
        );
        res.json({ invitations });
    } catch (error) {
        console.error('Error al obtener invitaciones:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Obtener mensajes de un grupo
router.get('/:groupId/messages', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        // Verificar si el usuario es miembro del grupo
        const [membership] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ?',
            [groupId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ message: 'No eres miembro de este grupo' });
        }

        const [messages] = await pool.query(
            `SELECT m.*, u.nombre_usuario 
             FROM mensajes m 
             JOIN usuarios u ON m.usuario_id = u.id 
             WHERE m.grupo_id = ? 
             ORDER BY m.fecha ASC`,
            [groupId]
        );

        res.json({ messages });
    } catch (error) {
        console.error('Error al obtener mensajes del grupo:', error);
        res.status(500).json({ message: 'Error al cargar los mensajes' });
    }
});

// Enviar mensaje a un grupo
router.post('/:groupId/messages', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { contenido } = req.body;
        const userId = req.userId;

        // Verificar si el usuario es miembro del grupo
        const [membership] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ?',
            [groupId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ message: 'No eres miembro de este grupo' });
        }

        const [result] = await pool.query(
            'INSERT INTO mensajes (usuario_id, grupo_id, mensaje, tipo) VALUES (?, ?, ?, "grupo")',
            [userId, groupId, contenido]
        );

        // Obtener el mensaje completo con información del usuario
        const [messageData] = await pool.query(
            `SELECT m.*, u.nombre_usuario 
             FROM mensajes m 
             JOIN usuarios u ON m.usuario_id = u.id 
             WHERE m.id = ?`,
            [result.insertId]
        );

        const message = messageData[0];

        // Emitir evento de Socket.IO a todos los miembros del grupo
        const io = req.app.get('socketio');
        const [members] = await pool.query(
            'SELECT usuario_id FROM miembros_grupo WHERE grupo_id = ?',
            [groupId]
        );

        members.forEach(member => {
            io.to(`user_${member.usuario_id}`).emit('new_group_message', {
                ...message,
                grupo_id: groupId
            });
        });

        res.status(201).json(message);
    } catch (error) {
        console.error('Error al enviar mensaje al grupo:', error);
        res.status(500).json({ message: 'Error al enviar el mensaje' });
    }
});

// Obtener detalles de un grupo específico
router.get('/:groupId', async (req, res) => {
    try {
        const userId = req.userId;
        const { groupId } = req.params;

        // Verificar si el usuario es miembro del grupo
        const [membership] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ?',
            [groupId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ message: 'No eres miembro de este grupo' });
        }

        // Obtener información del grupo
        const [groups] = await pool.query(
            `SELECT g.*, u.nombre_usuario as creador_nombre
             FROM grupos g
             JOIN usuarios u ON g.creador_id = u.id
             WHERE g.id = ?`,
            [groupId]
        );

        if (groups.length === 0) {
            return res.status(404).json({ message: 'Grupo no encontrado' });
        }

        // Obtener miembros del grupo
        const [members] = await pool.query(
            `SELECT u.id, u.nombre_usuario, mg.rol,
                    CASE 
                        WHEN s.fin IS NULL THEN true 
                        ELSE false 
                    END as online
             FROM miembros_grupo mg
             JOIN usuarios u ON mg.usuario_id = u.id
             LEFT JOIN sesiones s ON (u.id = s.usuario_id AND s.fin IS NULL)
             WHERE mg.grupo_id = ?`,
            [groupId]
        );

        res.json({
            ...groups[0],
            miembros: members
        });
    } catch (error) {
        console.error('Error al obtener detalles del grupo:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Crear nuevo grupo
router.post('/', async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const creadorId = req.userId;

        if (!nombre) {
            return res.status(400).json({ message: 'El nombre del grupo es requerido' });
        }

        const [result] = await pool.query(
            'INSERT INTO grupos (nombre, descripcion, creador_id) VALUES (?, ?, ?)',
            [nombre, descripcion, creadorId]
        );

        // Agregar al creador como miembro administrador
        await pool.query(
            'INSERT INTO miembros_grupo (grupo_id, usuario_id, rol) VALUES (?, ?, "admin")',
            [result.insertId, creadorId]
        );

        res.status(201).json({
            id: result.insertId,
            nombre,
            descripcion,
            creador_id: creadorId
        });
    } catch (error) {
        console.error('Error al crear grupo:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Unirse a un grupo público
router.post('/:groupId/join', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        // Verificar si ya es miembro
        const [existingMember] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ?',
            [groupId, userId]
        );

        if (existingMember.length > 0) {
            return res.status(400).json({ message: 'Ya eres miembro de este grupo' });
        }

        // Agregar como miembro
        await pool.query(
            'INSERT INTO miembros_grupo (grupo_id, usuario_id, rol) VALUES (?, ?, "miembro")',
            [groupId, userId]
        );

        res.json({ message: 'Te has unido al grupo exitosamente' });
    } catch (error) {
        console.error('Error al unirse al grupo:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Invitar usuario a un grupo
router.post('/:groupId/invite', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { username } = req.body;
        const adminId = req.userId;

        // Verificar si el usuario que invita es administrador
        const [admin] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ? AND rol = "admin"',
            [groupId, adminId]
        );

        if (admin.length === 0) {
            return res.status(403).json({ message: 'No tienes permisos para invitar usuarios' });
        }

        // Buscar el usuario por nombre
        const [users] = await pool.query(
            'SELECT id, nombre_usuario FROM usuarios WHERE nombre_usuario = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const invitedUserId = users[0].id;

        // Verificar si el usuario ya es miembro
        const [existingMember] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ?',
            [groupId, invitedUserId]
        );

        if (existingMember.length > 0) {
            return res.status(400).json({ message: 'El usuario ya es miembro del grupo' });
        }

        // Crear invitación
        await pool.query(
            'INSERT INTO grupo_invitaciones (grupo_id, usuario_id, invitado_por) VALUES (?, ?, ?)',
            [groupId, invitedUserId, adminId]
        );

        // Notificación por Socket.IO
        const io = req.app.get('socketio');
        io.to(`user_${invitedUserId}`).emit('new_group_invitation', {
            grupo_id: groupId,
            grupo_nombre: (await pool.query('SELECT nombre FROM grupos WHERE id = ?', [groupId]))[0][0].nombre,
            invitado_por: (await pool.query('SELECT nombre_usuario FROM usuarios WHERE id = ?', [adminId]))[0][0].nombre_usuario
        });

        res.json({ message: 'Invitación enviada exitosamente' });
    } catch (error) {
        console.error('Error al invitar usuario:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Aceptar invitación a grupo
router.post('/invitations/:invitationId/accept', async (req, res) => {
    try {
        const { invitationId } = req.params;
        const userId = req.userId;

        // Verificar que la invitación existe y es para este usuario
        const [invitation] = await pool.query(
            'SELECT * FROM grupo_invitaciones WHERE id = ? AND usuario_id = ? AND estado = "pendiente"',
            [invitationId, userId]
        );

        if (invitation.length === 0) {
            return res.status(404).json({ message: 'Invitación no encontrada' });
        }

        const groupId = invitation[0].grupo_id;

        // Agregar como miembro
        await pool.query(
            'INSERT INTO miembros_grupo (grupo_id, usuario_id, rol) VALUES (?, ?, "miembro")',
            [groupId, userId]
        );

        // Marcar invitación como aceptada
        await pool.query(
            'UPDATE grupo_invitaciones SET estado = "aceptada", fecha_respuesta = CURRENT_TIMESTAMP WHERE id = ?',
            [invitationId]
        );

        res.json({ message: 'Invitación aceptada exitosamente' });
    } catch (error) {
        console.error('Error al aceptar invitación:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Rechazar invitación a grupo
router.post('/invitations/:invitationId/reject', async (req, res) => {
    try {
        const { invitationId } = req.params;
        const userId = req.userId;

        // Marcar invitación como rechazada
        await pool.query(
            'UPDATE grupo_invitaciones SET estado = "rechazada", fecha_respuesta = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?',
            [invitationId, userId]
        );

        res.json({ message: 'Invitación rechazada' });
    } catch (error) {
        console.error('Error al rechazar invitación:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Salir de un grupo
router.delete('/:groupId/leave', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        // Verificar si es el creador del grupo
        const [group] = await pool.query(
            'SELECT creador_id FROM grupos WHERE id = ?',
            [groupId]
        );

        if (group.length > 0 && group[0].creador_id === userId) {
            return res.status(400).json({ message: 'No puedes salir del grupo que creaste. Transfiere la administración primero.' });
        }

        // Eliminar de miembros
        await pool.query(
            'DELETE FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ?',
            [groupId, userId]
        );

        res.json({ message: 'Has salido del grupo exitosamente' });
    } catch (error) {
        console.error('Error al salir del grupo:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Obtener miembros de un grupo
router.get('/:groupId/members', async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        // Verificar si el usuario es miembro del grupo
        const [membership] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ?',
            [groupId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ message: 'No eres miembro de este grupo' });
        }

        // Obtener miembros
        const [members] = await pool.query(
            `SELECT u.id, u.nombre_usuario, mg.rol,
                    CASE 
                        WHEN s.fin IS NULL THEN true 
                        ELSE false 
                    END as online
             FROM miembros_grupo mg
             JOIN usuarios u ON mg.usuario_id = u.id
             LEFT JOIN sesiones s ON (u.id = s.usuario_id AND s.fin IS NULL)
             WHERE mg.grupo_id = ?
             ORDER BY mg.rol DESC, u.nombre_usuario ASC`,
            [groupId]
        );

        res.json({ members });
    } catch (error) {
        console.error('Error al obtener miembros del grupo:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Eliminar miembro del grupo (solo administradores)
router.delete('/:groupId/members/:memberId', async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const adminId = req.userId;

        // Verificar si el usuario que elimina es administrador
        const [admin] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ? AND rol = "admin"',
            [groupId, adminId]
        );

        if (admin.length === 0) {
            return res.status(403).json({ message: 'No tienes permisos para eliminar miembros' });
        }

        // Verificar que no se elimine a sí mismo
        if (parseInt(memberId) === adminId) {
            return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
        }

        // Eliminar miembro
        await pool.query(
            'DELETE FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ?',
            [groupId, memberId]
        );

        res.json({ message: 'Miembro eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar miembro:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Actualizar información del grupo
router.put('/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { nombre, descripcion } = req.body;
        const userId = req.userId;

        // Verificar si el usuario es administrador
        const [admin] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ? AND rol = "admin"',
            [groupId, userId]
        );

        if (admin.length === 0) {
            return res.status(403).json({ message: 'No tienes permisos para editar el grupo' });
        }

        await pool.query(
            'UPDATE grupos SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre, descripcion, groupId]
        );

        res.json({ message: 'Grupo actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar grupo:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

module.exports = router; 