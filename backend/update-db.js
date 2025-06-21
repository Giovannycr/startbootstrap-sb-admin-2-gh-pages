require('dotenv').config();
const pool = require('./config/database');

async function updateDatabase() {
    try {
        console.log('Actualizando estructura de la base de datos...');

        // Agregar columna email si no existe
        try {
            await pool.query('ALTER TABLE usuarios ADD COLUMN email VARCHAR(100) UNIQUE');
            console.log('Columna email agregada a la tabla usuarios');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('La columna email ya existe');
            } else {
                console.error('Error al agregar columna email:', error);
            }
        }

        // Verificar si existen usuarios y agregar emails
        const [users] = await pool.query('SELECT id, nombre_usuario FROM usuarios');
        
        for (const user of users) {
            try {
                await pool.query(
                    'UPDATE usuarios SET email = ? WHERE id = ?',
                    [`${user.nombre_usuario}@empresa.com`, user.id]
                );
                console.log(`Email agregado para usuario ${user.nombre_usuario}`);
            } catch (error) {
                console.error(`Error al actualizar email para ${user.nombre_usuario}:`, error);
            }
        }

        // Agregar columna departamento si no existe
        await addDepartamentoColumn();

        console.log('Base de datos actualizada correctamente');

    } catch (error) {
        console.error('Error al actualizar la base de datos:', error);
    } finally {
        process.exit(0);
    }
}

async function addDepartamentoColumn() {
    try {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN departamento VARCHAR(100) DEFAULT NULL`);
        console.log('Columna "departamento" agregada correctamente.');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('La columna "departamento" ya existe.');
        } else {
            console.error('Error al agregar la columna:', error);
        }
    } finally {
        pool.end();
    }
}

updateDatabase(); 