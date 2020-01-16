'use strict'

const debug = require('debug')('pan-european-routing')
const {
	routingEndpoints,
	enrichLegFns
} = require('./lib/endpoints')

const formatLocation = (loc, name) => {
	if ('object' !== typeof loc || !loc) {
		throw new Error(name + ' must be an object')
	}
	if (loc.type === 'location') return loc
	if (loc.type === 'stop' || loc.type === 'station') return loc.location
	throw new Error('invalid ' + name)
}

const journeys = await (from, to, opt = {}) => {
	const _from = formatLocation(from, 'from')
	const _to = formatLocation(to, 'to')

	const endpoint = routingEndpoints.find(([_, bbox]) => {
		return inside(bbox, _from) && inside(bbox, _to)
	})
	if (!endpoint) throw new Error('no endpoint covers from & to')
	const [_, __, clientName, client] = endpoint[3]
	debug(`using ${clientName} for routing`, {from, to})

	// todo: compute stable IDs
	let {journeys} = client.journeys(_from, _to, opt)
	for (const enrichLeg of enrichLegFns) {
		journeys = await Promise.all(async (journey) => ({
			...journey,
			// todo: debug logging
			legs: await Promise.all(journey.legs.map((leg) => {
				return enrichLeg(leg).catch(() => leg)
			}))
		}))
	}

	return {journeys}
}

module.exports = {
	journeys
}
