
var MAGIC = ((ns) => {

	// IMPORTS
	let Game = ns.Game;
	let degrees = ns.degrees,
			radians = ns.radians,
			angle2vector = ns.angle2vector,
			a2v = ns.a2v,
			vector2angle = ns.vector2angle,
			zipForEach = ns.zipForEach;
	let AgentsScanner = ns.AgentsScanner,
			WallSensor = ns.WallSensor,
			CpuClock = ns.CpuClock,
			PowerSupply = ns.PowerSupply,
			Armor = ns.Armor,
			EnergyShield = ns.EnergyShield;
	let LOG = ns.LOG;
	const Q_NOT_DEAD = ns.constants.AGENT_STATE.Q_NOT_DEAD;
	const Q_DEAD = ns.constants.AGENT_STATE.Q_DEAD;
	const Q_ELIMINATED = ns.constants.AGENT_STATE.Q_ELIMINATED;




	///////////////////////////////////////////////////////////////////////////
	// Agents
	

	/**
	 * Properties assignable from outside include:
	 *
	 * name: robot identifier
	 * pos: initial position
	 * -- Hardware/Loadout --
	 * cpu: CPU speed bought from the hardware store
	 * energy: Max energy
	 * health: Sustainable damage
	 * -- Not Yet Supported --
	 * shields: Max shields (at normal drain rates)
	 * weapon: Currently only plain bullets are supported
	 */
	function GenericAgent(game, properties) {
		Object.assign(this, {
			game: game,
			name: properties.name,
			type: properties.type,
			number: properties.number,
			// logic support
			eventQueue: [],
			state: Q_NOT_DEAD,
			// "Hardware Registers"
			fire: 0,
			drv: {
				x: 0,
				y: 0,
			},
			turret: {
				angle: 0,
			},
			hw: {
				agents: new AgentsScanner(this),
				wall: new WallSensor(this),
				cpuClock: new CpuClock(properties.hw.cpu),
				power: new PowerSupply(properties.hw.energy),
				armor: new Armor(properties.hw.damage),
				shields: new EnergyShield(0),	// not implemented yet
			},
		});
	}

	GenericAgent.const = ns.constants;

	GenericAgent.prototype.error = function (msg) {
		throw new Error(`[${this.name}] ERROR: ${msg}`);
	};

	GenericAgent.prototype.initializeHardware = function () {
		this.hw.wall.initialize();
	};

	GenericAgent.prototype.isNotDead = function () {
		return this.getState() === Q_NOT_DEAD;
	};

	GenericAgent.prototype.isDead = function () {
		return this.getState() === Q_DEAD;
	};

	GenericAgent.prototype.isEliminated = function () {
		return this.getState() === Q_ELIMINATED;
	};

	/**
	 * For display in the status monitor/roster manager
	 */
	GenericAgent.prototype.getCondition = function () {
		switch (this.getState()) {
			case Q_NOT_DEAD:
				return 'GOOD';
			case Q_DEAD:
			case Q_ELIMINATED:
				return 'DEAD';
			default:
				return 'UNKNOWN';
		}
	};

	GenericAgent.prototype.getName = function () {
		return this.name;
	};

	GenericAgent.prototype.getNumber = function () {
		return this.number;
	};

	GenericAgent.prototype.getPosition = function () {
		// Make sure pos registers are up to date
		let p = this.game.getPosition(this);	// delegates to Game.Physics
		if (p) {
			this.pos.x = p.x;
			this.pos.y = p.y;
		}
		return this.pos;
	};

	GenericAgent.prototype.getPosX = function () {
		return this.getPosition().x;
	};

	GenericAgent.prototype.getPosY = function () {
		return this.getPosition().y;
	};

	/** 
	* Return contents of AIM register, which are natively in radians.
	*/
	GenericAgent.prototype.getAim = function () {
		return this.turret.angle;
	};

	GenericAgent.prototype.getAimDegrees = function () {
		return degrees(this.getAim());
	};

	GenericAgent.prototype.setAim = function (rad) {
		this.turret.angle = rad;
		this.hw.agents.update();
	};

	GenericAgent.prototype.setAimDegrees = function (deg) {
		this.setAim(radians(deg));
	};

	GenericAgent.prototype.setAimVector = function (vec) {
		let angle = Matter.Vector.angle(this.getPosition(), vec);
		this.setAim(angle);
	};

	GenericAgent.prototype.getLookDegrees = function () {
		return degrees(this.turret.offset);
	}

	GenericAgent.prototype.setLook = function (rad) {
		this.vision.offset = rad;
		this.hw.agents.update();
	}

	GenericAgent.prototype.setLookDegrees = function (deg) {
		this.setLook(radians(deg));
	}

	GenericAgent.prototype.getCPU = function () {
		return this.hw.cpuClock.cpuSpeed;
	}

	GenericAgent.prototype.getBulletEnergy = function () {
		return this.fire;
	}

	GenericAgent.prototype.addBulletEnergy = function (e) {
		this.fire += this.hw.power.drawEnergy(e);
	}

	GenericAgent.prototype.clearBulletEnergy = function () {
		this.fire = 0;
	}

	GenericAgent.prototype.getEnergy = function () {
		return this.hw.power.availableEnergy;
	}

	GenericAgent.prototype.rechargeEnergy = function () {
		this.hw.power.recharge();
	}

	GenericAgent.prototype.getMaxEnergy = function () {
		return this.hw.power.maxEnergy;
	}

	GenericAgent.prototype.getHealth = function () {
		return this.hw.armor.sustainableDamage;
	};

	GenericAgent.prototype.removeHealth = function (amt) {
		if (amt < 0) {
			this.error(`removeHealth: Negative amount (${amt})`);
		}
		this.hw.armor.takeDamage(amt);
	};

	GenericAgent.prototype.getMaxHealth = function () {
		return this.hw.armor.maxDamage;
	};

	GenericAgent.prototype.getShields = function () {
		return this.hw.shields.currentShields;
	}

	GenericAgent.prototype.getMaxShields = function () {
		return this.hw.shields.maxShields;
	}


	////////////////////////////////////////////////////////////////////////
	// Course Control
	//
	// There are two ways to control movement: using vectors (dx,dy), 
	// or using polar-style coordinates (radius, azimuth) (here called (r, th)).
	// 
	// The primitive control data is conveyed to the physics system via the
	// 'drv' property (drv:{x,y}), for "drive".
	// So all API calls ultimately boil down to setting drv.x and drv.y.
	// 

	GenericAgent.prototype.getSpeedX = function () {
		return this.drv.x;
	};

	GenericAgent.prototype.setSpeedX = function (dx) {
		this.setVelocity(dx, this.drv.y);
	}

	GenericAgent.prototype.getSpeedY = function () {
		return this.drv.y;
	};

	GenericAgent.prototype.setSpeedY = function (dy) {
		this.setVelocity(this.drv.x, dy);
	};

	/**
	 * This is the core method that all other API calls should reduce to.
	 * That will assure that energy costs are assessed uniformly.
	 */
	GenericAgent.prototype.setVelocity = function (dx, dy) {
		let dx0 = this.drv.x,
				xcost = Math.abs(dx - dx0),
				dy0 = this.drv.y,
				ycost = Math.abs(dy - dy0),
				cost = Math.round(xcost + ycost);
		this.hw.power.drawEnergy(cost);
		this.drv.x = dx;
		this.drv.y = dy;
		if (this.getEnergy() > 0) {
			this.game.setBodyVelocity(this);
		}
	};

	/**
	 * Return {r, th}, where th (the azimuth) is in degrees, converted 
	 * from radians. So this is meant for clients, not internal use,
	 * which should maintain all angles in radians.
	 */
	GenericAgent.prototype.getHeading = function () {
		let hdg = vector2angle(this.drv.x, this.drv.y),
				deg = degrees(hdg.th);
		return {r: hdg.r, th: deg};
	};

	/**
	 * @param th (the azimuth, 'theta') should be in radians
	 */
	GenericAgent.prototype.setHeading = function (r, th) {
		let vec = angle2vector(th, r);
		this.setVelocity(vec.x, vec.y);
	};

	//
	// End of course control
	//////////////////////////////////////////////////////////////////////////


	GenericAgent.prototype.module = function (modName) {
		if (!this.hw.hasOwnProperty(modName)) {
			this.error(`Attempt to access non-existing module '${modName}'`);
		}
		return this.hw[modName];
	};

	GenericAgent.prototype.setInterruptHandler = function (path, hdlr) {
		let mod = path.shift();
		if (!this.hw.hasOwnProperty(mod)) {
			this.error(`Unknown hardware module '${mod}'`);
		}
		this.hw[mod].setHandler(hdlr);
		// Modules with only one interrupt will ignore the path argument,
		// which should be [] for them.
	};

	GenericAgent.prototype.setInterruptSensitivity = function (path, param) {
		let mod = path.shift();
		if (!this.hw.hasOwnProperty(mod)) {
			this.error(`Unknown hardware module '${mod}'`);
		}
		this.hw[mod].setSensitivity(param);
		// Modules with only one interrupt will ignore the path argument,
		// which should be [] for them.
	};

	GenericAgent.prototype.getState = function () {
		return this.state;
	};

	GenericAgent.prototype.setState = function (qNew) {
		this.state = qNew;
	};

	GenericAgent.prototype.fireWeapons = function () {
		let payload = this.getBulletEnergy(),
				angle = this.getAim();
		// Cap the energy payload at this agent's available energy
		//payload = Math.min(this.getEnergy(), payload);
		if (payload > 0) {
			this.launchProjectile(angle, payload);
			this.clearBulletEnergy();
		}
		// No other attacks supported at this time
	}

	GenericAgent.prototype.launchProjectile = function (angle, energy) {
		let norm = angle2vector(angle, 1),	// direction of shot
				drv = Matter.Vector.mult(norm, 12),	// scale by velocity
				offset = Matter.Vector.mult(norm, GenericAgent.const.AGENT_RADIUS + 2), // start outside of shooter bot
				pos = Matter.Vector.add(this.getPosition(), offset);
		this.game.createProjectile(this, pos, drv, energy);
	}

	GenericAgent.prototype.update = function () {

		this.startChronon();

		if (this.isNotDead()) {
			this.runProgram();
		}

	};

	GenericAgent.prototype.startChronon = function () {
		// Handle event notifications (event queue) for "external" events 
		// coming in from the Game object.
		// Right now there's no prioritization; it's just a flat list
		// The update methods may queue interrupts. In any case, they update
		// the relevant registers for reading under normal program control.
		this.eventQueue.forEach((evt) => this.handleEvent(evt));
		this.eventQueue = [];
		this.checkState();

		if (this.isNotDead()) {
			this.hw.wall.update();
			this.hw.agents.update();
			this.rechargeEnergy();
		}
	};

	GenericAgent.prototype.checkState = function () {
		switch (this.state) {
			case Q_NOT_DEAD:
				if (this.getHealth() === 0) {
					this.game.queueEvent({
						op: 'agentDied',
						agent: this,
					});
					this.setState(Q_DEAD);
				}
				break;
			case Q_DEAD:
				if (--this.deathCounter === 0) {
					this.game.queueEvent({
						op: 'agentEliminated',
						agent: this,
					});
					this.setState(Q_ELIMINATED);
				}
				break;
			case Q_ELIMINATED:
				break;
			default:
				this.error('checkState: Bad state');
		}
	};

	GenericAgent.prototype.debugUpdateStep = function (dbg) {
		if (dbg.startOfChronon()) {
			this.startChronon();
		}
		if (this.isNotDead() && !this.done(dbg.getClock())) {
			this.interpreter.step();
			if (this.interpreter.syncFlag) {
				this.interpreter.syncFlag = false;
				dbg.sync();
			} else {
				dbg.advanceClock();
			}
		}
	};

	/**
	 * Kick off the recursive call to stepper().
	 */
	GenericAgent.prototype.runProgram = function () {

		for (let tick = 0; !this.done(tick); ++tick) {
			if (this.interpreter.syncFlag) {
				this.interpreter.syncFlag = false;
				continue;
			}
			this.interpreter.step();
		}

	};

	GenericAgent.prototype.done = function (tick) {
		if (tick >= this.getCPU()) {
			return true;
		}
		if (this.getEnergy() <= 0) {
			return true;
		}
		return false;		
	}

	/**
	 * REVIEW: This is only called by AgentsScanner. So it doesn't really
	 * represent a proper service, and is instead kind of an intrusion of 
	 * that particular scanner into what should be more generic platform-y 
	 * code.
	 */
	GenericAgent.prototype.checkSightEvents = function () {
		let scanner = this.hw.agents;
		scanner.data = null;
		let angle = this.turret.angle + scanner.angle,
				pos = this.getPosition(),
				sightRay = a2v(pos, angle, GenericAgent.const.SIGHT_DISTANCE);
		let data = this.game.checkSightEvents(this, pos, sightRay);
		if (data) {
			scanner.data = data;
		}
	};

	GenericAgent.prototype.queueEvent = function (evt) {
		this.eventQueue.push(evt);
	};

	GenericAgent.prototype.preRender = function () {
		this.sprite.preRender(this);
	};

	GenericAgent.prototype.render = function (gfx) {
		this.sprite.render(gfx, this);
	};

	GenericAgent.prototype.logFrameData = function () {
		LOG({
			type: 'agent-frame-data',
			name: this.getName(),
			pos: this.getPosition(),
			sprite: {
				radius: this.sprite.radius,
				color: this.sprite.color,
				aim: this.getAim(),
			},
			health: this.getHealth(),
			maxHealth: this.getMaxHealth(),
			state: this.getState(),
			energy: this.getEnergy(),
			shields: this.getShields(),
			condition: this.getCondition(),
		});
	};

	GenericAgent.prototype.handleEvent = function (evt) {
//		console.log(this.name, "handleEvent", evt);
		switch (evt.op) {
			case 'collision':
				this.environmentalDamage(GenericAgent.const.BUMP_DAMAGE);
				// TODO: Raise in-collision condition, maybe triggering an interrupt
				// in the interpreter
				break;
			case 'wall':
				this.environmentalDamage(GenericAgent.const.WALL_DAMAGE);
				this.hw.wall.update();	
				// This will queue an interrupt, if it wasn't already raised by proximity
				break;
			case 'hit':
				this.projectileImpact(evt.data.hitBy);
				break;
			default:
				this.error(`Agent does not recognize event operator (${evt.op})`);
		}
	};

	GenericAgent.prototype.queueInterrupt = function (sensor) {
		this.interpreter.queueInterrupt(sensor);
	};

	GenericAgent.prototype.onAgentDied = function () {
		this.deathCounter = 200;
		this.game.graphics.activate(this.sprite, 'dead');
	}

	GenericAgent.prototype.onAgentEliminated = function () {
		this.game.graphics.removeSprite(this);
	}

	GenericAgent.prototype.environmentalDamage = function (rawDmg) {
		// Theoretically, we could have factors like shields and armor that
		// lessen the effect of the impact. 
		// For now, we just assess the full raw damage.
		this.removeHealth(rawDmg);
	};

	GenericAgent.prototype.projectileImpact = function (projectile) {
		// Theoretically, we could have factors like shields and armor that
		// lessen the effect of the impact. 
		// For now, we just assess the full raw damage.
		this.removeHealth(projectile.energy);
	};



	// EXPORTS
	ns.GenericAgent = GenericAgent;

	return ns;

})(MAGIC || {});
