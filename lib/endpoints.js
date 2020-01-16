'use strict'

const createVbbHafas = require('vbb-hafas')
const createDbHafas = require('db-hafas')

// todo
// const vbbBbox = require('german-states/as-geojson').BB
// const dbBbox = require('germany/as-geojson').BB

const vbbHafas = createVbbHafas('pan-european-routing')
const dbHafas = createDbHafas('pan-european-routing')

const routingEndpoints = [
	// priority, bbox, name, client
	[0, vbbBbox, 'vbb-hafas', vbbHafas],
	[1, dbBbox, 'db-hafas', dbHafas],
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
