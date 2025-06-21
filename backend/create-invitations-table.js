const pool = require('./config/database');

async function createInvitationsTable() {
    try {
        console.log('Creando tabla de invitaciones a grupos...');

        // Crear tabla de invitaciones a grupos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS grupo_invitaciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                grupo_id INT NOT NULL,
                usuario_id INT NOT NULL,
                invitado_por INT NOT NULL,
                estado ENUM('pendiente', 'aceptada', 'rechazada') DEFAULT 'pendiente',
                fecha_invitacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_respuesta TIMESTAMP NULL,
                FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (invitado_por) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Tabla de invitaciones a grupos creada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al crear tabla de invitaciones:', error);
        process.exit(1);
    }
}

createInvitationsTable(); 