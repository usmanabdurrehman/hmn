First run the command npm install so that it installs all the packages

You can start the project by running 
npm start <numDaysToLookBack> <numDaysToForecastArg> <bumpParameter> <bumpStart> <variableMapping> <PeriodKey> 
<datasource>

Each command line parameter has a default value so only running npm start will do the job as well. The default values are given below

numDaysToLookBack = "SOD",
numDaysToForecast = 730,
bumpParameter = 0,
bumpStart = 0,
variableMapping = "MV_CNT1",
PeriodKey = "Day",
datasource = "csv"

1) The numDaysToLookBack variable will be used for picking the number of rows used to train the model. This is done using a function getDataFromNumDaysToLookback present in the utils file
2) The numDaysToForecast variabe will be used for determining the number of intervals to be forecasted. The extrapolation is done in a function forecastFeature present inside the utils file
3) The <bumpParameter>. The number with which the COUNTER variable should be bumped.
4) The <bumpStart>. The row number from which, the Bump should be applied.
   The bumping is applied in the integrateXY function in the utils file. The bumping part is present in around lines 380 to 386. 
5) <variableMapping> parameter. This is done using a function selectXY in the utils file. 
   You also said to apply linear or polynomail regression in the case of a single feature. I am using polynomial regression of degree 2. You can change the degree from the .env file. 
   Also you said that it should do multivariat regression in case of multiple features which it is doing automatically out of the box(talking about the PolynomailRegressor).
6) The <PeriodKey>. This mapping is done using an array getPeriod inside the subutils file.
7) <datasource> argument determines whether the data should be fetched from a postgres database or csv file.

Each function has a description on top of it. You can read it to get a better understanding of it.

If you have any further questions. You can always message me on fiverr. Cheers