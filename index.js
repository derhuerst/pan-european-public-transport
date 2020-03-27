'use strict'

// const pSeries = require('p-series')
const debug = require('debug')('pan-european-routing')
const {
	routingEndpoints,
	enrichLegFns
} = require('./lib/endpoints')
const {isInside} = require('./lib/helpers')

// todo: make this an option
// const pAll = pSeries
const pAll = tasks => Promise.all(tasks.map(task => task()))

const formatLocation = (loc, name) => {
	if ('object' !== typeof loc || !loc) {
		throw new Error(name + ' must be an object')
	}
	if (loc.type === 'location') return loc
	if (loc.type === 'stop' || loc.type === 'station') return loc.location
	throw new Error('invalid ' + name)
}

const journeys = async (from, to, opt = {}) => {
	const _from = formatLocation(from, 'from')
	const _to = formatLocation(to, 'to')

	const endpoint = routingEndpoints.find(([_, serviceArea]) => {
		return isInside(_from, serviceArea) && isInside(_to, serviceArea)
	})
	if (!endpoint) throw new Error('no endpoint covers from & to')
	const [_, __, clientName, client] = endpoint
	debug(`using ${clientName} for routing`, from, to)

	opt = {stopovers: true, ...opt}
	const {journeys} = await client.journeys(_from, _to, opt)
	// todo: compute stable IDs

	const enrich = enrichLegFns
	.filter(([srcClientName]) => srcClientName === clientName)

	const enrichLeg = async (leg) => {
		if (leg.walking) return leg

		// This works like a "parallel" reduce/fold.
		let enrichedLeg = leg
		await pAll(enrich.map(([_, clientName, matchLeg]) => async () => {
			try {
				const enrichLeg = await matchLeg(leg)
				if (enrichLeg) enrichedLeg = enrichLeg(enrichedLeg)
			} catch (err) {
				if (err.name === 'ReferenceError' || err.name === 'TypeError') throw err
				debug('enriching failed', err)
			}
		}))
		return enrichedLeg
	}

	const enrichJourney = async (journey) => ({
		...journey,
		legs: await pAll(journey.legs.map(leg => () => enrichLeg(leg)))
	})

	return {
		journeys: await pAll(journeys.map(j => () => enrichJourney(j)))
	}
}

module.exports = {
	journeys
}
