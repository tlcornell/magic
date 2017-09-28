
var MAGIC = ((ns) => {

	function RosterManager (rootElement, numDisplays) {
		this.root = rootElement;
		this.numDisplays = numDisplays;
		this.agentDisplays = [];
	}

	/**
	 * This shouldn't really be hard-coded, but until we have the ability 
	 * to scan the disk for built-ins and host posted agents it'll have to do.
	 */
	RosterManager.EMPTY_SLOT = "";
	RosterManager.botsAvailable = [
			RosterManager.EMPTY_SLOT,
			"Navigator",
			"GunTurret",
			"ModifiedShotBot",
			"WallBouncer",
	];

	RosterManager.prototype.createView = function () {
		for (let i = 0; i < 6; ++i) {
			this.addAgentDisplay(i);
		}
	};

	RosterManager.prototype.addAgentDisplay = function (idx) {
		let ad = new AgentDisplayWidget(this.root, idx);
		this.agentDisplays.push(ad);
	};

	RosterManager.prototype.attachAgent = function (agent, idx) {
		this.agentDisplays[idx].attachAgent(agent, idx);
	};

	RosterManager.prototype.acceptSelection = function () {
		this.agentDisplays.forEach((e) => e.acceptSelection());
	};

	/**
	 * Called when the 'Start Game' button is pressed.
	 */
	RosterManager.prototype.getRoster = function () {
		let roster = [];
		this.agentDisplays.forEach((slot) => {
			if (slot.data !== RosterManager.EMPTY_SLOT) {
				roster.push(slot.data);
			}
		});
		return roster;
	};

	RosterManager.prototype.updateView = function () {
		this.agentDisplays.forEach((view, index) => view.updateAgentView(index));
	};

	RosterManager.prototype.reset = function () {
		this.agentDisplays.forEach((view) => view.reset());
	};




	function AgentDisplayWidget (parent, i) {
		this.agent = null;
		// What we really want here is two elements occupying the same space,
		// with only one of them set to 'visible' at a time. Otherwise, we keep
		// creating new selector elements that are identical to the old ones
		// that we *hope* have been garbage collected...
		this.portrait = null;
		this.health = {curr: null, max: null};
		this.energy = {curr: null, max: null};
		this.shields = {curr: null, max: null};
		this.condition = null;

		this.data = "";
		// The <div> wrapping the selector/text:
		this.element = this.create(parent, i);

	}

	AgentDisplayWidget.prototype.reset = function () {
		this.agent = null;
		this.allowSelection();	// should reset this.data
		this.resetPortrait();
		this.resetStats();
	}

	AgentDisplayWidget.prototype.attachAgent = function (agent, idx) {
		if (this.agent !== null) {
			console.log(`DEBUG: Overwriting agent -- skipped cleanup phase?`);
		}
		this.agent = agent;
		this.initializeAgentView(idx);
	}

	AgentDisplayWidget.prototype.mkPortrait = function (idx) {
		//let agent = this.agent;
		let div = document.createElement('div');
//		div.style.margin = 0;
//		div.style.padding = 0;
		div.setAttribute('class', 'widget-item');

		let canvas = document.createElement('canvas');
		canvas.setAttribute('width', '64');
		canvas.setAttribute('height', '64');
		canvas.class = 'widget-item';
		this.portrait = canvas;
		this.drawDefaultPortrait();
		div.appendChild(canvas);
		return div;
	};

	AgentDisplayWidget.prototype.getDrawingContext = function () {
		return this.portrait.getContext('2d');
	};

	AgentDisplayWidget.prototype.resetPortrait = function () {
		this.drawDefaultPortrait();
	};

	AgentDisplayWidget.prototype.drawDefaultPortrait = function () {
		let ctx = this.getDrawingContext();
		let radius = 15,
				stroke = '#888',
				fill = '#AAA',
				posX = this.portrait.width/2,
				posY = this.portrait.height/2;
		ctx.strokeStyle = stroke;
		ctx.fillStyle = fill;
		ctx.beginPath();
		ctx.arc(posX, posY, radius, 0, 2 * Math.PI);
		ctx.fill();
		ctx.stroke();
	}

	AgentDisplayWidget.prototype.drawAgentPortrait = function () {
		let sprite = this.agent.sprite,
				ctx = this.getDrawingContext(),
				cvs = this.portrait,
				pos = {x: cvs.width/2, y: cvs.height/2};
		sprite.renderBodyCannon(ctx, pos, 0);
	};

	AgentDisplayWidget.prototype.mkName = function () {
		let div = document.createElement('div');
		div.setAttribute('class', 'widget-item name');
		let sel = this.mkSelect();
		div.appendChild(sel);
		//-----------------------------------------------
		this.element = div;
		this.change(sel.value);
		//-----------------------------------------------
		div.style.paddingLeft = '12px';
		div.style.paddingTop = '8px';
		return div;
	};

	AgentDisplayWidget.prototype.mkStatus = function () {
		//let agent = this.agent;
		let div = document.createElement('div');
		div.setAttribute('class', 'widget-item status');
		div.style['display'] ='grid';
		div.style['grid-template-columns'] = '1fr 1fr 1fr 1fr';
		div.style['align-items'] = 'center';
		div.style['justify-items'] = 'center';

		let health = document.createElement('div');
		health.setAttribute('class', 'hpView');
		health.style['grid-column'] = '1';
		health.style['grid-row'] = '1';
		health.innerHTML = 
			`❤️ 
			<span class="currHP">
				0
			</span>/<span class="maxHP">
				0
			</span>`;
		this.health.curr = health.getElementsByClassName("currHP")[0];
		this.health.max = health.getElementsByClassName("maxHP")[0];
		div.appendChild(health);

		let energy = document.createElement('div');
		energy.style['grid-column'] = '2';
		energy.style['grid-row'] = '1';
		energy.innerHTML =
			`⚡ 
			<span class="currEnergy">
				0
			</span>/<span class="maxEnergy">
				0
			</span>`;
		this.energy.curr = energy.getElementsByClassName("currEnergy")[0];
		this.energy.max = energy.getElementsByClassName("maxEnergy")[0];
		div.appendChild(energy);

		let shields = document.createElement('div');
		shields.style['grid-column'] = '3';
		shields.style['grid-row'] = '1';
		shields.innerHTML =
			`🛡️ 
			<span class="currShields">
				0
			</span>/<span class="maxShields">
				0
			</span>`;
		this.shields.curr = shields.getElementsByClassName("currShields")[0];
		this.shields.max = shields.getElementsByClassName("maxShields")[0];
		div.appendChild(shields);

		let condition = document.createElement('div');
		condition.style['grid-column'] = '4';
		condition.style['grid-row'] = '1';
		let cval = 'UNKNOWN';
		condition.innerHTML = 
			`<span class="conditionVal">${cval}</span>`;
		this.condition = condition.firstElementChild;
		this.conditionColor(cval);
		div.appendChild(condition);
		return div;
	};

	AgentDisplayWidget.prototype.resetStats = function () {
		let props = ['health', 'energy', 'shields'];
		props.forEach((prop) => {
			this[prop].curr.innerText = '0';
			this[prop].max.innerText = '0';
		});
		let cval = 'UNKNOWN'
		this.condition.innerText = cval;
		this.conditionColor(cval);
	};

	AgentDisplayWidget.prototype.create = function (parent, idx) {

		let portrait = this.mkPortrait(idx);
		portrait.style['grid-column'] = '1'
		portrait.style['grid-row'] = `${(idx * 2) + 1}/span 2`;
		parent.appendChild(portrait);

		let name = this.mkName();
		name.style['grid-column'] = '2/span 4'
		name.style['grid-row'] = `${(idx * 2) + 1}`;
		parent.appendChild(name);

		let status = this.mkStatus();
		status.style['grid-column'] = '2/span 4';
		status.style['grid-row'] = `${(idx * 2) + 2}`;
		parent.appendChild(status);

		return name;
	};

	AgentDisplayWidget.prototype.handleEvent = function (evt) {
		switch (evt.type) {
			case 'change':
				this.change(this.element.childNodes[0].value);
				break;
		}
	};

	/**
	 * This is the guts of the <select> onChange event handler, but it
	 * is written so that it can be called by other clients besides the
	 * game UI.
	 */
	AgentDisplayWidget.prototype.change = function (val) {
		this.element.childNodes[0].value = val;
		this.data = val;
	};

	/**
	 * Called on game start to fix the roster to the current state
	 * of all the agent selectors.
	 */
	AgentDisplayWidget.prototype.acceptSelection = function () {
		// Replace <select> with text from <select>.value
		// Contract: this.data must equal the final value of <select>
		this.element.innerHTML = '';
		this.element.innerHTML = this.data;
		this.agent = null;
	};

	/**
	 * Called on game reset (but not restart or pause!), to allow the 
	 * selection of agents in the roster.
	 */
	AgentDisplayWidget.prototype.allowSelection = function () {
		this.element.innerHTML = '';
		let sel = this.mkSelect();
		this.element.appendChild(sel);
		this.change(sel.value);
	}

	AgentDisplayWidget.prototype.mkSelect = function () {
		let nameSel = document.createElement('select');
		RosterManager.botsAvailable.forEach((nm) => {
			let opt = document.createElement('option');
			opt.value = nm;
			opt.innerText = nm;
			nameSel.appendChild(opt);
		});
		nameSel.addEventListener("change", this, false);
		return nameSel;
	}

	AgentDisplayWidget.prototype.updateAgentView = function () {
		let agent = this.agent;
		if (agent === null) {
			return;
		}
		this.health.curr.innerText = agent.getHealth();
//		if (agent.getHealth() < agent.getMaxHealth() / 30) {
//			let health = document.getElementsByClassName('status')[idx];
//			health.firstElementChild.style.color = 'red';
//		}
		this.energy.curr.innerText = ns.round(agent.getEnergy());
		this.shields.innerText = agent.getShields();
		let agtCnd = agent.getCondition();
		this.condition.innerText = agtCnd;
		this.conditionColor(agtCnd);
	};


	AgentDisplayWidget.prototype.initializeAgentView = function () {
		this.updateAgentView();	// sets curr vals, and condition
		this.health.max.innerText = this.agent.getMaxHealth();
		this.energy.max.innerText = this.agent.getMaxEnergy();
		this.shields.max.innerText = this.agent.getMaxShields();
		this.drawAgentPortrait();
	};


	AgentDisplayWidget.prototype.conditionColor = function (cond) {
		let elt = this.condition;
		switch (cond) {
			case 'DEAD':
				elt.style['background-color'] = '#AAA';
				elt.style['border-color'] = '#444';
				elt.style['color'] = '#444';
				break;
			case 'GOOD':
				elt.style['background-color'] = 'hsl(106, 67%, 75%)';
				elt.style['border-color'] = 'hsl(106, 67%, 25%)';
				elt.style['color'] = 'hsl(106, 67%, 25%)';
				break;
			default:
				elt.style['background-color'] = 'hsl(43, 47%, 75%)';
				elt.style['border-color'] = 'hsl(43, 47%, 25%)';
				elt.style['color'] = 'hsl(43, 47%, 25%)';
				break;
		}
	};



	// EXPORTS
	ns.RosterManager = RosterManager;

	return ns;

})(MAGIC || {});
