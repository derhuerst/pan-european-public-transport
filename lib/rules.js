'use strict'

const {matchers: db} = require('./db')
const {matchers: pkp} = require('./pkp')
const {matchers: vbb} = require('./vbb')
const {matchers: hvv} = require('./hvv')
const {matchers: insa} = require('./insa')

const withRetVal = (retVal, matchers) => {
	return Object.entries(matchers)
	.map(([name, testFn]) => [name, testFn, retVal])
}

const matchers = {
	db: {
		pkp: [
			...withRetVal(true, db.pkp),
			...withRetVal(false, db.self),
		],
		vbb: [
			...withRetVal(true, db.vbb),
			...withRetVal(false, db.self),
		],
		hvv: [
			...withRetVal(true, db.hvv),
			...withRetVal(false, db.self),
		],
		insa: [
			...withRetVal(true, db.insa),
			...withRetVal(false, db.self),
		],
	},
	pkp: {
		db: [
			...withRetVal(true, pkp.db),
			...withRetVal(false, pkp.self),
		],
		cd: [
			...withRetVal(true, pkp.cd),
			...withRetVal(false, pkp.self),
		],
		vbb: [
			...withRetVal(true, pkp.vbb),
			...withRetVal(false, pkp.self),
		],
	},
	vbb: {
		db: [
			...withRetVal(true, vbb.db),
			...withRetVal(false, vbb.self),
			vbb.bob,
		],
		pkp: [
			...withRetVal(true, vbb.pkp),
			...withRetVal(false, vbb.self),
			vbb.bob,
		],
		insa: [
			...withRetVal(true, vbb.insa),
			...withRetVal(false, vbb.self),
		],
	},
	hvv: {
		db: [
			['regionalTrain', hvv.regionalTrain, true],
			['regionalExpressTrain', hvv.regionalExpressTrain, true],
			['longDistanceTrain', hvv.longDistanceTrain, true],
			...withRetVal(false, hvv.self),
		],
	},
	insa: {
		db: [
			...withRetVal(true, insa.db),
			...withRetVal(false, insa.self),
		],
		vbb: [
			...withRetVal(true, insa.vbb),
			...withRetVal(false, insa.self),
		],
	},
}

module.exports = matchers
