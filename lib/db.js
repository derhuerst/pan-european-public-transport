'use strict'

const {feature: toGeoJSON} = require('topojson-client')
const world = require('world-atlas/countries-50m.json')
const simplify = require('@turf/simplify').default
const buffer = require('@turf/buffer').default
const union = require('@turf/union').default
const createDbHafas = require('db-hafas')
const without = require('lodash/without')
const tokenize = require('tokenize-db-station-name')
const normalize = require('normalize-for-search')
const {strictEqual} = require('assert')
const {hasLineId, hasOperatorId, or, hasAdminCode} = require('./helpers')

const countries = toGeoJSON(world, world.objects.countries).features
const countriesInServiceArea = [
	// todo: add all
	'Germany', 'Norway', 'Sweden',
	'Denmark', 'Poland', 'Czechia',
	'Austria', 'Switzerland', 'Italy',
	'France', 'Spain', 'Portugal',
	'Luxembourg', 'Belgium', 'Netherlands',
	'United Kingdom'
]
.map(name => countries.find(c => c.properties.name === name))

const _serviceArea =
countriesInServiceArea
.slice(1)
.reduce((all, country) => union(all, country), countriesInServiceArea[0])
const serviceArea = simplify(buffer(_serviceArea, 50), {tolerance: .01})

const dbHafas = createDbHafas('pan-european-routing')

// todo: move to tokenize-db-station-name
const stopStopwords = [
	'bahnhof',
	'berlin', 'hamburg',
	'ubahn', 'sbahn', '[tram]',

	'bayern', 'thueringen', 'sachsen', 'anhalt', 'westfalen', 'wuerttemberg', 'oberpfalz', 'schwaben', 'oberbayern', 'holstein', 'braunschweig', 'saalekreis', 'saalekreis', 'niederbayern', 'schwarzwald', 'oldenburg', 'uckermark', 'rheinland', 'oberfranken', 'rheinhessen', 'hessen', 'altmark', 'limesstadt', 'vogtland', 'mecklenburg', 'mittelfranken', 'dillkreis', 'odenwald', 'erzgebirge', 'prignitz', 'oberhessen', 'ostfriesland', 'schleswig', 'unterfranken', 'westerwald', 'dithmarschen',
	// todo: 'saechsische schweiz', 'thueringer wald', 'schaumburg lippe', 'frankfurt main'
	'bahnhof',
	'fernbahnhof'
]

const normalizeStopName = (str) => {
	return without(tokenize(str), ...stopStopwords).join(' ')
}

strictEqual(normalizeStopName('HBF/Mönckebergstraße, Hamburg'), 'hauptbahnhof moenckeberg strasse')

const normalizeLineName = (str) => {
	str = str
	.replace(/^bus\s+/ig, '') // buses
	.replace(/^str\s+/ig, '') // trams
	.replace(/\s+/g, '')
	return normalize(str)
}

strictEqual(normalizeLineName('Bus  142'), '142')
strictEqual(normalizeLineName('Metro Bus 142'), 'metrobus142')
strictEqual(normalizeLineName('STR M5'), 'm5')

