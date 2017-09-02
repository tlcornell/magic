
var MAGIC = (function(ns) {

	// Imports
	let randomFloat = ns.randomFloat,
		Layer = ns.Layer;

	const Q_DONE = 1;
	const Q_NOT_DONE = 2;
	const Q_NOT_DEAD = 3;
	const Q_DEAD = 4;
	const Q_ELIMINATED = 5;

	let PlayerAgent = function (name) {
		Object.assign(this, {
			name: name,
			health: 100,
			pos: {		// Should just be read only? Based on physics body props
				x: 0,
				y: 0,
			},
			drv: {		// "drive" -- direction of movement
				x: randomFloat(-3, 3),
				y: randomFloat(-3, 3),
			},
			aim: Math.random() * 2 * Math.PI,	// random initial AIM
		});
		this.state = new StateNotDead(this);
	}

	let StateNotDead = function (agent) {
		this.agent = agent;
		this.id = Q_NOT_DEAD;
	};

	StateNotDead.prototype.update = function () {
		//console.log("StateNotDead update", this.agent.name);
		if (this.agent.health === 0) {
			return Q_DONE;
		}

		//---------------------------------------------------
		// This is where the bot program gets advanced
		// (If the bot has any energy)

		this.agent.setAim(this.agent.getAim() + 5);

		// End of bot program step (i.e., end of chronon?)
		//---------------------------------------------------		
		
		this.agent.driveVector(this.agent.drv);

		return Q_NOT_DONE;
	}

	StateNotDead.prototype.render = function (ctx, layer) {
		let agent = this.agent,
			pos = agent.getPosition(), // get true position from physics body
			color = agent.color;

		if (layer === Layer.ACTIVE) {
			let stroke = `hsl(${color}, 50%, 33%)`,
				fill = `hsl(${color}, 50%, 67%)`;
			// circle
			ctx.strokeStyle = stroke;
			ctx.fillStyle = fill;
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, PlayerAgent.RADIUS, 0, 2 * Math.PI);

			ctx.fill();
			// aim pointer
			ctx.moveTo(pos.x, pos.y);
			let x2 = pos.x + PlayerAgent.RADIUS * Math.cos(agent.aim);
			let y2 = pos.y + PlayerAgent.RADIUS * Math.sin(agent.aim);
			ctx.lineTo(x2, y2);

			ctx.stroke();
		} else if (layer === Layer.LABELS) {
			ctx.font = "8px sans";
			ctx.textAlign = "center";
			ctx.fillStyle = "black";
			ctx.fillText(agent.name, pos.x, pos.y + PlayerAgent.RADIUS + 12);

			let barX = pos.x - PlayerAgent.RADIUS,
				barY = pos.y - PlayerAgent.RADIUS - 8,
				barW = 2 * PlayerAgent.RADIUS,
				barH = 3;
			ctx.fillStyle = 'red';
			ctx.fillRect(barX, barY, barW, barH);
			ctx.fillStyle = 'green';
			ctx.fillRect(barX, barY, barW * agent.health / 100, barH);
		}
	}

	let StateDead = function (agent) {
		this.agent = agent;
		this.id = Q_DEAD;
		this.counter = 500;
	}

	StateDead.prototype.update = function () {
		if (--this.counter == 0) {
			return Q_DONE;
		}
		return Q_NOT_DONE;
	}

	StateDead.prototype.render = function (ctx, layer) {
		if (layer !== Layer.GROUND) {
			return;
		}
		let agent = this.agent,
			pos = agent.getPosition(), // get true position from physics body
			stroke = '#888',
			fill = '#BBB';
		// circle
		ctx.strokeStyle = stroke;
		ctx.fillStyle = fill;
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, PlayerAgent.RADIUS, 0, 2 * Math.PI);

		ctx.fill();
		// aim pointer
		ctx.moveTo(pos.x, pos.y);
		let x2 = pos.x + PlayerAgent.RADIUS * Math.cos(agent.aim);
		let y2 = pos.y + PlayerAgent.RADIUS * Math.sin(agent.aim);
		ctx.lineTo(x2, y2);

		ctx.stroke();

		// label -- drawn on GROUND, not LABELS, for dead agents
		ctx.font = "8px sans";
		ctx.textAlign = "center";
		ctx.fillStyle = stroke;	// use disc stroke color for label
		ctx.fillText(agent.name, pos.x, pos.y + PlayerAgent.RADIUS + 12);
	}

	let StateEliminated = function (agent) {
		this.agent = agent;
		this.id = Q_ELIMINATED;
	}

	StateEliminated.prototype.update = function () {
		return Q_NOT_DONE;
	}

	StateEliminated.prototype.render = function (ctx, layer) {
		// Do nothing.
	}

	PlayerAgent.RADIUS = 15;

	PlayerAgent.prototype.update = function () {
		//console.log("Update", this.name);
		let result = this.state.update();
		while (result === Q_DONE) {
			this.state = this.transition(this.state.id);
			result = this.state.update();
		}
	}

	PlayerAgent.prototype.transition = function (q1) {
		console.log("Transition out of state", q1);
		switch (q1) {
			case Q_NOT_DEAD:
				return new StateDead(this);
			case Q_DEAD:
				return new StateEliminated(this);
			default:
				throw `No transition out of state #${this.id}`;
		}
	}

	PlayerAgent.prototype.render = function (ctx, layer) {
		this.state.render(ctx, layer);
	}

	/** 
	* Return contents of AIM register, converted to degrees.
	* Returns an integer value.
	*/
	PlayerAgent.prototype.getAim = function () {
		return Math.floor(this.aim * 180 / Math.PI);
	}

	/**
	* Set contents of AIM register. Input is in degrees; convert to radians
	*/
	PlayerAgent.prototype.setAim = function (degrees) {
		this.aim = degrees * Math.PI / 180;
	}

	PlayerAgent.prototype.setAimV = function (vector) {
		this.aim = Matter.Vector.angle(this.getPosition(), vector);
	}

	PlayerAgent.prototype.getPosition = function () {
		// Make sure pos registers are up to date
		if (!this.body) {
			return this.pos;
		}
		this.pos.x = this.body.position.x;
		this.pos.y = this.body.position.y;
		return this.body.position;
	}

	PlayerAgent.prototype.setPosition = function (pos) {
		if (this.body) this.body.position = Matter.Vector.create(pos.x, pos.y);
		this.pos = Matter.Vector.create(pos.x, pos.y);
	}

	PlayerAgent.prototype.removeHealth = function (amt) {
		if (this.health === 0) {
			// Can't die twice
			return;
		}
		this.health -= amt;
		if (this.health < 0) {
			this.health = 0;
		}
		if (this.health === 0) {
			console.log(this.name, "has died");
		}
	}

	PlayerAgent.prototype.driveVector = function (vec) {
		this.drv.x = vec.x;
		this.drv.y = vec.y;
		Matter.Body.setVelocity(this.body, this.drv);
		//let force = Matter.Vector.create(this.drv.x, this.drv.y);
		//Matter.Body.applyForce(this.body, this.getPosition(), force);
	}

	/* 
	* These event handlers should eventually be defined in 
	* robot program code, not here.
	*/
	PlayerAgent.prototype.onWall = function (whichWall) {
		if (whichWall === 'NORTH' || whichWall === 'SOUTH') {
			this.driveVector({x: this.drv.x, y: -1 * this.drv.y});
		} else {
			this.driveVector({x: -1 * this.drv.x, y: this.drv.y});
		}

		this.removeHealth(5);
	}

	PlayerAgent.prototype.onBump = function (otherSprite) {
		this.removeHealth(1);
		this.setAimV(otherSprite.getPosition());
	}

	// Exports
	ns.PlayerAgent = PlayerAgent;

	return ns;

})(MAGIC || {});
