require('dotenv').config();
const pool = require('./config/database');

async function checkUsers() {
    try {
        console.log('Verificando usuarios en la base de datos...');

        const [users] = await pool.query('SELECT id, nombre_usuario, email FROM usuarios');
        
        if (users.length === 0) {
            console.log('No hay usuarios en la base de datos');
        } else {
            console.log('Usuarios existentes:');
            users.forEach(user => {
                console.log(`- ID: ${user.id}, Usuario: ${user.nombre_usuario}, Email: ${user.email || 'Sin email'}`);
            });
        }

        // Verificar si hay algún usuario con contraseña hasheada
        const [testUser] = await pool.query('SELECT nombre_usuario, contraseña FROM usuarios LIMIT 1');
        if (testUser.length > 0) {
            console.log(`\nEjemplo de contraseña del usuario ${testUser[0].nombre_usuario}:`);
            console.log(`Contraseña: ${testUser[0].contraseña}`);
            console.log(`Longitud: ${testUser[0].contraseña.length} caracteres`);
        }

    } catch (error) {
        console.error('Error al verificar usuarios:', error);
    } finally {
        process.exit(0);
    }
}

checkUsers(); 