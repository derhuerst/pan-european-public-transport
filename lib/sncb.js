'use strict'

const simplify = require('@turf/simplify')
const buffer = require('@turf/buffer')
const createHafas = require('hafas-client')
const sncbProfile = require('hafas-client/p/sncb')
const createHealthCheck = require('hafas-client-health-check')
const without = require('lodash/without')
const slug = require('slug')
const {strictEqual} = require('assert')
const normalize = require('normalize-for-search')
const countries = require('./countries')
const withCache = require('./hafas-with-cache')
const {hasOperatorId, hasAdminCode, or} = require('./helpers')

const _serviceArea = countries.find(c => c.properties.name === 'Belgium')
const serviceArea = simplify(buffer(_serviceArea, 30), {tolerance: .01})

const endpointName = 'sncb'
const sncbHafas = withCache(endpointName, createHafas(sncbProfile, 'pan-european-routing'))
const healthCheck = createHealthCheck(sncbHafas, '8892007') // Gent-Sint-Pieters/Gand-Saint-Pierre

// todo: move to an npm package, e.g. create tokenize-sncb-station-name
const stopPatterns = [
	/\[stib\]/i, /\[mivb\]/i, /\[stib\/mivb\]/i, // https://www.stib-mivb.be
	/\[tec\]/i, // https://www.infotec.be
	/\[de lijn\]/i, // https://www.delijn.be
	// country codes
	/\(d\)/i, /\(nl\)/i, /\(lu\)/i, /\(fr\)/i, /\(gb\)/i, /\(ch\)/i,
]
const stopStopwords = []
const normalizeStopName = (str) => {
	for (const r of stopPatterns) {
		str = str.replace(new RegExp(r), '')
	}
	str = slug(str.replace(/[\s-.]+/g, ' '))
	return without(str.split('-'), ...stopStopwords)
	.join(' ')
}
strictEqual(normalizeStopName('WIENER [MIVB]'), 'wiener')
strictEqual(normalizeStopName('WIENER [STIB/MIVB]'), 'wiener')
strictEqual(normalizeStopName('WIERS Gourgues [TEC]'), 'wiers gourgues')
strictEqual(normalizeStopName('Eisden Patro [De Lijn]'), 'eisden patro')
strictEqual(normalizeStopName('Koeln (d)'), 'koeln')
strictEqual(normalizeStopName('Maastricht (NL)'), 'maastricht')
strictEqual(normalizeStopName('Luxembourg (LU)'), 'luxembourg')
strictEqual(normalizeStopName('Lille Europe (FR)'), 'lille europe')
strictEqual(normalizeStopName('London St Pancras (GB)'), 'london st pancras')
strictEqual(normalizeStopName('ZURICH (CH)'), 'zurich')

const normalizeLineName = (str) => {
	str = str
	.replace(/^bus\s+/ig, '') // buses
	.replace(/^tra\s+/ig, '') // trams
	.replace(/\s+/g, '')
	return normalize(str)
}
strictEqual(normalizeLineName('foo bar 12'), 'foobar12')
strictEqual(normalizeLineName('Bus 123a'), '123a')
strictEqual(normalizeLineName('Tra 11a'), '11a')

const matchers = {
	// The SNCB/NMBS endpoint doesn't return `line.operator`, and
	// `line.adminCode` is almost always `SNCB` or the country
	// the train is currently running in. 🙄
	self: {
		sncb: hasAdminCode('SNCB'),
		eurostar: (leg) => {
			if (!leg.line || !leg.line.name) return null
			return /eur\s/i.test(leg.line.name)
		},
		anyBelgian: hasAdminCode('88____'),
	},

	db: {
		ice: (leg) => {
			if (!leg.line || !leg.line.name) return null
			return /ice\s/i.test(leg.line.name)
		},
		// todo: InterCity, EuroCity, Regio?
		anyGerman: hasAdminCode('80____'),
	},

	sncf: {
		tgv: (leg) => {
			if (!leg.line || !leg.line.name) return null
			return /tgv\s/i.test(leg.line.name)
		},
		// tood: TGV INOUI?, OUIGO?
		anyFrench: hasAdminCode('82____'),
	},

	ns: {
		anyDutch: hasAdminCode('84____'),
	},

	cfl: {
		anyLuxembourgish: hasAdminCode('82____'),
	},
}

module.exports = {
	serviceArea,
	endpointName,
	client: sncbHafas,
	healthCheck,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
