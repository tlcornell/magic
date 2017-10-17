var MAGIC = ((ns) => {

	// IMPORTS



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


	// EXPORTS
	ns.WallSensor = WallSensor;

	return ns;

})(MAGIC || {});
