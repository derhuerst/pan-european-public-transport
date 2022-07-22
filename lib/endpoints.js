'use strict'

const {deepStrictEqual: eql} = require('assert')
const get = require('lodash/get')
const createFindLeg = require('find-hafas-data-in-another-hafas/find-leg')
const _debug = require('debug')('pan-european-public-transport:endpoints')
const createMergeLeg = require('find-hafas-data-in-another-hafas/merge-leg')
const {createFindArrival, createFindDeparture} = require('find-hafas-data-in-another-hafas/find-arr-dep')
const {createMergeArrival, createMergeDeparture} = require('find-hafas-data-in-another-hafas/merge-arr-dep')
const allRules = require('./rules')
const {isInside} = require('./helpers')
const {
	serviceArea: dbServiceArea,
	endpointName: dbEndpName,
	client: dbClient,
	healthCheck: dbHealthCheck,
	normalizeStopName: normalizeDbStopName,
	normalizeLineName: normalizeDbLineName
} = require('./db')
const {
	serviceArea: pkpServiceArea,
	endpointName: pkpEndpName,
	client: pkpClient,
	healthCheck: pkpHealthCheck,
	normalizeStopName: normalizePkpStopName,
	normalizeLineName: normalizePkpLineName
} = require('./pkp')
const {
	serviceArea: sncbServiceArea,
	endpointName: sncbEndpName,
	client: sncbClient,
	healthCheck: sncbHealthCheck,
	normalizeStopName: normalizeSncbStopName,
	normalizeLineName: normalizeSncbLineName
} = require('./sncb')
const {
	serviceArea: vbbServiceArea,
	endpointName: vbbEndpName,
	client: vbbClient,
	healthCheck: vbbHealthCheck,
	normalizeStopName: normalizeVbbStopName,
	normalizeLineName: normalizeVbbLineName
} = require('./vbb')
const {
	serviceArea: hvvServiceArea,
	endpointName: hvvEndpName,
	client: hvvClient,
	healthCheck: hvvHealthCheck,
	normalizeStopName: normalizeHvvStopName,
	normalizeLineName: normalizeHvvLineName
} = require('./hvv')
const {
	serviceArea: insaServiceArea,
	endpointName: insaEndpName,
	client: insaClient,
	healthCheck: insaHealthCheck,
	normalizeStopName: normalizeInsaStopName,
	normalizeLineName: normalizeInsaLineName
} = require('./insa')

const endpoints = [ // todo: use objects
	// priority, serviceArea, endpointName, client
	[0, vbbServiceArea, vbbEndpName, vbbClient, normalizeVbbStopName, normalizeVbbLineName, vbbHealthCheck],
	[0, hvvServiceArea, hvvEndpName, hvvClient, normalizeHvvStopName, normalizeHvvLineName, hvvHealthCheck],
	[0, insaServiceArea, insaEndpName, insaClient, normalizeInsaStopName, normalizeInsaLineName, insaHealthCheck],
	[1, pkpServiceArea, pkpEndpName, pkpClient, normalizePkpStopName, normalizePkpLineName, pkpHealthCheck],
	[1, dbServiceArea, dbEndpName, dbClient, normalizeDbStopName, normalizeDbLineName, dbHealthCheck],
	// SNCB has very sparse data
	[2, sncbServiceArea, sncbEndpName, sncbClient, normalizeSncbStopName, normalizeSncbLineName, sncbHealthCheck],
].sort((a, b) => a[0] - b[0])

const essentialEndpoints = ['db']

const flatMap = (arr, fn) => {
	return arr.reduce((acc, v, i) => [].concat(acc, fn(v, i)), [])
}
eql(flatMap([2, 3], x => new Array(x).fill(x)), [2, 2, 3, 3, 3])

