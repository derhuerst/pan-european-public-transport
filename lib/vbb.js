'use strict'

const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const createVbbHafas = require('vbb-hafas')
const createHealthCheck = require('hafas-client-health-check')
const without = require('lodash/without')
const tokenize = require('tokenize-vbb-station-name')
const {strictEqual} = require('assert')
const normalize = require('normalize-for-search')
const withCache = require('./hafas-with-cache')
const {hasOperatorId, hasAdminCode, hasLineId, or} = require('./helpers')

// from https://github.com/derhuerst/deutschlandGeoJSON/blob/c8b1da28dd32ab05b0e52cef882ef4dcc70883b5/2_bundeslaender/4_niedrig.geo.json
const germanStates = require('./german-states.geo.json')
const brandenburg = germanStates.features.find(f => f.properties.id === 'DE-BB')
const berlin = germanStates.features.find(f => f.properties.id === 'DE-BE')
const serviceArea = union(buffer(brandenburg, 2), buffer(berlin, 2))

const endpointName = 'vbb'
const vbbHafas = withCache(endpointName, createVbbHafas('pan-european-routing'))
const healthCheck = createHealthCheck(vbbHafas, '900000017101') // U Mehringdamm

// todo: move to tokenize-vbb-station-name
const stopStopwords = [
	'bahnhof',
	'berlin', 'polen',
	'sbahn', 'ubahn',
	'uckermark',
]

const normalizeStopName = (str) => {
	return without(tokenize(str), ...stopStopwords)
	.reduce((tokens, token) => {
		if (/[\w]strasse/g.test(token)) {
			return [...tokens, token.slice(0, -7), token.slice(-7)]
		}
		return [...tokens, token]
	}, [])
	.join(' ')
}

strictEqual(normalizeStopName('Foo Barstr.'), 'foo bar strasse')
strictEqual(normalizeStopName('str.'), 'strasse')

const normalizeLineName = (str) => {
	return normalize(str.replace(/\s+/g, ''))
}

const matchers = {
	// https://www.vbb.de/der-verkehrsverbund/verkehrsunternehmen
	self: {
		sBahnBerlin: hasOperatorId('s-bahn-berlin-gmbh'),
		bvg: hasOperatorId('berliner-verkehrsbetriebe'),
		odeg: hasOperatorId('odeg-ostdeutsche-eisenbahn-gmbh'),
		neb: hasOperatorId('neb-betriebsgesellschaft-mbh'),
		uvgg: hasOperatorId('uckermarkische-verkehrsgesellschaft-mbh'),
		fft: or(
			hasOperatorId('stadtverkehrsgesellschaft-mbh-frankfurt-oder'),
			hasAdminCode('FFT'), // tram
			hasAdminCode('FFB'), // bus
		),
		mobus: hasOperatorId('mobus-markisch-oderland-bus-gmbh'),
		bos: hasOperatorId('busverkehr-oder-spree-gmbh'),
		dbRegioBusOst: hasOperatorId('db-regio-bus-ost-gmbh'),
		teltowFläming: hasOperatorId('verkehrsgesellschaft-teltow-flaming-mbh'),
		elbeElster: hasOperatorId('verkehrsmanagement-elbe-elster-gmbh'),
		oberspreewaldLausitz: hasOperatorId('verkehrsgesellschaft-oberspreewald-lausitz-mbh'),
		bex: or( // https://erdbeershuttle.de
			hasOperatorId('bex-bayern-express-p-kuhn-berlin-gmbh'),
			hasAdminCode('BEX001'),
		),
		rvs: hasAdminCode('regionale-verkehrsgesellschaft-dahme-spreewald-mbh'),
	},

	// todo: https://github.com/public-transport/hafas-client/issues/149
	// https://de.wikipedia.org/wiki/DB_Regio
	db: {
		ice: hasLineId(/\bice\b/),
		ire: hasLineId(/\bire\b/),
		dbRegio: hasOperatorId('db-regio-ag'),
	},

	pkp: {
		pkpIntercity: hasOperatorId('pkp-intercity'),
		polregio: hasOperatorId('polregio'),
	},

	insa: {
		hvg: hasOperatorId('hallesche-verkehrs-ag'),
	},

	flixtrain: hasOperatorId('flixtrain-gmbh'),
	nightjet: hasLineId(/\bnj\b/),

	// todo: BOB/BRB/Meridian uses an unknown system
	bob: hasOperatorId('bayerische-oberlandbahn-gmbh'),
}

module.exports = {
	serviceArea,
	endpointName,
	client: vbbHafas,
	healthCheck,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
