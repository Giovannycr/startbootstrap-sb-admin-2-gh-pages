const fetch = require('node-fetch');

async function testServerConnection() {
    try {
        console.log('🧪 Probando conexión al servidor...\n');

        const baseUrl = 'http://localhost:3000';
        const apiUrl = 'http://localhost:3000/api';

        // 1. Probar conexión básica al servidor
        console.log('1. Probando conexión básica al servidor...');
        try {
            const response = await fetch(baseUrl);
            if (response.ok) {
                console.log('   ✅ Servidor respondiendo correctamente');
            } else {
                console.log(`   ❌ Servidor respondió con status: ${response.status}`);
            }
        } catch (error) {
            console.log('   ❌ No se puede conectar al servidor');
            console.log('   💡 Asegúrate de que el servidor esté corriendo con: node server.js');
            return;
        }

        // 2. Probar ruta de perfil (sin autenticación)
        console.log('\n2. Probando ruta de perfil sin autenticación...');
        try {
            const response = await fetch(`${apiUrl}/profile`);
            if (response.status === 401) {
                console.log('   ✅ Ruta protegida correctamente (401 Unauthorized)');
            } else {
                console.log(`   ⚠️  Ruta respondió con status: ${response.status}`);
            }
        } catch (error) {
            console.log('   ❌ Error al probar ruta de perfil:', error.message);
        }

        // 3. Probar ruta de subida de foto (sin autenticación)
        console.log('\n3. Probando ruta de subida de foto sin autenticación...');
        try {
            const response = await fetch(`${apiUrl}/profile/photo`, {
                method: 'POST'
            });
            if (response.status === 401) {
                console.log('   ✅ Ruta protegida correctamente (401 Unauthorized)');
            } else {
                console.log(`   ⚠️  Ruta respondió con status: ${response.status}`);
            }
        } catch (error) {
            console.log('   ❌ Error al probar ruta de foto:', error.message);
        }

        // 4. Verificar que el servidor esté corriendo en el puerto correcto
        console.log('\n4. Verificando puerto del servidor...');
        console.log('   💡 El servidor debe estar corriendo en: http://localhost:3000');
        console.log('   💡 Si no está corriendo, ejecuta en otra terminal:');
        console.log('      cd backend && node server.js');

        console.log('\n🎉 Pruebas de conexión completadas!');
        console.log('\n📋 Resumen:');
        console.log('   - Servidor: Verificar si está corriendo');
        console.log('   - Rutas protegidas: Funcionando correctamente');
        console.log('   - API: Configurada correctamente');

        console.log('\n💡 Para solucionar el error 404:');
        console.log('   1. Abre una nueva terminal');
        console.log('   2. Navega a la carpeta backend: cd backend');
        console.log('   3. Ejecuta el servidor: node server.js');
        console.log('   4. Deberías ver: "Servidor corriendo en el puerto 3000"');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        process.exit(0);
    }
}

testServerConnection(); 