'use strict'

const buffer = require('@turf/buffer').default
const createInsaHafas = require('insa-hafas')
const without = require('lodash/without')
const normalize = require('normalize-for-search')
// const {strictEqual} = require('assert')
const {hasOperatorId, or} = require('./helpers')

// from https://github.com/derhuerst/deutschlandGeoJSON/blob/c8b1da28dd32ab05b0e52cef882ef4dcc70883b5/2_bundeslaender/4_niedrig.geo.json
const germanStates = require('./german-states.geo.json')
const saxonyAnhalt = germanStates.features.find(f => f.properties.id === 'DE-ST')
const serviceArea = buffer(saxonyAnhalt, 15)

const insaHafas = createInsaHafas('pan-european-routing')

// todo: move to an npm package, e.g. create tokenize-insa-station-name
const stopStopwords = [
	'mark', 'harz', 'uckermarck'
]

const normalizeStopName = (str) => {
	str = str.replace(/[\s-.]+/g, ' ')
	return without(normalize(str).split(' '), ...stopStopwords)
	.join(' ')
}

// strictEqual(normalizeStopName('Hamburg-Harburg'), 'harburg')
// strictEqual(normalizeStopName('Harburg Rathaus'), 'harburg rathaus')
// strictEqual(normalizeStopName('Barmbek-Nord - ev. Kita'), 'barmbek nord ev kita')

// todo: "Zug ICE 123" -> "ICE 123" ?
const normalizeLineName = (str) => {
	return normalize(str.replace(/\s+/g, ''))
}

const matchers = {
	self: {
		hvg: hasOperatorId('hallesche-verkehrs-ag'),
		omnibusSaalekreis: hasOperatorId('omnibusbetrieb-saalekreis'),
		abellio: hasOperatorId('abellio-rail-mitteldeutschland-gmbh'),
		// todo: does INSA have proper data for HANS?
		hans: hasOperatorId('hanseatische-eisenbahn-gmbh'),
		// tood: does INSA have proper data for Erfurter Bahn?
		erfurterBahn: or(hasOperatorId('erfurter-bahn-express'), hasOperatorId('erfurter-bahn')),
		pvgs: hasOperatorId('pvgs-altmarkkreis-salzwedel'),
	},

	db: {
		dbRegioSüdost: hasOperatorId('db-regio-ag-sudost'),
		dbRegioNord: hasOperatorId('db-regio-ag-nord'),
		dbFernverkehr: hasOperatorId('db-fernverkehr-ag'),
	},

	vbb: {
		dbRegioNordost: hasOperatorId('db-regio-ag-nordost'),
		odeg: hasOperatorId('ostdeutsche-eisenbahn-gmbh'),
	},

	// // most DB-subsidiary-operated & independently operated trains
	// // just have the operator `zug` in insa datam, e.g.
	// // - ICE, EC, IC, IRE
	// // - DB Regio Nord, Regionalverkehre Start, erixx
	// // see also https://www.insa.de/de/ueber-uns/der-insa/verkehrsunternehmen
	// // see also https://github.com/public-transport/hafas-client/blob/db9287f7fdc4c4c7f5c3f30a83a7609bea46f426/p/insa/products.js
	// regionalTrain: or(
	// 	hasProduct('regional-train'),
	// 	hasProduct('akn')
	// ),
	// regionalExpressTrain: hasProduct('regional-express-train'),
	// longDistanceTrain: hasProduct('long-distance-train'),
}

module.exports = {
	serviceArea,
	clientName: 'insa',
	client: insaHafas,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
