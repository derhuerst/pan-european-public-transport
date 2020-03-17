'use strict'

const {feature: toGeoJSON} = require('topojson-client')
const world = require('world-atlas/countries-50m.json')

const countries = toGeoJSON(world, world.objects.countries).features

module.exports = countries
