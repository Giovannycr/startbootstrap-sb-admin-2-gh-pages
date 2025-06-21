const pool = require('./config/database');

async function createTestMessages() {
    try {
        console.log('Creando mensajes de prueba...');

        // Insertar mensajes en el chat general
        const generalMessages = [
            { usuario_id: 1, mensaje: '¡Hola a todos! Bienvenidos al chat general.' },
            { usuario_id: 2, mensaje: '¡Hola! ¿Cómo están todos?' },
            { usuario_id: 1, mensaje: 'Todo bien, gracias. ¿Alguien más por aquí?' },
            { usuario_id: 3, mensaje: '¡Presente! Me alegra ver que el chat funciona.' },
            { usuario_id: 2, mensaje: 'Excelente, ahora podemos comunicarnos todos.' }
        ];

        for (const msg of generalMessages) {
            await pool.query(
                'INSERT INTO mensajes (usuario_id, mensaje, tipo) VALUES (?, ?, "general")',
                [msg.usuario_id, msg.mensaje]
            );
        }

        // Insertar algunos mensajes privados entre usuarios
        const privateMessages = [
            { usuario_id: 1, destinatario_id: 2, mensaje: 'Hola Ana, ¿cómo va todo?' },
            { usuario_id: 2, destinatario_id: 1, mensaje: '¡Hola Juan! Todo bien, ¿y tú?' },
            { usuario_id: 1, destinatario_id: 2, mensaje: 'Perfecto, gracias por preguntar.' },
            { usuario_id: 1, destinatario_id: 3, mensaje: 'Hola Carlos, ¿viste el nuevo proyecto?' },
            { usuario_id: 3, destinatario_id: 1, mensaje: 'Sí, se ve muy interesante. ¿Quieres que lo revisemos juntos?' }
        ];

        for (const msg of privateMessages) {
            await pool.query(
                'INSERT INTO mensajes (usuario_id, destinatario_id, mensaje, tipo) VALUES (?, ?, ?, "privado")',
                [msg.usuario_id, msg.destinatario_id, msg.mensaje]
            );
        }

        console.log('✅ Mensajes de prueba creados exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al crear mensajes de prueba:', error);
        process.exit(1);
    }
}

createTestMessages(); 