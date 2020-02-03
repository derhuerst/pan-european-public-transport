'use strict'

const {matchers: db} = require('./db')
const {matchers: vbb} = require('./vbb')
const {matchers: hvv} = require('./hvv')

const matchers = {
	db: {
		vbb: [
			...Object.values(db.vbb).map(fn => [fn, true]),
			...Object.values(db.self).map(fn => [fn, false]),
		],
		hvv: [
			...Object.values(db.hvv).map(fn => [fn, true]),
			...Object.values(db.self).map(fn => [fn, false]),
		]
	},
	vbb: {
		db: [
			...Object.values(vbb.db).map(fn => [fn, true]),
			...Object.values(vbb.self).map(fn => [fn, false]),
		],
	},
	hvv: {
		db: [
			[hvv.regionalTrain, true],
			[hvv.regionalExpressTrain, true],
			[hvv.longDistanceTrain, true],
			...Object.values(hvv.self).map(fn => [fn, false]),
		]
	},
}

module.exports = matchers
