'use strict'

const {journeys} = require('.')

const inBerlin = {
	type: 'location',
	address: 'Großer Bunkerberg in Volkspark Friedrichshain',
	latitude: 52.526367, longitude: 13.432154
}
const inBrandenburg = {
	type: 'location',
	address: 'Stadion der Freundschaft, Frankfurt Oder',
	latitude: 52.331983, longitude: 14.555394
}
const inLeipzig = {
	type: 'location',
	address: 'Kita "Grünschnabel", Leipzig',
	latitude: 51.323274, longitude: 12.421322
}

;(async () => {
	// const brandenburg = await journeys(inBerlin, inBrandenburg)
	// console.log('brandenburg', brandenburg.journeys)

	const germany = await journeys(inBerlin, inLeipzig, {results: 1})
	console.log('germany', germany.journeys)

	// todo
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
