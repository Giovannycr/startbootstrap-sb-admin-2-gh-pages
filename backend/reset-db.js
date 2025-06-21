require('dotenv').config();
const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function resetDatabase() {
    try {
        console.log('Limpiando base de datos...');

        // Eliminar datos existentes
        await pool.query('DELETE FROM mensajes');
        await pool.query('DELETE FROM miembros_grupo');
        await pool.query('DELETE FROM grupos');
        await pool.query('DELETE FROM sesiones');
        await pool.query('DELETE FROM amigos');
        await pool.query('DELETE FROM usuarios');

        console.log('Base de datos limpiada');

        // Crear usuarios de prueba
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        const users = [
            { nombre_usuario: 'admin', contraseña: hashedPassword, email: 'admin@empresa.com' },
            { nombre_usuario: 'usuario1', contraseña: hashedPassword, email: 'usuario1@empresa.com' },
            { nombre_usuario: 'usuario2', contraseña: hashedPassword, email: 'usuario2@empresa.com' },
            { nombre_usuario: 'usuario3', contraseña: hashedPassword, email: 'usuario3@empresa.com' },
            { nombre_usuario: 'test', contraseña: hashedPassword, email: 'test@empresa.com' }
        ];

        for (const user of users) {
            const [result] = await pool.query(
                'INSERT INTO usuarios (nombre_usuario, contraseña, email) VALUES (?, ?, ?)',
                [user.nombre_usuario, user.contraseña, user.email]
            );
            console.log(`Usuario ${user.nombre_usuario} creado con ID: ${result.insertId}`);
        }

        console.log('\nBase de datos reiniciada correctamente');
        console.log('\nUsuarios disponibles:');
        console.log('- admin / 123456');
        console.log('- usuario1 / 123456');
        console.log('- usuario2 / 123456');
        console.log('- usuario3 / 123456');
        console.log('- test / 123456');

    } catch (error) {
        console.error('Error al reiniciar la base de datos:', error);
    } finally {
        process.exit(0);
    }
}

resetDatabase(); 