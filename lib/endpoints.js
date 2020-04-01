'use strict'

const {deepStrictEqual: eql} = require('assert')
const get = require('lodash/get')
const createFindLeg = require('find-hafas-leg-in-another-hafas')
const _debug = require('debug')('pan-european-routing:endpoints')
const mergeLegs = require('find-hafas-leg-in-another-hafas/merge')
const createFindArrDep = require('./find-arr-dep')
const {createMergeArrival, createMergeDeparture} = require('./merge-arr-dep')
const allRules = require('./rules')
const {isInside} = require('./helpers')
const {
	serviceArea: dbServiceArea,
	clientName: dbClientName,
	client: dbClient,
	normalizeStopName: normalizeDbStopName,
	normalizeLineName: normalizeDbLineName
} = require('./db')
const {
	serviceArea: pkpServiceArea,
	clientName: pkpClientName,
	client: pkpClient,
	normalizeStopName: normalizePkpStopName,
	normalizeLineName: normalizePkpLineName
} = require('./pkp')
const {
	serviceArea: sncbServiceArea,
	clientName: sncbClientName,
	client: sncbClient,
	normalizeStopName: normalizeSncbStopName,
	normalizeLineName: normalizeSncbLineName
} = require('./sncb')
const {
	serviceArea: vbbServiceArea,
	clientName: vbbClientName,
	client: vbbClient,
	normalizeStopName: normalizeVbbStopName,
	normalizeLineName: normalizeVbbLineName
} = require('./vbb')
const {
	serviceArea: hvvServiceArea,
	clientName: hvvClientName,
	client: hvvClient,
	normalizeStopName: normalizeHvvStopName,
	normalizeLineName: normalizeHvvLineName
} = require('./hvv')
const {
	serviceArea: insaServiceArea,
	clientName: insaClientName,
	client: insaClient,
	normalizeStopName: normalizeInsaStopName,
	normalizeLineName: normalizeInsaLineName
} = require('./insa')

const endpoints = [
	// priority, serviceArea, clientName, client
	[0, vbbServiceArea, vbbClientName, vbbClient, normalizeVbbStopName, normalizeVbbLineName],
	[0, hvvServiceArea, hvvClientName, hvvClient, normalizeHvvStopName, normalizeHvvLineName],
	[0, insaServiceArea, insaClientName, insaClient, normalizeInsaStopName, normalizeInsaLineName],
	[1, pkpServiceArea, pkpClientName, pkpClient, normalizePkpStopName, normalizePkpLineName],
	[1, dbServiceArea, dbClientName, dbClient, normalizeDbStopName, normalizeDbLineName],
	// SNCB has very sparse data
	[2, sncbServiceArea, sncbClientName, sncbClient, normalizeSncbStopName, normalizeSncbLineName],
].sort((a, b) => a[0] - b[0])

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
//     (clientNameA, client, serviceAreaA, normalizeStopNameA, normalizeLineNameA),
//     (clientNameB, client, serviceAreaB, normalizeStopNameB, normalizeLineNameB)
// ), ...
const endpointPairs = allPairs([
	vbbClientName,
	vbbClient,
	vbbServiceArea,
	normalizeVbbStopName,
	normalizeVbbLineName,
], [
	hvvClientName,
	hvvClient,
	hvvServiceArea,
	normalizeHvvStopName,
	normalizeHvvLineName,
], [
	insaClientName,
	insaClient,
	insaServiceArea,
	normalizeInsaStopName,
	normalizeInsaLineName,
], [
	sncbClientName,
	sncbClient,
	sncbServiceArea,
	normalizeSncbStopName,
	normalizeSncbLineName,
], [
	pkpClientName,
	pkpClient,
	pkpServiceArea,
	normalizePkpStopName,
	normalizePkpLineName,
], [
	dbClientName,
	dbClient,
	dbServiceArea,
	normalizeDbStopName,
	normalizeDbLineName,
])

// sourceClientName, clientName, enrichLeg
// todo: DRY with `enrichArrDepFns`
const enrichLegFns = endpointPairs.map(([source, target]) => {
	const [
		sourceClientName, srcClient,
		_,
		normalizeSrcStopName,
		normalizeSrcLineName
	] = source
	const [
		clientName,
		client,
		serviceArea,
		normalizeStopName,
		normalizeLineName
	] = target

	const debug = _debug.extend([sourceClientName, clientName].join('-'))

	const rules = get(allRules, [sourceClientName, clientName], [])

	const findLeg = createFindLeg({
		clientName: sourceClientName,
		hafas: srcClient,
		normalizeStopName: normalizeSrcStopName,
		normalizeLineName: normalizeSrcLineName
	}, {
		clientName,
		hafas: client,
		normalizeStopName,
		normalizeLineName
	})

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

	const matchLeg = async (srcLeg) => {
		debug(sourceClientName, '->', clientName, 'matchLeg', srcLeg)
		if (!shouldEnrich(srcLeg)) return enrichedLeg => enrichedLeg

		const leg = await findLeg(srcLeg)
		if (!leg) return enrichedLeg => enrichedLeg
		debug('equivalent leg', leg)

		const enrichLeg = (enrichedLeg) => {
			return mergeLegs(
				enrichedLeg, leg,
				normalizeSrcStopName, normalizeSrcStopName
			)
		}
		return enrichLeg
	}

	return [sourceClientName, clientName, matchLeg]
})

// todo: DRY with `enrichLegFns`
const enrichArrDepFns = endpointPairs.map(([src, target]) => {
	src = {
		clientName: src[0],
		client: src[1],
		serviceArea: src[2],
		normalizeStopName: src[3],
		normalizeLineName: src[4],
	}
	target = {
		clientName: target[0],
		client: target[1],
		serviceArea: target[2],
		normalizeStopName: target[3],
		normalizeLineName: target[4],
	}

	const debug = _debug.extend([src.clientName, target.clientName].join('-'))

	const rules = get(allRules, [src.clientName, target.clientName], [])

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
		debug(src.clientName, '->', target.clientName, 'matchArrDep', srcArrDep)
		if (!shouldEnrich(srcArrDep)) return enrichedArrDep => enrichedArrDep

		const findArrDep = createFindArrDep(method, src, target)
		const arrDep = await findArrDep(srcArrDep)
		if (!arrDep) return enrichedArrDep => enrichedArrDep
		debug('equivalent arr/dep', arrDep)

		let merge
		if (method === 'arrivals') {
			merge = createMergeArrival('previousStopovers', src, target)
		} else if (method === 'departures') {
			merge = createMergeDeparture('nextStopovers', src, target)
		} else throw new Error('invalid method')
		return enrichedArrDep => merge(enrichedArrDep, arrDep)
	}

	return [src.clientName, target.clientName, matchArrDep]
})

module.exports = {
	endpoints,
	enrichLegFns,
	enrichArrDepFns,
}
