////////////////////////////////////////////////////////////////////////
// Cribbed from 
//
var express = require('express'),
  path = require('path'),
  fs = require('fs'),
  app = express(),
  config = require('../config');

//set the port
app.set('port', config.apiPort);

//
// Routes to static files
//	
var public = path.join(__dirname, '../public');
var npm = path.join(__dirname, '../node_modules');
var cfgdir = path.join(__dirname, '../config');
app.use(express.static(public));
app.use(express.static(npm));
app.use('/config', express.static(cfgdir));

app.use((req, res, next) => {
	console.log('Origin (if specified):', req.get('Origin'));
	next();
});

//
// Routes for Game-Internal APIs
//
app.get('/agents', agentListRequest);

//
// Start Listening
//
var server = app.listen(app.get('port'), config.apiHost, function () {
  console.log(`The server is running on http://${config.apiHost}:${app.get('port')}`);
});



////////////////////////////////////////////////////////////////////////////
// Callbacks, Helper Functions, etc.
//


function agentListRequest(req, res) {

	/*
	{
		name: "...",
		config: {...},
		script: "...",
		sprites: ["...", "...", ...],
	}
	*/

	justTheDirs("./public/resources/agents", (err, results) => {
		if (err) throw err;
		results = results.map((path) => 
			path.substr(path.indexOf('/resources'))
		);
		res.send(results);
	});

}


function justTheDirs (root, done) {
	let results = [];
	fs.readdir(root, (err, entries) => {

		if (err) return done(err);
		let pending = entries.length;
		if (!pending) {
			return done(null, results);
		}

		entries.forEach(entry => {
			entry = path.resolve(root, entry);
			fs.stat(entry, (err, stats) => {
				if (stats && stats.isDirectory()) {
					results.push(entry);
					if (!--pending) {
						done(null, results);
					}
				} else {
					if (!--pending) done(null, results);
				}
			});
		});

	});
}

function traverse (dir, select, done) {

	let results = [];

	fs.readdir(dir, (err, entries) => {

		if (err) return done(err);
		let pending = entries.length;
		if (!pending) return done(null, results);
		
		entries.forEach((entry) => {
			entry = path.resolve(dir, entry);
			fs.stat(entry, (err, stats) => {

				if (stats && stats.isDirectory()) {
					traverse(entry, select, (err, res) => {
						results = results.concat(res);
						if (!--pending) done(null, results);
					});
				} else {
					if (select(entry)) results.push(entry);
					if (!--pending) done(null, results);
				}

			});
		});

	});
}

