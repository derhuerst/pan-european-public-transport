# pan-european-public-transport

**Public transport routing across Europe.** Merges data from API endpoints for various regions to get better data than what *one* endpoint provides.

*Note:* Check the [`find-hafas-leg-in-another-hafas` readme](https://github.com/derhuerst/find-hafas-leg-in-another-hafas/blob/master/readme.md#find-hafas-leg-in-another-hafas) and the [`stable-public-transport-ids` readme](https://github.com/derhuerst/stable-public-transport-ids/blob/b6a824e32cfda9297fca1fb21c0f2e6d3838f3fc/readme.md#stable-public-transport-ids) for more backgound info.

---

For a [routing](https://en.wikipedia.org/wiki/Shortest_path_problem#Applications) request from A (starting point) to B (destination), it will

1. **fetch results** (called *journeys*) from an endpoint that covers both A and B
2. **identify other endpoints that may have additional data** about the parts of the journey (called *legs*), using
	- their coverage/service area
	- a [list of rules which data to use each endpoint for](lib/rules.js)
3. for each leg, try to **find the equivalent leg in each endpoint and merge it** with the one fetched first

*Note:* Right now, this only works with [`hafas-client@5`](https://github.com/public-transport/hafas-client/tree/5)-compatible API clients.

[![npm version](https://img.shields.io/npm/v/pan-european-public-transport.svg)](https://www.npmjs.com/package/pan-european-public-transport)
[![build status](https://api.travis-ci.org/derhuerst/pan-european-public-transport.svg?branch=master)](https://travis-ci.org/derhuerst/pan-european-public-transport)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/pan-european-public-transport.svg)
![minimum Node.js version](https://img.shields.io/node/v/pan-european-public-transport.svg)
[![chat with me on Gitter](https://img.shields.io/badge/chat%20with%20me-on%20gitter-512e92.svg)](https://gitter.im/derhuerst)
[![support me on Patreon](https://img.shields.io/badge/support%20me-on%20patreon-fa7664.svg)](https://patreon.com/derhuerst)


## Installation

```shell
npm install derhuerst/pan-european-public-transport
```


## Usage

The API mimicks the [`hafas-client@5` API](https://github.com/public-transport/hafas-client/blob/5/docs/readme.md).

```js
const {journeys} = require('pan-european-public-transport')

const inBerlin = {
	type: 'location',
	address: 'Großer Bunkerberg in Volkspark Friedrichshain',
	latitude: 52.526367, longitude: 13.432154
}
const inHamburg =  {
	type: 'location',
	address: 'Hansestadt Hamburg - Neustadt, Johannisbollwerk 6',
	latitude: 53.545056, longitude: 9.974467
}

const toHamburg = await journeys(inBerlin, inHamburg, {results: 1})
const [enrichedJourney] = toHamburg.journeys
console.log('enrichedJourney', enrichedJourney)
```

This will use the [Deutsche Bahn endpoint](lib/db.js) and enrich the journey with data from the [VBB endpoint](lib/vbb.js) and [HVV endpoint](lib/hvv.js).


## Related

- [`find-hafas-leg-in-another-hafas`](https://github.com/derhuerst/find-hafas-leg-in-another-hafas) – Find a journey leg from one HAFAS endpoint in another one.
- [`stable-public-transport-ids`](https://github.com/derhuerst/stable-public-transport-ids) – Get stable IDs for public transport stations, etc.
- [`vbb-hafas`](https://github.com/derhuerst/vbb-hafas) – JavaScript client for the VBB HAFAS API.
- [`db-hafas`](https://github.com/derhuerst/db-hafas) – JavaScript client for the DB HAFAS API.
- [`insa-hafas`](https://github.com/derhuerst/insa-hafas) – JavaScript client for the NASA/INSA HAFAS API.


## Contributing

If you have a question or need support using `pan-european-public-transport`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, refer to [the issues page](https://github.com/derhuerst/pan-european-public-transport/issues).
