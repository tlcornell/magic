
/**
* Declare our namespace
*/
var MAGIC = ((ns) => {

	let e_ = ns.e_,
		randomeFloat = ns.randomFloat,
		PlayerAgent = ns.PlayerAgent;

	let stop = false;
	let sprites = [];
	let arena = e_("arena");
	let ctx = arena.getContext("2d");
	// Set up MatterJS
	let matterEngine = Matter.Engine.create();

	const WALL_THICKNESS = 20;

	function handleCollisions(evt) {
		for (let i = 0; i < evt.pairs.length; ++i) {
			let bodyA = evt.pairs[i].bodyA,
				bodyB = evt.pairs[i].bodyB,
				spriteA = sprites[bodyA.spriteIndex],
				spriteB = sprites[bodyB.spriteIndex];

			if (isWall(bodyA)) {
				console.log(bodyB.label, "on", bodyA.label);
				spriteB.onWall(bodyA.label);
			} else {
				if (isWall(bodyB)) {
					console.log(bodyA.label, "on", bodyB.label);
					spriteA.onWall(bodyB.label);
				} else {
					console.log(bodyA.label, "collides with", bodyB.label);
					console.log(evt);
					spriteA.onBump(spriteB);
					spriteB.onBump(spriteA);
				}
			}
		}
	}

	function isWall(body) {
		return body.label === 'NORTH' ||
			body.label === 'SOUTH' ||
			body.label === 'EAST' ||
			body.label === 'WEST';
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
		// Add walls
		let north = Matter.Bodies.rectangle(
			arena.outerWidth/2, WALL_THICKNESS/2,
			arena.outerWidth, WALL_THICKNESS,
			{ isStatic: true, label: "NORTH" }
		);
		let south = Matter.Bodies.rectangle(
			arena.outerWidth/2, arena.outerHeight - WALL_THICKNESS/2,
			arena.outerWidth, WALL_THICKNESS,
			{ isStatic: true, label: "SOUTH" });
		let west = Matter.Bodies.rectangle(
			WALL_THICKNESS/2, arena.outerHeight/2,
			WALL_THICKNESS, arena.outerHeight - 2*WALL_THICKNESS,
			{ isStatic: true, label: "EAST" });
		let east = Matter.Bodies.rectangle(
			arena.outerWidth - WALL_THICKNESS/2, arena.outerHeight/2,
			WALL_THICKNESS, arena.outerHeight - 2*WALL_THICKNESS,
			{ isStatic: true, label: "WEST" });
		Matter.World.add(matterEngine.world, [north, south, west, east]);
		// Add bots
		for (var i = 0; i < spriteList.length; ++i) {
			let sprite = spriteList[i];
			sprite.body = Matter.Bodies.circle(
				sprite.pos.x, 
				sprite.pos.y, 
				PlayerAgent.RADIUS,
				// options:
				{
					angle: sprite.aim,
					density: 1,
					friction: 0,
					frictionAir: 0,
					frictionStatic: 0,
					label: sprite.name,
					//restitution: defaults to 0
				}
			);
			sprite.body.spriteIndex = i;
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

	/**
	* Arena 'height' and 'width' represent the *inside* of the arena,
	* not including the walls.
	*/
	function configureArena() {
		let canvas = e_("arena");
		arena.width = canvas.width - (2 * WALL_THICKNESS);
		arena.height = canvas.height - (2 * WALL_THICKNESS);
		arena.outerWidth = canvas.width;
		arena.outerHeight = canvas.height;
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

	function initialize() {
		console.log("RoboWar starting...");
		matterEngine.world.gravity.y = 0;
		document.addEventListener('keydown', keyHandler);
		configureArena();
		addSprites();
	}

	function update() {
		Matter.Engine.update(matterEngine, 1000/60);
		let n = sprites.length;
		for (var i = 0; i < n; ++i) {
			sprites[i].update();
		}
	}

	function render() {
		ctx.clearRect(0, 0, arena.outerWidth, arena.outerHeight);
		ctx.fillStyle = "#AAA";
		ctx.fillRect(0, 0, arena.outerWidth, WALL_THICKNESS);
		ctx.fillRect(0, arena.outerHeight - WALL_THICKNESS, 
			arena.outerWidth, arena.outerHeight);
		ctx.fillRect(0, WALL_THICKNESS, 
			WALL_THICKNESS, arena.outerHeight - WALL_THICKNESS);
		ctx.fillRect(arena.outerWidth - WALL_THICKNESS, WALL_THICKNESS, 
			arena.outerWidth, arena.outerHeight - WALL_THICKNESS);
		let n = sprites.length;
		for (var layer = 0; layer < 2; ++layer) {
			for (var i = 0; i < n; ++i) {
				let s = sprites[i];
				s.render(ctx, i, n, layer);
			}
		}
	}

	Matter.Events.on(matterEngine, 'collisionActive', handleCollisions);
	Matter.Events.on(matterEngine, 'collisionStart', handleCollisions);

	function removeDeadSprites(sprites) {
		for (var i = 0; i < sprites.length; ++i) {
			let sprite = sprites[i];
			if (sprite.health > 0 || !sprite.body) {
				continue;
			}
			Matter.World.remove(matterEngine.world, sprite.body, true);
		}
	}

	function gameLoop() {
		if (stop) {
			return;
		}
		requestAnimationFrame(gameLoop);
		update();
		render();
		removeDeadSprites(sprites);
	}

	function keyHandler(evt) {
		stop = true;
	}

	ns.main = function () {
		console.log("Starting the Metaprogram for Agent Generation Interaction and Control...");
		matterEngine.world.gravity.y = 0;
		document.addEventListener('keydown', keyHandler);
		configureArena();
		addSprites();
		render();
		gameLoop();
	}

	return ns;
	

})(MAGIC || {});


/**
* Start up
*/
window.onload = () => {
	MAGIC.main();
};

