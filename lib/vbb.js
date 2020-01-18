'use strict'

const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const createVbbHafas = require('db-hafas')

// from https://github.com/derhuerst/deutschlandGeoJSON/blob/c8b1da28dd32ab05b0e52cef882ef4dcc70883b5/2_bundeslaender/4_niedrig.geo.json
const germanStates = require('./german-states.geo.json')
const brandenburg = germanStates.features.find(f => f.properties.id === 'DE-BB')
const berlin = germanStates.features.find(f => f.properties.id === 'DE-BE')
const serviceArea = union(buffer(brandenburg, 2), buffer(berlin, 2))

const vbbHafas = createVbbHafas('pan-european-routing')

const enrichLeg = async (legB) => {
	if (!legB.tripId || !legB.line || !legB.line.public) return legB

	// todo
	return legB
}

module.exports = {
	serviceArea,
	clientName: 'vbb-hafas',
	client: vbbHafas,
	enrichLeg
}
