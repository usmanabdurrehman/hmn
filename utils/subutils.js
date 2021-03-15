/*
  Reshapes the array to required shape
  Needs to be done before feeding any array to a model
*/

let reshape = function (array, rows, cols) {
  var copy = array.slice(0); // Copy all elements.
  array.length = 0; // Clear out existing array.

  for (var r = 0; r < rows; r++) {
    var row = [];
    for (var c = 0; c < cols; c++) {
      var i = r * cols + c;
      if (i < copy.length) {
        row.push(copy[i]);
      }
    }
    array.push(row);
  }
  return array;
};

const dayOfYear = (date) =>
  Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);

/*
  Mapping the period parameter passed as <PeriodKey>
  to the respective value according to this scheme
  ⦁ QHR = 900
  ⦁ HHR = 1,800
  ⦁ Hour = 3,600
  ⦁ Day =  86,400 (default if not present)
  ⦁ Week = 604,800
  ⦁ Month = 2,628,000
  ⦁ Qtr = 7,884,000
  ⦁ Half = 15,768,000
  ⦁ Year = 31, 536,000 
*/

const getPeriod = (key) => {
  let periods = [
    {
      name: "QHR",
      value: 900,
    },
    {
      name: "HHR",
      value: 1800,
    },
    {
      name: "Hour",
      value: 3600,
    },
    {
      name: "Day",
      value: 86400,
    },
    {
      name: "Week",
      value: 604800,
    },
    {
      name: "Month",
      value: 2628000,
    },
    {
      name: "Qtr",
      value: 7884000,
    },
    {
      name: "Half",
      value: 15768000,
    },
    {
      name: "Year",
      value: 31536000,
    },
  ];

  return periods.find(
    (period) => period.name.toLowerCase() == key.toLowerCase()
  )["value"];
};

// Tells if the parameter passed is a number(even thou it is string number)
function isNumeric(str) {
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
}

// Returns whether an object passed inside the function is an object or not(boolean value)
let isObject = (yourVariable) => {
  return typeof yourVariable === "object" && yourVariable !== null;
};

/* 
  Gets the quarter month given a month
  e.g For June, the quarter month will be 4
*/
let getQuarter = (m) => {
  let quarter;
  if ([12, 11, 10].includes(m)) {
    quarter = 10;
  } else if ([9, 8, 7].includes(m)) {
    quarter = 7;
  } else if ([6, 5, 4].includes(m)) {
    quarter = 4;
  } else {
    quarter = 1;
  }
  return quarter;
};

let calculateRatio = (COUNTER, UNITS, Period, FltMet) => {
  let ratio =
    parseFloat(COUNTER) /
    parseFloat(UNITS) /
    parseFloat(Period) /
    (parseFloat(FltMet) / 100);
  return isFinite(ratio) ? ratio.toFixed(2) : 0;
};

let dayOfTheWeek = [7, 1, 2, 3, 4, 5, 6];

let makeDateString = (dateArr, dateSeperator, TTime = false) => {
  let [year, month, day, hour, min, sec] = dateArr;
  return `${year}${dateSeperator}${month
    .toString()
    .padStart(2, "0")}${dateSeperator}${day.toString().padStart(2, "0")}${
    TTime ? "T" : " "
  }${hour.toString().padStart(2, "0")}:${min
    .toString()
    .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

let getJulainDay = (Year,Month,Day) => {
  a = parseInt((14 - Month) / 12);
  y = Year + 4800 - a;
  m = Month + 12 * a - 3;
  JDN =
    Day +
    parseInt((153 * m + 2) / 5) +
    365 * y +
    parseInt(y / 4) -
    parseInt(y / 100) +
    parseInt(y / 400) -
    32045; 
  return JDN;
};

module.exports = {
  reshape,
  dayOfYear,
  getPeriod,
  getQuarter,
  isNumeric,
  calculateRatio,
  dayOfTheWeek,
  makeDateString,
  getJulainDay
};
