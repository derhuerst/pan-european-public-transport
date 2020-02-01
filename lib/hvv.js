'use strict'

const buffer = require('@turf/buffer').default
const createHafas = require('hafas-client')
const hvvProfile = require('hafas-client/p/hvv')
// const without = require('lodash/without')
// const tokenize = require('tokenize-hvv-station-name')
// const {strictEqual} = require('assert')
const slug = require('slug')
const {hasLineId, hasOperatorId, or, hasProduct} = require('./helpers')

// from https://github.com/derhuerst/deutschlandGeoJSON/blob/c8b1da28dd32ab05b0e52cef882ef4dcc70883b5/2_bundeslaender/4_niedrig.geo.json
const germanStates = require('./german-states.geo.json')
const hamburg = germanStates.features.find(f => f.properties.id === 'DE-HH')
const serviceArea = buffer(hamburg, 15)

const hvvHafas = createHafas(hvvProfile, 'pan-european-routing')

// todo: move to an npm package, e.g. create tokenize-hvv-station-name
// const stopStopwords = [
// 	'bahnhof',
// 	'berlin', 'polen',
// 	'sbahn', 'ubahn'
// ]

const normalizeStopName = (str) => {
	return str // todo
	// return without(tokenize(str), ...stopStopwords)
	// .reduce((tokens, token) => {
	// 	if (/[\w]strasse/g.test(token)) {
	// 		return [...tokens, token.slice(0, -7), token.slice(-7)]
	// 	}
	// 	return [...tokens, token]
	// }, [])
	// .join(' ')
}

// strictEqual(normalizeStopName('Foo Barstr.'), 'foo bar strasse')
// strictEqual(normalizeStopName('str.'), 'strasse')

// todo: "Zug ICE 123" -> "ICE 123"
const normalizeLineName = str => slug(str.replace(/\s/g, ''))

const matchers = {
	// https://www.hvv.de/de/ueber-uns/der-hvv/verkehrsunternehmen
	self: {
		hochbahnBus: hasLineId(/\bhha\b/),
		akn: hasProduct('akn'),
		vhh: hasLineId(/\bvhh\b/),
		akMasten: hasLineId(/\bakma\b/),
		sBahnZVU: hasOperatorId('s-bahn-zvu'),
		// todo: hochbahn
		// todo: hvv, vhh, hvvNimmbus, sBahnHamburg
		// todo: sBahnZVU, startUnterelbe, nordbahn, metronom
	},

	// most DB-subsidiary-operated & independently operated trains
	// just have the operator `zug` in HVV datam, e.g.
	// - ICE, EC, IC, IRE
	// - DB Regio Nord, Regionalverkehre Start, erixx
	// see also https://www.hvv.de/de/ueber-uns/der-hvv/verkehrsunternehmen
	// see also https://github.com/public-transport/hafas-client/blob/db9287f7fdc4c4c7f5c3f30a83a7609bea46f426/p/hvv/products.js
	regionalTrain: or(
		hasProduct('regional-train'),
		hasProduct('akn')
	),
	regionalExpressTrain: hasProduct('regional-express-train'),
	longDistanceTrain: hasProduct('long-distance-train'),
}

module.exports = {
	serviceArea,
	clientName: 'hvv',
	client: hvvHafas,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
