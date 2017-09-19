
var MAGIC = ((ns) => {

	function StatusWidget (rootElement) {
		this.root = rootElement;
		this.agents = [];
	}

	/**
	 * Required properties of 'agent' (for mocking):
	 * 	getName()
	 *	getMaxHealth()
	 *	getMaxShields()
	 *	getMaxEnergy()
	 *	getCondition()
	 *	sprite.renderBodyCannon(context, pos, aim)
	 */
	StatusWidget.prototype.addAgentDisplay = function (agent, idx) {
		this.agents.push(agent);

		let ord = idx + 1,
				item_id = `item-${ord}`,
				img_id = `img-${ord}`,
				name_id = `name-${ord}`,
				status_id = `status-${ord}`;
		// NOTE that all these IDs use the *ordinal* number of the actor

		let portrait = this.mkPortrait(agent, idx);
		portrait.style['grid-column'] = '1'
		portrait.style['grid-row'] = `${ord*2 - 1}/${ord*2 + 1}`;
		this.root.appendChild(portrait);
		let name = this.mkName(name_id, agent.getName());
		name.style['grid-column'] = '2/span 4'
		name.style['grid-row'] = `${ord*2 - 1}`;
		this.root.appendChild(name);
		let status = this.mkStatus(status_id, agent);
		status.style['grid-column'] = '2/span 4';
		status.style['grid-row'] = `${ord*2}`;
		this.root.appendChild(status);
	};

	StatusWidget.prototype.mkPortrait = function (agent, idx) {
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

	StatusWidget.prototype.mkName = function (name_id, name) {
		let div = document.createElement('div');
		div.setAttribute('id', name_id);
		div.setAttribute('class', 'widget-item name');
		div.innerText = name;
		div.style.paddingLeft = '12px';
		div.style.paddingTop = '3px';
		return div;
	};

	StatusWidget.prototype.mkStatus = function (status_id, agent) {
		let div = document.createElement('div');
		div.setAttribute('id', status_id);
		div.setAttribute('class', 'widget-item status');
		div.style['display'] ='grid';
		div.style['grid-template-columns'] = '1fr 1fr 1fr 1fr';
		div.style['align-items'] = 'center';
		div.style['justify-items'] = 'center';

		let health = document.createElement('div');
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

	StatusWidget.prototype.updateView = function () {
		this.agents.forEach((agent, index) => this.updateAgentView(agent, index));
	};

	StatusWidget.prototype.updateAgentView = function (agent, idx) {
		let hp = document.getElementsByClassName('currHP')[idx];
		hp.innerText = agent.getHealth();
		if (agent.getHealth() < agent.getMaxHealth() / 30) {
			let health = document.getElementById(`status-${idx+1}`)
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
