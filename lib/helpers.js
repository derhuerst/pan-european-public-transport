'use strict'

const isPointInPolygon = require('@turf/boolean-point-in-polygon').default

const hasLineId = (r) => (leg) => {
	if (leg.line && leg.line.id) return r.test(leg.line.id)
	return null
}
const hasProduct = (p) => (leg) => {
	if (leg.line) return leg.line.product === p
	return null
}
const hasOperatorId = (oId) => (leg) => {
	const op = leg.line && leg.line.operator
	if (op) return op.id === oId
	return null
}

const or = (testFn1, testFn2) => (leg) => {
	return testFn1(leg) === true || testFn2(leg) === true
}
const and = (testFn1, testFn2) => (leg) => {
	return testFn1(leg) === true && testFn2(leg) === true
}

const isInside = (point, area) => {
	return isPointInPolygon([point.longitude, point.latitude], area)
}

module.exports = {
	hasLineId,
	hasProduct,
	hasOperatorId,
	or, and,
	isInside
}
