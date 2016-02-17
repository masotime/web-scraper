# webscrape

NOTE: I wanted `scrape`, `scraper`, `webscraper` or `web-scraper` but people are squatting on the name in npm...

This replaces the older [qscraper][1] library with a more efficient API.

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

* `scrapper.download(...)`

All invocations return **A+ Promises**. This works well with `async/await` in ES7.

1. The first argument is _always_ the URL you want to scrape
2. The second argument is an object that contains additional options regarding the HTTP request you want to make.
  a. For `.get`, `{ headers, query }` is supported
  b. For `.post`, `{ headers, query, body }` is supported.
  c. For `.download`, `{ headers, query, filename }` is supported.

* `headers` should be a simple JavaScript object representing the HTTP headers you want to send.
* `query` is also a JavaScript object of the query params you want to send.
* `body` is a JavaScript object of the FORM params you want to POST (multipart is not currently supported)
* `filename` is a **string** - the path of where you want the file you are downloading to be saved as, otherwise the original name is used.

Please refer to [test.js][2] for some ES6 examples.

[1]: https://www.npmjs.com/package/qscraper
[2]: test.js