// @flow strict
import request from 'request';
import fs from 'fs';
import zlib from 'zlib';

import lib, { type WebscrapeResult, type WebscrapeOptions, type OptionsObject } from './lib';
import { debuglog } from 'util';

const log = debuglog('webscrape');

const { betterRequest, constructOptionsWithJar, constructError, constructResult, determineFilename } = lib;

function isOK(statusCode: number): boolean {
	const str = statusCode && statusCode.toString();
	return str && str.length === 3 && str.indexOf('2') === 0 || false;
}

type GetOptions = {|
	headers?: $PropertyType<WebscrapeOptions, 'headers'>,
	query?: $PropertyType<WebscrapeOptions, 'query'>,
	agentOptions?: $PropertyType<WebscrapeOptions, 'agentOptions'>,
	indicies?: $PropertyType<WebscrapeOptions, 'indicies'>,
|};

type PostOptions = {|
	headers?: $PropertyType<WebscrapeOptions, 'headers'>,
	query?: $PropertyType<WebscrapeOptions, 'query'>,
	body?: $PropertyType<WebscrapeOptions, 'body'>,
	agentOptions?: $PropertyType<WebscrapeOptions, 'agentOptions'>,
	indicies?: $PropertyType<WebscrapeOptions, 'indicies'>,
|};

type DownloadOptions = {|
	post?: $PropertyType<WebscrapeOptions, 'body'>,
	headers?: $PropertyType<WebscrapeOptions, 'headers'>,
	query?: $PropertyType<WebscrapeOptions, 'query'>,
	agentOptions?: $PropertyType<WebscrapeOptions, 'agentOptions'>,
	filename: string,
	indicies?: $PropertyType<WebscrapeOptions, 'indicies'>,
|};

type ScraperApi = {|
	get: (uri: string, GetOptions) => Promise<WebscrapeResult>,
	post: (uri: string, PostOptions) => Promise<WebscrapeResult>,
	download: (uri: string, DownloadOptions) => Promise<string>
|};

function extractBody(res: http$IncomingMessage<>): Promise<string> {
	return new Promise((ok, fail) => {
		let body;
		res.on('data', (chunk) => body += chunk);
		res.on('end', () => {
			return ok(body);
		});	
		res.on('error', (err: Error) => {
			return fail(err);
		})
	});
}

// creates a closure instance of a scraper
function Scraper(): ScraperApi {

	const jar = request.jar();
	const constructOptions = (uri: string, {
		headers, query, body, method, agentOptions, indicies
	}: $Shape<WebscrapeOptions> = {} ): OptionsObject => constructOptionsWithJar(uri, {
		headers, query, body, method, agentOptions, indicies, jar
	});

	const get = (uri: string, { headers, query, agentOptions, indicies }: GetOptions = {} ): Promise<WebscrapeResult> => new Promise((resolve: (WebscrapeResult) => void, reject: (Error) => void): void => {
		const options = constructOptions(uri, { headers, query, agentOptions, indicies, method: 'GET' });
		return betterRequest(options, (err, resp, body) => {
			if (err) {
				return reject(err);
			} else if (resp && body) {
				const bodyStr: string = body instanceof Buffer ? body.toString('utf8') : body;
				if (!isOK(resp.statusCode)) {
					return reject(constructError(options, resp, bodyStr));
				} else {
					return resolve(constructResult(resp, bodyStr));
				}
			} else {
				return reject(new Error('no response or body'))
			}
		});

	});

	const post = (uri: string, { headers, query, body, agentOptions, indicies } = {} ): Promise<WebscrapeResult> => new Promise( (resolve, reject) => {
		const options = constructOptions(uri, { headers, query, body, agentOptions, indicies, method: 'POST' });
		return betterRequest(options, function(err, resp, body) {
			if (err) {
				return reject(err);
			} else if (resp && body) {
				const bodyStr: string = body instanceof Buffer ? body.toString('utf8') : body;
				if (!isOK(resp.statusCode)) {
					return reject(constructError(options, resp, bodyStr));
				} else {
					return resolve(constructResult(resp, bodyStr));
				}
			} else {
				return reject(new Error('no response or body'));
			}
		});
	});

	const download = function(uri: string, { post, headers, query, agentOptions, filename, indicies }: DownloadOptions = {}): Promise<string> {

		return determineFilename(uri, filename).then((downloadpath: string): Promise<string> => {
			log(`DOWNLOAD ${uri} to ${downloadpath}`);

			// TODO: This mechanic is awkward and a band-aid. Find a better syntax
			const method = post && typeof post === 'object' ? 'POST' : 'GET';
			const preOpts: WebscrapeOptions = { method, headers, query, agentOptions, indicies };
			if (method === 'POST') {
				preOpts.body = post;
			}

			// normal operation resumes
			const options = constructOptions(uri, preOpts);
			const writeStream = fs.createWriteStream(downloadpath);
			const req = request(options);

			return new Promise((resolve, reject) => {
				// adapted from http://nickfishman.com/post/49533681471/nodejs-http-requests-with-gzip-deflate-compression,
				// but this time this is clearly a use case for streams
				req.on('response', function(res) {
					var encoding = res.headers['content-encoding'];

					// TODO: I need to support more status codes
					if (!isOK(res.statusCode)) {
						extractBody(res)
							.then((errorBody) => reject(constructError(options, res, errorBody)))
							.catch(() => reject(constructError(options, res, 'no-body-could-be-extracted')))
					} else {
						if (encoding === 'gzip') {
							res.pipe(zlib.createGunzip()).pipe(writeStream);
						} else if (encoding === 'deflate') {
							res.pipe(zlib.createInflate()).pipe(writeStream);
						} else {
							res.pipe(writeStream);
						}
					}
				});

				req.on('error', function(err) {
					return reject(err);
				});

				writeStream.on('error', function(err) {
					return reject(err);
				}).on('finish', function() {
					writeStream.close();
					return resolve(downloadpath);
				});

			});

		});

	};

	return { get, post, download };
}

export default Scraper;