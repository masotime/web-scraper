# webscrape

[![npm downloads][downloads-image]][downloads-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage Status][coverage-image]][coverage-url]

`webscrape` is a convenience module that grabs stuff over HTTP and provides automatic parsing into JSON or a convenient jQuery selector to allow you to quickly manipulate the result. In addition, it also supports an endpoint to download files into your filesystem, either with the same name remotely, or to a specified folder / filename.

`webscrape` is [Promise/A+][promiseA+] based via [bluebird][4], and as a result also works well with ES7's `async/await` syntax.

## usage

This module uses **default exports**. In ES6, you would do

```
import Scraper from 'webscrape';

const scraper = Scraper();
```

However in ES5, you would do

```
var webscrape = require('webscrape');
var scraper = webscrape.default();
```

## api

`webscrape` uses a standard syntax for all invocations. Currently it supports the 2 basic HTTP methods, GET and POST, and are invoked via

* `scraper.get(url, options)`
* `scraper.post(url, options)`

In addition, there is also

* `scraper.download(url, options)`

All invocations return **A+ Promises**. This works well with `async/await` in ES7.

1. The first argument `url` is _always_ the URL you want to scrape
2. The second argument is an object that contains additional options regarding the HTTP request you want to make.
   * For `.get`, `{ headers, query }` is supported
   * For `.post`, `{ headers, query, body }` is supported.
   * For `.download`, `{ headers, query, filename, post }` is supported.

e.g. `scraper.get("http://www.google.com/search", { query: { q: 'pineapples' } });`

### parameters

* `headers` should be a simple JavaScript object representing the HTTP headers you want to send.
* `query` is also a JavaScript object of the query params you want to send.
* `body` is a JavaScript object of the FORM params you want to POST (multipart is not currently supported)
* `filename` is a **string** - the path of where you want the file you are downloading to be saved as, otherwise the original name is used.
* `post` - this is a special parameter available for download only. It changes the method to POST and should be an object which contains the POST body.

### response

Apart from the `download` API, the response will be a "result" object with one or more additional properties

* It will always have a `.body` property representing the entirety of the response body, along with `.headers`
* If the response is of type `application/json`, then there will be a `.json` property which is essentially the parsed JSON object.
* If the response is of type `text/html`, there will be a `.$` which, via the [cheerio][3] library, provides jQuery-like selector functionality.

## examples (ES6/2015):

```
import Scraper from 'webscrape';

const scraper = Scraper();

async function main() {
    const result = await scraper.get('https://www.google.com');
    console.log(result.body); // dumps the raw HTML
    console.log(result.$('title').text()); // returns "Google"

    const query = {
        'address': '1600 Amphitheatre Parkway, Mountain View, CA',
        'sensor': 'false'
    };
    const result2 = await scraper.get('http://maps.googleapis.com/maps/api/geocode/json', { query })
    console.log(result2.json); // gets JSON information about the Google's Headquarters
}

async function execute() {
	try {
		await main();
	} catch (e) {
		console.error(e.stack || e);
	}
}

execute();

```

Please refer to [test.js][2] for more ES6 examples.

P.S. This replaces the older [qscraper][1] library with a more efficient API. This module is currently for Node only, it is _not_ a universal or client-side module.

[1]: https://www.npmjs.com/package/qscraper
[2]: test.js
[3]: https://www.npmjs.com/package/cheerio
[4]: https://www.npmjs.com/package/bluebird
[promiseA+]: https://promisesaplus.com

[downloads-image]: https://img.shields.io/npm/dm/webscrape.svg?style=flat-square
[downloads-url]: https://www.npmjs.com/package/webscrape
[travis-image]: https://travis-ci.org/masotime/webscrape.svg?branch=master
[travis-url]: https://travis-ci.org/masotime/webscrape
[daviddm-image]: https://david-dm.org/masotime/webscrape.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/masotime/webscrape
[coverage-image]: https://coveralls.io/repos/github/masotime/webscrape/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/masotime/webscrape?branch=master