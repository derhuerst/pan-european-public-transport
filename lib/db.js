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
	'sbahn',

	'bayern', 'thueringen', 'sachsen', 'anhalt', 'westfalen', 'wuerttemberg', 'oberpfalz', 'schwaben', 'oberbayern', 'holstein', 'braunschweig', 'saalekreis', 'saalekreis', 'niederbayern', 'schwarzwald', 'oldenburg', 'uckermark', 'rheinland', 'oberfranken', 'rheinhessen', 'hessen', 'altmark', 'limesstadt', 'vogtland', 'mecklenburg', 'mittelfranken', 'dillkreis', 'odenwald', 'erzgebirge', 'prignitz', 'oberhessen', 'ostfriesland', 'schleswig', 'unterfranken', 'westerwald', 'dithmarschen',
	// todo: 'saechsische schweiz', 'thueringer wald', 'schaumburg lippe', 'frankfurt main'
	'bahnhof',
	'fernbahnhof'
]

const normalizeStopName = (str) => {
	return without(tokenize(str), ...stopStopwords).join(' ')
}

const normalizeLineName = str => slug(str.replace(/\s/g, ''))

module.exports = {
	serviceArea,
	clientName: 'db-hafas',
	client: dbHafas,
	normalizeStopName,
	normalizeLineName
}
