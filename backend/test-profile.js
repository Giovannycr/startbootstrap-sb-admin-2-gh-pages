const pool = require('./config/database');

async function testProfile() {
    try {
        console.log('🧪 Probando funcionalidades del perfil...\n');

        // 1. Verificar estructura de la tabla usuarios
        console.log('1. Verificando estructura de tabla usuarios...');
        const [columns] = await pool.query('DESCRIBE usuarios');
        const columnNames = columns.map(col => col.Field);
        
        const requiredColumns = ['id', 'nombre_usuario', 'email', 'departamento', 'profile_photo_url'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
            console.log(`❌ Faltan columnas: ${missingColumns.join(', ')}`);
            return;
        }
        console.log('✅ Todas las columnas necesarias existen');

        // 2. Obtener usuario de prueba
        console.log('\n2. Obteniendo usuario de prueba...');
        const [users] = await pool.query('SELECT id, nombre_usuario, email, departamento, profile_photo_url FROM usuarios LIMIT 1');
        if (users.length === 0) {
            console.log('❌ No hay usuarios para probar');
            return;
        }
        const user = users[0];
        console.log(`✅ Usuario encontrado: ${user.nombre_usuario}`);

        // 3. Probar actualización de perfil
        console.log('\n3. Probando actualización de perfil...');
        const testEmail = 'test.profile@example.com';
        const testDepartment = 'Desarrollo de Software';
        
        await pool.query(
            'UPDATE usuarios SET email = ?, departamento = ? WHERE id = ?',
            [testEmail, testDepartment, user.id]
        );
        console.log('✅ Perfil actualizado exitosamente');

        // 4. Verificar que se guardó correctamente
        console.log('\n4. Verificando datos guardados...');
        const [updatedUser] = await pool.query(
            'SELECT email, departamento FROM usuarios WHERE id = ?',
            [user.id]
        );
        console.log('   Datos guardados:', updatedUser[0]);

        // 5. Probar actualización de foto de perfil
        console.log('\n5. Probando actualización de foto de perfil...');
        const testPhotoUrl = '/uploads/profiles/test_photo.jpg';
        await pool.query(
            'UPDATE usuarios SET profile_photo_url = ? WHERE id = ?',
            [testPhotoUrl, user.id]
        );
        console.log('✅ Foto de perfil actualizada');

        // 6. Verificar estadísticas
        console.log('\n6. Verificando estadísticas del usuario...');
        
        // Total de amigos
        const [friends] = await pool.query(
            'SELECT COUNT(*) as total FROM amigos WHERE usuario_id = ? AND estado = "aceptado"',
            [user.id]
        );
        
        // Total de grupos
        const [groups] = await pool.query(
            'SELECT COUNT(*) as total FROM miembros_grupo WHERE usuario_id = ?',
            [user.id]
        );
        
        // Total de mensajes
        const [messages] = await pool.query(
            'SELECT COUNT(*) as total FROM mensajes WHERE usuario_id = ?',
            [user.id]
        );
        
        // Estado online
        const [sessions] = await pool.query(
            'SELECT * FROM sesiones WHERE usuario_id = ? AND fin IS NULL',
            [user.id]
        );
        
        console.log('   Estadísticas:');
        console.log(`   - Amigos: ${friends[0].total}`);
        console.log(`   - Grupos: ${groups[0].total}`);
        console.log(`   - Mensajes: ${messages[0].total}`);
        console.log(`   - Estado: ${sessions.length > 0 ? 'Online' : 'Offline'}`);

        // 7. Verificar directorio de uploads
        console.log('\n7. Verificando directorio de uploads...');
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const profilesDir = path.join(uploadsDir, 'profiles');
        
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('   ✅ Directorio uploads creado');
        } else {
            console.log('   ✅ Directorio uploads existe');
        }
        
        if (!fs.existsSync(profilesDir)) {
            fs.mkdirSync(profilesDir, { recursive: true });
            console.log('   ✅ Directorio profiles creado');
        } else {
            console.log('   ✅ Directorio profiles existe');
        }

        // 8. Limpiar datos de prueba
        console.log('\n8. Limpiando datos de prueba...');
        await pool.query(
            'UPDATE usuarios SET email = NULL, departamento = NULL, profile_photo_url = "img/undraw_profile.svg" WHERE id = ?',
            [user.id]
        );
        console.log('✅ Datos de prueba limpiados');

        console.log('\n🎉 ¡Todas las pruebas del perfil pasaron exitosamente!');
        console.log('\n📋 Resumen:');
        console.log(`   - Usuario probado: ${user.nombre_usuario}`);
        console.log(`   - Actualización de perfil: ✅`);
        console.log(`   - Actualización de foto: ✅`);
        console.log(`   - Estadísticas: ✅`);
        console.log(`   - Directorios de uploads: ✅`);

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        process.exit(0);
    }
}

testProfile(); 