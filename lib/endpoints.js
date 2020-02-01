'use strict'

const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const {deepStrictEqual: eql} = require('assert')
const get = require('lodash/get')
const createFindLeg = require('find-hafas-leg-in-another-hafas')
const debug = require('debug')('pan-european-routing:endpoints')
const mergeLegs = require('find-hafas-leg-in-another-hafas/merge')
const allMatchers = require('./matchers')
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
const {
	serviceArea: hvvServiceArea,
	clientName: hvvClientName,
	client: hvvClient,
	normalizeStopName: normalizeHvvStopName,
	normalizeLineName: normalizeHvvLineName
} = require('./hvv')

const routingEndpoints = [
	// priority, serviceArea, clientName, client
	[0, vbbServiceArea, vbbClientName, vbbClient],
	[0, hvvServiceArea, hvvClientName, hvvClient],
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
const endpointPairs = allPairs([
	vbbClientName,
	vbbClient,
	normalizeVbbStopName,
	normalizeVbbLineName,
], [
	hvvClientName,
	hvvClient,
	normalizeHvvStopName,
	normalizeHvvLineName,
], [
	dbClientName,
	dbClient,
	normalizeDbStopName,
	normalizeDbLineName,
])

// sourceClientName, clientName, enrichLeg
const enrichLegFns = endpointPairs.map(([source, target]) => {
	const [
		sourceClientName, _, normalizeSrcStopName, normalizeSrcLineName
	] = source
	const [
		clientName, client, normalizeStopName, normalizeLineName
	] = target

	const matchers = get(allMatchers, [sourceClientName, clientName], [])

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
		debug(sourceClientName, clientName, 'enrichLeg', srcLeg)

		if (!srcLeg.tripId || !srcLeg.line || !srcLeg.line.public) return srcLeg

		for (const [testFn, shouldEnrich] of matchers) {
			if (testFn(srcLeg) !== true) continue
			if (shouldEnrich === false) {
				debug('not enriching because of', testFn.name, testFn.expected)
				return srcLeg
			}
			if (shouldEnrich === true) {
				debug('enriching because of', testFn.name, testFn.expected)
				break
			}
		}

		const leg = await findLeg(srcLeg)
		if (!leg) return srcLeg
		debug('equivalent leg', leg)

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
