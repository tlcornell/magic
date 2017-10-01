////////////////////////////////////////////////////////////////////////
// Cribbed from 
//
var express = require('express'),
  path = require('path'),
  fs = require('fs'),
  app = express();

//set the port
app.set('port', 3000);

var public = path.join(__dirname, '../public');
console.log(public);
app.use(express.static(path.join(__dirname, '../public')));

//app.get('/', serveMainGamePage);

//app.get('/agents', agentListRequest);

// Listen for requests
var server = app.listen(app.get('port'), function () {
  console.log('The server is running on http://localhost:' + app.get('port'));
});


function serveMainGamePage(req, res) {
	res.sendFile(path.join(__dirname, '../public/index.html'));
}


/*
function agentListRequest(req, res) {

	console.log(req.get('Origin'));

	justTheDirs("./resources/agents", (err, results) => {
		if (err) throw err;
		//console.log(results);
		res.setHeader('Access-Controll-Allow-Origin', '*');
		console.log(res);
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

function traverse (dir, done) {
	let results = [];
	fs.readdir(dir, (err, entries) => {
		if (err) {
			return done(err);
		} 
		let pending = entries.length;
		if (!pending) {
			return done(null, results);
		}
		entries.forEach((entry) => {
			entry = path.resolve(dir, entry);
			fs.stat(entry, (err, stats) => {
				if (stats && stats.isDirectory()) {
					traverse(entry, (err, res) => {
						results = results.concat(res);
						if (!--pending) done(null, results);
					});
				} else {
					results.push(entry);
					if (!--pending) done(null, results);
				}
			});
		});
	});
}
*/
