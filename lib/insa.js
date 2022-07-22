'use strict'

const buffer = require('@turf/buffer')
const createInsaHafas = require('insa-hafas')
const createHealthCheck = require('hafas-client-health-check')
const without = require('lodash/without')
const tokenize = require('tokenize-insa-station-name')
const {strictEqual} = require('assert')
const normalize = require('normalize-for-search')
const withCache = require('./hafas-with-cache')
const {hasOperatorId, or, hasProduct} = require('./helpers')

// from https://github.com/derhuerst/deutschlandGeoJSON/blob/c8b1da28dd32ab05b0e52cef882ef4dcc70883b5/2_bundeslaender/4_niedrig.geo.json
const germanStates = require('./german-states.geo.json')
const saxonyAnhalt = germanStates.features.find(f => f.properties.id === 'DE-ST')
const serviceArea = buffer(saxonyAnhalt, 15)

const endpointName = 'insa'
const insaHafas = withCache(endpointName, createInsaHafas('pan-european-routing'))
const healthCheck = createHealthCheck(insaHafas, '90072') // Magdeburg Hbf

const normalizeStopName = (str) => {
	return without(tokenize(str), 'halle').join(' ')
}

strictEqual(normalizeStopName('Halle  (Saale), Hallmarkt'), 'hallmarkt')

const normalizeLineName = (str) => {
	str = str
	.replace(/^zug\s+/ig, '') // long-distance trains?
	// we need this to match DB line names?
	.replace(/^str\s+/ig, '') // trams
	// .replace(/\s+/g, '')
	return normalize(str)
}
strictEqual(normalizeLineName('STR 7'), '7')

const matchers = {
	self: {
		hvg: hasOperatorId('hallesche-verkehrs-ag'),
		omnibusSaalekreis: hasOperatorId('omnibusbetrieb-saalekreis'),
		abellio: hasOperatorId('abellio-rail-mitteldeutschland-gmbh'),
		// todo: Erfurter Bahn seems to be covered by VMT
		// see public-transport/hafas-client#158
		erfurterBahn: or(hasOperatorId('erfurter-bahn-express'), hasOperatorId('erfurter-bahn')),
		pvgs: hasOperatorId('pvgs-altmarkkreis-salzwedel'),
	},

	db: {
		dbRegioSüdost: hasOperatorId('db-regio-ag-sudost'),
		dbRegioNord: hasOperatorId('db-regio-ag-nord'),
		dbRegioBayern: hasOperatorId('db-regio-ag-bayern'),
		dbFernverkehr: hasOperatorId('db-fernverkehr-ag'),
	},

	vbb: {
		dbRegioNordost: hasOperatorId('db-regio-ag-nordost'),
		odeg: hasOperatorId('ostdeutsche-eisenbahn-gmbh'),
		// todo: is this correct?
		hans: hasOperatorId('hanseatische-eisenbahn-gmbh'),
	},

	// most DB-subsidiary-operated & independently operated trains
	// just have the operator `zug` in insa data, e.g.
	// - ICE, EC, IC, IRE
	// - DB Regio Nord, Regionalverkehre Start, erixx
	// see also https://www.insa.de/de/ueber-uns/der-insa/verkehrsunternehmen
	// see also https://github.com/public-transport/hafas-client/blob/db9287f7fdc4c4c7f5c3f30a83a7609bea46f426/p/insa/products.js
	regionalExpressTrain: hasProduct('regional-express-train'),
	regionalTrain: hasProduct('regional-train'),
	longDistanceTrain: hasProduct('long-distance-train'),
}

module.exports = {
	serviceArea,
	endpointName,
	client: insaHafas,
	healthCheck,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
