const mysql = require("mysql");
//Create Database Connection
const conn = mysql.createConnection({
	host: "mysql-140220-0.cloudclusters.net",
	user: "client",
	password: "12345678",
	database: "brightvision", 
	port: 19608 ,
	multipleStatements: true
});


module.exports = {conn} ;

