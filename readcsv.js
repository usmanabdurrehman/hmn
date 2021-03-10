let fs = require("fs").promises;
let parse = require("csv-parse/lib/sync");
let pd = require('node-pandas')

let readCsv = async (name) => {
	const fileContent = await fs.readFile(__dirname + `/${name}`);
	let stringified = await fileContent.toString()
	return stringified
};

let parseCsv = async (name) => {
	let text = await readCsv(name)
	let csv = []
	let rows = text.split('\n')
	let header = rows.shift()
	rows.forEach(row=>{
		let rowArray = row.split(',').map(item=>item.trim())
		rowArray!='' && csv.push(row.split(',').map(item=>item.trim()))
	})
	return csv
}

module.exports = parseCsv
