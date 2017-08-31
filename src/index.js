
/**
* Declare our namespace
*/
let RoboWar = (() => {


	let sprites = [];
	let arena = e_("arena");
	let ctx = arena.getContext("2d");
	// Set up MatterJS
	let matterEngine = Matter.Engine.create();

	function e_(id) {
		return document.getElementById(id);
	}

	// Converts from degrees to radians.
	Math.radians = function(degrees) {
	  return degrees * Math.PI / 180;
	};

	// Converts from radians to degrees.
	Math.degrees = function(radians) {
	  return radians * 180 / Math.PI;
	};


	function PlayerAgent(name) {
		Object.assign(this, {
			name: name,
			pos: {		// Should just be read only? Based on physics body props
				x: 0,
				y: 0,
			},
			drv: {		// "drive" -- direction of movement
				x: randomInt(-3, 3),
				y: randomInt(-3, 3),
			},
			aim: Math.random() * 2* Math.PI,	// random initial AIM
		});
	}

	PlayerAgent.RADIUS = 15;

	PlayerAgent.prototype.render = function (ctx, index, count) {
		let pos = this.getPosition(); // get true position from physics body
		let color = ((360/count) % 360) * index;
		// circle
		ctx.strokeStyle = `hsl(${color}, 50%, 33%)`;
		ctx.fillStyle = `hsl(${color}, 50%, 67%)`;
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, PlayerAgent.RADIUS, 0, 2 * Math.PI);

		ctx.fill();
		// aim pointer
		ctx.moveTo(pos.x, pos.y);
		let x2 = pos.x + PlayerAgent.RADIUS * Math.cos(this.aim);
		let y2 = pos.y + PlayerAgent.RADIUS * Math.sin(this.aim);
		ctx.lineTo(x2, y2);

		ctx.stroke();

		ctx.font = "8px sans";
		ctx.textAlign = "center";
		ctx.fillStyle = "black";
		ctx.fillText(this.name, pos.x, pos.y + PlayerAgent.RADIUS + 12);
	}

	function randomInt(lo, hi) {
		let rand = Math.floor(Math.random() * (hi - lo + 1));
		rand += lo;
		return rand;
	}

	PlayerAgent.prototype.update = function () {
		this.setAim(this.getAim() + 5);
		
		let pos2 = {x: this.pos.x, y: this.pos.y};
		
		// This will make bots appear to bounce:
		if (this.drv.x === 0) {
			this.drv.x = randomInt(-3, 3);
		}
		if (this.drv.y === 0) {
			this.drv.y = randomInt(-3, 3);
		}

		let r = PlayerAgent.RADIUS + 1;
		pos2.x += this.drv.x;
		if (pos2.x + r > arena.width) {
			// EAST
			pos2.x = arena.width - r;
			this.drv.x = 0;
		} else if (pos2.x - r < 0) {
			// WEST
			pos2.x = r;
			this.drv.x = 0;
		}
		pos2.y += this.drv.y;
		if (pos2.y - r < 0) {
			// NORTH
			pos2.y = r;
			this.drv.y = 0;
		} else if (pos2.y + r > arena.height) {
			// SOUTH
			pos2.y = arena.height - r;
			this.drv.y = 0;
		}

		this.setPosition(pos2);
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

	PlayerAgent.prototype.getPosition = function () {
		// Make sure pos registers are up to date
		this.pos.x = this.body.position.x;
		this.pos.y = this.body.position.y;
		return this.body.position;
	}

	PlayerAgent.prototype.setPosition = function (pos) {
		if (this.body) this.body.position = Matter.Vector.create(pos.x, pos.y);
		this.pos = Matter.Vector.create(pos.x, pos.y);
	}

	/**
	* Position the agents in botList so that no one else is in their
	* row or col. That is, initializing AIM to 0, 90, 180, or 270 should
	* not see anyone right off the bat.
	*/
	function initialPositions(botList) {
		let n = botList.length;
		// Make randomized lists of row and column numbers
		// Robot i will start in the center of row[i], col[i].
		let rows = Array.from(Array(n).keys());
		let cols = rows.slice(); // clone array
		shuffle(rows);
		shuffle(cols);
		let cw2 = Math.floor(arena.width/(2*n)),		// 1/2 column width
			rh2 = Math.floor(arena.height/(2*n));	// 1/2 row height
		// Place bots in the middle of their randomly generated cell
		botList.map((e,i) => {
			e.setPosition({
				x: (rows[i] * cw2 * 2) + cw2, 
				y: (cols[i] * rh2 * 2) + rh2
			});
		});
	}

	function addSpritesToPhysicsEngine(spriteList) {
		for (var i = 0; i < spriteList.length; ++i) {
			let sprite = spriteList[i];
			sprite.body = Matter.Bodies.circle(
				sprite.pos.x, 
				sprite.pos.y, 
				PlayerAgent.RADIUS,
				// options:
				{
					angle: sprite.aim,
					friction: 0,
					frictionAir: 0,
					frictionStatic: 0,
					label: sprite.name,
					//restitution: defaults to 0
					type: "player",	// just in case
				}
			);
			Matter.World.add(matterEngine.world, sprite.body);
		}
	}

	/**
	* Randomly shuffle an array in-place.
	*/
	function shuffle (array) {
		let i = 0, 
			j = 0, 
			temp = null;

		for (i = array.length - 1; i > 0; i -= 1) {
			j = Math.floor(Math.random() * (i + 1));
			temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
	}

	function configureArena() {
		let canvas = e_("arena");
		arena.width = canvas.width;
		arena.height = canvas.height;
		console.log("Arena:", arena);
	}

	function addSprites() {
		/// List of agents we will be running (PCs only, for now)
		for (var i = 0; i < 6; ++i) {
			sprites.push(new PlayerAgent(`Agent${i}`));
		}
		initialPositions(sprites);
		addSpritesToPhysicsEngine(sprites);
		console.log("Agents:", sprites);
	}

	function update() {
		Matter.Engine.update(matterEngine, 1000/60);
		let n = sprites.length;
		for (var i = 0; i < n; ++i) {
			sprites[i].update();
		}
	}

	function render() {
		ctx.clearRect(0, 0, arena.width, arena.height);
		let n = sprites.length;
		for (var i = 0; i < n; ++i) {
			let s = sprites[i];
			s.render(ctx, i, n);
		} 
		//console.log(sprites[0].body.position);
	}

	function gameLoop() {
		requestAnimationFrame(gameLoop);
		update();
		render();
	}

	main = () => {
		console.log("RoboWar starting...");
		configureArena();
		addSprites();
		render();
		gameLoop();
	}


	return {
		main: main,
	}

})();


/**
* Start up
*/
window.onload = () => {
	RoboWar.main();
};

