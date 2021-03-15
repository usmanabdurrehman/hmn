let lookup = [{
	mapping:'SLP_MET1',
	X:['Day of the Month'],
	Y:['FltMet1']
},{
	mapping:'LIN_DOM1',
	X:['Day of the Month'],
	Y:['FltMet1']
},{
	mapping:'LIN_CNT1',
	X:['COUNTER'],
	Y:['FltMet1']
},{
	mapping:'LIN_CNT2',
	X:['COUNTER'],
	Y:['FltMet2']
},{
	mapping:'MV_CNT1',
	X:['COUNTER','Day of the Month','UNITS'],
	Y:['FltMet1']
},{
	mapping:'MV_CNT2',
	X:['COUNTER','Day of the Year','UNITS'],
	Y:['FltMet2']
}
,{
	mapping:'MV_CNT3',
	X:['COUNTER','Day of the Month','UNITS'],
	Y:['FltMet2']
}
]


module.exports = lookup