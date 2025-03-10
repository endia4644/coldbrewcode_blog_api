const dotenv = require("dotenv");

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: __dirname + "/../.env.production" });
} else {
  dotenv.config({ path: __dirname + "/../.env.development" });
}

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "coldbrewcode_dev",
    host: "coldbrewcode-mysql.endia.me",
    port: "33306",
    dialect: "mysql",
    timezone: "+09:00",
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "coldbrewcode_dev",
    host: "coldbrewcode-mysql.endia.me",
    port: "33306",
    dialect: "mysql",
    timezone: "+09:00",
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "coldbrewcode",
    host: "coldbrewcode-mysql.endia.me",
    port: "33306",
    dialect: "mysql",
    timezone: "+09:00",
  },
};