const allPairs = (...vs) => {
	return flatMap(vs, (v, i) => {
		return [
			...vs.slice(0, i),
			...vs.slice(i + 1)
		].map(v2 => [v, v2])
	})
}
eql(allPairs(1, 2, 3), [
	[1, 2], [1, 3],
	[2, 1], [2, 3],
	[3, 1], [3, 2]
])

// (
//     (endpointNameA, client, serviceAreaA, normalizeStopNameA, normalizeLineNameA),
//     (endpointNameB, client, serviceAreaB, normalizeStopNameB, normalizeLineNameB)
// ), ...
const endpointPairs = allPairs([
	vbbEndpName,
	vbbClient,
	vbbServiceArea,
	normalizeVbbStopName,
	normalizeVbbLineName,
], [
	hvvEndpName,
	hvvClient,
	hvvServiceArea,
	normalizeHvvStopName,
	normalizeHvvLineName,
], [
	insaEndpName,
	insaClient,
	insaServiceArea,
	normalizeInsaStopName,
	normalizeInsaLineName,
], [
	sncbEndpName,
	sncbClient,
	sncbServiceArea,
	normalizeSncbStopName,
	normalizeSncbLineName,
], [
	pkpEndpName,
	pkpClient,
	pkpServiceArea,
	normalizePkpStopName,
	normalizePkpLineName,
], [
	dbEndpName,
	dbClient,
	dbServiceArea,
	normalizeDbStopName,
	normalizeDbLineName,
])

// sourceEndpName, endpointName, enrichLeg
// todo: DRY with `enrichArrDepFns`
const enrichLegFns = endpointPairs.map(([source, target]) => {
	const [
		sourceEndpName, srcClient,
		_,
		normalizeSrcStopName,
		normalizeSrcLineName
	] = source
	const [
		endpName,
		client,
		serviceArea,
		normalizeStopName,
		normalizeLineName
	] = target
	// todo: make `endpointPairs` contain objects
	const A = {
		endpointName: sourceEndpName,
		client: srcClient,
		normalizeStopName: normalizeSrcStopName,
		normalizeLineName: normalizeSrcLineName
	}
	const B = {
		endpointName: endpName,
		client: client,
		normalizeStopName,
		normalizeLineName
	}

	const debug = _debug.extend([sourceEndpName, endpName].join('-'))

	const rules = get(allRules, [sourceEndpName, endpName], [])

	const shouldEnrich = (srcLeg) => {
		if (!srcLeg.tripId || !srcLeg.line || !srcLeg.line.public) return false

		for (const [name, testFn, enrich] of rules) {
			if (testFn(srcLeg) !== true) continue
			if (enrich === false) {
				debug('not enriching because of matcher', name)
				return false
			}
			if (enrich === true) {
				debug('enriching because of matcher', name)
				return true
			}
		}

		// todo: manual, per-endpoint shouldEnrich fn
		// const lName = normalizeSrcLineName(srcLeg.line.name || '', srcLeg.line)
		// const origName = normalizeSrcStopName(srcLeg.origin.name || '', srcLeg.origin)
		// const destName = normalizeSrcStopName(srcLeg.destination.name || '', srcLeg.destination)
		// if (!fn(lName, origName, destName, srcLeg)) return false

		// check if the leg goes through the service area
		const locs = [
			srcLeg.origin,
			srcLeg.destination,
			...(srcLeg.stopovers || []).map(s => s.stop)
		]
		.flatMap(s => [s.station && s.station.location, s.location])
		.filter(loc => !!loc)
		if (!locs.some(loc => isInside(loc, serviceArea))) {
			debug('not enriching because leg is outside service area')
			return false
		}

		return true
	}

	// Once the source leg has been matched with another leg, the
	// latter will be merged into the source leg. Multiple endpoints
	// are used for matching & merged, so, in order to run the
	// *matching* in parallel, matching & merging are split into two
	// steps.

	const findLeg = createFindLeg(A, B)
	const mergeLeg = createMergeLeg(A, B)
	const matchLeg = async (srcLeg) => {
		debug(sourceEndpName, '->', endpName, 'matchLeg?', {...srcLeg, stopovers: undefined})
		if (!shouldEnrich(srcLeg)) return enrichedLeg => enrichedLeg

		const leg = await findLeg(srcLeg)
		if (!leg) return enrichedLeg => enrichedLeg
		debug('equivalent leg', leg)
		return enrichedLeg => mergeLeg(enrichedLeg, leg)
	}

	return [sourceEndpName, endpName, matchLeg]
})

