'use strict'

const buffer = require('@turf/buffer').default
const createDbHafas = require('db-hafas')
const without = require('lodash/without')
const tokenize = require('tokenize-db-station-name')
const slug = require('slug')

// from https://github.com/isellsoap/deutschlandGeoJSON/blob/117a0a13dca574f8ecb48c6bcacf0580feaf499e/1_deutschland/4_niedrig.geojson
const germany = require('./germany.geo.json').features[0]
const serviceArea = buffer(germany, 50)

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
