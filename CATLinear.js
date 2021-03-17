/*
History:
2021-Mar-11 CRS 
2021-Mar-10 CRS Cleanup; Added new parameter to control integer growth and compound that it could use improvements.
2021-Mar-09 CRS Cleanup items on output; fixing ratio calculation
2021-Mar-08     Code Drop Phase II
2021-Feb-26 CRS Following changes were made
	Parameterized Output and Log file and also changed name of var for input file.
	Added Run info to Console.log as well as reformatted to a single line with delimiters so it can be parsed.
	Added Output filename to console.log output.
	Modified it to create a new output file each time vs. appending.
2021-Feb-25     Original Framework Version Phase I
*/
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
	dayOfTheWeek,
	makeDateString,
	getJulainDay
} = require("./utils/subutils");
const parseCsv = require("./readcsv");
require("dotenv").config();
const rowcnt = 1;
const jdate = 212396035500000000;

let forecastData = async () => {
	// Getting arguments from command line
	let myArgs = process.argv.slice(2);

	// Assigning the arguments into variables
	let [
		numDaysToLookBack = "SOD",
		numDaysToForecast = 730,
		bumpParameter = 0,
		bumpStart = 0,
		rateOfGrowth = 0,
		variableMapping = "MV_CNT1",
		PeriodKey = "Day",
		datasource = "csv",
	] = myArgs;
	console.log(
		`Run Arguments|LookBack:${numDaysToLookBack} | DaysToForecast:${numDaysToForecast}|bumpAmount:${bumpParameter}|bumpStart:${bumpStart}|rateOfGrowth:${rateOfGrowth}|varMap:${variableMapping}|PeriodKey:${PeriodKey}|datasource:${datasource}|Input:${process.env.NAME_OF_INPUT}|Output:${process.env.NAME_OF_OUTPUT}\n`
	);

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
	let rowcnt = 0
	csv = csv.map((row, index) => {
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
		//2017-10-17 00:00:00

		let [date, time] = TimeSlot.includes(" ")
			? TimeSlot.split(" ")
			: [TimeSlot, null];
		let dateSeperator = date.includes("-") ? "-" : "/";
		let [year, month, day] = date
			.split(dateSeperator)
			.map((e) => parseInt(e));
		let [hour, min, sec] = time
			? time.split(":").map((e) => parseInt(e))
			: [0, 0, 0];
		let dateObj = new Date(year, month - 1, day, parseInt(hour), parseInt(min), parseInt(sec));

		let unix_time = Math.round(dateObj.getTime()/1000);
		let TTime = makeDateString([year, month, day, hour, min, sec],dateSeperator,true)
		TimeSlot = makeDateString([year, month, day, hour, min, sec],dateSeperator)

		//Increment row counter so it is continuous from original to forecast.
		rowcnt = index + 1;
		//Populated Original Data Row output in the output file.
		return {
			"TIMESTAMP_TimeStamp":getJulainDay(year,month,day),
			MonNode: MonNode,
			TimeSlot: TimeSlot,
			UNITT: uniqueUNITT.indexOf(UNITT),
			UNITS: UNITS,
			COUNTER: COUNTER,
			FltMet1: FltMet1,
			FltMet2: FltMet2,
			Rat1: calculateRatio(COUNTER, UNITS, Period, FltMet1),
			Rat2: calculateRatio(COUNTER, UNITS, Period, FltMet2),
			// Row Counter here
			Row: rowcnt,
			//Add O = Original Data.
			Dtype: "O",
			Method: variableMapping,
			//----- TO DO ---- Add Fields being used in forecast or ZERO (0) fill.
			Features: "|Original|",
			"TTime":TTime,
			"UnixTS":unix_time, 

			//Not needed in output but needed for processing
			"Year(4 digit)": year,
			"Year(2 digit)": parseInt(`${year}`.slice(2, 4)),
			Month: month,
			"Day of the Year": dayOfYear(dateObj),
			"Day of the Month": day,
			"Day of the Week": dayOfTheWeek[dateObj.getDay()],
			"Time Hour": hour,
			"Time Minute": min,
			"Time Seconds": sec
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
		forecastData,
	] = utils.integrateXY(
		csv,
		variableMapping,
		numDaysToForecast,
		numDaysToLookBack,
		bumpStart,
		bumpParameter,
		rateOfGrowth
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
		equation = `Linear Regression: ${weights[1]} * (x) + ${weights[0]}`;
		/*
			Making the log string which will be populated in the log.txt file
		*/
		let log = `${date} ${time} | ${
			X[i].length
		} samples examined | Samples examined from ${
			dates[i].firstDateString
		} to ${
			dates[i].lastDateString
		} | Forecasts made: ${numDaysToForecast}  | Vars: ${forecastColumns.join()}| Eq: ${equation} | R2 score ${r2_score} \n\n`;
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
		`${Object.keys(data[0][0])
			.slice(0, 16)
			.join(",")}\n`
	);

	// Writing the original data
	//console.log(`Writing Original Data to CSV: ${process.env.NAME_OF_OUTPUT}`);

	for (let i = 0; i < systems.length; i++) {
		let row = "";
		for (let j = 0; j < data[i].length; j++) {
			//----- TO DO ----  Break this out into individual variables
			row = Object.values(data[i][j]).slice(0, 16).join(",");
			fs.appendFileSync(`./${process.env.NAME_OF_OUTPUT}`, `${row}\n`);
			row = "";
		}
	}
	/*
		Writing forecast data to forecast file
	*/

	// Writing the forecast data headers
	let containsCOUNTERInMapping = forecastColumns.includes("COUNTER");
	let containsUNITSInMapping = forecastColumns.includes("UNITS");

	// fs.appendFileSync(
	// 	`./${process.env.NAME_OF_OUTPUT}`,
	// 	`\n\nMonNode(1),TimeSlot(2),UNITT(3),UNITS(4),COUNTER(5), FltMet1(6), FltMet2(7), Rat1(8), Rat2(9), RowNum(10), DType(11), Method(12),"|${forecastColumns.join(
	// 		","
	// 	)}|(13)" \n`
	// );
	//console.log(`Writing Forecast Data to CSV: ${process.env.NAME_OF_OUTPUT}`);

	// Writing the forecast data
	for (let i = 0; i < systems.length; i++) {
		let row = "";
		for (let j = 0; j < forecastsForAllSystems[i].length; j++) {
			//---- TO DO ---- Add Julian Date Timestamp (212396035500000000)
			//new Date().getTime()/86400000 + 2440587.5
			// row = `${jdate[i]},`;
			row += `${forecastData[i]["TIMESTAMP_TimeStamp"][j]},`;
			row += `${systems[i]},`;
			//----- TO DO ----  The timestamp should be the same format as the input or simply it should be standardized as YYYY-MM-DD HH:MM:SS
			row += `${forecastData[i]["TimeSlot"][j]},`;
			//----- TO DO ---- This currently outputs the text string which is ideal.. but the original data outputs the numeric. They need to be consistent.
			row += `${forecastData[i]["UNITT"][0]},`;
			// This outputs the last seen MAX(UNITS) values; Forecast should match.
			row += `${forecastData[i]["UNITS"][0]},`;
			//This incorrectly increases the units counter.
			//row += `${forecastData[i]["UNITS"].length==1 ? forecastData[i]["UNITS"][0] : forecastData[i]["UNITS"][j]},`

			row += `${
				forecastData[i]["COUNTER"].length == 1
					? forecastData[i]["COUNTER"][0]
					: forecastData[i]["COUNTER"][j]
			},`;
			row += `${
				forecastColumns.includes("FltMet1")
					? forecastsForAllSystems[i][j][0].toFixed(2)
					: 0
			},`;
			row += `${
				forecastColumns.includes("FltMet2")
					? forecastsForAllSystems[i][j][0].toFixed(2)
					: 0
			},`;

			//Forecast Output
			//----- This MUST ALWAYS include FLOAT 1 and FLOAT 2 columns; even if not a feature. It should be included as zero if not.
			//----- This MUST ALWAYS include RAT 1 and RAT 2 columns; even if not a feature. It should be included as zero if not.
			row += `${
				forecastColumns.includes("FltMet1")
					? calculateRatio(
							containsCOUNTERInMapping
								? forecastFeatures[i][j][0]
								: forecastData[i]["COUNTER"].length == 1
								? forecastData[i]["COUNTER"][0]
								: forecastData[i]["COUNTER"][j],
							containsUNITSInMapping
								? forecastFeatures[i][j][2]
								: forecastData[i]["UNITS"].length == 1
								? forecastData[i]["UNITS"][0]
								: forecastData[i]["UNITS"][j],
							Period,
							forecastsForAllSystems[i][j][0].toFixed(2)
					  )
					: 0
			},`;
			row += `${
				forecastColumns.includes("FltMet2")
					? calculateRatio(
							containsCOUNTERInMapping
								? forecastFeatures[i][j][0]
								: forecastData[i]["COUNTER"].length == 1
								? forecastData[i]["COUNTER"][0]
								: forecastData[i]["COUNTER"][j],
							containsUNITSInMapping
								? forecastFeatures[i][j][2]
								: forecastData[i]["UNITS"].length == 1
								? forecastData[i]["UNITS"][0]
								: forecastData[i]["UNITS"][j],
							Period,
							forecastsForAllSystems[i][j][0].toFixed(2)
					  )
					: 0
			},`;
			//----- TO DO ---- Add Data Row Counter starting from the row of the original data; currently this is just a counter of forecasts.
			row += `${rowcnt++},`;
			row += `F,`;
			//Variable Mapping - Profile.
			row += `${variableMapping},`;
			//Raw Features / Input Fields
			row += `"|${forecastFeatures[i][j].join("-")}|",`;
			row += `${forecastData[i]['TTime'][j]},`
			row += `${forecastData[i]['UnixTS'][j]}`
			//----- TO DO ---- If the date breakdowns are going to exist in the original data they need to be here or at least zero column.. ideally the data.
			fs.appendFileSync(`./${process.env.NAME_OF_OUTPUT}`, `${row}\n`);
			row = "";
		}
	}
};
forecastData();
