'use strict'

const pLimit = require('p-limit')
const debug = require('debug')('pan-european-public-transport')
const {
	endpoints,
	enrichLegFns,
	enrichArrDepFns,
} = require('./lib/endpoints')
const {isInside} = require('./lib/helpers')
const {client: dbClient} = require('./lib/db')

const ENRICH = Symbol.for('pan-european-public-transport:enrich')

const ENRICH_ARRS_DEPS_CONCURRENCY = process.env.ENRICH_ARRS_DEPS_CONCURRENCY
	? parseInt(process.env.ENRICH_ARRS_DEPS_CONCURRENCY)
	: Infinity
const ENRICH_LEGS_CONCURRENCY = process.env.ENRICH_LEGS_CONCURRENCY
	? parseInt(process.env.ENRICH_LEGS_CONCURRENCY)
	: Infinity

const asLocation = (loc, name) => {
	if ('object' !== typeof loc || !loc) {
		throw new Error(name + ' must be an object')
	}
	if (loc.type === 'location') return loc
	if (loc.type === 'stop' || loc.type === 'station') return loc.location
	throw new Error('invalid ' + name)
}

const _stationBoard = async (method, endpointName, station, opt = {}) => {
	const loc = asLocation(station, 'station')
	const endpoint = endpoints.find(([_, __, cName]) => cName === endpointName)
	if (!endpoint) throw new Error('invalid endpoint/client name')
	const [
		_, __, ___,
		client,
		normalizeStopName, normalizeLineName,
	] = endpoint
	debug(`using ${endpointName} for fetching ${method} at`, station)

	opt = {...opt, remarks: true}
	const arrsDeps = await client[method](station, opt)
	// todo: compute stable IDs
	if (opt[ENRICH] === false) return arrsDeps

	const enrich = enrichArrDepFns
	.filter(([srcEndpointName]) => srcEndpointName === endpointName)

	const limited = pLimit(ENRICH_ARRS_DEPS_CONCURRENCY)
	const enrichArrDep = async (arrDep) => {
		// This works like a "parallel" reduce/fold.
		let enrichedArrDep = arrDep
		await Promise.all(enrich.map(([_, __, matchArrDep]) => limited(async () => {
			try {
				const enrich = await matchArrDep(method, arrDep)
				if (enrich) enrichedArrDep = enrich(enrichedArrDep)
			} catch (err) {
				if (err.name === 'ReferenceError' || err.name === 'TypeError') throw err
				debug('enriching failed', err)
			}
		})))
		return enrichedArrDep
	}

	return await Promise.all(arrsDeps.map(arrDep => enrichArrDep(arrDep)))
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
	const [_, __, endpointName, client] = endpoint
	debug(`using ${endpointName} for routing`, from, to)

	opt = {stopovers: true, ...opt}
	const {journeys} = await client.journeys(_from, _to, opt)
	// todo: compute stable IDs
	if (opt[ENRICH] === false) return {journeys}

	const enrich = enrichLegFns
	.filter(([srcEndpointName]) => srcEndpointName === endpointName)

	const limited = pLimit(ENRICH_LEGS_CONCURRENCY)
	const enrichLeg = async (leg, legI) => {
		if (leg.walking) return leg

		// This works like a "parallel" reduce/fold.
		let enrichedLeg = leg
		await Promise.all(enrich.map(([_, __, matchLeg]) => limited(async () => {
			try {
				const enrichLeg = await matchLeg(leg)
				if (enrichLeg) enrichedLeg = enrichLeg(enrichedLeg)
			} catch (err) {
				if (err.name === 'ReferenceError' || err.name === 'TypeError') throw err
				debug('enriching failed', err)
			}
		})))
		return enrichedLeg
	}

	const enrichJourney = async (journey) => ({
		...journey,
		legs: await Promise.all(journey.legs.map(leg => enrichLeg(leg)))
	})

	return {
		journeys: await Promise.all(journeys.map(j => enrichJourney(j)))
	}
}

const client = Object.create(dbClient)
client.ENRICH = ENRICH

client.departures = departures
client.arrivals = arrivals
client.journeys = journeys

module.exports = client
