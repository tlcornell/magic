
var MAGIC = (function(ns) {

	let randomFloat = ns.randomFloat;

	ns.PlayerAgent = function (name) {
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
	}

	ns.PlayerAgent.RADIUS = 15;

	ns.PlayerAgent.prototype.update = function () {
		if (this.health === 0) {
			return;
		}

		//---------------------------------------------------
		// This is where the bot program gets advanced

		this.setAim(this.getAim() + 5);

		// End of bot program step (i.e., end of chronon?)
		//---------------------------------------------------		
		
		this.driveVector(this.drv);
		
	}

	ns.PlayerAgent.prototype.render = function (ctx, index, count, layer) {
		//console.log(this.name, this.body.velocity, this.body.position);
		let pos = this.getPosition(); // get true position from physics body
		if (layer === 0) {
			let color = ((360/count) % 360) * index,
				stroke = `hsl(${color}, 50%, 33%)`,
				fill = `hsl(${color}, 50%, 67%)`;
			if (this.health === 0) {
				stroke = '#888';
				fill = '#BBB';
			}
			// circle
			ctx.strokeStyle = stroke;
			ctx.fillStyle = fill;
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, ns.PlayerAgent.RADIUS, 0, 2 * Math.PI);

			ctx.fill();
			// aim pointer
			ctx.moveTo(pos.x, pos.y);
			let x2 = pos.x + ns.PlayerAgent.RADIUS * Math.cos(this.aim);
			let y2 = pos.y + ns.PlayerAgent.RADIUS * Math.sin(this.aim);
			ctx.lineTo(x2, y2);

			ctx.stroke();
		} else if (layer === 1) {
			ctx.font = "8px sans";
			ctx.textAlign = "center";
			ctx.fillStyle = "black";
			ctx.fillText(this.name, pos.x, pos.y + ns.PlayerAgent.RADIUS + 12);

			if (this.health === 0) {
				// Don't bother with the health bar
				return;
			}

			let barX = pos.x - ns.PlayerAgent.RADIUS,
				barY = pos.y - ns.PlayerAgent.RADIUS - 8,
				barW = 2 * ns.PlayerAgent.RADIUS,
				barH = 3;
			ctx.fillStyle = 'red';
			ctx.fillRect(barX, barY, barW, barH);
			ctx.fillStyle = 'green';
			ctx.fillRect(barX, barY, barW * this.health / 100, barH);
		}
	}

	/** 
	* Return contents of AIM register, converted to degrees.
	* Returns an integer value.
	*/
	ns.PlayerAgent.prototype.getAim = function () {
		return Math.floor(this.aim * 180 / Math.PI);
	}

	/**
	* Set contents of AIM register. Input is in degrees; convert to radians
	*/
	ns.PlayerAgent.prototype.setAim = function (degrees) {
		this.aim = degrees * Math.PI / 180;
	}

	ns.PlayerAgent.prototype.setAimV = function (vector) {
		this.aim = Matter.Vector.angle(this.getPosition(), vector);
	}

	ns.PlayerAgent.prototype.getPosition = function () {
		// Make sure pos registers are up to date
		if (!this.body) {
			return this.pos;
		}
		this.pos.x = this.body.position.x;
		this.pos.y = this.body.position.y;
		return this.body.position;
	}

	ns.PlayerAgent.prototype.setPosition = function (pos) {
		if (this.body) this.body.position = Matter.Vector.create(pos.x, pos.y);
		this.pos = Matter.Vector.create(pos.x, pos.y);
	}

	ns.PlayerAgent.prototype.removeHealth = function (amt) {
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

	ns.PlayerAgent.prototype.driveVector = function (vec) {
		this.drv.x = vec.x;
		this.drv.y = vec.y;
		Matter.Body.setVelocity(this.body, this.drv);
		//let force = Matter.Vector.create(this.drv.x, this.drv.y);
		//Matter.Body.applyForce(this.body, this.getPosition(), force);
	}

	ns.PlayerAgent.prototype.onWall = function (whichWall) {
		if (whichWall === 'NORTH' || whichWall === 'SOUTH') {
			this.driveVector({x: this.drv.x, y: -1 * this.drv.y});
		} else {
			this.driveVector({x: -1 * this.drv.x, y: this.drv.y});
		}

		this.removeHealth(5);
	}

	ns.PlayerAgent.prototype.onBump = function (otherSprite) {
		this.removeHealth(1);
		this.setAimV(otherSprite.getPosition());
	}

	return ns;

})(MAGIC || {});
