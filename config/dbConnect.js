const mysql = require("mysql2/promise");
require("dotenv").config(); // .env 파일 로드

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // 기본값: 3306
  waitForConnections: true,          // 연결 대기 설정
  connectionLimit: 10,               // 최대 연결 제한
  queueLimit: 0                      // 대기열 제한
});

module.exports = db;
