////////////////////////////////////////////////////////////////////////////
// HardwareModules.js
//

var MAGIC = ((ns) => {

	// IMPORTS
	let constants = ns.constants;
	let radians = ns.radians,
			degrees = ns.degrees;
	

	

	//----------------------------------------------------------------------
	// Agents Scanner Module
	//

	function AgentsScanner (agent) {
		Object.assign(this, {
			agent: agent,
			name: 'agents',
			angle: 0,
			data: null,		// {thing: (object), dist: (pixels)}
			priority: 60,
			sensitivity: constants.SIGHT_DISTANCE,
			handler: -1,
		});
	}

	AgentsScanner.prototype.getHandler = function () {
		return this.handler;
	};

	AgentsScanner.prototype.setHandler = function (addr) {
		if (isNaN(addr)) this.agent.error(`setHandler: ${addr} is not a number`);
		this.handler = addr;
	};

	AgentsScanner.prototype.getPriority = function () {
		return this.priority;
	};

	AgentsScanner.prototype.setSensitivity = function (param) {
		this.sensitivity = param;
	};

	/** 
	 * Ideally, the current state of the ir-flag will be passed in 
	 * as an argument.
	 */
	AgentsScanner.prototype.update = function () {
		this.agent.checkSightEvents();
		// agent.checkSightEvents will set this.data if anything is in sight
		
		// Maybe trigger an interrupt?
		if (!this.data) return;
		if (this.handler === -1) return;
		if (this.data.dist > this.sensitivity) return;
		// Trigger interrupt (no edge triggering behavior here)
		this.agent.queueInterrupt(this);
	};

	AgentsScanner.prototype.read = function (path) {
		if (path.length === 0) {
			if (!this.data) return 0;
			return this.data.dist;
		} 
		let reg = path.shift();
		switch (reg) {
			case 'angle':
				return degrees(this.angle);
			case 'data': {
				if (!this.data) return 0;
				let reg1 = path.shift();
				switch (reg1) {
					case 'thing':
						return this.data.thing;
					case 'dist':
						return this.data.dist;
				}
			}
			case 'param':
				return this.sensitivity;
		}
		this.agent.error(`AgentsScanner: Bad register '${path.join(".")}'`);
	};

	AgentsScanner.prototype.write = function (path, val) {
		let reg = path.shift();
		if (reg === 'angle') {
			this.angle = radians(val);
		}
		else {
			this.agent.error(`AgentsScanner: Can't write to register '${path.join(".")}'`);
		}
	};



	//----------------------------------------------------------------------
	// Wall Scanner Hardware Module
	//

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
		this.oldData = [0, 0, 0, 0];
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
	WallSensor.prototype.read = function (prop) {
		if (prop.length === 0) {
			let minDist = this.data[0],
					closest = 0;
			this.data.forEach((d, i) => {
				if (d <= this.getSensitivity() && d <= minDist) {
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
				this.agent.error(`Invalid wall register '${prop[0]}'`);
		}
	};

	WallSensor.prototype.write = function (path, val) {
		if (path.length === 0) {
			this.agent.error(`WallSensor: Illegal write`);
		}
		if (path[0] === 'limit') {
			this.setSensitivity(val);
		} else {
			this.agent.error(`WallSensor: Illegal write (${path.join('.')})`);
		}
	};

	WallSensor.prototype.update = function () {

		this._updateData();		// distances to all 4 walls

		if (this.handler === -1) {
			// no handler => interrupt disabled
			// we can still inspect the wall proximity data by hand, of course
			return;
		}

		let triggerInterrupt = false;

		for (let i = 0; i < 4; ++i) {
			if (this.data[i] <= this.sensitivity && this.data[i] < this.oldData[i]) {
				triggerInterrupt = true;
			} 
			this.oldData[i] = this.data[i];
		}

		if (triggerInterrupt) {
			this.agent.queueInterrupt(this);
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

	WallSensor.prototype.setSensitivity = function (param) {
		//this._clearOldFlags();
		this.sensitivity = param;
		//this.update();
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
	WallSensor.prototype.setHandler = function (addr) {
		this.handler = addr;
	};

	WallSensor.prototype._clearOldFlags = function () {
		this.oldFlags.forEach((_, i) => this.oldFlags[i] = 0);
	};



	//----------------------------------------------------------------------
	// CPU (Clock) Hardware Module
	//
	// Upgrade Points:
	// 0 - Speed 5
	// 1 - Speed 10
	// 2 - Speed 15
	// 3 - Speed 20

	function CpuClock (upgradePoints) {
		upgradePoints = Math.min(upgradePoints, 3);	// capped at 3
		this.cpuSpeed = 5 + (5 * upgradePoints);
	}


	//----------------------------------------------------------------------
	// Power Supply Hardware Module
	//
	// This model does not support negative energy. You can only withdraw
	// up to whatever is still available, but no more.
	//
	// Upgrade Points:
	//	0 - 20
	//	1 - 30
	//	2 - 40
	//	3 - 50

	function PowerSupply (upgradePoints) {
		upgradePoints = Math.min(upgradePoints, 3);	// capped at 3
		this.maxEnergy = 20 + (upgradePoints * 10);	// base energy
		this.availableEnergy = this.maxEnergy;
	}

	/**
	 * Returns the amount of energy actually delivered, which may be less
	 * than the desired amount, and may even be zero.
	 */
	PowerSupply.prototype.drawEnergy = function (desiredAmount) {
		if (desiredAmount <= 0) {
			return 0;
		}
		let delivered = 0;
		if (desiredAmount > this.availableEnergy) {
			delivered = this.availableEnergy;
			this.availableEnergy = 0;
		} else {
			delivered = desiredAmount;
			this.availableEnergy -= desiredAmount;
		}
		return delivered;
	};

	/**
	 * Batteries recharge at a rate of two points per turn.
	 */
	PowerSupply.prototype.recharge = function () {
		this.availableEnergy = Math.min(this.maxEnergy, this.availableEnergy + 2);
	};



	//----------------------------------------------------------------------
	// Armor Hardware Module
	//
	// Upgrade Points:
	//	0 - 100
	//	1 - 150
	//	2 - 200
	//	3 - 250

	function Armor (upgradePoints) {
		upgradePoints = Math.min(upgradePoints, 3);	// capped at 3
		this.maxDamage = 100 + (upgradePoints * 50);	
		this.sustainableDamage = this.maxDamage;
	}

	Armor.prototype.takeDamage = function (amount) {
		this.sustainableDamage = Math.max(0, this.sustainableDamage - amount);
	};

	Armor.prototype.armorGone = function () {
		return this.sustainableDamage <= 0;
	};



	//----------------------------------------------------------------------
	// Shields Hardware Module
	//
	// Energy shields, which consume energy to reduce damage. Not as effective
	// as armor, but renewable.
	//
	// Currently unimplemented -- this is just a stub.

	function EnergyShield (upgradePoints) {
		this.maxShields = 0;
		this.currentShields = this.maxShields;
	}


	//----------------------------------------------------------------------
	// Standard Motor Hardware Module
	//

	function StandardMotor (agent) {
		this.agent = agent;
		this.drv = {
			x: 0,
			y: 0,
		};
	}

	StandardMotor.prototype.read = function (prop) {
		let reg = prop.shift;
		if (reg === 'velocity') {
			reg = prop.shift();
			if (reg === 'dx') {
				return this.getSpeedX();
			} else if (reg === 'dy') {
				return this.getSpeedY();
			} else {
				this.agent.error(`Attempt to read unknown motor register (velocity.${reg})`);
			}
		} else if (reg === 'heading') {
			reg = prop.shift();
			if (reg === 'r') {
				return this.getRadius();
			} else if (reg === 'th') {
				return this.getAzimuth();
			} else {
				this.agent.error(`Attempt to read unknown motor register (heading.${reg})`);
			}
		} else {
			this.agent.error(`Attempt to read unknown motor register (${reg})`);
		}
	};

	/**
	 * Single valued write. Use writev() for tuple values.
	 */
	StandardMotor.prototype.write = function (path, val) {
		let reg = path.shift();
		if (reg === 'velocity') {
			if (path.length === 0) {
				// Ooops! We need a tuple here -- use writev!
				this.agent.error(`Internal Error: write to [velocity] needs tuple argument`);
			}
			reg = path.shift();
			if (reg === 'dx') {
				// Change drv.x, holding drv.y constant
				this.setSpeedX(val);
			} else if (reg === 'dy') {
				// Change drv.y, holding drv.x constant
				this.setSpeedY(val);
			} else {
				this.agent.error(`Unrecognized motor register (velocity.${reg})`);
			}
		} else if (reg === 'heading') {
			if (path.length === 0) {
				this.agent.error(`Internal Error: write to [heading] needs tuple argument`);
			} else if (reg === 'r') {
				this.setRadius(val);
			} else if (reg === 'th') {
				this.setAzimuth(val);
			} else {
				this.agent.error(`Unrecognized motor register (heading.${reg})`);
			}
		} else {
			this.agent.error(`AgentsScanner: Can't write to register '${path.join(".")}'`);
		}
	};

	StandardMotor.prototype.writev = function (path, vals) {
		let reg = path.shift();
		if (reg === 'velocity') {
			this.setVelocity(vals[0], vals[1]);
		} else if (reg === 'heading') {
			this.setHeading(vals[0], vals[1]);
		} else {
			this.agent.error(`Attempt to write unknown motor register (${reg})`);
		}
	};

	StandardMotor.prototype.getSpeedX = function () {
		return this.drv.x;
	};

	StandardMotor.prototype.setSpeedX = function (dx) {
		this.setVelocity(dx, this.drv.y);
	}

	StandardMotor.prototype.getSpeedY = function () {
		return this.drv.y;
	};

	StandardMotor.prototype.setSpeedY = function (dy) {
		this.setVelocity(this.drv.x, dy);
	};

	/**
	 * This is the core method that all other API calls should reduce to.
	 * That will assure that energy costs are assessed uniformly.
	 */
	StandardMotor.prototype.setVelocity = function (dx, dy) {
		let dx0 = this.drv.x,
				xcost = Math.abs(dx - dx0),
				dy0 = this.drv.y,
				ycost = Math.abs(dy - dy0),
				cost = Math.round(xcost + ycost);
		this.agent.hw.power.drawEnergy(cost);
		this.drv.x = dx;
		this.drv.y = dy;
		if (this.agent.getEnergy() > 0) {
			this.agent.game.setBodyVelocity(this.agent);
		}
	};

	/**
	 * Return {r, th}, where th (the azimuth) is in degrees, converted 
	 * from radians. So this is meant for clients, not internal use,
	 * which should maintain all angles in radians.
	 */
	StandardMotor.prototype.getHeading = function () {
		let hdg = vector2angle(this.drv.x, this.drv.y),
				deg = degrees(hdg.th);
		return {r: hdg.r, th: deg};
	};

	/**
	 * @param th (the azimuth, 'theta') should be in radians
	 */
	StandardMotor.prototype.setHeading = function (r, th) {
		let vec = angle2vector(th, r);
		this.setVelocity(vec.x, vec.y);
	};

	StandardMotor.prototype.getRadius = function () {
		return this.getHeading().r;
	};

	StandardMotor.prototype.getAzimuth = function () {
		return this.getHeading().th;
	};

	/**
	 * Change the heading's radial coordinate (speed), keeping the azimuth
	 * (direction) constant.
	 */
	StandardMotor.prototype.setRadius = function (r) {
		let azimuth = this.getHeading().th,
		    vec = angle2vector(azimuth, r);
		this.setVelocity(vec.x, vec.y);
	};

	/**
	 * Change the heading's polar coordinate (azimuth, i.e., direction), keeping
	 * its radial coordinate (radius, i.e., speed) constant.
	 *
	 * @param th (the azimuth, 'theta') should be in radians
	 */
	StandardMotor.prototype.setAzimuth = function (th) {
		let radius = this.getHeading().r,
				vec = angle2vector(th, radius);
		this.setVelocity(vec.x, vec.y);
	};


	// EXPORTS
	ns.AgentsScanner = AgentsScanner;
	ns.WallSensor = WallSensor;
	ns.CpuClock = CpuClock;
	ns.PowerSupply = PowerSupply;
	ns.Armor = Armor;
	ns.EnergyShield = EnergyShield;
	ns.StandardMotor = StandardMotor;

	return ns;

})(MAGIC || {});
