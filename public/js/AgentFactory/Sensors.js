var MAGIC = ((ns) => {

	// IMPORTS
	let constants = ns.constants;
	let radians = ns.radians,
			degrees = ns.degrees;
	

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

	WallSensor.prototype.write = function (_path, _val) {
		this.agent.error(`WallSensor: No writable registers`);
	};

	WallSensor.prototype.update = function () {

		this._updateData();		// distances to all 4 walls

		if (this.handler === -1) {
			// no handler => interrupt disabled
			// we can still inspect the wall proximity data by hand, of course
			return;
		}

		// There was a bug here regarding redZoneSize: it originally included
		// wall thickness. However, this.data[i] holds the distance to wall i,
		// not distance to the edge of the arena. So the red zone size should 
		// be measured from the wall, not from the edge of the arena.
		let redZoneSize = /*constants.WALL_THICKNESS +*/ this.sensitivity,
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

		let rememberFlags = () => {
			this.flags.forEach((f, i) => this.oldFlags[i] = f);
		};

		// Trigger only on change of state
		if (edgeTrigger()) {
			this.agent.queueInterrupt(this);
		}
		rememberFlags();
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


	// EXPORTS
	ns.AgentsScanner = AgentsScanner;
	ns.WallSensor = WallSensor;

	return ns;

})(MAGIC || {});
