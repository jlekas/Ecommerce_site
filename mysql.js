const Promise = require('bluebird');
const appConfig = require('./config').appConfig;
const mysql = require('mysql');

Promise.promisifyAll(mysql);
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);

let pool = mysql.createPool(appConfig.mysql);

function getSqlConnection() {
  return pool.getConnectionAsync().disposer(function(connection) {
    connection.destroy();
  });
};

exports.getSqlConnection = getSqlConnection;