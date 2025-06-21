const pool = require('./config/database');

async function checkUsersTable() {
    try {
        console.log('🔍 Verificando estructura de tabla usuarios...\n');

        // 1. Verificar estructura actual
        console.log('1. Estructura actual de la tabla usuarios:');
        const [columns] = await pool.query('DESCRIBE usuarios');
        const columnNames = columns.map(col => col.Field);
        columns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });

        // 2. Verificar columnas necesarias para el perfil
        console.log('\n2. Verificando columnas necesarias para el perfil:');
        const requiredColumns = {
            'email': 'VARCHAR(255) NULL',
            'departamento': 'VARCHAR(100) NULL',
            'foto_perfil': 'VARCHAR(255) NULL'
        };

        const missingColumns = [];
        for (const [columnName, columnType] of Object.entries(requiredColumns)) {
            if (!columnNames.includes(columnName)) {
                missingColumns.push({ name: columnName, type: columnType });
                console.log(`   ❌ Falta columna: ${columnName}`);
            } else {
                console.log(`   ✅ Columna existe: ${columnName}`);
            }
        }

        // 3. Agregar columnas faltantes
        if (missingColumns.length > 0) {
            console.log('\n3. Agregando columnas faltantes...');
            for (const column of missingColumns) {
                console.log(`   Agregando ${column.name}...`);
                await pool.query(`ALTER TABLE usuarios ADD COLUMN ${column.name} ${column.type}`);
                console.log(`   ✅ Columna ${column.name} agregada`);
            }
        } else {
            console.log('\n3. ✅ Todas las columnas necesarias ya existen');
        }

        // 4. Verificar estructura final
        console.log('\n4. Estructura final de la tabla usuarios:');
        const [finalColumns] = await pool.query('DESCRIBE usuarios');
        finalColumns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });

        // 5. Probar inserción de datos de perfil
        console.log('\n5. Probando actualización de perfil...');
        const [users] = await pool.query('SELECT id FROM usuarios LIMIT 1');
        if (users.length > 0) {
            const userId = users[0].id;
            await pool.query(
                'UPDATE usuarios SET email = ?, departamento = ? WHERE id = ?',
                ['test@example.com', 'Desarrollo', userId]
            );
            console.log('   ✅ Actualización de perfil exitosa');

            // Verificar que se guardó
            const [updatedUser] = await pool.query(
                'SELECT email, departamento FROM usuarios WHERE id = ?',
                [userId]
            );
            console.log('   Datos guardados:', updatedUser[0]);
        }

        console.log('\n🎉 Verificación de tabla usuarios completada exitosamente!');

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        process.exit(0);
    }
}

checkUsersTable(); 