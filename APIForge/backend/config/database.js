const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

for (const envPath of [path.resolve(__dirname, '..', '.env'), path.resolve(__dirname, '..', '..', '.env')]) {
  dotenv.config({ path: envPath });
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'apiforge',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
