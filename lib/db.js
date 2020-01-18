'use strict'

const buffer = require('@turf/buffer').default
const createDbHafas = require('db-hafas')

// from https://github.com/isellsoap/deutschlandGeoJSON/blob/117a0a13dca574f8ecb48c6bcacf0580feaf499e/1_deutschland/4_niedrig.geojson
const germany = require('./germany.geo.json').features[0]
const serviceArea = buffer(germany, 50)

const dbHafas = createDbHafas('pan-european-routing')

const enrichLeg = async (legB) => {
	if (!legB.tripId || !legB.line || !legB.line.public) return legB

	// todo
	return legB
}

module.exports = {
	serviceArea,
	clientName: 'db-hafas',
	client: dbHafas,
	enrichLeg
}
