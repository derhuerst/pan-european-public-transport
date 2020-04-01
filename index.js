'use strict'

// const pSeries = require('p-series')
const debug = require('debug')('pan-european-routing')
const {
	endpoints,
	enrichLegFns,
	enrichArrDepFns,
} = require('./lib/endpoints')
const {isInside} = require('./lib/helpers')

// todo: make this an option
// const pAll = pSeries
const pAll = tasks => Promise.all(tasks.map(task => task()))

const asLocation = (loc, name) => {
	if ('object' !== typeof loc || !loc) {
		throw new Error(name + ' must be an object')
	}
	if (loc.type === 'location') return loc
	if (loc.type === 'stop' || loc.type === 'station') return loc.location
	throw new Error('invalid ' + name)
}

const _stationBoard = async (method, clientName, station, opt = {}) => {
	const loc = asLocation(station, 'station')
	const endpoint = endpoints.find(([_, __, cName]) => cName === clientName)
	if (!endpoint) throw new Error('invalid endpoint/client name')
	const [
		_, __, ___,
		client,
		normalizeStopName, normalizeLineName,
	] = endpoint
	debug(`using ${clientName} for fetching ${method} at`, station)

	opt = {...opt, remarks: true}
	const arrsDeps = await client[method](station, opt)
	// todo: compute stable IDs

	const enrich = enrichArrDepFns
	.filter(([srcClientName]) => srcClientName === clientName)
	const enrichArrDep = async (arrDep) => {
		// This works like a "parallel" reduce/fold.
		let enrichedArrDep = arrDep
		await pAll(enrich.map(([_, __, matchArrDep]) => async () => {
			try {
				const enrich = await matchArrDep(method, arrDep)
				if (enrich) enrichedArrDep = enrich(enrichedArrDep)
			} catch (err) {
				if (err.name === 'ReferenceError' || err.name === 'TypeError') throw err
				debug('enriching failed', err)
			}
		}))
		return enrichedArrDep
	}

	return await pAll(arrsDeps.map(arrDep => () => enrichArrDep(arrDep)))
}

const departures = _stationBoard.bind(null, 'departures')
const arrivals = _stationBoard.bind(null, 'arrivals')

const journeys = async (from, to, opt = {}) => {
	const _from = asLocation(from, 'from')
	const _to = asLocation(to, 'to')

	const endpoint = endpoints.find(([_, serviceArea]) => {
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
	departures, arrivals,
	journeys
}
