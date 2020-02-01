'use strict'

const {feature: toGeoJSON} = require('topojson-client')
const world = require('world-atlas/countries-50m.json')
const simplify = require('@turf/simplify').default
const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const createDbHafas = require('db-hafas')
const without = require('lodash/without')
const tokenize = require('tokenize-db-station-name')
const slug = require('slug')
const {strictEqual} = require('assert')
const {hasLineId, hasOperatorId} = require('./helpers')

const countries = toGeoJSON(world, world.objects.countries).features
const countriesInServiceArea = [
	// todo: add all
	'Germany', 'Norway', 'Sweden',
	'Denmark', 'Poland', 'Czechia',
	'Austria', 'Switzerland', 'Italy',
	'France', 'Spain', 'Portugal',
	'Luxembourg', 'Belgium', 'Netherlands',
	'United Kingdom'
]
.map(name => countries.find(c => c.properties.name === name))

const _serviceArea =
countriesInServiceArea
.slice(1)
.reduce((all, country) => union(all, country), countriesInServiceArea[0])
const serviceArea = simplify(buffer(_serviceArea, 50), {tolerance: .01})

const dbHafas = createDbHafas('pan-european-routing')

// todo: move to tokenize-db-station-name
const stopStopwords = [
	'bahnhof',
	'berlin',
	'ubahn', 'sbahn', '[tram]',

	'bayern', 'thueringen', 'sachsen', 'anhalt', 'westfalen', 'wuerttemberg', 'oberpfalz', 'schwaben', 'oberbayern', 'holstein', 'braunschweig', 'saalekreis', 'saalekreis', 'niederbayern', 'schwarzwald', 'oldenburg', 'uckermark', 'rheinland', 'oberfranken', 'rheinhessen', 'hessen', 'altmark', 'limesstadt', 'vogtland', 'mecklenburg', 'mittelfranken', 'dillkreis', 'odenwald', 'erzgebirge', 'prignitz', 'oberhessen', 'ostfriesland', 'schleswig', 'unterfranken', 'westerwald', 'dithmarschen',
	// todo: 'saechsische schweiz', 'thueringer wald', 'schaumburg lippe', 'frankfurt main'
	'bahnhof',
	'fernbahnhof'
]

const normalizeStopName = (str) => {
	return without(tokenize(str), ...stopStopwords).join(' ')
}

const normalizeLineName = (str) => {
	str = str
	.replace(/^bus\s+/ig, '') // buses
	.replace(/^str\s+/ig, '') // trams
	.replace(/\s/g, '')
	return slug(str)
}

strictEqual(normalizeLineName('Bus 142'), '142')
strictEqual(normalizeLineName('Metro Bus 142'), 'MetroBus142')

const matchers = {
	// https://de.wikipedia.org/wiki/DB_Regio
	self: {
		dbFernverkehr: hasOperatorId('db-fernverkehr-ag'),
		dbRegioAgNord: hasOperatorId('db-regio-ag-nord'),
		dbRegioAgNordost: hasOperatorId('db-regio-ag-nordost'),
	},

	// https://www.vbb.de/der-verkehrsverbund/verkehrsunternehmen
	vbb: {
		bvgBus: hasLineId(/\bvbbbvb\b/),
		bvgTram: hasLineId(/\bvbbbvt\b/),
		bvgUBahn: hasLineId(/\bvbbbvu\b/),
		sBahnBerlin: hasOperatorId('s-bahn-berlin'),
		odeg: hasOperatorId('ostdeutsche-eisenbahn-gmbh'),
	},

	// https://de.wikipedia.org/wiki/Hamburger_Verkehrsverbund#In_den_HVV_integrierte_Unternehmen
	hvv: {
		hvv: hasLineId(/\bhvv\d*\b/),
		vhh: hasLineId(/\bhvvvhh\d*\b/), // Verkehrsbetriebe Hamburg-Holstein
		hvvNimmbus: hasLineId(/\bhvvhha\b/), // todo: is this actually Nimmbus?
		sBahnHamburg: hasOperatorId('s-bahn-hamburg'),
		sBahnZVU: hasOperatorId('s-bahn-zvu'),
		startUnterelbe: hasOperatorId('verkehrsgesellschaft-start-unterelbe-mbh'),
		nordbahn: hasOperatorId('nordbahn-eisenbahngesellschaft'),
		metronom: hasOperatorId('metronom'),
	},
}

module.exports = {
	serviceArea,
	clientName: 'db',
	client: dbHafas,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
