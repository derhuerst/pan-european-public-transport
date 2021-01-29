'use strict'

const buffer = require('@turf/buffer')
const createHafas = require('hafas-client')
const hvvProfile = require('hafas-client/p/hvv')
const createHealthCheck = require('hafas-client-health-check')
const without = require('lodash/without')
const normalize = require('normalize-for-search')
const {strictEqual} = require('assert')
const withCache = require('./hafas-with-cache')
const {hasLineId, hasOperatorId, or, hasProduct} = require('./helpers')

// from https://github.com/derhuerst/deutschlandGeoJSON/blob/c8b1da28dd32ab05b0e52cef882ef4dcc70883b5/2_bundeslaender/4_niedrig.geo.json
const germanStates = require('./german-states.geo.json')
const hamburg = germanStates.features.find(f => f.properties.id === 'DE-HH')
const serviceArea = buffer(hamburg, 15)

const endpointName = 'hvv'
const hvvHafas = withCache(endpointName, createHafas(hvvProfile, 'pan-european-routing'))
const healthCheck = createHealthCheck(hvvHafas, '3204') // Harburg

// todo: move to an npm package, e.g. create tokenize-hvv-station-name
const stopStopwords = [
	'bf', 'hamburg'
]

const normalizeStopName = (str) => {
	str = str.replace(/[\s-.]+/g, ' ')
	return without(normalize(str).split(' '), ...stopStopwords)
	.join(' ')
}

strictEqual(normalizeStopName('Hamburg-Harburg'), 'harburg')
strictEqual(normalizeStopName('Harburg Rathaus'), 'harburg rathaus')
strictEqual(normalizeStopName('Barmbek-Nord - ev. Kita'), 'barmbek nord ev kita')

// todo: "Zug ICE 123" -> "ICE 123"
const normalizeLineName = (str) => {
	return normalize(str.replace(/\s+/g, ''))
}

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
	endpointName,
	client: hvvHafas,
	healthCheck,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
