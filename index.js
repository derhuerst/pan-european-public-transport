'use strict'

const isPointInPolygon = require('@turf/boolean-point-in-polygon').default
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

const inside = (polygon, point) => {
	return isPointInPolygon([point.longitude, point.latitude], polygon)
}

const journeys = async (from, to, opt = {}) => {
	const _from = formatLocation(from, 'from')
	const _to = formatLocation(to, 'to')

	const endpoint = routingEndpoints.find(([_, bbox]) => {
		return inside(bbox, _from) && inside(bbox, _to)
	})
	if (!endpoint) throw new Error('no endpoint covers from & to')
	const [_, __, clientName, client] = endpoint
	debug(`using ${clientName} for routing`, {from, to})

	opt = {stopovers: true, ...opt}
	let {journeys} = await client.journeys(_from, _to, opt)
	// todo: compute stable IDs

	const enrich = enrichLegFns.filter(([srcClientName]) => {
		return srcClientName === clientName
		// todo: filter by `enrichClientName`, e.g. using geolocation?
	})
	for (const [_, enrichClientName, enrichLeg] of enrich) {
		const enrichJourney = async (journey) => ({
			...journey,
			legs: await Promise.all(journey.legs.map(async (leg) => {
				if (leg.walking) return leg

				debug('enriching leg with', enrichClientName, leg.tripId, leg.line && leg.line.name)
				try {
					return await enrichLeg(leg)
				} catch (err) {
					debug('enriching failed', err)
					return leg
				}
			}))
		})
		journeys = await Promise.all(journeys.map(enrichJourney))
	}

	return {journeys}
}

module.exports = {
	journeys
}
