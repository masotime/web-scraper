import request from 'request';
import fs from 'fs';
import Promise from 'bluebird';
import zlib from 'zlib';

import lib from './lib';

const { betterRequest, constructOptionsWithJar, constructError, constructResult, determineFilename } = lib;

// creates a closure instance of a scraper
function Scraper() {

	const jar = request.jar();
	const constructOptions = (uri, { headers, query, body } = {} ) => constructOptionsWithJar(uri, { headers, query, body, jar });

	const get = (uri, { headers, query } = {} ) => new Promise( (resolve, reject) => {
		const options = constructOptions(uri, { headers, query });
		return betterRequest(options, (err, resp, body) => {
			if (err) {
				return reject(err);
			} else if (resp.statusCode !== 200) {
				return reject(constructError(options, resp, body));
			} else {
				return resolve(constructResult(resp, body));
			}
		});

	});

	const post = (uri, { headers, query, body } = {} ) => new Promise( (resolve, reject) => {
		const options = constructOptions(uri, { headers, query, body });
		return betterRequest(options, function(err, resp, body) {
			if (err) {
				return reject(err);
			} else if (resp.statusCode !== 200) {
				return reject(constructError(options, resp, body));
			} else {
				return resolve(constructResult(resp, body));
			}
		});
	});

	// MAYDO: A download may be the response from a POST?
	const download = function(uri, { headers, query, filename } = {}) {

		return determineFilename(uri, filename).then( downloadpath => {
			console.log(`DOWNLOAD ${uri} to ${downloadpath}`);

			const options = constructOptions(uri, { headers, query });
			const writeStream = fs.createWriteStream(downloadpath);
			const req = request(options);

			return new Promise((resolve, reject) => {
				// adapted from http://nickfishman.com/post/49533681471/nodejs-http-requests-with-gzip-deflate-compression,
				// but this time this is clearly a use case for streams
				req.on('response', function(res) {
					var encoding = res.headers['content-encoding'];

					if (res.statusCode !== 200) {
						return reject(constructError(options, res, res.body));
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