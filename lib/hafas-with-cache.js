'use strict'

const Redis = require('ioredis')
const createRedisStore = require('cached-hafas-client/stores/redis')
const withCache = require('cached-hafas-client')
const _debug = require('debug')('pan-european-public-transport:hafas-with-cache')

const redis = new Redis(process.env.REDIS_URL || null)

const store = createRedisStore(redis)
const hafasWithCache = (endpointName, hafas) => {
	const cachedHafas = withCache(hafas, store)

	const debug = _debug.extend(endpointName)
	if (debug.enabled) {
		cachedHafas.on('hit', (method, ...args) => {
			debug('cache hit', method, ...args)
		})
		cachedHafas.on('miss', (method, ...args) => {
			debug('cache miss', method, ...args)
		})
	}

	return cachedHafas
}

hafasWithCache.redis = redis
module.exports = hafasWithCache
