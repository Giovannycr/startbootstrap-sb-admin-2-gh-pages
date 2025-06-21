const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'profiles');
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const userId = req.userId;
        const ext = path.extname(file.originalname);
        cb(null, `profile_${userId}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: function (req, file, cb) {
        // Verificar que sea una imagen
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// Obtener perfil del usuario autenticado
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const [users] = await pool.query(
            'SELECT id, nombre_usuario, email, departamento, profile_photo_url FROM usuarios WHERE id = ?', 
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        res.json({ profile: users[0] });
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Actualizar perfil (email y departamento)
router.put('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { email, departamento } = req.body;
        
        // Validar email si se proporciona
        if (email && !isValidEmail(email)) {
            return res.status(400).json({ message: 'Formato de email inválido' });
        }
        
        await pool.query(
            'UPDATE usuarios SET email = ?, departamento = ? WHERE id = ?', 
            [email, departamento, userId]
        );
        
        res.json({ message: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Cambiar contraseña
router.put('/password', async (req, res) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Contraseña actual y nueva contraseña son requeridas' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }
        
        // Obtener contraseña actual del usuario
        const [users] = await pool.query(
            'SELECT contraseña FROM usuarios WHERE id = ?', 
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, users[0].contraseña);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
        }
        
        // Encriptar nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Actualizar contraseña
        await pool.query(
            'UPDATE usuarios SET contraseña = ? WHERE id = ?', 
            [hashedPassword, userId]
        );
        
        res.json({ message: 'Contraseña cambiada exitosamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Subir foto de perfil
router.post('/photo', upload.single('profilePhoto'), async (req, res) => {
    try {
        const userId = req.userId;
        
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha subido ningún archivo' });
        }
        
        // Generar URL de la foto
        const photoUrl = `/uploads/profiles/${req.file.filename}`;
        
        // Actualizar URL de la foto en la base de datos
        await pool.query(
            'UPDATE usuarios SET profile_photo_url = ? WHERE id = ?', 
            [photoUrl, userId]
        );
        
        res.json({ 
            message: 'Foto de perfil actualizada exitosamente',
            photoUrl: photoUrl
        });
    } catch (error) {
        console.error('Error al subir foto de perfil:', error);
        res.status(500).json({ message: 'Error al subir la foto' });
    }
});

// Obtener estadísticas del usuario
router.get('/statistics', async (req, res) => {
    try {
        const userId = req.userId;
        
        // Total de amigos
        const [friends] = await pool.query(
            'SELECT COUNT(*) as total FROM amigos WHERE usuario_id = ? AND estado = "aceptado"', 
            [userId]
        );
        
        // Total de grupos
        const [groups] = await pool.query(
            'SELECT COUNT(*) as total FROM miembros_grupo WHERE usuario_id = ?', 
            [userId]
        );
        
        // Total de mensajes enviados
        const [messages] = await pool.query(
            'SELECT COUNT(*) as total FROM mensajes WHERE usuario_id = ?', 
            [userId]
        );
        
        // Estado online
        const [sessions] = await pool.query(
            'SELECT * FROM sesiones WHERE usuario_id = ? AND fin IS NULL', 
            [userId]
        );
        
        const onlineStatus = sessions.length > 0 ? 'Online' : 'Offline';
        
        res.json({
            statistics: {
                totalFriends: friends[0].total,
                totalGroups: groups[0].total,
                totalMessages: messages[0].total,
                onlineStatus
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Función auxiliar para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

module.exports = router; 