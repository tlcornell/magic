/////////////////////////////////////////////////////////////////////////////
// 
// AgentFactory.js
//
// Load data for agent types, create instances.
//


var MAGIC = ((ns) => {

	// IMPORTS
	let Game = ns.Game,
			GenericAgent = ns.GenericAgent,
			Interpreter = ns.Interpreter;

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

	AgentFactory.prototype.initialize = function (continuation) {
		this.loadAgentKits(continuation);
	}

	AgentFactory.prototype.loadAgentKits = function (continuation) {

		let serverUrl = 'http://localhost:3000';

		let downloadKitsFromConfigs = () => {
			let queue = Object.keys(this.agentKits),
					remaining = queue.length;
			let done = () => {
				continuation(queue);
			};
			queue.forEach((kitName) => {
				let kit = this.agentKits[kitName],
						script = kit.config.script,
						url = `${serverUrl}/resources/agents/${kitName}/${script}`,
						req = new XMLHttpRequest();
				req.open('GET', url);
				req.onerror = () => {
					throw new Error(`Attempt to get script failed (${url})`);
				};
				req.onload = () => {
					kit.script = req.responseText;
					if (--remaining === 0) {
						done();
					}
				};
				req.send();
			});
		};

		/**
		 * Get the kit names and their paths from the server.
		 * Then get their config files.
		 * Then pass control to downloadKitsFromConfigs, to pull down all
		 * the stuff mentioned in the kit config.
		 */
		let getKitsFromList = () => {
			let dirList = JSON.parse(xreq.responseText);
			let kitNames = dirList.map(
				(agentDir) => agentDir.substr(agentDir.lastIndexOf('/') + 1));
			let cfgList = dirList.map((agtDir) => `${agtDir}/config.js`);
			let count = cfgList.length;
			zipForEach(kitNames, cfgList, (kitName, cfgPath) => {
				var cfgreq = new XMLHttpRequest();
				cfgreq.open('GET', `${serverUrl}${cfgPath}`);
				cfgreq.onload = () => {
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
		let kit = this.agentKits[agentType];
		this.howManyOfEach[agentType] = this.howManyOfEach[agentType] || 0;
		let typeCount = ++this.howManyOfEach[agentType],
				id = this.counter++,
				name = typeCount > 1 ? `${agentType} #${typeCount}` : `${agentType}`;
		let properties = {
			name: name,
			number: id,									// per-game unique ID
			type: 'agent/generic',			// there's no non-generic agent, so redundant
			hw: kit.config.loadout,
		};
		let agent = new GenericAgent(properties);
		agent.sourceCode = kit.script; 
		let compiler = new ns.Compiler();
		compiler.compile(agent);	// --> agent.program
		agent.interpreter = new ns.Interpreter(agent);

		return agent;
	}

	// EXPORTS
	ns.AgentFactory = AgentFactory;

	return ns;

})(MAGIC || {});
