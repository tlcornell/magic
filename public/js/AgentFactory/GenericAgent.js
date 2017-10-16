
var MAGIC = ((ns) => {

	// IMPORTS
	let Game = ns.Game;
	let degrees = ns.degrees,
			radians = ns.radians,
			angle2vector = ns.angle2vector,
			vector2angle = ns.vector2angle,
			zipForEach = ns.zipForEach;
	let LOG = ns.LOG;
	const Q_NOT_DEAD = ns.constants.AGENT_STATE.Q_NOT_DEAD;
	const Q_DEAD = ns.constants.AGENT_STATE.Q_DEAD;
	const Q_ELIMINATED = ns.constants.AGENT_STATE.Q_ELIMINATED;



	/**
	 * Walls are always checked in order: N, W, S, E
	 */
	function WallSensor (agent) {
		this.agent = agent;

		this.name = 'wall';	// agent.hw[ws.getName()] = ws ?
		this.priority = 20;
		this.sensitivity = 20;
		this.handler = -1;

		this.data = [0, 0, 0, 0];
		this.flags = [0, 0, 0, 0];
		this.oldFlags = [0, 0, 0, 0];
	}

	WallSensor.prototype.initialize = function () {
		// This needs to be delayed until after the agent we are part of
		// has been assigned its initial coordinates by the agent factory,
		// which happens after the agent constructor has been called.
		this._updateData();
	};

	WallSensor.prototype._updateData = function () {
		let x = this.agent.getPosX(),
				y = this.agent.getPosY(),
				N = constants.WALL_THICKNESS,
				W = constants.WALL_THICKNESS,
				S = constants.ARENA.HEIGHT - constants.WALL_THICKNESS,
				E = constants.ARENA.WIDTH - constants.WALL_THICKNESS;
		this.data[0] = y - N;		// distance to NORTH wall
		this.data[1] = x - W;		// ditto WEST
		this.data[2] = S - y; 	// ditto SOUTH
		this.data[3] = E - x;		// ditto EAST
	};

	/**
	 * Should return an int in [0,4].
	 */
	WallSensor.prototype.get = function (prop) {
		if (prop.length === 0) {
			console.log('plain old wall query');
			let minDist = this.data[0],
					closest = 0;
			this.data.forEach((d, i) => {
				if (d < this.getSensitivity() && d <= minDist) {
					closest = i + 1;
					minDist = d;
				}
			});
			return closest;
		} else switch (prop[0]) {
			case 'north':
				return this.data[0];
			case 'west':
				return this.data[1];
			case 'south':
				return this.data[2];
			case 'east':
				return this.data[3];
			default:
				throw new Error(`Invalid wall register '${prop[0]}'`);
		}
	};

	WallSensor.prototype.update = function () {

		this._updateData();		// distances to all 4 walls

		if (this.handler === -1) {
			// no handler => interrupt disabled
			// we can still inspect the wall proximity data by hand, of course
			return;
		}

		let redZoneSize = constants.WALL_THICKNESS + this.sensitivity,
				x = this.agent.getPosX(),
				y = this.agent.getPosY();

		if (this.data[0] <= redZoneSize) {
			this.flags[0] = 1;
		} 
		if (this.data[1] <= redZoneSize) {
			this.flags[1] = 1;
		} 
		if (this.data[2] <= redZoneSize) {
			this.flags[2] = 1;
		} 
		if (this.data[3] <= redZoneSize) {
			this.flags[3] = 1;
		} 

		let edgeTrigger = () => {
			for (let i = 0; i < 4; ++i) {
				let f = this.flags[i],
						o = this.oldFlags[i];
				if (f === 1 && o === 0) {
					return true;
				}
			}
			return false;
		};

		// Trigger only on change of state
		if (edgeTrigger()) {
			this.agent.queueInterrupt(this);
			// REVIEW: `this` is the WallSensor object. Maybe we want to queue
			// something more like just an interrupt?
			// Needs at least name, priority, and handler address
			this.rememberFlags();
		}
	};

	WallSensor.prototype.getName = function () {
		return this.name;
	};

	WallSensor.prototype.getPriority = function () {
		return this.priority;
	};

	/** 
	 * Not sure this is ever needed.
	 */
	WallSensor.prototype.getSensitivity = function () {
		return this.sensitivity;
	};

	WallSensor.prototype.setSensitivity = function (_path, param) {
		this.sensitivity = param;
	};

	WallSensor.prototype.getHandler = function () {
		return this.handler;
	};

	/**
	 * Validity of @addr must have been checked already.
	 * We don't know how long the program is, so we don't know if @addr is
	 * beyond the end of it, for example.
	 *
	 * Set to -1 to disable this interrupt
	 */
	WallSensor.prototype.setHandler = function (_path, addr) {
		this.handler = addr;
	};

	/**
	 * REVIEW: Need to be absolutely certain about when this should be called,
	 * and that it is getting called just when we need it to be.
	 */
	WallSensor.prototype.rememberFlags = function () {
		this.oldFlags = this.flags;
	};


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
			cpuSpeed: properties.hw.cpu,
			energy: properties.hw.energy,
			maxEnergy: properties.hw.energy,
			fire: 0,
			health: properties.hw.damage,
			maxHealth: properties.hw.damage,
			shields: properties.hw.shields,
			maxShields: properties.hw.shields,
			drv: {
				x: 0,
				y: 0,
			},
			sight: {
				angle: 0,
				offset: 0,
				thing: null,
				dist: 0,
			},
			hw: {
				wall: new WallSensor(this),
			},
		});
		this.prog = {
			main: beNotDead,
		};
	}

	GenericAgent.const = ns.constants;

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
		return this.sight.angle;
	};

	GenericAgent.prototype.getAimDegrees = function () {
		return degrees(this.getAim());
	};

	GenericAgent.prototype.setAim = function (rad) {
		this.sight.angle = rad;
		this.checkSightEvents();
	};

	GenericAgent.prototype.setAimDegrees = function (deg) {
		this.setAim(radians(deg));
	};

	GenericAgent.prototype.setAimVector = function (vec) {
		let angle = Matter.Vector.angle(this.getPosition(), vec);
		this.setAim(angle);
	};

	GenericAgent.prototype.getLookDegrees = function () {
		return degrees(this.sight.offset);
	}

	GenericAgent.prototype.setLook = function (rad) {
		this.vision.offset = rad;
		this.checkSightEvents();
	}

	GenericAgent.prototype.setLookDegrees = function (deg) {
		this.setLook(radians(deg));
	}

	GenericAgent.prototype.getSightDist = function () {
		if (this.sight.dist) {
			return this.sight.dist;
		} else {
			return 0;
		}
	};

	GenericAgent.prototype.getCPU = function () {
		return this.cpuSpeed;
	}

	GenericAgent.prototype.getBulletEnergy = function () {
		return this.fire;
	}

	GenericAgent.prototype.addBulletEnergy = function (e) {
		this.fire += e;
		this.energy -= e;
	}

	GenericAgent.prototype.clearBulletEnergy = function () {
		this.fire = 0;
	}

	GenericAgent.prototype.getEnergy = function () {
		return this.energy;
	}

	GenericAgent.prototype.rechargeEnergy = function () {
		this.energy = Math.min(this.maxEnergy, this.energy + 2);
	}

	GenericAgent.prototype.getMaxEnergy = function () {
		return this.maxEnergy;
	}

	GenericAgent.prototype.getHealth = function () {
		return this.health;
	};

	GenericAgent.prototype.setHealth = function (amt) {
		this.health = Math.max(amt, 0);
	}

	GenericAgent.prototype.removeHealth = function (amt) {
		if (amt < 0) {
			throw new Error(`removeHealth: Negative amount (${amt})`);
		}
		let H = this.getHealth();
		if (H === 0) {
			return;
		}
		this.setHealth(H - amt);
		// Note that setHealth floors out at zero. So it's okay even if H-amt is neg.
	};

	GenericAgent.prototype.getMaxHealth = function () {
		return this.maxHealth;
	};

	GenericAgent.prototype.getShields = function () {
		return this.shields;
	}

	GenericAgent.prototype.getMaxShields = function () {
		return this.maxShields;
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
		this.energy -= cost;
		this.energy = Math.min(this.maxEnergy, this.energy);
		this.drv.x = dx;
		this.drv.y = dy;
	};

	/**
	 * Return {r, th}, where th (the azimuth) is in degrees, converted 
	 * from radians. So this is meant for clients, not internal use,
	 * which should maingain all angles in radians.
	 */
	GenericAgent.prototype.getHeading = function () {
		let hdg = vector2angle(this.drv.x, this.drv.y),
				deg = degrees(hdg.th);
		return {r: hdg.r, th: deg};
	};

	GenericAgent.prototype.setHeading = function (r, th) {
		let vec = angle2vector(th, r);
		this.setVelocity(vec.x, vec.y);
	};

	//
	// End of course control
	//////////////////////////////////////////////////////////////////////////


	GenericAgent.prototype.module = function (modName) {
		if (!this.hw.hasOwnProperty(modName)) {
			throw new Error(`Attempt to access non-existing module '${modName}'`);
		}
		return this.hw[modName];
	};

	GenericAgent.prototype.setInterruptHandler = function (path, hdlr) {
		let mod = path.shift();
		if (!this.hw.hasOwnProperty(mod)) {
			throw new Error(`Unknown hardware module '${mod}'`);
		}
		this.hw[mod].setHandler(path, hdlr);
		// Modules with only one interrupt will ignore the path argument,
		// which should be [] for them.
	};

	GenericAgent.prototype.setInterruptSensitivity = function (path, param) {
		let mod = path.shift();
		if (!this.hw.hasOwnProperty(mod)) {
			throw new Error(`Unknown hardware module '${mod}'`);
		}
		this.hw[mod].setSensitivity(path, param);
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
				offset = Matter.Vector.mult(norm, GenericAgent.const.AGENT_RADIUS + 1), // start outside of shooter bot
				pos = Matter.Vector.add(this.getPosition(), offset);
		this.game.createProjectile(this, pos, drv, energy);
	}

	GenericAgent.prototype.update = function () {

		let generatedTasks = [];

		// Handle event notifications (event queue) for "external" events 
		// coming in from the Game object.
		// Right now there's no prioritization; it's just a flat list
		this.hw.wall.update();
		this.sight.dist = 0;
		this.sight.thing = null;
		this.eventQueue.forEach((evt) => this.handleEvent(evt));
		this.eventQueue = [];
		// Trigger events if warranted (e.g., we just died)
		// We might add some generated tasks here.

		this.prog.main.call(this, generatedTasks);

		return generatedTasks;

	};

	/**
	 * This is the main agent state, where we run an interpreter over
	 * the agent control program. This wrapper handles tasks that must
	 * be executed before and after the actual interpreter cycle.
	 */
	let beNotDead = function (gameTasks) {
		if (this.getHealth() === 0) {
			gameTasks.push({
				op: 'agentDied',
				agent: this,
			});
			this.prog.main = beDead;
		} else {

			this.rechargeEnergy();
			// Even without interrupts, we need to do this in case a bot
			// has moved into our sights.
			this.checkSightEvents();

			// Check per-chronon interrupts?

			//---------------------------------------------------
			// This is where the bot program gets advanced
			// (While the bot has any energy)

			for (var i = 0; i < this.getCPU(); ++i) {

				if (this.getEnergy() <= 0) break;
				if (this.interpreter.syncFlag) {
					this.interpreter.syncFlag = false;
					break;
				}

				this.interpreter.step();
			}

			// End of bot program cycle (i.e., end of chronon?)
			//---------------------------------------------------		

			// If any energy has been stored in a weapon register,
			// fire that weapon now.
			//this.fireWeapons();
			
			if (this.getEnergy() > 0) {
				this.game.setBodyVelocity(this);
			}
		}
	};

	let beDead = function (gameTasks) {
		if (--this.deathCounter === 0) {
			gameTasks.push({
				op: 'agentEliminated',
				agent: this,
			});
			this.prog.main = beEliminated;
		}
	}

	let beEliminated = function (gameTasks) {
	}

	GenericAgent.prototype.onSight = function () {
		let seen = this.sight.thing;
//		console.log(this.name, "sees", seen.name);
		let p1 = this.getPosition(),
				p2 = seen.getPosition();
		//this.game.graphics.drawLine(p1, p2);
		//this.game.togglePaused();
	};

	GenericAgent.prototype.checkSightEvents = function () {
		this.game.checkSightEvents(this);
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
				throw new Error(`Agent does not recognize event operator (${evt.op})`);
		}
	};

	GenericAgent.prototype.queueInterrupt = function (sensor) {
		this.interpreter.queueInterrupt(sensor);
	};

	GenericAgent.prototype.onAgentDied = function () {
		this.setState(Q_DEAD);
		this.deathCounter = 200;
		this.game.graphics.activate(this.sprite, 'dead');
	}

	GenericAgent.prototype.onAgentEliminated = function () {
		this.setState(Q_ELIMINATED);
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
