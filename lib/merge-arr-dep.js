'use strict'

const {deepStrictEqual} = require('assert')
const omit = require('lodash/omit')
const createMatchStop = require('find-hafas-leg-in-another-hafas/match-stop-or-station')
const createMatchStopover = require('find-hafas-leg-in-another-hafas/match-stopover')
// const {plannedDepartureOf} = require('find-hafas-leg-in-another-hafas/lib/helpers')

// todo: DRY this file with find-hafas-leg-in-another-hafas/merge

// todo: this fails with unicode
const upperCase = str => str[0].toUpperCase() + str.slice(1)

const mergeIds = (key, clientNameA, a, clientNameB, b) => {
	const pluralKey = key + 's'
	const ids = {
		...(a && a[pluralKey] || {}),
		...(b && b[pluralKey] || {})
	}
	if (a && a[key]) ids[clientNameA] = a[key]
	if (b && b[key]) ids[clientNameB] = b[key]
	return ids
}

const a = {foo: 1, foos: {c: 3}}
const b = {foo: 2, foos: {a: 5, d: 4}}
deepStrictEqual(mergeIds('foo', 'a', null, 'b', null), {})
deepStrictEqual(mergeIds('foo', 'a', a, 'b', null), {a: 1, c: 3})
deepStrictEqual(mergeIds('foo', 'a', null, 'b', b), {a: 5, b: 2, d: 4})
deepStrictEqual(mergeIds('foo', 'a', a, 'b', b), {a: 1, b: 2, c: 3, d: 4})

const mergeStop = (clientNameA, stopA, clientNameB, stopB) => {
	const ids = mergeIds('id', clientNameA, stopA, clientNameB, stopB)
	if (!stopB) return {...stopA, ids}
	if (!stopA) return {...stopB, id: null, ids}
	return {
		// todo: additional stopB props?
		...omit(stopA, ['station']),
		ids,
		station: stopA.station ? mergeStop(clientNameA, stopA.station, clientNameB, stopB.station) : null
	}
}

const mergeDateTime = (keys) => (stA, stB) => {
	const _cancelled = keys.cancelled || 'cancelled'
	const _when = keys.when || 'when'
	const _plannedWhen = keys.plannedWhen || 'planned' + upperCase(_when)
	const _prognosedWhen = keys.prognosedWhen || 'prognosed' + upperCase(_when)
	const _delay = keys.delay || _when + 'Delay'
	const _platform = keys.platform || _when + 'Platform'
	const _plannedPlatform = keys.plannedPlatform || 'planned' + upperCase(_platform)
	const _prognosedPlatform = keys.prognosedPlatform || 'prognosed' + upperCase(_platform)
	const _reachable = keys.reachable || 'reachable'

	// always prefer `stB` realtime data if both available
	const merged = {
		[_when]: (
			Number.isFinite(stB[_delay])
			? stB[_when]
			: stA[_when]
		),
		[_plannedWhen]: (
			stB[_plannedWhen] ||
			stA[_plannedWhen] ||
			null
		),
		[_delay]: (
			Number.isFinite(stB[_delay])
			? stB[_delay]
			: stA[_delay]
		),
		[_platform]: (
			stB[_platform] !== stB[_plannedPlatform] // todo
			? stB[_platform]
			: stA[_platform]
		),
		[_plannedPlatform]: (
			stB[_plannedPlatform] ||
			stA[_plannedPlatform] ||
			null
		)
	}

	if (_cancelled in stB) {
		merged[_cancelled] = stB[_cancelled]
	} else if (_cancelled in stA) {
		merged[_cancelled] = stA[_cancelled]
	}
	if (_prognosedWhen in stB) {
		merged[_prognosedWhen] = stB[_prognosedWhen]
	} else if (_prognosedWhen in stA) {
		merged[_prognosedWhen] = stA[_prognosedWhen]
	}
	if (_prognosedPlatform in stB) {
		merged[_prognosedPlatform] = stB[_prognosedPlatform]
	} else if (_prognosedPlatform in stA) {
		merged[_prognosedPlatform] = stA[_prognosedPlatform]
	}

	if (typeof stB[_reachable] === 'boolean') {
		merged[_reachable] = stB[_reachable]
	} else if (typeof stA[_reachable] === 'boolean') {
		merged[_reachable] = stA[_reachable]
	}

	return merged
}
const mergeWhen = mergeDateTime({delay: 'delay', platform: 'platform'})
const mergeDep = mergeDateTime({when: 'departure'})
const mergeArr = mergeDateTime({when: 'arrival'})

const createMergeArrDep = (stopoversKey, mergeArrDep, A, B) => (arrDepA, arrDepB) => {
	const {
		clientName: clientNameA,
		normalizeStopName: normalizeStopNameA,
	} = A
	const {
		clientName: clientNameB,
		normalizeStopName: normalizeStopNameB,
	} = B

	const res = {
		...arrDepA,

		tripIds: mergeIds('tripId', clientNameA, arrDepA, clientNameB, arrDepB),
		line: {
			...arrDepA.line,
			fahrtNrs: mergeIds('fahrtNr', clientNameA, arrDepA.line, clientNameB, arrDepB.line)
		},

		stop: mergeStop(clientNameA, arrDepA.stop, clientNameB, arrDepB.stop),

		...mergeWhen(arrDepA, arrDepB),

		remarks: [
			...arrDepA.remarks || [],
			...arrDepB.remarks || []
		]

		// todo: additional `arrDepB` fields?
	}

	const stopoversA = arrDepA[stopoversKey]
	const stopoversB = arrDepB[stopoversKey]
	if (Array.isArray(stopoversA) && Array.isArray(stopoversB)) {
		const matchStop = createMatchStop(clientNameA, normalizeStopNameA, clientNameB, normalizeStopNameB)
		const matchStopover = createMatchStopover(matchStop, plannedDepartureOf)

		res[stopoversKey] = arrDepA[stopoversKey].map((stA) => {
			const stB = arrDepB[stopoversKey].find(matchStopover(stA))
			if (!stB) return stA
			return { // todo: DRY with lib/merge-arr-dep.js & find-hafas-leg-in-another-hafas/merge
				...stA,
				stop: mergeStop(clientNameA, stA.stop, clientNameB, stB.stop),
				...mergeDep(stA, stB),
				...mergeArr(stA, stB)
			}
		})
	} else if (Array.isArray(stopoversA)) {
		res[stopoversKey] = stopoversA
	} else if (Array.isArray(stopoversB)) {
		res[stopoversKey] = stopoversB
	}

	return res
}

// https://github.com/public-transport/hafas-client/blob/33d77868a441ae0391ce8cfcf2ef0c855ceffd91/parse/arrival-or-departure.js#L53-L54
const createMergeArrival = createMergeArrDep.bind(null, 'previousStopovers')
const createMergeDeparture = createMergeArrDep.bind(null, 'nextStopovers')

module.exports = {
	createMergeArrival,
	createMergeDeparture,
}
