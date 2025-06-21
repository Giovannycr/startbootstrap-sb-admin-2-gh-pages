const pool = require('./config/database');

async function testGroupMessages() {
    try {
        console.log('🧪 Probando envío de mensajes a grupos...\n');

        // 1. Obtener un grupo existente
        console.log('1. Obteniendo grupo existente...');
        const [groups] = await pool.query('SELECT * FROM grupos LIMIT 1');
        if (groups.length === 0) {
            console.log('❌ No hay grupos para probar');
            return;
        }
        const group = groups[0];
        console.log(`✅ Grupo encontrado: ${group.nombre} (ID: ${group.id})`);

        // 2. Obtener un usuario miembro del grupo
        console.log('\n2. Obteniendo miembro del grupo...');
        const [members] = await pool.query(
            'SELECT u.id, u.nombre_usuario FROM miembros_grupo mg JOIN usuarios u ON mg.usuario_id = u.id WHERE mg.grupo_id = ? LIMIT 1',
            [group.id]
        );
        if (members.length === 0) {
            console.log('❌ No hay miembros en el grupo');
            return;
        }
        const member = members[0];
        console.log(`✅ Miembro encontrado: ${member.nombre_usuario} (ID: ${member.id})`);

        // 3. Verificar estructura de la tabla mensajes
        console.log('\n3. Verificando estructura de tabla mensajes...');
        const [columns] = await pool.query('DESCRIBE mensajes');
        const columnNames = columns.map(col => col.Field);
        console.log('Columnas de mensajes:', columnNames);

        const requiredColumns = ['id', 'usuario_id', 'grupo_id', 'mensaje', 'tipo', 'fecha'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
            console.log(`❌ Faltan columnas: ${missingColumns.join(', ')}`);
            return;
        }
        console.log('✅ Todas las columnas necesarias existen');

        // 4. Insertar mensaje de prueba
        console.log('\n4. Insertando mensaje de prueba...');
        const testMessage = 'Mensaje de prueba para verificar funcionalidad';
        const [messageResult] = await pool.query(
            'INSERT INTO mensajes (usuario_id, grupo_id, mensaje, tipo, fecha) VALUES (?, ?, ?, ?, NOW())',
            [member.id, group.id, testMessage, 'grupo']
        );
        console.log(`✅ Mensaje insertado con ID: ${messageResult.insertId}`);

        // 5. Verificar que el mensaje se guardó correctamente
        console.log('\n5. Verificando mensaje guardado...');
        const [savedMessage] = await pool.query(
            `SELECT m.*, u.nombre_usuario 
             FROM mensajes m 
             JOIN usuarios u ON m.usuario_id = u.id 
             WHERE m.id = ?`,
            [messageResult.insertId]
        );
        
        if (savedMessage.length > 0) {
            const msg = savedMessage[0];
            console.log('✅ Mensaje guardado correctamente:');
            console.log(`   - ID: ${msg.id}`);
            console.log(`   - Usuario: ${msg.nombre_usuario}`);
            console.log(`   - Grupo: ${msg.grupo_id}`);
            console.log(`   - Mensaje: ${msg.mensaje}`);
            console.log(`   - Tipo: ${msg.tipo}`);
            console.log(`   - Fecha: ${msg.fecha}`);
        } else {
            console.log('❌ No se pudo recuperar el mensaje guardado');
        }

        // 6. Verificar mensajes del grupo
        console.log('\n6. Verificando mensajes del grupo...');
        const [groupMessages] = await pool.query(
            `SELECT m.*, u.nombre_usuario 
             FROM mensajes m 
             JOIN usuarios u ON m.usuario_id = u.id 
             WHERE m.grupo_id = ? 
             ORDER BY m.fecha ASC`,
            [group.id]
        );
        console.log(`✅ ${groupMessages.length} mensajes encontrados en el grupo`);

        // 7. Verificar permisos de miembro
        console.log('\n7. Verificando permisos de miembro...');
        const [membership] = await pool.query(
            'SELECT * FROM miembros_grupo WHERE grupo_id = ? AND usuario_id = ?',
            [group.id, member.id]
        );
        
        if (membership.length > 0) {
            console.log(`✅ ${member.nombre_usuario} es miembro del grupo con rol: ${membership[0].rol}`);
        } else {
            console.log(`❌ ${member.nombre_usuario} no es miembro del grupo`);
        }

        console.log('\n🎉 ¡Pruebas de mensajes de grupo completadas exitosamente!');
        console.log('\n📋 Resumen:');
        console.log(`   - Grupo: ${group.nombre}`);
        console.log(`   - Miembro: ${member.nombre_usuario}`);
        console.log(`   - Mensaje de prueba: ${testMessage}`);
        console.log(`   - Total mensajes en grupo: ${groupMessages.length}`);

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        process.exit(0);
    }
}

testGroupMessages(); 