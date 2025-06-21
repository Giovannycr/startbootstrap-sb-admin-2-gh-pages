require('dotenv').config();
const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
    try {
        console.log('Inicializando y reseteando la base de datos...');

        // 1. BORRAR TABLAS EXISTENTES EN ORDEN CORRECTO
        console.log('Borrando tablas antiguas si existen...');
        await pool.query('DROP TABLE IF EXISTS sesiones, amigos, mensajes, miembros_grupo, grupos, usuarios;');
        console.log('Tablas borradas.');

        // 2. CREAR TABLAS CON EL ESQUEMA CORRECTO
        console.log('Creando nuevas tablas...');
        
        await pool.query(`
            CREATE TABLE usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
                contraseña VARCHAR(255) NOT NULL,
                email VARCHAR(100) UNIQUE,
                departamento VARCHAR(100) DEFAULT NULL,
                profile_photo_url VARCHAR(255) DEFAULT 'img/undraw_profile.svg',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE grupos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                descripcion TEXT,
                creador_id INT NOT NULL,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (creador_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);

        await pool.query(`
            CREATE TABLE miembros_grupo (
                id INT AUTO_INCREMENT PRIMARY KEY,
                grupo_id INT NOT NULL,
                usuario_id INT NOT NULL,
                rol ENUM('admin', 'miembro') DEFAULT 'miembro',
                FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                UNIQUE KEY unique_member (grupo_id, usuario_id)
            );
        `);

        await pool.query(`
            CREATE TABLE mensajes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT,
                destinatario_id INT NULL,
                grupo_id INT NULL,
                mensaje TEXT NOT NULL,
                tipo ENUM('usuario', 'sistema') NOT NULL DEFAULT 'usuario',
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
                FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
            );
        `);

        await pool.query(`
            CREATE TABLE amigos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                amigo_id INT NOT NULL,
                estado ENUM('pendiente', 'aceptado', 'rechazado') DEFAULT 'pendiente',
                fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (amigo_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                UNIQUE KEY unique_friendship (usuario_id, amigo_id)
            );
        `);

        await pool.query(`
            CREATE TABLE sesiones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fin TIMESTAMP NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);
        console.log('Tablas creadas exitosamente.');

        // 3. INSERTAR DATOS DE PRUEBA
        console.log('Insertando datos de prueba...');
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        const users = [
            { nombre: 'giovanny', email: 'giovanny@empresa.com', dep: 'Desarrollo' },
            { nombre: 'mateo', email: 'mateo@empresa.com', dep: 'Diseño' },
            { nombre: 'admin', email: 'admin@empresa.com', dep: 'Gerencia' }
        ];

        for (const user of users) {
            await pool.query(
                'INSERT INTO usuarios (nombre_usuario, contraseña, email, departamento) VALUES (?, ?, ?, ?)',
                [user.nombre, hashedPassword, user.email, user.dep]
            );
        }
        console.log('Usuarios de prueba creados.');
        console.log('\nBase de datos inicializada correctamente.');
        console.log('Ahora puedes iniciar tu servidor con: node backend/server.js');

    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
    } finally {
        // Cierra el pool de conexiones para que el script termine
        await pool.end();
        process.exit(0);
    }
}

initializeDatabase(); 