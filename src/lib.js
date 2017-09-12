import request from 'request';
import cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
import url from 'url';
import Promise from 'bluebird';
import zlib from 'zlib';

import { debuglog } from 'util';

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
function betterRequest(options, callback) {

	// my god why doesn't mikeal just bake this shit into request
	const req = request(options);

	// adapted from http://nickfishman.com/post/49533681471/nodejs-http-requests-with-gzip-deflate-compression
	// TODO: Consider a streamed approach next time
	req.on('response', function(res) {
		const chunks = [];

		res.on('data', function(chunk) {
			chunks.push(chunk);
		});

		res.on('end', function() {
			const buffer = Buffer.concat(chunks);
			const encoding = res.headers['content-encoding'];

			try {
				if (encoding === 'gzip') {
					debuglog('Content is gzipped');
					zlib.gunzip(buffer, (err, decoded) => callback(err, res, decoded && decoded.toString()));
				} else if (encoding === 'deflate') {
					debuglog('Content is deflated');
					zlib.inflate(buffer, (err, decoded) =>  callback(err, res, decoded && decoded.toString()));
				} else {
					// very special case, although this should really be a 303.
					if (res.statusCode === 302) {
						const err = new Error(`Unexpected Redirect to ${res.headers.location}`);
						err.name = 'UnexpectedRedirectError';
						err.location = res.headers.location;
						return callback(err);
					}

					// manually handle 303... bah
					if (res.statusCode === 303) {
						options.uri = res.headers.location;
						return betterRequest(options, callback);
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

function constructError(options, resp, body) {
	const error = new Error();
	error.message = `${options.method || 'GET'} ERROR ${options.uri}`;
	error.statusCode = resp.statusCode;
	error.body = body;
	return error;
}

// TODO: This could throw errors. Deal with it.
function constructResult(resp, body) {
	const result = {
		body,
		headers: resp.headers
	};

	const contentType = resp.headers['content-type'];
	const mimeType = contentType && contentType.split(';')[0];
	// augment the result
	switch (mimeType) {
		case 'text/html': result.$ = cheerio.load(body, { lowerCaseTags: true }); break;
		case 'application/json': result.json = JSON.parse(body.replace(UNICODE_HEADER, (m, n) => String.fromCharCode(parseInt(n,16))));
	}

	return result;
}

function constructOptionsWithJar(uri, { headers, query, body, jar, agentOptions, method = 'GET', indicies = true }) {
	const options = { uri, jar, method };

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
		const contentTypeSet = Object.keys(options.headers)
			.map(key => ({ key: key.toLowerCase(), value: options.headers[key] }))
			.filter(pair => pair.key === 'content-type');
		if (contentTypeSet.length === 1) {
			// since there is a content type, we assume this is not a HTTP form POST.
			// NOTE: as a result, the user must do encoding manually.
			options.json = contentTypeSet[0].value.toLowerCase().startsWith('application/json');
			options.body = body;
		} else {
			options.form = body;
		}
	}

	return options;
}

function determineFilename(uri, filename) {
	return new Promise((resolve, reject) => {
		let baseFilename
		try {
			baseFilename = /[^/]+$/.exec(url.parse(uri,true).pathname)[0];
		} catch (err) {
			debuglog(`WARNING Unable to determine base filename for ${uri}`);
		}

		// why is this the first condition? because we may need baseFilename if filename is a folder
		if (!filename && !baseFilename) {
			return reject(new Error(`DOWNLOAD ${uri} - Filename not given and cannot determine base name`)); // TODO: Nicer error
		} else if (filename) {
			// if the filename is actually a folder that already exists, then download to the folder using the baseFilename
			fs.stat(filename, (err, result) => {
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