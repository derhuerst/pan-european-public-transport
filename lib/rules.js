'use strict'

const {matchers: db} = require('./db')
const {matchers: vbb} = require('./vbb')
const {matchers: hvv} = require('./hvv')

const withRetVal = (retVal, matchers) => {
	return Object.entries(matchers)
	.map(([name, testFn]) => [name, testFn, retVal])
}

const matchers = {
	db: {
		vbb: [
			...withRetVal(true, db.vbb),
			...withRetVal(false, db.self),
		],
		hvv: [
			...withRetVal(true, db.hvv),
			...withRetVal(false, db.self),
		]
	},
	vbb: {
		db: [
			...withRetVal(true, vbb.db),
			...withRetVal(false, vbb.self),
		],
	},
	hvv: {
		db: [
			['regionalTrain', hvv.regionalTrain, true],
			['regionalExpressTrain', hvv.regionalExpressTrain, true],
			['longDistanceTrain', hvv.longDistanceTrain, true],
			...withRetVal(false, hvv.self),
		]
	},
}

module.exports = matchers
