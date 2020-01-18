'use strict'

const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const {
	serviceArea: dbServiceArea,
	clientName: dbClientName,
	client: dbClient,
	enrichLeg: enrichLegWithDb
} = require('./db')
const {
	serviceArea: vbbServiceArea,
	clientName: vbbClientName,
	client: vbbClient,
	enrichLeg: enrichLegWithVbb
} = require('./vbb')

const routingEndpoints = [
	// priority, serviceArea, clientName, client
	[0, vbbServiceArea, vbbClientName, vbbClient],
	[1, dbServiceArea, dbClientName, dbClient],
].sort((a, b) => a[0] - b[0])

const enrichLegFns = [
	[vbbClientName, enrichLegWithVbb],
	[dbClientName, enrichLegWithDb]
]

module.exports = {
	routingEndpoints,
	enrichLegFns
}
