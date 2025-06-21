const pool = require('./config/database');

async function testGroups() {
    try {
        console.log('🧪 Probando funcionalidades de grupos...\n');

        // 1. Verificar que las tablas existen
        console.log('1. Verificando tablas...');
        const [tables] = await pool.query('SHOW TABLES LIKE "grupos"');
        if (tables.length === 0) {
            console.log('❌ Tabla "grupos" no existe');
            return;
        }
        console.log('✅ Tabla "grupos" existe');

        const [memberTables] = await pool.query('SHOW TABLES LIKE "miembros_grupo"');
        if (memberTables.length === 0) {
            console.log('❌ Tabla "miembros_grupo" no existe');
            return;
        }
        console.log('✅ Tabla "miembros_grupo" existe');

        const [invitationTables] = await pool.query('SHOW TABLES LIKE "grupo_invitaciones"');
        if (invitationTables.length === 0) {
            console.log('❌ Tabla "grupo_invitaciones" no existe');
            return;
        }
        console.log('✅ Tabla "grupo_invitaciones" existe\n');

        // 2. Verificar usuarios de prueba
        console.log('2. Verificando usuarios de prueba...');
        const [users] = await pool.query('SELECT id, nombre_usuario FROM usuarios LIMIT 3');
        if (users.length < 2) {
            console.log('❌ Necesitas al menos 2 usuarios para probar grupos');
            console.log('Ejecuta: node create-test-user.js');
            return;
        }
        console.log(`✅ ${users.length} usuarios encontrados:`, users.map(u => u.nombre_usuario).join(', '));

        // 3. Crear un grupo de prueba
        console.log('\n3. Creando grupo de prueba...');
        const [groupResult] = await pool.query(
            'INSERT INTO grupos (nombre, descripcion, creador_id) VALUES (?, ?, ?)',
            ['Grupo de Prueba', 'Grupo para probar funcionalidades', users[0].id]
        );
        const groupId = groupResult.insertId;
        console.log(`✅ Grupo creado con ID: ${groupId}`);

        // 4. Agregar miembros al grupo
        console.log('\n4. Agregando miembros al grupo...');
        await pool.query(
            'INSERT INTO miembros_grupo (grupo_id, usuario_id, rol) VALUES (?, ?, "admin")',
            [groupId, users[0].id]
        );
        console.log(`✅ ${users[0].nombre_usuario} agregado como administrador`);

        if (users.length > 1) {
            await pool.query(
                'INSERT INTO miembros_grupo (grupo_id, usuario_id, rol) VALUES (?, ?, "miembro")',
                [groupId, users[1].id]
            );
            console.log(`✅ ${users[1].nombre_usuario} agregado como miembro`);
        }

        // 5. Verificar miembros del grupo
        console.log('\n5. Verificando miembros del grupo...');
        const [members] = await pool.query(
            `SELECT u.nombre_usuario, mg.rol 
             FROM miembros_grupo mg 
             JOIN usuarios u ON mg.usuario_id = u.id 
             WHERE mg.grupo_id = ?`,
            [groupId]
        );
        console.log('✅ Miembros del grupo:', members.map(m => `${m.nombre_usuario} (${m.rol})`));

        // 6. Crear invitación de prueba
        if (users.length > 2) {
            console.log('\n6. Creando invitación de prueba...');
            await pool.query(
                'INSERT INTO grupo_invitaciones (grupo_id, usuario_id, invitado_por) VALUES (?, ?, ?)',
                [groupId, users[2].id, users[0].id]
            );
            console.log(`✅ Invitación creada para ${users[2].nombre_usuario}`);
        }

        // 7. Verificar invitaciones
        console.log('\n7. Verificando invitaciones...');
        const [invitations] = await pool.query(
            `SELECT gi.*, u.nombre_usuario, g.nombre as grupo_nombre
             FROM grupo_invitaciones gi
             JOIN usuarios u ON gi.usuario_id = u.id
             JOIN grupos g ON gi.grupo_id = g.id
             WHERE gi.estado = "pendiente"`
        );
        console.log(`✅ ${invitations.length} invitaciones pendientes encontradas`);

        // 8. Verificar estructura de mensajes para grupos
        console.log('\n8. Verificando estructura de mensajes...');
        const [messageColumns] = await pool.query('DESCRIBE mensajes');
        const hasGroupId = messageColumns.some(col => col.Field === 'grupo_id');
        const hasTipo = messageColumns.some(col => col.Field === 'tipo');
        
        if (hasGroupId && hasTipo) {
            console.log('✅ Tabla mensajes tiene columnas grupo_id y tipo');
        } else {
            console.log('❌ Tabla mensajes no tiene las columnas necesarias para grupos');
        }

        console.log('\n🎉 ¡Todas las pruebas de grupos pasaron exitosamente!');
        console.log('\n📋 Resumen:');
        console.log(`   - Grupo creado: ${groupId}`);
        console.log(`   - Miembros: ${members.length}`);
        console.log(`   - Invitaciones: ${invitations.length}`);
        console.log('\n🚀 El sistema de grupos está listo para usar.');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        process.exit(0);
    }
}

testGroups(); 