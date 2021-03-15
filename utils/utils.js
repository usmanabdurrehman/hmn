let sub = require("date-fns/sub");
const addDays = require("date-fns/addDays");
const {
  reshape,
  dayOfYear,
  getQuarter,
  isNumeric,
  isObject,
  dayOfTheWeek,
  getJulainDay,
} = require("./subutils");
let variableMappingLookup = require("../variableMappingLookup");

// Seperates the data by system so that we can treat it independently
let seperateBySystem = (data) => {
  let uniqlabel = [...new Set(data.map((ar) => ar.MonNode))];
  let temparr = [];

  for (let i = 0; i < uniqlabel.length; i++) {
    temparr.push([]);
  }

  data.forEach((item) => {
    let MonNode = item.MonNode;
    let index = uniqlabel.indexOf(MonNode);
    temparr[index].push(item);
  });

  return [temparr, uniqlabel];
};

/*
  Returns the data based on the <numDaysToLookBack> parameter
  The mapping is done based on this scheme

  ⦁ Numeric:  1-9999  (currently in place)
  ⦁ Start of the Data = SOD
  ⦁ Start of Last Year = SLY
  ⦁ Last Six Months = L6M
  ⦁ Last 12 Months = L12M
  ⦁ Last 18 Months = L18M
  ⦁ Last 24 Months = L24M
  ⦁ Start of the Year = “SOY”
  ⦁ Start of the Quarter (Jan1,Apr1, July1, Oct1) = “SOQ”
  ⦁ Start of the Month “SOM”
*/

let getDataFromNumDaysToLookback = (data, numDaysToLookBack) => {
  if (!numDaysToLookBack) {
    return data;
  } else if (isNumeric(numDaysToLookBack)) {
    numDaysToLookBack = parseInt(numDaysToLookBack);
    return data.length >= numDaysToLookBack
      ? data.slice(-numDaysToLookBack, data.length)
      : data;
  } else {
    let lastYearOfData = data[data.length - 1]["Year(4 digit)"];
    let lastMonthOfData = data[data.length - 1]["Month"];
    let lastDayOfData = data[data.length - 1]["Day of the Month"];
    let lastDateObject = new Date(
      lastYearOfData,
      lastMonthOfData - 1,
      lastDayOfData
    );
    let idx;
    switch (numDaysToLookBack) {
      case "SOD":
        return data;
        break;
      case "SLY":
        idx = 0;
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i]["Year(4 digit)"] > lastYearOfData - 2) {
            idx += 1;
          } else break;
        }
        return data.slice(-idx, data.length);
        break;
      case "L6M":
        let last6MonthsDate = sub(lastDateObject, { months: 6 });
        idx = 0;
        for (let i = data.length - 1; i >= 0; i--) {
          if (
            new Date(
              data[i]["Year(4 digit)"],
              data[i]["Month"] - 1,
              data[i]["Day of the Month"]
            ) > last6MonthsDate
          ) {
            idx += 1;
          } else break;
        }
        return data.slice(-idx, data.length);
        break;
      case "L12M":
        let last12MonthsDate = sub(lastDateObject, { months: 12 });
        idx = 0;
        for (let i = data.length - 1; i >= 0; i--) {
          if (
            new Date(
              data[i]["Year(4 digit)"],
              data[i]["Month"],
              data[i]["Day of the Month"]
            ) > last12MonthsDate
          ) {
            idx += 1;
          } else break;
        }
        return data.slice(-idx, data.length);
        break;
      case "L18M":
        let last18MonthsDate = sub(lastDateObject, { months: 18 });
        idx = 0;
        for (let i = data.length - 1; i >= 0; i--) {
          if (
            new Date(
              data[i]["Year(4 digit)"],
              data[i]["Month"],
              data[i]["Day of the Month"]
            ) > last18MonthsDate
          ) {
            idx += 1;
          } else break;
        }
        return data.slice(-idx, data.length);
        break;
      case "L24M":
        let last24MonthsDate = sub(lastDateObject, { months: 24 });
        idx = 0;
        for (let i = data.length - 1; i >= 0; i--) {
          if (
            new Date(
              data[i]["Year(4 digit)"],
              data[i]["Month"],
              data[i]["Day of the Month"]
            ) > last24MonthsDate
          ) {
            idx += 1;
          } else break;
        }
        return data.slice(-idx, data.length);
        break;
      case "SOY":
        idx = 0;
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i]["Year(4 digit)"] == lastYearOfData) {
            idx += 1;
          } else break;
        }
        return data.slice(-idx, data.length);
        break;
      case "SOQ":
        let monthOfStartOfQuarter = getQuarter(lastMonthOfData);
        idx = 0;
        for (let i = data.length - 1; i >= 0; i--) {
          if (
            data[i]["Month"] >= monthOfStartOfQuarter &&
            data[i]["Year(4 digit)"] == lastYearOfData
          ) {
            idx += 1;
          } else break;
        }
        return data.slice(-idx, data.length);
        break;
      case "SOM":
        // done
        idx = 0;
        for (let i = data.length - 1; i >= 0; i--) {
          if (
            data[i]["Month"] == lastMonthOfData &&
            data[i]["Year(4 digit)"] == lastYearOfData
          ) {
            idx += 1;
          } else break;
        }
        return data.slice(-idx, data.length);
        break;
      default:
        return data;
        break;
    }
  }
};

