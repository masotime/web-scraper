# webscrape

NOTE: I wanted `scrape`, `scraper`, `webscraper` or `web-scraper` but people are squatting on the name in npm...

This replaces the older [qscraper][1] library with a more efficient API. This module is currently for Node only, it is _not_ a universal or client-side module.

## usage

This module uses default exports. In ES6, you would do

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

* `scraper.get(...)`
* `scraper.post(...)`

In addition, there is also

* `scraper.download(...)`

All invocations return **A+ Promises**. This works well with `async/await` in ES7.

1. The first argument is _always_ the URL you want to scrape
2. The second argument is an object that contains additional options regarding the HTTP request you want to make.
   * For `.get`, `{ headers, query }` is supported
   * For `.post`, `{ headers, query, body }` is supported.
   * For `.download`, `{ headers, query, filename }` is supported.

e.g. `scraper.get("http://www.google.com/search", { query: { q: 'pineapples' } });`

### parameters

* `headers` should be a simple JavaScript object representing the HTTP headers you want to send.
* `query` is also a JavaScript object of the query params you want to send.
* `body` is a JavaScript object of the FORM params you want to POST (multipart is not currently supported)
* `filename` is a **string** - the path of where you want the file you are downloading to be saved as, otherwise the original name is used.

### response 

Apart from the `download` API, the response will be a "result" object with one or more additional properties

* It will always have a `.body` property representing the entirety of the response body.
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

await main();

```

Please refer to [test.js][2] for more ES6 examples.

[1]: https://www.npmjs.com/package/qscraper
[2]: test.js
[3]: https://www.npmjs.com/package/cheerio