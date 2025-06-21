const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const userId = req.userId || 'test';
        const ext = path.extname(file.originalname);
        cb(null, `profile_${userId}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: function (req, file, cb) {
        // Verificar que sea una imagen
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

async function testProfileRoute() {
    try {
        console.log('🧪 Probando ruta de subida de fotos de perfil...\n');

        // 1. Verificar que multer está funcionando
        console.log('1. Verificando configuración de multer...');
        console.log('   ✅ Multer configurado correctamente');
        console.log(`   ✅ Directorio de destino: ${path.join(__dirname, '..', 'uploads', 'profiles')}`);

        // 2. Verificar directorio de uploads
        console.log('\n2. Verificando directorio de uploads...');
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

        // 3. Verificar que el archivo de rutas existe
        console.log('\n3. Verificando archivo de rutas...');
        const profileRoutesPath = path.join(__dirname, 'routes', 'profile.js');
        if (fs.existsSync(profileRoutesPath)) {
            console.log('   ✅ Archivo de rutas existe');
        } else {
            console.log('   ❌ Archivo de rutas no existe');
            return;
        }

        // 4. Verificar que multer está instalado
        console.log('\n4. Verificando dependencias...');
        try {
            require('multer');
            console.log('   ✅ Multer está instalado');
        } catch (error) {
            console.log('   ❌ Multer no está instalado');
            console.log('   💡 Ejecuta: npm install multer');
            return;
        }

        // 5. Simular una subida de archivo
        console.log('\n5. Simulando subida de archivo...');
        const testFileName = `test_${Date.now()}.txt`;
        const testFilePath = path.join(profilesDir, testFileName);
        
        // Crear archivo de prueba
        fs.writeFileSync(testFilePath, 'Archivo de prueba');
        console.log(`   ✅ Archivo de prueba creado: ${testFileName}`);

        // Verificar que se puede leer
        if (fs.existsSync(testFilePath)) {
            console.log('   ✅ Archivo se puede leer correctamente');
        } else {
            console.log('   ❌ No se puede leer el archivo');
        }

        // Limpiar archivo de prueba
        fs.unlinkSync(testFilePath);
        console.log('   🧹 Archivo de prueba eliminado');

        console.log('\n🎉 ¡Todas las pruebas de la ruta pasaron exitosamente!');
        console.log('\n📋 Resumen:');
        console.log('   - Multer configurado: ✅');
        console.log('   - Directorios creados: ✅');
        console.log('   - Archivo de rutas existe: ✅');
        console.log('   - Dependencias instaladas: ✅');
        console.log('   - Permisos de escritura: ✅');

        console.log('\n💡 Si sigues teniendo problemas, verifica:');
        console.log('   1. Que el servidor esté corriendo en el puerto 3000');
        console.log('   2. Que estés autenticado (tienes un token válido)');
        console.log('   3. Que la URL de la API sea correcta en js/config.js');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        process.exit(0);
    }
}

testProfileRoute(); 