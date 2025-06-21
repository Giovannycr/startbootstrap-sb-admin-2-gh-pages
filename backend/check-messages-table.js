const pool = require('./config/database');

async function checkMessagesTable() {
    try {
        console.log('🔍 Verificando estructura de tabla mensajes...\n');

        // 1. Verificar estructura actual
        console.log('1. Estructura actual de la tabla mensajes:');
        const [columns] = await pool.query('DESCRIBE mensajes');
        columns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });

        // 2. Verificar valores actuales en la columna tipo
        console.log('\n2. Valores actuales en la columna tipo:');
        const [types] = await pool.query('SELECT DISTINCT tipo FROM mensajes WHERE tipo IS NOT NULL');
        console.log('   Valores encontrados:', types.map(t => t.tipo));

        // 3. Verificar si la columna tipo es ENUM
        const tipoColumn = columns.find(col => col.Field === 'tipo');
        if (tipoColumn && tipoColumn.Type.includes('enum')) {
            console.log('\n3. La columna tipo es ENUM con valores:', tipoColumn.Type);
            
            // Extraer valores del ENUM
            const enumMatch = tipoColumn.Type.match(/enum\((.*)\)/);
            if (enumMatch) {
                const enumValues = enumMatch[1].split(',').map(v => v.replace(/'/g, ''));
                console.log('   Valores permitidos:', enumValues);
                
                // Verificar si 'grupo' está permitido
                if (!enumValues.includes('grupo')) {
                    console.log('   ❌ El valor "grupo" no está permitido');
                    console.log('   💡 Necesitamos agregar "grupo" a los valores permitidos');
                    
                    // Construir nuevo ENUM con 'grupo' incluido
                    const newEnumValues = [...enumValues, 'grupo'];
                    const newEnumString = newEnumValues.map(v => `'${v}'`).join(',');
                    
                    console.log('\n4. Actualizando ENUM para incluir "grupo"...');
                    await pool.query(`ALTER TABLE mensajes MODIFY COLUMN tipo ENUM(${newEnumString})`);
                    console.log('   ✅ ENUM actualizado exitosamente');
                } else {
                    console.log('   ✅ El valor "grupo" ya está permitido');
                }
            }
        } else {
            console.log('\n3. La columna tipo no es ENUM, es:', tipoColumn.Type);
        }

        // 4. Probar inserción de mensaje de grupo
        console.log('\n4. Probando inserción de mensaje de grupo...');
        const [groups] = await pool.query('SELECT id FROM grupos LIMIT 1');
        const [users] = await pool.query('SELECT id FROM usuarios LIMIT 1');
        
        if (groups.length > 0 && users.length > 0) {
            const [result] = await pool.query(
                'INSERT INTO mensajes (usuario_id, grupo_id, mensaje, tipo, fecha) VALUES (?, ?, ?, ?, NOW())',
                [users[0].id, groups[0].id, 'Mensaje de prueba', 'grupo']
            );
            console.log('   ✅ Mensaje de grupo insertado exitosamente con ID:', result.insertId);
            
            // Limpiar mensaje de prueba
            await pool.query('DELETE FROM mensajes WHERE id = ?', [result.insertId]);
            console.log('   🧹 Mensaje de prueba eliminado');
        }

        console.log('\n🎉 Verificación completada exitosamente!');

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        process.exit(0);
    }
}

checkMessagesTable(); 