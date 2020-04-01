'use strict'

const {journeys, departures} = require('.')

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
const inHalle = {
	type: 'location',
	id: '980508377',
	address: 'Halle - Giebichenstein, Große Brunnenstraße 3',
	latitude: 51.500594, longitude: 11.956175
}
const inWroclaw = {
	type: 'stop',
	id: '5100069',
	name: 'Wroclaw (PL), Glowny',
	location: {
		type: 'location', address: 'Wroclaw (PL), Glowny',
		latitude: 51.098075, longitude: 17.037084
	}
}

;(async () => {
	const toBrandenburg = await journeys(inBerlin, inBrandenburg)
	console.log('toBrandenburg', toBrandenburg.journeys)

	const toLeipzig = await journeys(inBerlin, inLeipzig, {results: 1})
	console.log('toLeipzig', toLeipzig.journeys[0])

	const toHamburg = await journeys(inBerlin, inHamburg, {results: 1})
	console.log('toHamburg', toHamburg.journeys[0])

	const toHalle = await journeys(inBerlin, inHalle, {results: 1})
	console.log('toHalle', toHalle.journeys[0])

	const depsInWroclaw = await departures('db', inWroclaw, {when: '2020-06-01T08:00+02:00', duration: 2})
	console.log('depsInWroclaw[0]', depsInWroclaw[0])

	// todo
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
