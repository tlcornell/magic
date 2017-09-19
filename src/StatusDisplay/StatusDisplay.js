
var MAGIC = ((ns) => {

	function StatusWidget (rootElement) {
		this.root = rootElement;
		this.agentDisplays = [];
	}

	StatusWidget.botsAvailable = [
			"(empty)",
			"Navigator",
			"GunTurrent",
			"ModifiedShotBot",
			"WallBouncer",
	];

	StatusWidget.prototype.create = function () {
		for (let i = 0; i < 6; ++i) {
			this.addAgentDisplay(null, i);
		}
	};

	StatusWidget.prototype.addAgentDisplay = function (agent, idx) {
		let ad = new AgentDisplayWidget(this.root, agent, idx);

		this.agentDisplays.push(ad);
	};

	StatusWidget.prototype.updateView = function () {
		this.agentDisplays.forEach((view, index) => view.updateAgentView(index));
	};




	function AgentDisplayWidget (parent, agent, i) {
		// IRL this will be a game object; for now it's a name:
		this.agent = agent;
		this.data = agent.getName();
		// The <div> wrapping the selector/text:
		this.boundElement = this.create(parent, i);
	}

	AgentDisplayWidget.prototype.mkPortrait = function (idx) {
		let agent = this.agent;
		let div = document.createElement('div');
		div.style.margin = 0;
		div.style.padding = 0;
		div.setAttribute('class', 'widget-item');

		let canvas = document.createElement('canvas');
		canvas.setAttribute('width', '64');
		canvas.setAttribute('height', '64');
		canvas.class = 'widget-item';
		let ctx = canvas.getContext('2d');
		agent.sprite.renderBodyCannon(ctx, {x:32, y:32}, 0);
		//drawBot(ctx, idx);
		//drawImg(ctx);

		div.appendChild(canvas);
		return div;
	};

	AgentDisplayWidget.prototype.mkName = function () {
		let div = document.createElement('div');
		div.setAttribute('class', 'widget-item name');
		let sel = this.mkSelect();
		div.appendChild(sel);
		//-----------------------------------------------
		this.boundElement = div;
		this.change(sel.value);
		//-----------------------------------------------
		div.style.paddingLeft = '12px';
		div.style.paddingTop = '3px';
		return div;
	};

	AgentDisplayWidget.prototype.mkStatus = function () {
		let agent = this.agent;
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
				${agent.getMaxHealth()}
			</span>/<span class="maxHP">
				${agent.getMaxHealth()}
			</span>`;
		div.appendChild(health);

		let energy = document.createElement('div');
		energy.style['grid-column'] = '2';
		energy.style['grid-row'] = '1';
		energy.innerHTML =
		`⚡ 
		<span class="currEnergy">
			${agent.getMaxEnergy()}
		</span>/<span class="maxEnergy">
			${agent.getMaxEnergy()}
		</span>`;
		div.appendChild(energy);

		let shields = document.createElement('div');
		shields.style['grid-column'] = '3';
		shields.style['grid-row'] = '1';
		shields.innerHTML =
			`🛡️ 
			<span class="currShields">
				${agent.getMaxShields()}
			</span>/<span class="maxShields">
				${agent.getMaxShields()}
			</span>`;
		div.appendChild(shields);

		let condition = document.createElement('div');
		condition.style['grid-column'] = '4';
		condition.style['grid-row'] = '1';
		condition.innerHTML = 
			`<span class="conditionVal">${agent.getCondition()}</span>`;
		div.appendChild(condition);
		return div;
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
				this.change(this.boundElement.childNodes[0].value);
				break;
		}
	};

	/**
	 * This is the guts of the <select> onChange event handler, but it
	 * is written so that it can be called by other clients besides the
	 * game UI.
	 */
	AgentDisplayWidget.prototype.change = function (val) {
		this.boundElement.childNodes[0].value = val;
		this.data = val;
	};

	/**
	 * Called on game start to fix the roster to the current state
	 * of all the agent selectors.
	 */
	AgentDisplayWidget.prototype.acceptSelection = function () {
		// Replace <select> with text from <select>.value
		// Contract: this.data must equal the final value of <select>
		this.boundElement.innerHTML = '';
		this.boundElement.innerHTML = this.data;
	};

	/**
	 * Called on game stop (but not pause!), to allow the selection of agents
	 * in the roster.
	 */
	AgentDisplayWidget.prototype.allowSelection = function () {
		this.boundElement.innerHTML = '';
		let sel = this.mkSelect();
		this.boundElement.appendChild(sel);
		this.change(sel.value);
	}

	AgentDisplayWidget.prototype.mkSelect = function () {
		let nameSel = document.createElement('select');
		StatusWidget.botsAvailable.forEach((nm) => {
			let opt = document.createElement('option');
			opt.value = nm;
			opt.innerText = nm;
			nameSel.appendChild(opt);
		});
		nameSel.addEventListener("change", this, false);
		return nameSel;
	}

	AgentDisplayWidget.prototype.updateAgentView = function (idx) {
		let agent = this.agent;
		let hp = document.getElementsByClassName('currHP')[idx];
		hp.innerText = agent.getHealth();
		if (agent.getHealth() < agent.getMaxHealth() / 30) {
			let health = document.getElementsByClassName('status')[idx];
			health.firstElementChild.style.color = 'red';
		}
		let en = document.getElementsByClassName('currEnergy')[idx];
		en.innerText = agent.getEnergy();
		let sh = document.getElementsByClassName('currShields')[idx];
		sh.innerText = agent.getShields();
		let co = document.getElementsByClassName('conditionVal')[idx],
				agtCnd = agent.getCondition();
		co.innerText = agtCnd;
		if (agtCnd === 'DEAD') {
			co.style['background-color'] = '#AAA';
			co.style['border-color'] = '#888';
		}
	};



	// EXPORTS
	ns.StatusWidget = StatusWidget;

	return ns;

})(MAGIC || {});
