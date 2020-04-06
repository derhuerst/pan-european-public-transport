'use strict'

const createApi = require('hafas-rest-api')
const client = require('..')
const {checkHealth} = require('../lib/endpoints')
const pkg = require('../package.json')

const addHafasOpts = (opt, method, req) => {
	if (req.query.enrich === 'false') opt[client.ENRICH] = false
}

const cfg = {
	hostname: process.env.HOSTNAME || 'localhost',
	port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
	name: pkg.name,
	description: pkg.description,
	version: pkg.version,
	homepage: pkg.homepage,
	logging: true,
	aboutPage: true,
	docsLink: 'https://github.com/derhuerst/pan-european-public-transport',
	// todo: expose individual statuses
	healthCheck: async () => (await checkHealth()).healthy,
	addHafasOpts,
}

const api = createApi(client, cfg, () => {})
api.listen(cfg.port, (err) => {
	const {logger} = api.locals
	if (err) {
		logger.error(err)
		process.exitCode = 1
	} else {
		logger.info(`Listening on ${cfg.hostname}:${cfg.port}.`)
	}
})
