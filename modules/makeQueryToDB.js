require("dotenv").config();
const mysql = require("mysql2/promise");

async function makeQueryToDB(sql, params) {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_DB_HOST,
    port: process.env.MYSQL_DB_PORT,
    user: process.env.MYSQL_DB_USER_NAME,
    password: process.env.MYSQL_DB_USER_PASSWORD,
    database: process.env.MYSQL_DB_NAME,
  });

  const response = connection.execute(sql, params);
  connection.end();
  return response;
}

module.exports = makeQueryToDB;
