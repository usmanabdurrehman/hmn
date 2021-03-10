/*
History:
2021-Feb-26 CRS Following changes were made
	Parameterized Output and Log file and also changed name of var for input file.
	Added Run info to Console.log as well as reformatted to a single line with delimiters so it can be parsed.
	Added Output filename to console.log output.
	Modified it to create a new output file each time vs. appending.
2021-Feb-25 Original Framework Version
*/
const pd = require("node-pandas");
const LinearRegression = require("ml-regression-multivariate-linear");
const PolynomialRegressor = require("regression-multivariate-polynomial")
	.PolynomialRegressor;
const fs = require("fs");
const utils = require("./utils/utils");
const {
	getPeriod,
	dayOfYear,
	isNumeric,
	calculateRatio,
} = require("./utils/subutils");
const parseCsv = require("./readcsv");
require("dotenv").config();

let forecastData = async () => {
	// Getting arguments from command line
	let myArgs = process.argv.slice(2);

	// Assigning the arguments into variables
	let [
		numDaysToLookBack = "SOD",
		numDaysToForecast = 730,
		bumpParameter = 0,
		bumpStart = 0,
		variableMapping = "MV_CNT1",
		PeriodKey = "Day",
		datasource = "csv",
	] = myArgs;
	console.log(`Arguments being used
numDaysToLookBack => ${numDaysToLookBack},
numDaysToForecast => ${numDaysToForecast},
bumpParameter => ${bumpParameter},
bumpStart => ${bumpStart},
variableMapping => ${variableMapping},
PeriodKey => ${PeriodKey},
datasource => ${datasource}\n`);

	/*
		If a datasource argument having a value postgres is passed then it connects with a database,
		looks for a table named fiverr and saves the result(all the rows of that table) into the csv
		variable otherwise it reads from the csv file
	*/
	let csv = [];
	if (datasource == "postgres") {
		console.log("Fetching data from DB");
		csv = await require("./sqlconfig");
	} else {
		csv = await parseCsv(`${process.env.NAME_OF_INPUT}`);
	}

	let uniqueUNITT = [...new Set(csv.map((row) => row[2]))];
	let Period = getPeriod(PeriodKey);
	csv = csv.map((row) => {
		let [
			MonNode,
			TimeSlot,
			UNITT,
			UNITS,
			COUNTER,
			FltMet1,
			FltMet2,
		] = Object.values(row).map((val) =>
			isNumeric(val) ? parseInt(val) : val
		);
		let [date, time] = TimeSlot.includes(" ")
			? TimeSlot.split(" ")
			: [TimeSlot, null];
		let dateSeperator = date.includes("-") ? "-" : "/";
		let [year, month, day] = date
			.split(dateSeperator)
			.map((e) => parseInt(e));
		let [hour, min, sec] = time
			? time.split(":").map((e) => parseInt(e))
			: ["00", "00", "00"];
		let dayOfTheWeek = [7, 1, 2, 3, 4, 5, 6];
		let dateObj = new Date(year, month - 1, day);
		return {
			MonNode: MonNode,
			TimeSlot: TimeSlot,
			UNITS: UNITS,
			UNITT: uniqueUNITT.indexOf(UNITT),
			COUNTER: COUNTER,
			FltMet1: FltMet1,
			FltMet2: FltMet2,
			"Year(4 digit)": year,
			"Year(2 digit)": parseInt(`${year}`.slice(2, 4)),
			Month: month,
			"Day of the Year": dayOfYear(dateObj),
			"Day of the Month": day,
			"Day of the Week": dayOfTheWeek[dateObj.getDay()],
			"Time Hour": hour,
			"Time Minute": min,
			"Time Seconds": sec,
			Rat1: calculateRatio(COUNTER, UNITS, Period, FltMet1),
			Rat2: calculateRatio(COUNTER, UNITS, Period, FltMet2),
		};
	});

	/* 
		Creating a lookup file for UNITT 
		The Lookup file will be generated everytime 
	*/

	fs.writeFileSync("./lookup.txt", "");
	uniqueUNITT.forEach((uniq) => {
		fs.appendFileSync(
			`./lookup.txt`,
			`${uniq} => ${uniqueUNITT.indexOf(uniq)}\n`
		);
	});
	console.log(`Fetching data from CSV: ${process.env.NAME_OF_INPUT}`);

	/*
	***************************************************************************** 
				Getting all the data from the integrateXY function 
	*****************************************************************************

	This is the main thing happening in all of this code

	This function works in the following way
	1) First the data is fetched which would be used to train the model using the getDataFromNumDaysToLookback
	function present inside the utils file. It utilitzes the <numDaysToLookBack> param from command line.
	2) It seperates the dataset returned by getDataFromNumDaysToLookback by system using the seperateBySystem 
	function. Meaning if there are 3 different systems, it would split the data into 3 parts. 
	3) A loop will run over these 3 datasets and then there features will be forecasted, using the forecastFeature 
	function present inside the utils file which also utilizes another function getRateOfGrowth present inside 
	the same file.
	4) The following items are then returned
	data => Original Data seperated by systems
	X => Feature variables selected using the selectXY function according to the parameter variableMapping
	y => Target variable selected using the selectXY function according to the parameter variableMapping
	forecastFeatures => Features calculated using extrapolation for forecasting
	dates => first and last date of the data for all datasets seperated by systems. These values are logged
			 in the log file
	systems => An array of different unique systems in the dataset
	forecastColumns => Columns selected through the selectXY function according to the parameter variableMapping
	
	*/

	let [
		data,
		X,
		y,
		forecastFeatures,
		dates,
		systems,
		forecastColumns,
		forecastFillers,
	] = utils.integrateXY(
		csv,
		variableMapping,
		numDaysToForecast,
		numDaysToLookBack,
		bumpStart,
		bumpParameter
	);

	let forecastsForAllSystems = [];

	for (let i = 0; i < systems.length; i++) {
		let numRows = X[i].length;
		let X_train = X[i].slice(0, Math.floor(numRows * 0.8));
		let X_test = X[i].slice(Math.floor(numRows * 0.8), numRows);
		let y_train = y[i].slice(0, Math.floor(numRows * 0.8));
		let y_test = y[i].slice(Math.floor(numRows * 0.8), numRows);

		/*
		****************************************************************************
		 				Polynomial Regression Modeling
		****************************************************************************
		*/

		// Fitting the linear regression model
		const model = new PolynomialRegressor(
			parseInt(process.env.DEGREE_OF_POLYNOMIAL)
		);
		model.fit(X_train, y_train);

		// Predicting on the test data and calculating the r2_score
		let y_hat = model.predict(X_test);

		let r2_score = utils.r2_score(y_test, y_hat);

		// Getting the model weights from the model
		let { weights } = model;

		weights = weights.map((weight) => weight[0].toFixed(2));

		// Making forecasts from the forecast features
		let forecast = model.predict(forecastFeatures[i]);
		forecastsForAllSystems.push(forecast);

		/*
		***************************************************************************** 
							Logging training info in a file 
		*****************************************************************************
		*/
		/*
		Getting the current time and date using the Date object
		so that we can log it into the file
		*/
		let dateObject = new Date();
		let date = `${dateObject.getFullYear()}-${(dateObject.getMonth() + 1)
			.toString()
			.padStart(2, "0")}-${dateObject
			.getDate()
			.toString()
			.padStart(2, "0")}`;
		let time = `${dateObject
			.getHours()
			.toString()
			.padStart(2, "0")}:${dateObject
			.getMinutes()
			.toString()
			.padStart(2, "0")}:${dateObject
			.getSeconds()
			.toString()
			.padStart(2, "0")}`;

		// The equation for the linear regression model
		// The equation is not that accurate right now
		equation = ` Linear Regression: ${weights[1]} * (x) + ${weights[0]}`;
		/*
			Making the log string which will be populated in the log.txt file
		*/
		let log = `${date} ${time} | ${X[i].length} samples examined | Samples examined from ${dates[i].firstDateString} to ${dates[i].lastDateString} | ${numDaysToForecast} forecasts made | ${equation} | R2 score ${r2_score} \n\n`;
		let err = fs.appendFileSync(`./${process.env.NAME_OF_LOG}.log`, log);
		console.log(`${log}`);
	}

	/*
	***************************************************************************** 
						Writing forecast data to a file
	*****************************************************************************
	*/

	/*
		Writing original data to forecast file
	*/

	// Writing the original data headers
	fs.writeFileSync(
		`./${process.env.NAME_OF_OUTPUT}`,
		`${Object.keys(data[0][0]).join(",")}\n`
	);

	// Writing the original data
	console.log(`Writing Original Data to CSV: ${process.env.NAME_OF_OUTPUT}`);
	for (let i = 0; i < systems.length; i++) {
		let row = "";
		for (let j = 0; j < data[i].length; j++) {
			row = Object.values(data[i][j]).join(",");
			fs.appendFileSync(`./${process.env.NAME_OF_OUTPUT}`, `${row}\n`);
			row = "";
		}
		fs.appendFileSync(`./${process.env.NAME_OF_OUTPUT}`, `\n`);
	}

	/*
		Writing forecast data to forecast file
	*/

	// Writing the forecast data headers
	let containsCOUNTERInMapping = forecastColumns.includes("COUNTER");
	let containsUNITSInMapping = forecastColumns.includes("UNITS");

	fs.appendFileSync(
		`./${process.env.NAME_OF_OUTPUT}`,
		`\n\nMonNode,TimeSlot,UNITT,${
			!containsCOUNTERInMapping ? `COUNTER,` : ""
		}${!containsUNITSInMapping ? `UNITS,` : ""}${forecastColumns.join(
			","
		)},${forecastColumns.includes("FltMet1") ? "Rat1" : "Rat2"}\n`
	);
	console.log(`Writing Forecast Data to CSV: ${process.env.NAME_OF_OUTPUT}`);

	// Writing the forecast data
	for (let i = 0; i < systems.length; i++) {
		let row = "";
		for (let j = 0; j < forecastsForAllSystems[i].length; j++) {
			row = `${systems[i]},`;
			row += `${forecastFillers[i]["TimeSlot"][j]},`;
			row += `${uniqueUNITT[forecastFillers[i]["UNITT"]]},`;
			row += !containsCOUNTERInMapping ? `${forecastFillers[i]["COUNTER"]},` : ''
			row += !containsUNITSInMapping ? `${forecastFillers[i]["UNITS"]},` : ''
			row += `${forecastFeatures[i][j].join(",")},`;
			row += `${forecastsForAllSystems[i][j][0].toFixed(2)},`;
			row += calculateRatio(
				containsCOUNTERInMapping ? forecastFeatures[i][j][0] : forecastFillers[i]["COUNTER"],
				containsUNITSInMapping ? forecastFeatures[i][j][2] : forecastFillers[i]["UNITS"],
				Period,
				forecastsForAllSystems[i][j][0].toFixed(2)
			);
			fs.appendFileSync(`./${process.env.NAME_OF_OUTPUT}`, `${row}\n`);
			row = "";
		}
		fs.appendFileSync(`./${process.env.NAME_OF_OUTPUT}`, `\n`);
	}
};
forecastData();
