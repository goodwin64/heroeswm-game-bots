var Antigate = require('antigate');
var express = require('express')
var app = express();
 
var ag = new Antigate('***'); // paste here your Antigate key (instead of ***)

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.get('/cap/:capUrl', function (req, res) {
	ag.processFromURL(req.params.capUrl, function(error, text, id) {
		if (error) {
			console.log(error);
		} else {
			console.log('Now:          ', new Date());
			console.log('Your request: ', req.url);
			console.log('Captcha:      ', text);
			res.send(text.toLowerCase()); // comment this line to test manual server response
		}
	});
	// res.send('km9ucn'); // uncomment to test manual server response
});

app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});
