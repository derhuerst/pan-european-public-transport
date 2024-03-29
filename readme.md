# pan-european-public-transport

**Public transport routing across Europe.** Merges data from API endpoints for various regions, in order to get better data than what *one* endpoint provides.

[![npm version](https://img.shields.io/npm/v/pan-european-public-transport.svg)](https://www.npmjs.com/package/pan-european-public-transport)
[![build status](https://api.travis-ci.org/derhuerst/pan-european-public-transport.svg?branch=master)](https://travis-ci.org/derhuerst/pan-european-public-transport)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/pan-european-public-transport.svg)
![minimum Node.js version](https://img.shields.io/node/v/pan-european-public-transport.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)


## Why?

[*Why linked open transit data?*](https://github.com/public-transport/why-linked-open-transit-data) explains the problem:

> When travelling through larger regions or several countries by public transportation, finding out how and when to get to the destination is hard:
>
> 1. People often **need to use multiple, regionally limited apps** to find out which trains/busses/ferries/etc. are available, because these apps often have imprecise (e.g. regarding accessibility), outdated (e.g. construction work) or just no data whatsoever about other regions. Doing this research across operator boundaries involves a lot of manual work. Essentially the user needs to do the job that computers should do: routing through sub-networks.
> 2. When dealing with large distances (e.g. from Norway to France), this routing work becomes almost impossible for humans to do ad-hoc, because there are so many possible connections. Combined with e.g. cancellations & delays, **users may never find the optimal connection** because of that.
> 3. **Local, narrow-focused apps are not (as) accessible.** They're often developed with a smaller budget, in some languages, without screen reader & offline support, have a bad UX, are only available for some platforms, etc.
> 4. **Apps built for current mainstream use cases are not future-proof.** With the ongoing digitisation, diversification and increased on-demand features, they won't be able to deliver on people's mobility needs. (They barely do that *right now*.)


## How?

For a [routing](https://en.wikipedia.org/wiki/Shortest_path_problem#Applications) request from A (starting point) to B (destination), it will

1. **fetch results** (called *journeys*) from an endpoint that covers both A and B
2. **identify other endpoints that may have additional data** about the parts of the journey (called *legs*), using
	- their coverage/service area
	- a [list of rules which data to use each endpoint for](lib/rules.js)
3. for each leg, try to **find the equivalent leg in each endpoint and merge it** with the one fetched first

For a departures/arrivals request for a station A, it will

1. **fetch results** from the "most local" endpoint that covers A
2. **identify other endpoints that may have additional data**
3. for each arrival/departure, try to **find its equivalents in those endpoints and merge them**

*Note:* Right now, this only works with [`hafas-client@5`](https://github.com/public-transport/hafas-client/tree/5)-compatible API clients.

Compared with the [goals specified in *Why linked open transit data?*](https://github.com/public-transport/why-linked-open-transit-data/blob/49390ec3126d01ee96d3b2301acd01095c80b2e5/readme.md#linked-open-transport-data), this project can be seen as a "stepping stone" towards them:

- unlike [Linked Connections](https://linkedconnections.org), it *does not* do routing across federated data (yet?),
- design-wise, it relies smart/powerful servers (instead of the ["smart clients, simple servers" design](https://ruben.verborgh.org/blog/2014/05/29/the-pragmantic-web/#simple-servers-smart-clients)),
- it is *not* based on open standards and open data.

Nevertheless, it

- pulls results from multiple data sources and merges them,
- uses a subset of endpoints that can give meaningful results for each query,
- allows to gradually swap out a closed & proprietary endpoint with e.g. GTFS + [Navitia](https://www.navitia.io/), or even a [Linked Connections](https://linkedconnections.org) router.


## Installation

```shell
npm install derhuerst/pan-european-public-transport
```

`pan-european-public-transport` expects a Redis server running on `localhost:6379`. You can configure a different hostname/port via the `REDIS_URL` environment variable.


## Usage

The API mimicks the [`hafas-client@5` API](https://github.com/public-transport/hafas-client/blob/5/docs/readme.md).

```js
const client = require('pan-european-public-transport')

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

const toHamburg = await client.journeys(inBerlin, inHamburg, {results: 1})
const [enrichedJourney] = toHamburg.journeys
console.log('enrichedJourney', enrichedJourney)
```

This will use the [Deutsche Bahn endpoint](lib/db.js) for routing and enrich the journey using the [VBB](lib/vbb.js) and [HVV](lib/hvv.js) endpoints.

```js
const wroclawGlowny = '5100069'

const [enrichedDeparture] = await client.departures('db', wroclawGlowny, {results: 1})
console.log('enrichedDeparture', enrichedDeparture)
```

This will fetch departures at [*Wrocław Główny*](https://en.wikipedia.org/wiki/Wrocław_Główny_railway_station) using the [Deutsche Bahn endpoint](lib/db.js) and enrich each departure using the [PKP endpoint](lib/pkp.js).

### debugging

If you want to find out what it does, run with the following env var:

```bash
export DEBUG='pan-european-public-transport*,-pan-european-public-transport:hafas*,find-hafas-data-in-another-hafas*'
```


## Related

- [*Why linked open transit data?*](https://github.com/public-transport/why-linked-open-transit-data)
- [Linked Connections](https://linkedconnections.org)
- [`find-hafas-data-in-another-hafas`](https://github.com/derhuerst/find-hafas-data-in-another-hafas) – Find data from one HAFAS endpoint in another one.
- [`stable-public-transport-ids`](https://github.com/derhuerst/stable-public-transport-ids) – Get stable IDs for public transport stations, etc.
- [`vbb-hafas`](https://github.com/public-transport/vbb-hafas) – JavaScript client for the VBB HAFAS API.
- [`db-hafas`](https://github.com/public-transport/db-hafas) – JavaScript client for the DB HAFAS API.
- [`insa-hafas`](https://github.com/public-transport/insa-hafas) – JavaScript client for the NASA/INSA HAFAS API.


## Contributing

If you have a question or need support using `pan-european-public-transport`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, refer to [the issues page](https://github.com/derhuerst/pan-european-public-transport/issues).