/*
  Maps XY according to the <variableMapping> passed
  The mapping is done according to this scheme

  ⦁ SLP_MET1 = Slope of Line for Float Metric 1
  ⦁ LIN_DOM1 = Valid for Linear or Polynomial Regression and 
    X = Day of the Month and Y = Float Metric 1
  ⦁ LIN_CNT1 = Valid for Linear or Polynomial Regression and
    X = Integer COUNTER and Y = Float Metric 1
  ⦁ LIN_CNT2 = Valid for Linear or Polynomial Regression and 
    X = Integer COUNTER and Y = Float Metric 2
  ⦁ MV_CNT1 = Valid for Multivariant regression utilizing 
    Integer Counter, Day of the Month and Units to forecast Metric 1
  ⦁ MV_CNT2 = Valid for Multivariant regression utilizing 
    Integer Counter, Day of the Month and Units to forecast Metric 2
*/

let selectXY = (data, variableMapping) => {
  let x, y, columns;
  let { mapping, X, Y } = variableMappingLookup.find(
    (obj) => obj.mapping == variableMapping
  );
  x = data.map((d) => {
    let obj = {};
    X.forEach((column) => {
      obj[column] = d[column];
    });
    return obj;
  });
  y = data.map((d) => d[Y[0]]);
  columns = [...X, ...Y];
  return [x, y, columns];
};

/*
  Gets the rate of growth for each feature.
  It subtracts each subsequent value from the next and utilizes all those values
  to take an average. 
  e.g If I have an array UNITS [4,5,6,7,5,7]
  Then The calculation will be performed as 
  => absolute(4-5) + absolute(5-6) + absolute(6-7) + ..... + absolute(5-7) / length of [4,5,6,7,5,7]
  => (1 + 1 + 1 + 2 + 2) / 5
  => 7/5
  This will give us an avg value of 1.4
*/
let getRateOfGrowth = (arr) => {
  let results = [];
  for (let i = 0; i < arr.length - 1; i++) {
    results.push({
      diff: Math.abs((arr[i] - arr[i + 1]) / arr[i]),
      op: arr[i] - arr[i + 1] > 0 ? "sub" : "add",
    });
  }
  if (results.length == 0) {
    results.push({
      diff: 0,
      op: "add",
    });
  }
  let avg =
    results.map((e) => e.diff).reduce((acc, val) => acc + val) / results.length;
  avg = parseFloat(avg.toFixed(2));
  let oparray = results.map((e) => e.op);
  return [results, avg, oparray];
};

