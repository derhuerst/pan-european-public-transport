'use strict'

const {Console} = require('console')
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
const inCopenhagen = {
	type: 'stop',
	id: '8606146',
	name: 'Frederiksberg St.(Metro)',
	location: {
		type: 'location',
		address: 'Frederiksberg St.(Metro)',
		latitude: 55.681199,
		longitude: 12.534136
	}
}
const inHalle = {
	type: 'location',
	id: '980508377',
	address: 'Halle - Giebichenstein, Große Brunnenstraße 3',
	latitude: 51.500594, longitude: 11.956175
}
const inGraz = {
	type: 'location',
	id: '970049990',
	address: 'Graz - Gries, Lagergasse 12',
	latitude: 47.065496, longitude: 15.433571
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
const inGhent = {
	type: 'stop',
	id: '8800031',
	name: 'Ghent Central',
	location: {
		type: 'location', address: 'Ghent Central',
		latitude: 51.035627, longitude: 3.710612
	}
}

// note: this calculation is not timezone- & locale-aware!
const DAY = 24 * 60 * 60 * 1000
const daysTilMonday = 8 - new Date().getDay()
const d = new Date(Date.now() + daysTilMonday * DAY)
d.setHours(10)
d.setMinutes(0)
d.setSeconds(0)
d.setMilliseconds(0)
const when = d.toISOString()

// improve debugging experience
const console = new Console({
	stdout: process.stdout,
	stderr: process.stderr,
	inspectOptions: {depth: 4},
})
Error.stackTraceLimit = 40

;(async () => {
	// const toBrandenburg = await journeys(inBerlin, inBrandenburg, {
	// 	departure: when,
	// })
	// console.log('toBrandenburg', toBrandenburg.journeys)

	// const toLeipzig = await journeys(inBerlin, inLeipzig, {
	// 	departure: when, results: 1,
	// })
	// console.log('toLeipzig', toLeipzig.journeys[0])

	const toHamburg = await journeys(inBerlin, inHamburg, {
		departure: when, results: 1,
	})
	console.log('toHamburg', toHamburg.journeys[0])

	// const toHalle = await journeys(inBerlin, inHalle, {
	// 	departure: when, results: 1,
	// })
	// console.log('toHalle', toHalle.journeys[0])

	// const toCopenhagen = await journeys(inBerlin, inCopenhagen, {
	// 	departure: when, results: 1,
	// })
	// console.log('toCopenhagen', toCopenhagen.journeys[0])

	// const toGraz = await journeys(inBerlin, inGraz, {
	// 	departure: when, results: 1,
	// })
	// console.log('toGraz', toGraz.journeys[0])

	// const toWroclaw = await journeys(inBerlin, inWroclaw, {
	// 	departure: when, results: 1,
	// })
	// console.log('toWroclaw', toWroclaw.journeys[0])

	// const toGhent = await journeys(inBerlin, inGhent, {
	// 	departure: when, results: 1,
	// })
	// console.log('toGhent', toGhent.journeys[0])

	// const depsInWroclaw = await departures('db', inWroclaw, {
	// 	when, duration: 2,
	// })
	// console.log('depsInWroclaw[0]', depsInWroclaw[0])

	// todo
	process.exit()
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
