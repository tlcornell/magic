
/**
* Declare our namespace
*/
((ns) => {


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


	function PlayerAgent(name, startX = 0, startY = 0) {
		Object.assign(this, {
			name: name,
			x: startX,
			y: startY,
			dx: 0,
			dy: 0,
			aim: Math.random() * 2* Math.PI,	// random initial AIM
		});
	}

	PlayerAgent.RADIUS = 15;

	PlayerAgent.prototype.render = function (ctx, index, count) {
		let color = ((360/count) % 360) * index;
		// circle
		ctx.strokeStyle = `hsl(${color}, 50%, 33%)`;
		ctx.fillStyle = `hsl(${color}, 50%, 67%)`;
		ctx.beginPath();
		ctx.arc(this.x, this.y, PlayerAgent.RADIUS, 0, 2 * Math.PI);

		ctx.fill();
		// aim pointer
		ctx.moveTo(this.x, this.y);
		let x2 = this.x + PlayerAgent.RADIUS * Math.cos(this.aim);
		let y2 = this.y + PlayerAgent.RADIUS * Math.sin(this.aim);
		ctx.lineTo(x2, y2);

		ctx.stroke();		
	}

	PlayerAgent.prototype.update = function () {
		this.setAim(this.getAim() + 5);
	}

	/** 
	* Return contents of AIM register, converted to degrees.
	* Returns an integer value.
	*/
	PlayerAgent.prototype.getAim = function () {
		return Math.floor(this.aim * 180 / Math.PI);
	}

	/**
	* Set contents of AIM register. Input is in degrees; convert to radians.
	*/
	PlayerAgent.prototype.setAim = function (degrees) {
		this.aim = degrees * Math.PI / 180;
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
		let cw2 = Math.floor(ns.arena.width/(2*n)),		// 1/2 column width
			rh2 = Math.floor(ns.arena.height/(2*n));	// 1/2 row height
		// Place bots in the middle of their randomly generated cell
		botList.map((e,i) => {
			e.x = (rows[i] * cw2 * 2) + cw2; 
			e.y = (cols[i] * rh2 * 2) + rh2;
		});
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

	ns.arena = {};
	ns.sprites = [];

	function configureArena() {
		let canvas = e_("arena");
		ns.arena.width = canvas.width;
		ns.arena.height = canvas.height;
		console.log("Arena:", ns.arena);
	}

	function addSprites() {
		/// List of agents we will be running (PCs only, for now)
		for (var i = 0; i < 6; ++i) {
			ns.sprites.push(new PlayerAgent(`Agent${i}`));
		}
		initialPositions(ns.sprites);
		console.log("Agents:", ns.sprites);
	}

	ns.main = () => {
		console.log("RoboWar starting...");
		configureArena();
		addSprites();
		render();
		gameLoop();
	}

	function render() {
		let arena = e_("arena");
		let ctx = arena.getContext("2d");
		let n = ns.sprites.length;
		for (var i = 0; i < n; ++i) {
			let s = ns.sprites[i];
			s.render(ctx, i, n);
		} 
	}

	function gameLoop() {
		requestAnimationFrame(gameLoop);
		update();
		render();
	}

	function update() {
		let n = ns.sprites.length;
		for (var i = 0; i < n; ++i) {
			ns.sprites[i].update();
		}
	}

})(window.RoboWar = window.RoboWar || {});


/**
* Start up
*/
window.onload = () => {
	RoboWar.main();
};

