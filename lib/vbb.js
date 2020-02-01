'use strict'

const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const createVbbHafas = require('db-hafas')
const without = require('lodash/without')
const tokenize = require('tokenize-vbb-station-name')
const {strictEqual} = require('assert')
const slug = require('slug')
const {hasOperatorId, hasLineId} = require('./helpers')

// from https://github.com/derhuerst/deutschlandGeoJSON/blob/c8b1da28dd32ab05b0e52cef882ef4dcc70883b5/2_bundeslaender/4_niedrig.geo.json
const germanStates = require('./german-states.geo.json')
const brandenburg = germanStates.features.find(f => f.properties.id === 'DE-BB')
const berlin = germanStates.features.find(f => f.properties.id === 'DE-BE')
const serviceArea = union(buffer(brandenburg, 2), buffer(berlin, 2))

const vbbHafas = createVbbHafas('pan-european-routing')

// todo: move to tokenize-vbb-station-name
const stopStopwords = [
	'bahnhof',
	'berlin', 'polen',
	'sbahn', 'ubahn'
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

const normalizeLineName = str => slug(str.replace(/\s/g, ''))

const matchers = {
	// https://www.vbb.de/der-verkehrsverbund/verkehrsunternehmen
	self: {
		sBahnBerlin: hasOperatorId('s-bahn-berlin-gmbh'),
		bvg: hasOperatorId('berliner-verkehrsbetriebe'),
		odeg: hasOperatorId('odeg-ostdeutsche-eisenbahn-gmbh'),
		neb: hasOperatorId('neb-betriebsgesellschaft-mbh'),
	},

	// todo: https://github.com/public-transport/hafas-client/issues/149
	// https://de.wikipedia.org/wiki/DB_Regio
	db: {
		ice: hasLineId(/\bice\b/),
		ire: hasLineId(/\bire\b/),
	},

	flixtrain: hasOperatorId('flixtrain-gmbh'),
	nightjet: hasLineId(/\bnj\b/),
}

module.exports = {
	serviceArea,
	clientName: 'vbb',
	client: vbbHafas,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
