import express from 'express';
import bodyParser from 'body-parser';


const app = express();
const handler = (req, res) => {
	if (req.body && req.body.one === '1' && req.body.two === '2') {
		res.sendFile('_swfobject.file', { root: __dirname });
	} else {
		res.status(403).end();
	}
};

app.post('/download1', bodyParser.urlencoded({ extended: true }), handler);
app.post('/download2', bodyParser.json(), handler);

export default app;