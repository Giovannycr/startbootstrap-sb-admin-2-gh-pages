const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { nombre_usuario, contraseña } = req.body;

        // Verificar si el usuario ya existe
        const [existingUsers] = await pool.query(
            'SELECT id FROM usuarios WHERE nombre_usuario = ?',
            [nombre_usuario]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Insertar nuevo usuario
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre_usuario, contraseña) VALUES (?, ?)',
            [nombre_usuario, hashedPassword]
        );

        // Generar token
        const token = jwt.sign(
            { userId: result.insertId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            userId: result.insertId
        });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Inicio de sesión
router.post('/login', async (req, res) => {
    try {
        const { nombre_usuario, contraseña } = req.body;

        // Buscar usuario
        const [users] = await pool.query(
            'SELECT * FROM usuarios WHERE nombre_usuario = ?',
            [nombre_usuario]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = users[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(contraseña, user.contraseña);
        if (!validPassword) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Registrar inicio de sesión
        await pool.query(
            'INSERT INTO sesiones (usuario_id) VALUES (?)',
            [user.id]
        );

        // Generar token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Inicio de sesión exitoso',
            token,
            userId: user.id
        });
    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Cerrar sesión
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Actualizar registro de sesión
        await pool.query(
            'UPDATE sesiones SET fin = CURRENT_TIMESTAMP WHERE usuario_id = ? AND fin IS NULL',
            [decoded.userId]
        );

        res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

module.exports = router; 