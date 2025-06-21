const pool = require('./config/database');

async function updateMessagesTable() {
    try {
        console.log('Actualizando tabla de mensajes...');

        // Modificar la columna tipo para incluir los nuevos valores
        await pool.query(`
            ALTER TABLE mensajes 
            MODIFY COLUMN tipo ENUM('usuario', 'sistema', 'general', 'privado') NOT NULL DEFAULT 'usuario'
        `);

        console.log('✅ Tabla de mensajes actualizada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al actualizar tabla de mensajes:', error);
        process.exit(1);
    }
}

updateMessagesTable(); 