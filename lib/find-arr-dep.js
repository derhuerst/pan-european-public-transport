'use strict'

const debug = require('debug')('pan-european-public-transport:find-arr-dep')
const createFindStop = require('find-hafas-leg-in-another-hafas/find-stop')
const createMatchLine = require('find-hafas-leg-in-another-hafas/match-line')
const createMatchStop = require('find-hafas-leg-in-another-hafas/match-stop-or-station')
const createMatchStopover = require('find-hafas-leg-in-another-hafas/match-stopover')
// const createCollectDeps = require('hafas-collect-departures-at')

const MINUTE = 60 * 1000

const createFindArrDep = (type, A, B) => {
	const {
		clientName: srcClientName,
		client: srcClient,
		normalizeStopName: normalizeSrcStopName,
		normalizeLineName: normalizeSrcLineName,
	} = A
	const {
		clientName,
		client,
		normalizeStopName,
		normalizeLineName,
	} = B

	if (type !== 'departures' && type !== 'arrivals') {
		throw new Error('invalid type')
	}

	const findStop = createFindStop({
		...A, hafas: A.client,
	}, {
		...B, hafas: B.client,
	})
	const matchLine = createMatchLine(srcClientName, normalizeSrcLineName, clientName, normalizeLineName)
	const matchStop = createMatchStop(srcClientName, normalizeSrcStopName, clientName, normalizeStopName)
	const match = createMatchStopover(matchStop, arrDep => arrDep.plannedWhen)

	// todo: debug logs
	const findArrDep = async (depA, clientOpts = {}) => {
		debug('depA', depA)

		const stopB = await findStop(depA.stop)
		if (!stopB) {
			debug('finding the stop in', clientName, 'failed', depA.stop)
			return null
		}
		debug('stopB', stopB)

		// todo: search by realtime as well?
		const whenA = +new Date(depA.plannedWhen)
		// todo: fall back to `client[type](stopB.station, opts)`
		const depsB = await client[type](stopB, {
			...clientOpts,
			when: new Date(whenA - MINUTE),
			duration: 2 * MINUTE,
			// todo: includeRelatedStations ?
		})

		const matchB = match(depA)
		for (const depB of depsB) {
			debug('depB candidate', depB)

			if (!matchLine(depA.line, depB.line)) {
				debug('matching by line name failed', depA.line, depB.line)
				continue
			}
			if (!matchB(depB)) {
				debug('matching departure B failed')
				continue
			}
			return depB
		}
		return null
	}
	return findArrDep
}

module.exports = createFindArrDep