const matchers = {
	// https://de.wikipedia.org/wiki/DB_Regio
	self: {
		dbFernverkehr: hasOperatorId('db-fernverkehr-ag'),

		// todo: https://deacademic.com/pictures/dewiki/50/200px-DBRegio_2007_svg.png
		dbRegioAgNord: hasOperatorId('db-regio-ag-nord'),
		dbRegioAgNordost: hasOperatorId('db-regio-ag-nordost'),
		dbRegioAgBayern: hasOperatorId('db-regio-ag-bayern'),
		// they just link to bahn.de
		dbSüdostbayernbahn: hasOperatorId('db-regionetz-verkehrs-gmbh-sudostbayernbahn'),
		dbRegioAgBW: hasOperatorId('db-regio-ag-baden-wurttemberg'),
		dbRegioAgMitte: hasOperatorId('db-regio-ag-mitte'),
		// SÜWEX just links to bahn.de
		dbRegioAgMitteSüwex: hasOperatorId('db-regio-ag-mitte-suwex'),
		dbRegioAgNRW: hasOperatorId('db-regio-ag-nrw'),

		dbArriva: hasOperatorId('db-arriva'),

		// RBO just links to bahn.de
		rboPassau: or( // https://www.vlp-passau.de/fahrplan/linienplan
			hasAdminCode('rboMB_'),
			hasAdminCode('rboMB'),
		),
		// todo: VBP uses EFA
		stadtwerkePassau: hasAdminCode('swpVBP'),
		frgPassau: hasAdminCode('frg001'),
		rvo: or( // https://www.rvo-bus.de/
			hasOperatorId('regionalverkehr-oberbayern'),
			hasAdminCode('rvoRVO'),
		),
		// DB ZugBus RAB just links to bahn.de
		dbZugBusAlbBodensee: or( // https://www.zugbus-rab.de/
			hasOperatorId('db-zugbus-regionalverkehr-alb-bodensee-gmbh'),
			hasAdminCode('rabRAB'),
		),
		// todo: VHB uses EFA
		vhb: hasAdminCode('vhb001'),
		// Stadtwerke Konstanz don't have their own endpoint
		stadtwerkeKonstanz: hasAdminCode('sbpKON'),

		// S-Bahn Rhein-Main just links to bahn.de
		sBahnRheinMain: hasOperatorId('db-regio-ag-s-bahn-rhein-main'),
		// ORN just links to bahn.de
		orn: or(
			hasOperatorId('orn-omnibusverkehr-rhein-nahe-gmbh-rhein-nahe-bus'),
			hasAdminCode('rbpORN'),
		),
		// todo: MittelrheinBahn uses an unknown system and/or EFA
		mittelrheinbahn: hasOperatorId('mittelrheinbahn-trans-regio'),
		// RMB just links to bahn.de
		rmb: or(
			hasOperatorId('rmb-rhein-mosel-bus'),
			hasOperatorId('rhein-mosel-bus'),
		),

		// todo: vlexx links to RNN, RNN uses EFA
		vlexx: hasOperatorId('vlexx'),

		// todo: BOB/BRB/Meridian uses an unknown system
		meridian: hasOperatorId('meridian'),
		bob: hasOperatorId('Bayerische Oberlandbahn'),
	},

	// https://www.vbb.de/der-verkehrsverbund/verkehrsunternehmen
	vbb: {
		bvgBus: hasLineId(/\bvbbbvb\b/),
		bvgTram: hasLineId(/\bvbbbvt\b/),
		bvgUBahn: hasLineId(/\bvbbbvu\b/),
		sBahnBerlin: hasOperatorId('s-bahn-berlin'),
		odeg: hasOperatorId('ostdeutsche-eisenbahn-gmbh'),
	},

	pkpIntercity: hasOperatorId('pkp-intercity'),
	polregio: hasOperatorId('polregio'),

	// https://de.wikipedia.org/wiki/Hamburger_Verkehrsverbund#In_den_HVV_integrierte_Unternehmen
	hvv: {
		hvv: hasLineId(/\bhvv\d*\b/),
		vhh: hasLineId(/\bhvvvhh\d*\b/), // Verkehrsbetriebe Hamburg-Holstein
		hvvNimmbus: hasLineId(/\bhvvhha\b/), // todo: is this actually Nimmbus?
		sBahnHamburg: hasOperatorId('s-bahn-hamburg'),
		sBahnZVU: hasOperatorId('s-bahn-zvu'),
		startUnterelbe: hasOperatorId('verkehrsgesellschaft-start-unterelbe-mbh'),
		nordbahn: hasOperatorId('nordbahn-eisenbahngesellschaft'),
		metronom: hasOperatorId('metronom'),
	},

	insa: {
		abellioMitteldeutschland: hasOperatorId('abellio-rail-mitteldeutschland-gmbh'),
		hvg: or( // Halle
			hasAdminCode('nasHAT'), // tram
			hasAdminCode('nasHAB'), // bus
		),
	},

	vmt: { // todo: public-transport/hafas-client#158
		erfurterBahn: hasOperatorId('erfurter-bahn'),

		// Erfurt
		abellioMitteldeutschland: hasOperatorId('abellio-rail-mitteldeutschland-gmbh'),
		stadtwerkeErfurt: hasAdminCode('rmtEVA'),
		pvgWeimarerLand: hasAdminCode('rmtPVG'),

		// Jena
		jenaerVerkehr: hasAdminCode('rmtJNV'),
	},

	oebb: {
		oebb: hasOperatorId('osterreichische-bundesbahnen'),
		westbahn: hasOperatorId('westbahn')
	},

	vvt: { // https://www.vvt.at/
		// todo: https://github.com/public-transport/hafas-client/issues/41#issuecomment-545953736
		// todo: https://www.vvt.at/page.cfm?vpath=fahrplan/linienverzeichnis
		// wtf? this seems to be some regional bus in Tirol
		pbaitr: hasAdminCode('pbaitr'),
	},

	sbb: {
		// todo: https://github.com/public-transport/hafas-client/issues/41#issuecomment-545953736
		sbb: or(
			hasOperatorId('sbb'),
			hasOperatorId('sbb-gmbh'),
		),
		// THURBO just links to SBB
		thurbo: hasOperatorId('thurbo'),
		// Postauto/PostBus just links to SBB
		postauto: hasOperatorId('postauto-schweiz'),
		// todo: BVB (Basel) uses EFA
		bvb: hasOperatorId('basler-verkehrsbetriebe'),
		// BLT has its own system
		blt: or(
			hasOperatorId('baselland-transport'),
			hasOperatorId('auto-blt'), // wtf
		),
		autobusLiestal: hasOperatorId('autobus-ag-liestal'),
	},

	rmv: {
		// VIAS just links to rmv.de
		vias: or(
			hasOperatorId('vias-rail-gmbh'),
			hasOperatorId('vias-gmbh'),
		),
		// HLB links to bahn.de, rmv.de & nvv.de
		hlb: hasOperatorId('hessische-landesbahn'),

		// todo: Mainzer Mobilität uses an unknown system
		mainzerMobilität: or(
			hasAdminCode('rmv242'), // bus?
			hasAdminCode('rmv243'), // tram?
		),
	},

	nvv: {
		// HLB links to bahn.de, rmv.de & nvv.de
		hlb: hasOperatorId('hessische-landesbahn'),
	},

	sncf: {
		sncf: hasOperatorId('sncf'),
	},

	cfl: {
		cfl: hasOperatorId('cfl'),
	},

	sncb: {
		sncb: hasOperatorId('sncb'),
	},

	avv: {
		// todo: https://github.com/public-transport/hafas-client/issues/41#issuecomment-545953736
		// see also https://avv.de/de/ueber-uns/verkehrsunternehmen
		aseag: hasAdminCode('aavASE'),
		// Dürener Kreisbahn runs Rurtalbus, which just links to AVV
		dürenerKreisbahn: hasAdminCode('aavDKB'),
		// west Verkehr just links to AVV
		westVerkehr: hasAdminCode('aav006'),
		// Busverkehr Rheinland just links to bahn.de
		busverkehrRheinland: or(
			hasOperatorId('regionalverkehr-euregio-maas-rhein'),
			hasAdminCode('aavBVR'),
		),
		// VIAS is part of AVV
		vias: or(
			hasOperatorId('vias-rail-gmbh'),
			hasOperatorId('vias-gmbh'),
		),
	},

	// todo: part of VRR, which uses EFA
	abellioNRW: hasOperatorId('abellio-rail-nrw-gmbh'),

	ns: {
		// todo: find a client for NS
		ns: hasOperatorId('nederlandse-spoorwegen'),
	},
}

module.exports = {
	serviceArea,
	clientName: 'db',
	client: dbHafas,
	normalizeStopName,
	normalizeLineName,
	matchers,
}
