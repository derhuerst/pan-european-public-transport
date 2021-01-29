'use strict'

const simplify = require('@turf/simplify')
const buffer = require('@turf/buffer')
const createHafas = require('hafas-client')
const pkpProfile = require('hafas-client/p/pkp')
const createHealthCheck = require('hafas-client-health-check')
const without = require('lodash/without')
const slug = require('slug')
const {strictEqual} = require('assert')
const normalize = require('normalize-for-search')
const countries = require('./countries')
const withCache = require('./hafas-with-cache')
const {hasOperatorId, hasAdminCode, or} = require('./helpers')

const _serviceArea = countries.find(c => c.properties.name === 'Poland')
const serviceArea = simplify(buffer(_serviceArea, 50), {tolerance: .01})

const endpointName = 'pkp'
const pkpHafas = withCache(endpointName, createHafas(pkpProfile, 'pan-european-routing'))
const healthCheck = createHealthCheck(pkpHafas, '5100069') // Wrocław Główny

// todo: move to an npm package, e.g. create tokenize-pkp-station-name
const stopStopwords = [
	'gl', 'ul', 'glowny',
]
const normalizeStopName = (str) => {
	str = str.replace(/[\s-.]+/g, ' ')
	str = slug(str)
	return without(str.split('-'), ...stopStopwords)
	.join(' ')
}

strictEqual(normalizeStopName('Poznań Główny'), 'poznan')
strictEqual(normalizeStopName('Bydgoszcz, Sowa ul. Dworcowa'), 'bydgoszcz sowa dworcowa')

const normalizeLineName = (str) => {
	return normalize(str.replace(/\s+/g, ''))
}
strictEqual(normalizeLineName('foo bar 12'), 'foobar12')

const matchers = {
	self: {
		pkpIntercity: hasOperatorId('pkp-intercity'),
		polregio: hasOperatorId('polregio'),
		// https://en.wikipedia.org/wiki/Szybka_Kolej_Miejska_(Tricity)
		tricity: hasOperatorId('szybka-kolej-miejska-w-trojmiescie'),

		// todo: find own endpoints
		// https://en.wikipedia.org/wiki/Łódzka_Kolej_Aglomeracyjna
		łódź: hasOperatorId('lodzka-kolej-aglomeracyjna'),
		// https://en.wikipedia.org/wiki/Koleje_Wielkopolskie
		wielkopolskie: hasOperatorId('koleje-wielkopolskie'),
		// https://en.wikipedia.org/wiki/Koleje_Dolnośląskie
		dolnośląskie: hasOperatorId('koleje-dolnoslaskie'),
		// https://en.wikipedia.org/wiki/Koleje_Śląskie
		śląskie: hasOperatorId('koleje-slaskie'),
		// https://en.wikipedia.org/wiki/Koleje_Małopolskie
		małopolskie: hasOperatorId('koleje-malopolskie'),
	},

	db: {
		dbFernverkehr: hasOperatorId('db-fernverkehr-ag'),

		dbRegioAgNord: hasOperatorId('db-regio-ag-nord'),
		dbRegioAgNordost: hasOperatorId('db-regio-ag-nordost'),
		dbRegioAgSüdost: hasOperatorId('db-regio-ag-sudost'),
		dbRegioAgBayern: hasOperatorId('db-regio-ag-bayern'),

		dbArriva: hasOperatorId('db-arriva'),
	},

	// todo: DB or CD? https://cs.wikipedia.org/wiki/ARRIVA_vlaky
	cd: {
		cd: hasOperatorId('ceske-drahy'),

		// todo: cover its own endpoint
		// https://en.wikipedia.org/wiki/RegioJet
		regiojet: hasOperatorId('regiojet'),
	},

	// todo: https://en.wikipedia.org/wiki/Železničná_spoločnosť_Slovensko
	// todo: https://en.wikipedia.org/wiki/Ukrainian_Railways
	// todo: russian railways
	// or(
	// 	hasAdminCode('20LJ'),
	// 	hasAdminCode('20SH'),
	// 	hasAdminCode('20KJ'),
	// 	hasAdminCode('20OJ'),
	// ),

	vbb: {
		odeg: hasOperatorId('ostdeutsche-eisenbahn-gmbh'),
		neb: hasOperatorId('neb-niederbarnimer-eisenbahn'),

		sBahn: hasOperatorId('s-bahn-berlin'),
		// PKP doesn't seem to have buses & trams
		bvg: hasAdminCode('vbbBVU'),
	},

	// todo: https://de.wikipedia.org/wiki/Die_Länderbahn#Trilex
}

module.exports = {
	serviceArea,
	endpointName,
	client: pkpHafas,
	healthCheck,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
