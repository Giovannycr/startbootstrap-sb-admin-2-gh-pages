require('dotenv').config();
const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function createTestUser() {
    try {
        console.log('Creando usuario de prueba...');

        // Verificar si el usuario ya existe
        const [existingUser] = await pool.query(
            'SELECT id FROM usuarios WHERE nombre_usuario = ?',
            ['test']
        );

        if (existingUser.length > 0) {
            console.log('El usuario "test" ya existe');
            return;
        }

        // Crear contraseña hasheada
        const password = '123456';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre_usuario, contraseña, email) VALUES (?, ?, ?)',
            ['test', hashedPassword, 'test@empresa.com']
        );

        console.log('Usuario de prueba creado exitosamente');
        console.log('Credenciales:');
        console.log('- Usuario: test');
        console.log('- Contraseña: 123456');
        console.log('- ID: ' + result.insertId);

    } catch (error) {
        console.error('Error al crear usuario de prueba:', error);
    } finally {
        process.exit(0);
    }
}

createTestUser(); 