/*
  The avg obtained from the getRateOfGrowth() will be used to 
  forecast for that particular feature

  Taking the example given above forward where we got 1.4 average, 
  1.4 would be randomly added or subtracted to each value
  for <numDaysToForecast> number of times to extrapolate it

  This extrapolation will be used to predict(forecast) for
  those features 
*/
let forecastFeature = (arr, numDaysToForecast) => {
  let forecastFeature = [];
  let x = arr[arr.length - 1][0];
  let [_, avg, oparray] = getRateOfGrowth(arr);
  let randomop;
  /*
    Running a loop <numDaysToForecast> number of times and 
    adding or subtracting(random) te avg from the previous number
  */
  for (let i = 0; i < numDaysToForecast; i++) {
    randomop = oparray[Math.floor(Math.random() * oparray.length)];
    x = randomop == "add" ? x + avg : Math.abs(x - avg);
    forecastFeature.push([Math.round(x)]);
  }
  return forecastFeature;
};

let integrateXY = (
  data,
  variableMapping,
  numDaysToForecast,
  numDaysToLookBack,
  bumpStart,
  bumpParameter,
  rateOfGrowth
) => {
  /*
    Gets data according to what the numDaysToLookback parameter is passed from the command line
    More on that can be found inside the function definition
  */
  data = getDataFromNumDaysToLookback(data, numDaysToLookBack);
  console.log(
    "Number of Samples that come in the lookback period => ",
    data.length
  );
  /*
    Seperates the data according to system so that independent analysis could be
    performed on those
  */

  let seperatedBySystem = seperateBySystem(data);
  data = seperatedBySystem[0];
  let systems = seperatedBySystem[1];

  /*
    Initializing variables
    These would be utilized later
  */

  let [XSystem, ySystem, forecastFeaturesSystem, forecastData, datesSystem] = [
    [],
    [],
    [],
    [],
    [],
  ];
  let columns;
  for (let f = 0; f < data.length; f++) {
    /*
      Taking out the first and last date from the data which will be used in the log
    */
    let firstDateString = data[f][0]["TimeSlot"].split(" ")[0];
    let lastDateString = data[f][data[f].length - 1]["TimeSlot"].split(" ")[0];
    let dates = { firstDateString, lastDateString };
    datesSystem.push(dates);
    let dateSeperator = lastDateString.includes("-") ? "-" : "/";
    let [yr, mo, day] = lastDateString
      .split(dateSeperator)
      .map((str) => parseInt(str));
    /*
      Taking the lastDate from the data which will be used to extrapolate day if
      the variableMapping involves using the day variable to forecast data 
    */
    let lastDate = new Date(yr, mo - 1, day);
    /*
      Selects the features based on the variable mapping passed
    */
    let [X, y, cols] = selectXY(data[f], variableMapping);
    columns = cols;
    let forecastFeatures = [];
    for (let k = 0; k < numDaysToForecast; k++) {
      forecastFeatures.push([]);
    }
    let keys = Object.keys(X[0]);
    forecastData.push({
      UNITT: [data[f][data[f].length - 1]["UNITT"]],
      UNITS: [data[f][data[f].length - 1]["UNITS"]],
      COUNTER: [data[f][data[f].length - 1]["COUNTER"]],
    });
    let temparr;
    for (let i = 0; i < keys.length; i++) {
      let datesToForecast = [];
      for (let j = 1; j <= numDaysToForecast; j++) {
        datesToForecast.push(addDays(lastDate, j));
      }
      /*
          Extrapolating days
        */
      forecastData[f].TimeSlot = datesToForecast.map(
        (date) =>
          `${date.getFullYear()}${dateSeperator}${(date.getMonth() + 1)
            .toString()
            .padStart(
              2,
              "0"
            )}${dateSeperator}${date
            .getDate()
            .toString()
            .padStart(2, "0")} 00:00:00`
      );
      forecastData[f].TTime = datesToForecast.map(
        (date) =>
          `${date.getFullYear()}${dateSeperator}${(date.getMonth() + 1)
            .toString()
            .padStart(
              2,
              "0"
            )}${dateSeperator}${date
            .getDate()
            .toString()
            .padStart(2, "0")}T00:00:00`
      );
      forecastData[f].UnixTS = datesToForecast.map((date) =>
        Math.round(date.getTime() / 1000)
      );
      forecastData[f].TIMESTAMP_TimeStamp = datesToForecast.map((date) =>
        getJulainDay(date.getFullYear(), date.getMonth() + 1, date.getDate())
      );
      if (keys[i] == "Day of the Month") {
        temparr = datesToForecast.map((date) => date.getDate());
        temparr = reshape(temparr, temparr.length, 1);
      } else if (keys[i] == "Day of the Year") {
        temparr = datesToForecast.map((date) => dayOfYear(date));
        temparr = reshape(temparr, temparr.length, 1);
      } else if (keys[i] == "Day of the Week") {
        temparr = datesToForecast.map((date) => dayOfTheWeek(date.getDay()));
        temparr = reshape(temparr, temparr.length, 1);
      } else if (keys[i] == "Year(4 digit)") {
        temparr = datesToForecast.map((date) => date.getFullYear());
        temparr = reshape(temparr, temparr.length, 1);
      } else if (keys[i] == "Month") {
        temparr = datesToForecast.map((date) => date.getMonth());
        temparr = reshape(temparr, temparr.length, 1);
      } else if (keys[i] == "UNITS" || keys[i] == "UNITT") {
        let lastUNITVal = data[f][data[f].length - 1][keys[i]];
        temparr = [];
        for (let h = 0; h < numDaysToForecast; h++) {
          temparr.push(lastUNITVal);
        }
        temparr = reshape(temparr, temparr.length, 1);
      } else if (keys[i] == "COUNTER") {
        let lastCounterVal = X[X.length - 1]["COUNTER"];
        let Counter = X.map((x) => x.COUNTER);
        let [_, rateOfGrowthCalculated, __] = getRateOfGrowth(Counter);
        console.log(
          `Calculated Rate of Growth of COUNTER for system ${systems[f]} => ${rateOfGrowthCalculated}`
        );
        temparr = [lastCounterVal];
        for (let k = 0; k < numDaysToForecast; k++) {
          temparr.push(
            parseInt(
              temparr[temparr.length - 1] +
                temparr[temparr.length - 1] * rateOfGrowthCalculated
            )
          );
        }
        temparr = reshape(temparr, temparr.length, 1);
        /*
          The COUNTER feature will be bumped by the bumping parameter <bumpParameter>
          starting from the <bumpStart> parameter which are both passed from the 
          command line
        */
        let idx = 0;
        temparr = temparr.map((count) => {
          idx += 1;
          return idx >= bumpStart
            ? [count[0] + count[0] * (bumpParameter / 100)]
            : count;
        });
        let [___, rateOfGrowthAfterBump, ____] = getRateOfGrowth(
          [].concat.apply([], temparr)
        );
        console.log(
          `Calculated Rate of Growth of COUNTER for system ${systems[f]} after bump => ${rateOfGrowthAfterBump}`
        );
      } else {
        temparr = X.map((x) => x[keys[i]]);
        temparr = reshape(temparr, temparr.length, 1);
        /*
          Extrapolating using the forecastFeature function
          More details can be found in function definition
        */
        temparr = forecastFeature(temparr, numDaysToForecast);
      }
      forecastData[f][keys[i]] = [].concat.apply([], temparr);
      for (let j = 0; j < numDaysToForecast; j++) {
        forecastFeatures[j].push(temparr[j][0]);
      }
    }
    X = X.map((row) => Object.values(row));
    y = reshape(y, y.length, 1);
    XSystem.push(X);
    ySystem.push(y);
    forecastFeaturesSystem.push(forecastFeatures);
  }
  return [
    data,
    XSystem,
    ySystem,
    forecastFeaturesSystem,
    datesSystem,
    systems,
    columns,
    forecastData,
  ];
};

// Calculates the r2 score
function r2_score(y, y_hat) {
  let regressionSquaredError = 0;
  let totalSquaredError = 0;

  /*
    Flattening the arrays
  */
  y = [].concat.apply([], y);
  y_hat = [].concat.apply([], y_hat);

  let yMean = y.reduce((a, b) => a + b) / y.length;

  for (let i = 0; i < y.length; i++) {
    regressionSquaredError += Math.pow(y[i] - y_hat[i], 2);
    totalSquaredError += Math.pow(y[i] - yMean, 2);
  }
  return (1 - regressionSquaredError / totalSquaredError).toFixed(2);
}

module.exports = {
  integrateXY,
  r2_score,
};
