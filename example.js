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
const inHamburg =  {
	type: 'location',
	address: 'Hansestadt Hamburg - Neustadt, Johannisbollwerk 6',
	latitude: 53.545056, longitude: 9.974467
}

;(async () => {
	const toBrandenburg = await journeys(inBerlin, inBrandenburg)
	console.log('toBrandenburg', toBrandenburg.journeys)

	const toLeipzig = await journeys(inBerlin, inLeipzig, {results: 1})
	console.log('toLeipzig', toLeipzig.journeys[0])

	const toHamburg = await journeys(inBerlin, inHamburg, {results: 1})
	console.log('toHamburg', toHamburg.journeys[0])

	// todo
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
