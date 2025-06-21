const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'id8ca7er',
    database: process.env.DB_NAME || 'chat_empresarial'
});

module.exports = pool; 