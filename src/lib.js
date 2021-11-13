// @flow strict
import request, { type Options as RequestOptions, type OptionsObject, type Callback, type CookieJar } from 'request';
import cheerio, { type CheerioStatic } from 'cheerio';
import path from 'path';
import fs, { type Stats } from 'fs';
import url from 'url';
import zlib from 'zlib';

import { debuglog } from 'util';

export type { OptionsObject, Callback };

// base options
const BASE_OPTIONS = {
	headers: {
		"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36",
		"Cache-Control": "no-cache",
		"Pragma": "no-cache"
	}
};

// fix unicode in JSON response
const UNICODE_HEADER = /\\x([0-9a-fA-F]{2})/g;

// adds additional functionality like automatic gunzipping / deflating and 303 redirects
// into mikeal's request.
function betterRequest(options: RequestOptions, callback: Callback) {

	// my god why doesn't mikeal just bake this shit into request
	const req = request(options);

	// adapted from http://nickfishman.com/post/49533681471/nodejs-http-requests-with-gzip-deflate-compression
	// TODO: Consider a streamed approach next time
	req.on('response', function(res: http$IncomingMessage<>) {
		const chunks = [];

		res.on('data', function(chunk: Buffer) {
			chunks.push(chunk);
		});

		res.on('end', function(): void {
			const buffer = Buffer.concat(chunks);
			const encoding = res.headers['content-encoding'];

			try {
				if (encoding === 'gzip') {
					debuglog('Content is gzipped');
					zlib.gunzip(buffer, (err: Error, decoded: string): void => callback(err, res, decoded && decoded.toString()));
				} else if (encoding === 'deflate') {
					debuglog('Content is deflated');
					zlib.inflate(buffer, (err: Error, decoded: string): void =>  callback(err, res, decoded && decoded.toString()));
				} else {
					// very special case, although this should really be a 303.
					if (res.statusCode === 302) {
						const err = new Error(`Unexpected Redirect to ${res.headers.location}`);
						err.name = 'UnexpectedRedirectError';
						return callback(err);
					}

					// manually handle 303... bah
					if (res.statusCode === 303) {
						const forwardOptions = typeof options === 'string' ? { uri: res.headers.location } : {
							...options,
							uri: res.headers.location,
						};
						return betterRequest(forwardOptions, callback);
					} else {
						return callback(null, res, buffer && buffer.toString());
					}
				}
			} catch (e) {
				callback(e);
			}

		});

	});

	req.on('error', callback);
}

function constructError(options: RequestOptions, resp: http$IncomingMessage<>, body: string): Error {
	const error = new Error();
	if (typeof options === 'string') {
		error.message = `ERROR ${options}`;
	} else {
		error.message = `${options.method || 'GET'} ERROR ${options.uri} HttpCode ${resp.statusCode}\n${body}`;
	}	
	return error;
}

type StringMap = {|
	[string]: string
|};

export type WebscrapeResult = {|
	headers: StringMap,
	json?: { ... },
	body: string,
	$?: CheerioStatic
|};

// TODO: This could throw errors. Deal with it.
function constructResult(resp: http$IncomingMessage<>, body: string): WebscrapeResult {
	const result: WebscrapeResult = {
		body,
		headers: resp.headers
	};

	const contentType = resp.headers['content-type'];
	const mimeType = contentType && contentType.split(';')[0];
	// augment the result
	switch (mimeType) {
		case 'text/html': result.$ = cheerio.load(body, { lowerCaseTags: true }); break;
		case 'application/json': result.json = JSON.parse(body.replace(UNICODE_HEADER, (m: string, n: string): string => String.fromCharCode(parseInt(n,16))));
	}

	return result;
}

export type WebscrapeOptions = {|
	headers?: StringMap,
	query?: StringMap,
	body?: string | StringMap,
	jar?: CookieJar,
	agentOptions?: http$agentOptions,
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS',
	indicies?: boolean
|};

type KVPair = {|
	key: string,
	value: string,
|};

function constructOptionsWithJar(uri: string, { headers, query, body, jar, agentOptions, method = 'GET', indicies = true }: WebscrapeOptions): OptionsObject {
	const options: OptionsObject = { uri, jar, method };

	options.headers = Object.assign({}, BASE_OPTIONS.headers, headers);
	if (query !== undefined) {
		options.qs = query;
		options.qsStringifyOptions = {
			arrayFormat: indicies ? 'indicies' : 'repeat' // the documentation on this is terrible
		};
	}

	if (agentOptions) {
		options.agentOptions = agentOptions;
	}

	// TODO: this logic may change later, since it is not obvious
	if (body !== undefined) {
		const headers = options.headers || {};
		const contentTypeSet = Object.keys(headers)
			.map((key: string): KVPair => ({ key: key.toLowerCase(), value: headers[key] }))
			.filter((pair: KVPair): boolean => pair.key === 'content-type');
		if (contentTypeSet.length === 1) {
			// since there is a content type, we assume this is not a HTTP form.
			// NOTE: as a result, the user must do encoding manually.
			options.json = contentTypeSet[0].value.toLowerCase().startsWith('application/json');
			options.body = body;
		} else {
			options.form = body;
		}
	}

	return options;
}

function determineFilename(uri: string, filename: string): Promise<string> {
	return new Promise<string>((resolve: (string) => void, reject: (Error) => void): void => {
		let baseFilename
		try {
			const pathname = url.parse(uri,true).pathname;
			const matchResult = pathname ? /[^/]+$/.exec(pathname) : null;
			baseFilename = matchResult ? matchResult[0] : 'unknown';
		} catch (err) {
			debuglog(`WARNING Unable to determine base filename for ${uri}, using "unknown"`);
			baseFilename = 'unknown';
		}

		// why is this the first condition? because we may need baseFilename if filename is a folder
		if (!filename && !baseFilename) {
			return reject(new Error(`DOWNLOAD ${uri} - Filename not given and cannot determine base name`)); // TODO: Nicer error
		} else if (filename) {
			// if the filename is actually a folder that already exists, then download to the folder using the baseFilename
			fs.stat(filename, (err: ?Error, result: Stats): void => {
				try {
					if (err || !result.isDirectory()) {
						return resolve(filename); // just carry on using the filename
					} else {
						// we append the basefilename to the directory
						return resolve(path.join(filename, baseFilename));
					}
				} catch (e) {
					return reject(e);
				}
			});
		} else {
			// no filename, but we have a baseFilename
			return resolve(baseFilename);
		}

	});
}

export default {
	betterRequest, constructError, constructResult, constructOptionsWithJar, determineFilename
};