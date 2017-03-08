/* global describe, it, afterEach */
import assert from 'assert';
import Scraper from './src/index';
import Promise from 'bluebird';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

Promise.promisifyAll(fs);
const mkdir = Promise.promisify(mkdirp);

function asyncMocha (testFn) {
	return async done => {
		try {
			await testFn();
			done();
		} catch(err) {
			done(err);
		}
	}
}

async function deleteIfExists(...files) {
	return files.reduce( async (chain, file) => {
		try {
			await chain;
			const stat = await fs.statAsync(file);
			return stat.isDirectory() && await fs.rmdirAsync(file) || await fs.unlinkAsync(file);
		} catch (err) {
			// file probably doesn't exist, so we ignore
		}
	}, Promise.resolve());
}

describe('Scraper', () => {

	// MAYDO: Transpilation means that the function length cannot be properly tested
	const apis = [
		{ name: 'get', length: 2 },
		{ name: 'post', length: 2 },
		{ name: 'download', length: 2}
	];

	it('should return a scrape object', asyncMocha( async () => {
		const scraper = Scraper();
		assert.equal(typeof scraper, 'object');
		apis.forEach(api => {
			assert.equal(typeof scraper[api.name], 'function');
		});
	}));

	it('should be able to fetch Google\'s home page', asyncMocha( async () => {
		const scraper = Scraper();
		const result = await scraper.get('https://www.google.com');
		assert.ok(result.body);
		assert.ok(result.body.includes('<title>Google</title>'));
	}));

	it('should get a $ representation of Google\'s home page', asyncMocha( async () => {
		const scraper = Scraper();
		const result = await scraper.get('https://www.google.com');
		assert.ok(result.$);
		assert.equal(result.$('title').text(), 'Google');
	}));

	it('should be able to fetch a JSON response from Google\'s GEOCoding API', asyncMocha( async () => {
		const query = {
			'address': '1600 Amphitheatre Parkway, Mountain View, CA',
			'sensor': 'false'
		};

		const scraper = Scraper();
		const result = await scraper.get('http://maps.googleapis.com/maps/api/geocode/json', { query });
		assert.ok(result.json);
	}));

	describe('download', () => {
		const url = 'https://ajax.googleapis.com/ajax/libs/swfobject/2.2/swfobject.js';
		const innerpath = 'tempinnerfolder';
		const baseName = 'swfobject.js';
		const newName = 'differentswfobject.js';

		afterEach( async () => await deleteIfExists(baseName, newName, path.join(innerpath, baseName), innerpath));

		it('should be able to download the SWF object javascript library from Google\'s CDN', asyncMocha( async() => {
			const scraper = Scraper();

			const downloadedName = await scraper.download(url);
			assert.equal(downloadedName, baseName);

			const contents = await fs.readFileAsync(downloadedName, { encoding: 'utf8' });
			assert.ok(contents.includes('SWFObject'));
		}));

		it('should be able to download to the "inner" folder when that is used as the "target filename"', asyncMocha( async () => {
			const scraper = Scraper();
			await mkdir(innerpath);

			const downloadedName = await scraper.download(url, { filename: innerpath });
			assert.equal(downloadedName, path.join(innerpath, baseName));

			const contents = await fs.readFileAsync(downloadedName, { encoding: 'utf8'});
			assert.ok(contents.includes('SWFObject'));
		}));

		it('should be able to download the SWF object javascript library under a different name', asyncMocha( async () => {
			const scraper = Scraper();

			const downloadedName = await scraper.download(url, { filename: newName });
			assert.equal(downloadedName, newName);

			const contents = await fs.readFileAsync(downloadedName, { encoding: 'utf8'});
			assert.ok(contents.includes('SWFObject'));
		}));

	});

	describe('support for headers', () => {
		const tempfile = "testfile.txt";
		const headers = { Referer: 'nonsense' };
		const HEADER_DIAGNOSIS_URL = 'https://www.whatismybrowser.com/detect/what-http-headers-is-my-browser-sending';

		it('should be able to add a header that is sent in the HTTP request', asyncMocha( async () => {
			const scraper = Scraper();
			const result = await scraper.get(HEADER_DIAGNOSIS_URL, { headers });
			assert.ok(result.$('th:contains("REFERER")').next().text().includes('nonsense'));
		}));

		it('should be able to download a file with the header sent in the HTTP request', asyncMocha( async () => {
			const scraper = Scraper();
			const downloadedName = await scraper.download(HEADER_DIAGNOSIS_URL, { filename: tempfile, headers });
			const contents = await fs.readFileAsync(downloadedName, { encoding: 'utf8' });
			assert.ok(contents.includes('nonsense'));
		}));

		it('should be able to read headers from the response', asyncMocha( async () => {
			const scraper = Scraper();
			const { headers } = await scraper.get('https://www.instagram.com');

			assert.ok(headers['set-cookie']);
		}));

		afterEach( async () => await deleteIfExists(tempfile));

	});

	describe('querystring support', () => {
		it('should use indices by default for arrays in query', asyncMocha( async () => {
			const scraper = Scraper();
			const { json } = await scraper.get('https://postman-echo.com/get', {
				query: {
					test: [123,234]
				}
			});

			assert.equal(decodeURI(json.url), 'https://postman-echo.com/get?test[0]=123&test[1]=234');
		}));

		it('should disable indicies if specified as false in options', asyncMocha( async () => {
			const scraper = Scraper();
			const { json } = await scraper.get('https://postman-echo.com/get', {
				query: {
					test: [123,234]
				},
				indicies: false
			});

			assert.equal(decodeURI(json.url), 'https://postman-echo.com/get?test=123&test=234');
		}));
	});

});