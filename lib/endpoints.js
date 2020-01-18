'use strict'

const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const {deepStrictEqual: eql} = require('assert')
const createFindLeg = require('find-hafas-leg-in-another-hafas')
const debug = require('debug')('pan-european-routing:endpoints')
const mergeLegs = require('find-hafas-leg-in-another-hafas/merge')
const {
	serviceArea: dbServiceArea,
	clientName: dbClientName,
	client: dbClient,
	normalizeStopName: normalizeDbStopName,
	normalizeLineName: normalizeDbLineName
} = require('./db')
const {
	serviceArea: vbbServiceArea,
	clientName: vbbClientName,
	client: vbbClient,
	normalizeStopName: normalizeVbbStopName,
	normalizeLineName: normalizeVbbLineName
} = require('./vbb')

const routingEndpoints = [
	// priority, serviceArea, clientName, client
	[0, vbbServiceArea, vbbClientName, vbbClient],
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
//     (clientNameA, client, normalizeStopNameA, normalizeLineNameA),
//     (clientNameB, client, normalizeStopNameB, normalizeLineNameB)
// ), ...
const endpointPairs = allPairs(
	[vbbClientName, vbbClient, normalizeVbbStopName, normalizeVbbLineName],
	[dbClientName, dbClient, normalizeDbStopName, normalizeDbLineName],
)

// sourceClientName, clientName, enrichLeg
// todo: disallow-list for pairs (e.g. never enrich VBB with DB?)
const enrichLegFns = endpointPairs.map(([source, target]) => {
	const [
		sourceClientName, _, normalizeSrcStopName, normalizeSrcLineName
	] = source
	const [
		clientName, client, normalizeStopName, normalizeLineName
	] = target
	const findLeg = createFindLeg({
		hafas: client,
		normalizeStopName: normalizeSrcStopName,
		normalizeLineName: normalizeSrcLineName
	}, {
		hafas: client,
		normalizeStopName,
		normalizeLineName
	})

	const enrichLeg = async (srcLeg) => {
		if (!srcLeg.tripId || !srcLeg.line || !srcLeg.line.public) return srcLeg

		const leg = await findLeg(srcLeg)
		if (!leg) return srcLeg
		debug('equivalent leg', {
			[sourceClientName]: srcLeg,
			[clientName]: leg
		})

		return mergeLegs(
			srcLeg, leg,
			normalizeSrcStopName, normalizeSrcStopName
		)
	}

	return [sourceClientName, clientName, enrichLeg]
})

module.exports = {
	routingEndpoints,
	enrichLegFns
}
