'use strict'

const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const createVbbHafas = require('vbb-hafas')
const createDbHafas = require('db-hafas')

// from https://github.com/derhuerst/deutschlandGeoJSON/blob/c8b1da28dd32ab05b0e52cef882ef4dcc70883b5/2_bundeslaender/4_niedrig.geo.json
const germanStates = require('./german-states.geo.json')
const brandenburg = germanStates.features.find(f => f.properties.id === 'DE-BB')
const berlin = germanStates.features.find(f => f.properties.id === 'DE-BE')
const vbbArea = union(buffer(brandenburg, 2), buffer(berlin, 2))

// from https://github.com/isellsoap/deutschlandGeoJSON/blob/117a0a13dca574f8ecb48c6bcacf0580feaf499e/1_deutschland/4_niedrig.geojson
const germany = require('./germany.geo.json')
const dbArea = buffer(germany, 50)

const vbbHafas = createVbbHafas('pan-european-routing')
const dbHafas = createDbHafas('pan-european-routing')

const routingEndpoints = [
	// priority, bbox, name, client
	[0, vbbArea, 'vbb-hafas', vbbHafas],
	[1, dbArea, 'db-hafas', dbHafas],
].sort((a, b) => a[0] - b[0])

const enrichWithVbb = async (legB) => {
	// todo
	return legB
}

const enrichWithDb = async (legB) => {
	// todo
	return legB
}

const enrichLegFns = [
	enrichWithVbb,
	enrichWithDb
]

module.exports = {
	routingEndpoints,
	enrichLegFns
}
