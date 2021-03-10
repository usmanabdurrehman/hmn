const { Client,Pool } = require('pg')

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})
let getData = async () => {
	let result = await pool.query(`SELECT * from ${process.env.TABLE_NAME}`)
	return result.rows
}

module.exports = getData()
