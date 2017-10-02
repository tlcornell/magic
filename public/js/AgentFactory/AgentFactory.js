/////////////////////////////////////////////////////////////////////////////
// 
// AgentFactory.js
//
// Load data for agent types, create instances.
//


var MAGIC = ((ns) => {

	// IMPORTS
	let Game = ns.Game;

	Array.prototype.zip = Array.prototype.zip || function zip(l2) {
		let l1 = this,
				n1 = l1.length,
				n2 = l2.length;
		if (n1 !== n2) {
			throw new Error("zip: lists not of equal lengths");
		}
		let result = [];
		for (let i = 0; i < n1; ++i) {
			result.push( [ l1[i], l2[i] ] );
		}
		return result;
	}

	function zipForEach(l1, l2, f) {
		for (let i = 0; i < l1.length; ++i) {
			f(l1[i], l2[i]);
		}
	}

	function AgentFactory(game) {
		this.game = game;
		this.counter = 0;
		this.howManyOfEach = {};
		this.agentKits = {};
	}

	AgentFactory.prototype.initialize = function () {
		console.log('Initializing AgentFactory...');
		this.loadAgentKits();
	}

	AgentFactory.prototype.loadAgentKits = function () {

		let serverUrl = 'http://localhost:3000';

		let downloadKitsFromConfigs = (cfgList) => {
			console.log(this.agentKits);
		};

		let getKitsFromList = () => {
			let dirList = JSON.parse(xreq.responseText);
			console.log('dirList', dirList);
			let kitNames = dirList.map(
				(agentDir) => agentDir.substr(agentDir.lastIndexOf('/') + 1));
			console.log("kitNames", kitNames);
			let cfgList = dirList.map((agtDir) => `${agtDir}/config.js`);
			let count = cfgList.length;
			zipForEach(kitNames, cfgList, (kitName, cfgPath) => {
				var cfgreq = new XMLHttpRequest();
				cfgreq.open('GET', `${serverUrl}${cfgPath}`);
				cfgreq.onload = () => {
					console.log(this);
					this.agentKits[kitName] = {
						config: JSON.parse(cfgreq.responseText),
					};
					if (--count === 0) {
						// Got'em all -- get the resources they are telling us about.
						downloadKitsFromConfigs();
					}
				};
				cfgreq.onerror = () => {
					throw new Error('Error attempting to get config files from server');
				};
				cfgreq.send();
			});
		};

		var xreq = new XMLHttpRequest();
		xreq.open('GET', 'http://localhost:3000/agents');
		xreq.onload = getKitsFromList;
		xreq.onerror = function () {
			throw new Error('Error attempting to get agent kit list from server');
		};
		xreq.send();

	}

	AgentFactory.prototype.reset = function () {
		this.counter = 0;
	}

	AgentFactory.prototype.createAgent = function (agentType) {
		this.howManyOfEach[agentType] = this.howManyOfEach[agentType] || 0;
		let typeCount = ++this.howManyOfEach[agentType];
		let properties = {
			name: `${type} #${typeCount}`,
			number: this.counter++,						// per-game unique ID
			type: 'agent/generic',						// there's no non-generic agent, so redundant
			sourceCode: ns.samples[type],
			hw: this.selectLoadout(type),
			//pos: initPosList[i],
			color: ((360/count) % 360) * i,
			radius: Game.const.AGENT_RADIUS,
		};

	}

	// EXPORTS
	ns.AgentFactory = AgentFactory;

	return ns;

})(MAGIC || {});
