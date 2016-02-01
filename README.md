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

Please refer to [test.js][2] for some ES6 examples.

[1]: https://www.npmjs.com/package/qscraper
[2]: test.js