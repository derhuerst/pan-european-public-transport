'use strict'

const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const {deepStrictEqual: eql} = require('assert')
const get = require('lodash/get')
const createFindLeg = require('find-hafas-leg-in-another-hafas')
const _debug = require('debug')('pan-european-routing:endpoints')
const mergeLegs = require('find-hafas-leg-in-another-hafas/merge')
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

const routingEndpoints = [
	// priority, serviceArea, clientName, client
	[0, vbbServiceArea, vbbClientName, vbbClient],
	[0, hvvServiceArea, hvvClientName, hvvClient],
	[0, insaServiceArea, insaClientName, insaClient],
	[1, pkpServiceArea, pkpClientName, pkpClient],
	[1, dbServiceArea, dbClientName, dbClient],
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
		hafas: srcClient,
		normalizeStopName: normalizeSrcStopName,
		normalizeLineName: normalizeSrcLineName
	}, {
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

module.exports = {
	routingEndpoints,
	enrichLegFns
}