// todo: DRY with `enrichLegFns`
const enrichArrDepFns = endpointPairs.map(([src, target]) => {
	src = {
		endpointName: src[0],
		client: src[1],
		serviceArea: src[2],
		normalizeStopName: src[3],
		normalizeLineName: src[4],
	}
	target = {
		endpointName: target[0],
		client: target[1],
		serviceArea: target[2],
		normalizeStopName: target[3],
		normalizeLineName: target[4],
	}

	const debug = _debug.extend([src.endpointName, target.endpointName].join('-'))

	const rules = get(allRules, [src.endpointName, target.endpointName], [])

	// todo: manual, per-endpoint shouldEnrich fn
	const shouldEnrich = (srcArrDep) => {
		if (!srcArrDep.tripId || !srcArrDep.line || !srcArrDep.line.public) return false

		for (const [name, testFn, enrich] of rules) {
			if (testFn(srcArrDep) !== true) continue
			if (enrich === false) {
				debug('not enriching because of matcher', name)
				return false
			}
			if (enrich === true) {
				debug('enriching because of matcher', name)
				return true
			}
		}

		// check if the arr/dep is in the service area
		const locs = [
			srcArrDep.stop.location,
			srcArrDep.stop.station && srcArrDep.stop.station.location,
		]
		.filter(loc => !!loc)
		if (!locs.some(loc => isInside(loc, target.serviceArea))) {
			debug('not enriching because arr/dep is outside service area')
			return false
		}

		return true
	}

	const matchArrDep = async (method, srcArrDep) => {
		debug(src.endpointName, '->', target.endpointName, 'matchArrDep', srcArrDep)
		if (!shouldEnrich(srcArrDep)) return enrichedArrDep => enrichedArrDep

		let find
		if (method === 'arrivals') {
			find = createFindArrival(src, target)
		} else if (method === 'departures') {
			find = createFindDeparture(src, target)
		} else throw new Error('invalid method')

		const arrDep = await find(srcArrDep)
		if (!arrDep) return enrichedArrDep => enrichedArrDep
		debug('equivalent arr/dep', arrDep)

		let merge
		if (method === 'arrivals') {
			merge = createMergeArrival(src, target)
		} else if (method === 'departures') {
			merge = createMergeDeparture(src, target)
		} else throw new Error('invalid method')
		return enrichedArrDep => merge(enrichedArrDep, arrDep)
	}

	return [src.endpointName, target.endpointName, matchArrDep]
})

const checkHealth = async () => {
	const res = await Promise.all(endpoints.map(async ([_, __, endpointName, ___, ____, _____, healthCheck]) => {
		try {
			return {
				endpointName,
				healthy: await healthCheck(),
				error: null,
			}
		} catch (err) {
			return {
				endpointName,
				healthy: null,
				error: err,
			}
		}
	}))
	const essentialRes = essentialEndpoints.map(name => res.find(r => r.endpointName === name) || {})
	const failingEssential = essentialRes.filter(r => !!r.error).map(r => r.endpointName)
	if (failingEssential.length > 0) {
		const err = new Error('Health check failed with ' + failingEssential.join(','))
		err.results = essentialRes
		throw err
	}
	return {
		healthy: essentialRes.every(r => r.healthy === true),
		results: res,
	}
}

module.exports = {
	endpoints,
	enrichLegFns,
	enrichArrDepFns,
	checkHealth,
}
