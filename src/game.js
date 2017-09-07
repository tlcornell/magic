var MAGIC = ((ns) => {

	//////////////////////////////////////////////////////////////////////
	// Utility functions:

	/** 
	 * Short alias for getElementById
	 */
	function e_ (id) {
		return document.getElementById(id);
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

	function normDegrees(degrees) {
			degrees %= 360;
			if (degrees < 0) {
				degrees += 360;
			}
		  return degrees;
	}

	// Converts from degrees to radians.
	// Result should fall in [0, 2pi).
	function radians(degrees) {
	  return normDegrees(degrees) * Math.PI / 180;
	}

	// Converts from radians to degrees.
	// Result guaranteed to be in [0, 360).
	function degrees(radians) {
		let d = radians * 180 / Math.PI;
	  return normDegrees(d);
	}

	// This assumes that we are starting from 0,0,
	// so don't forget to Vector.add an offset.
	// Angle in radians!
	function angle2vector(angle, distance) {
		let x = Math.cos(angle) * distance,
				y = Math.sin(angle) * distance;
		return Matter.Vector.create(x, y);
	}

	function randomInt(lo, hi) {
		let rand = Math.floor(Math.random() * (hi - lo + 1));
		rand += lo;
		return rand;
	}

	function randomFloat(lo, hi) {
		let rand = Math.random() * (hi - lo);
		rand += lo;
		return rand;
	}


	/**
	 * App is for loading resources, talking to servers, interacting with UI
	 */
	let App = function () {};

	/**
	 * Start this web app
	 *
	 * Right now, starting the app immediately launches a pre-configured 
	 * game. Later, a UI action by the user will be required to actually
	 * start a game, once it has been configured.
	 */
	App.prototype.start = function () {
		console.log("Starting MAGIC: The Metaprogram for Agent Generation Interaction and Control...");
		this.setupUI();
		this.game = new Game(this);
		this.game.start();
	};

	/**
	 * Set up the application UI.
	 *
	 * Currently this is limited to just listening for [SPACE] keypresses.
	 * Someday there may be buttons and menus and all that jazz.
	 */
	App.prototype.setupUI = function () {
		// Need to use 'bind' here so that 'keyHandler' is called with 'this'
		// equal to the app. Otherwise 'this' will be '#document' when called.
		document.addEventListener('keydown', this.keyHandler.bind(this), false);
	};

	/**
	 * UI event listener, for keypress events.
	 */
	App.prototype.keyHandler = function (evt) {
		// Pause on any key. Maybe should just be spacebar?
		switch (evt.key) {
			case " ":
				this.game.togglePaused();
				break;
			default:
				// ignore
				break;
		}
	};


	/**
	 * Game: Main game object.
	 */
	function Game(theApp) {
		Object.assign(this, {
			app: theApp,		// Back reference to container
			loopCounter: 0,
			requestId: 0,		// returned from requestAnimationFrame
			flags: {
				paused: true,
			},
			objects: {
				map: [],
				actors: [],
			},
		});
		this.graphics = new Graphics(this);
		this.physics = new Physics(this);
	};

	Game.const = {
		ACTOR_RADIUS: 15,
		WALL_THICKNESS: 20,
		arena: {
			width: 800,
			height: 640,
		},
	};

	Game.prototype.start = function () {
		this.initializeSubsystems();
		this.populateTheArena();
		this.render();
	};

	Game.prototype.initializeSubsystems = function () {
		console.log("Game.prototype.initializeSubsystems");
		this.graphics.initialize();
		this.physics.initialize();
	};

	Game.prototype.populateTheArena = function () {
		this.createMap();
		this.createActors();
	};

	Game.prototype.createMap = function () {
		let wd = Game.const.arena.width;
		let ht = Game.const.arena.height;
		let th = Game.const.WALL_THICKNESS;
		this.addWall(0, 0, wd, th, 'NORTH');
		this.addWall(0, ht - th, wd, ht, 'SOUTH');
		this.addWall(0, th, th, ht - th, 'WEST');
		this.addWall(wd - th, th, wd, ht - th, 'EAST');
	};

	/**
	 * Plug specific wall data into a schema for making walls.
	 * Someday that will be part of map construction. For now the map
	 * is very very simple.
	 */
	Game.prototype.addWall = function (x, y, w, h, name) {
		let properties = {
			pos: {x: x, y: y},
			width: w,
			height: h,
			name: name,
			type: 'wall',
		}
		let body = Physics.wallSegment(x, y, w, h, name);
		this.physics.addBody(body);
		let sprite = Graphics.createSprite('wall', properties);
		let object = this.createGameObject(properties);
		object.body = body;
		object.sprite = sprite;
		this.objects.map.push(object);
	};

	Game.prototype.createActors = function () {
		let count = 6;
		let initPosList = scatter(count);		// random positions, not too close
		for (var i = 0; i < count; ++i) {
			let properties = {
				name: `Agent${i}`,
				type: 'actor/generic',
				color: ((360/count) % 360) * i,
				pos: initPosList[i],
				radius: Game.const.ACTOR_RADIUS,
			};
			this.createActor(properties);
		}
	};

	/**
	 * Assign initial positions so no one is too close
	 *
	 * Divide the arena up into |actors| rows and columns, and
	 * assign row, col pairs uniquely.
	 */
	function scatter(n) {
		let rows = Array.from(Array(n).keys());
		let cols = rows.slice();
		shuffle(rows);
		shuffle(cols);
		let cw2 = Math.floor(Game.const.arena.width/(2*n)),
				rh2 = Math.floor(Game.const.arena.height/(2*n)),
				cw = 2 * cw2,
				rh = 2 * rh2;
		let scatteredCoords = [];
		for (var i = 0; i < n; ++i) {
			scatteredCoords.push({
				x: (cols[i] * cw) + cw2,
				y: (rows[i] * rh) + rh2,
			});
		}
		return scatteredCoords;
	};

	/**
	 * In this function, we create a sprite master with a generic 'actor' 
	 * key. In real life, the key would be the name of a particular bot,
	 * and would connect it to the sprite sheets for that character.
	 */
	Game.prototype.createActor = function (properties) {
		let actor = this.createGameObject(properties);
		actor.body = Physics.actorBody(properties);
		actor.sprite = Graphics.createSprite('actor',	properties);
		this.physics.addBody(actor.body);
		this.objects.actors.push(actor);
	};

	Game.prototype.createGameObject = function (properties) {
		switch (properties.type) {
			case 'actor/generic':
				return new GenericActor(properties);
			case 'wall':
				return new WallObject(properties);
			default:
				throw new Error(`Unrecognized game object type: ${properties.type}`);
		}
	};

	Game.prototype.togglePaused = function () {
		if (this.flags.paused) {
			this.flags.paused = false;
			this.loop();
		} else {
			this.flags.paused = true;
			if (this.requestId !== 0) {
				window.cancelAnimationFrame(this.requestId);
			}
		}
	};

	Game.prototype.loop = function () {
		++this.loopCounter;
		this.requestId = requestAnimationFrame(this.loop.bind(this));
		console.log("Game.loop", this.loopCounter);
		this.update();
		this.render();
	};

	Game.prototype.update = function () {
		this.physics.update();
		this.objects.actors.forEach((actor) => actor.update());
	};

	Game.prototype.render = function () {
		this.graphics.clearViewport();
		this.objects.map.map((wall) => wall.render(this.graphics));
		this.objects.actors.map((actor) => actor.render(this.graphics));
	};

	///////////////////////////////////////////////////////////////////////////
	// Actors
	
	const Q_DONE = 1;
	const Q_NOT_DONE = 2;
	const Q_NOT_DEAD = 3;
	const Q_DEAD = 4;
	const Q_ELIMINATED = 5;

	function GenericActor(properties) {
		Object.assign(this, {
			name: properties.name,
			health: 100,
			maxHealth: 100,
			pos: properties.pos,
			drv: {
				x: randomFloat(-3, 3),
				y: randomFloat(-3, 3),
			},
			aim: Math.random() * 2 * Math.PI, // randomRadian?
		});
		this.state = Q_NOT_DEAD;
	}

	GenericActor.prototype.isNotDead = function () {
		return this.state === Q_NOT_DEAD;
	};

	GenericActor.prototype.isDead = function () {
		return this.state === Q_DEAD;
	};

	GenericActor.prototype.isEliminated = function () {
		return this.state === Q_ELIMINATED;
	};

	GenericActor.prototype.getName = function () {
		return this.name;
	};

	GenericActor.prototype.getPosition = function () {
		// Make sure pos registers are up to date
		if (this.body) {
			this.pos.x = this.body.position.x;
			this.pos.y = this.body.position.y;
		}
		return this.pos;
	};

	/** 
	* Return contents of AIM register, which are natively in radians.
	*/
	GenericActor.prototype.getAim = function () {
		return this.aim;
	};

	GenericActor.prototype.getAimDegrees = function () {
		return degrees(this.aim);
	};

	GenericActor.prototype.setAimDegrees = function (deg) {
		this.aim = radians(deg);
	};

	GenericActor.prototype.getHealth = function () {
		return this.health;
	};

	GenericActor.prototype.getMaxHealth = function () {
		return this.maxHealth;
	};

	GenericActor.prototype.driveVector = function (vec) {
		this.drv.x = vec.x;
		this.drv.y = vec.y;
		Matter.Body.setVelocity(this.body, this.drv);
		//let force = Matter.Vector.create(this.drv.x, this.drv.y);
		//Matter.Body.applyForce(this.body, this.getPosition(), force);
	};

	GenericActor.prototype.update = function () {
		if (this.isEliminated()) {
			console.log(`${this.getName()} eliminated`);
			return;
		}
		if (this.isDead()) {
			console.log(`${this.getName()} dead`);
			if (--this.deathCounter === 0) {
				this.state = Q_ELIMINATED;
			}
		} else if (this.isNotDead()) {
			if (this.getHealth() <= 0) {
				this.state = Q_DEAD;
				this.deathCounter = 20;
				return;
			}
			//---------------------------------------------------
			// This is where the bot program gets advanced
			// (If the bot has any energy)

			this.setAimDegrees(this.getAimDegrees() + 5);

			// End of bot program step (i.e., end of chronon?)
			//---------------------------------------------------		
			
			this.driveVector(this.drv);
		} else {
			throw new Error(`Game object ${this.getName()} in invalid state for update`);
		}
	};

	GenericActor.prototype.render = function (gfx) {
		this.sprite.render(gfx, this);
	};



	///////////////////////////////////////////////////////////////////////////
	// Walls and other map objects

	function WallObject(properties) {
		let p = properties;
		Object.assign(this, {
			name: p.name,
		});
	}

	WallObject.prototype.update = function () {
		console.log("WallObject.prototype.update");	// should be unreachable
	};

	WallObject.prototype.render = function (gfx) {
		this.sprite.render(gfx);
		// We might want to consider whether we really want to call this on 
		// game loop renders. The walls never change, in this version.
	};



	///////////////////////////////////////////////////////////////////////////
	// Graphics Subsystem

	/**
	 * The graphics subsystem. Someday this will probably be a wrapper around
	 * a lower level drawing library like Pixi.js or something.
	 * The main thing we have to do here is to manage a multi-layer canvas
	 * collection, consisting of several canvases layered on top of each other.
	 */
	Graphics = function (theGame) {
		Object.assign(this, {
			game: theGame,
			surface: null,
		});
	};

	Graphics.prototype.initialize = function () {
		console.log("Graphics.prototype.initialize");
		this.surface = new LayeredCanvas(this);
	};

	Graphics.Layer = Object.freeze({
		MIN: 1,
		GROUND: 1,
		ACTIVE: 2,
		LABELS: 3,
		MAX: 3,
	});

	Graphics.prototype.getContext = function (layer) {
		return this.surface.layers[layer].getContext('2d');
	};

	Graphics.createSprite = function (key, properties) {
		switch (key) {
			case 'actor':
				return new GenericActorSprite(properties);
				break;
			case 'wall':
				return new WallSprite(properties);
			default:
				throw Error(`Unrecognized sprite master key: ${key}`);
		}
	};

	Graphics.prototype.clearViewport = function () {
		this.surface.clear();
	};


	/**
	 * Abstraction over multiple stacked canvases
	 *
	 * The idea being that we stack them all at the same fixed position,
	 * and they will draw in 'z axis' order. So stuff drawn on the bottom 
	 * canvas will get covered by stuff drawn on higher ones.
	 */
	LayeredCanvas = function (graphics) {
		this.el = e_("arena");
		console.log(this.el);
		this.width = 800;
		this.height = 640;
		this.layers = [];
		let Layer = Graphics.Layer;
		let ids = ["", "ground", "active", "labels"];
		for (var i = Layer.MIN; i <= Layer.MAX; ++i) {
			this.createLayer(i, this.el, `${ids[i]}-layer`);
		}
	};

	LayeredCanvas.prototype.createLayer = function (idx, el, id) {
		let layer = document.createElement("canvas");
		layer.id = id;
		layer.width = this.width;
		layer.height = this.height;
		this.el.appendChild(layer);
		this.layers[idx] = layer;
	};

	LayeredCanvas.prototype.clear = function () {
		for (var i = Graphics.Layer.MIN; i <= Graphics.Layer.MAX; ++i) {
			let ctx = this.layers[i].getContext('2d');
			ctx.clearRect(0, 0, Game.const.arena.width, Game.const.arena.height);
		}
	};


	/**
	 * A SpriteMaster is a drawable that may draw different actual sprites
	 *
	 * The idea is that it controls a collection of graphical resources,
	 * like sprite sheets, and it handles figuring out which is the
	 * current one to draw.
	 * In our current situation, we actually just draw shapes, not
	 * sprites, so it doesn't do much.
	 */
	function WallSprite(properties) {
		Object.assign(this, {
			pos: properties.pos,
			width: properties.width,
			height: properties.height,
			name: properties.name,
		});
	};

	WallSprite.prototype.render = function (gfx) {
		// Walls draw in the GROUND layer, so get the right context
		let ground = Graphics.Layer.GROUND;
		let ctx = gfx.getContext(ground);
		ctx.fillStyle = "#AAA";
		ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
	};


	function GenericActorSprite(properties) {
		Object.assign(this, properties);
		/* This is where we fill in the actual sprite details,
		   that is, the animation that this sprite runs on initial creation. */
	}

	/**
	 * This is tricky, because the layer(s) we draw to varies with the
	 * state of the actor model.
	 */
	GenericActorSprite.prototype.render = function (gfx, model) {
		let radius = Game.const.ACTOR_RADIUS,
				name = model.getName(),
				pos = model.getPosition(),
				aim = model.getAim(),
				health = model.getHealth(),
				maxHealth = model.getMaxHealth();
		if (model.isNotDead()) {
			let ctx = gfx.getContext(Graphics.Layer.ACTIVE);
			let stroke = `hsl(${this.color}, 50%, 33%)`,
					fill = `hsl(${this.color}, 50%, 67%)`;
			// render body
			ctx.strokeStyle = stroke;
			ctx.fillStyle = fill;
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
			ctx.fill();
			// render turret
			ctx.moveTo(pos.x, pos.y);
			let x2 = pos.x + (radius * Math.cos(aim)),
					y2 = pos.y + (radius * Math.sin(aim));
			ctx.lineTo(x2, y2);
			ctx.stroke();
			// decorations
			// - label
			ctx = gfx.getContext(Graphics.Layer.LABELS);
			ctx.font = "8px sans";
			ctx.textAlign = "center";
			ctx.fillStyle = "black";
			ctx.fillText(name, pos.x, pos.y + radius + 12);
			// - health bar
			let barX = pos.x - radius,
					barY = pos.y - radius - 8,
					barW = 2 * radius,
					barH = 3;
			ctx.fillStyle = 'red';
			ctx.fillRect(barX, barY, barW, barH);
			ctx.fillStyle = 'green';
			ctx.fillRect(barX, barY, barW * (health / maxHealth), barH);
		} else if (model.isDead()) {
			let ctx = gfx.getContext(Graphics.Layer.GROUND);
			let stroke = '#888',
					fill = '#BBB';
			// body
			ctx.strokeStyle = stroke;
			ctx.fillStyle = fill;
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
			ctx.fill();
			// turret
			ctx.moveTo(pos.x, pos.y);
			let x2 = pos.x + radius * Math.cos(aim),
					y2 = pos.y + radius * Math.sin(aim);
			ctx.lineTo(x2, y2);
			ctx.stroke();
			// label
			ctx.font = '8px sans';
			ctx.textAlign = 'center';
			ctx.fillStyle = stroke;	// use disc stroke color for label
			ctx.fillText(name, pos.x, pos.y + radius + 12);
		} else if (model.isEliminated()) {
			// Hopefully this no-op is unreachable...
		} else {
			throw new Error(`No valid drawing routine for ${name}`);
		}
	};


	/**
	 * Physics: A wrapper around the Matter.js physics engine.
	 */
	Physics = function (theGame) {
		Object.assign(this, {
			game: theGame,
		});
	};

	Physics.prototype.initialize = function () {
		console.log("Physics.prototype.initialize");
		this.matter = Matter.Engine.create();
		this.matter.world.gravity.y = 0;
		Matter.Events.on(this.matter, 'collisionActive', handleCollisions);
		Matter.Events.on(this.matter, 'collisionStart', handleCollisions);
	};

	function handleCollisions(evt) {
		for (let i = 0; i < evt.pairs.length; ++i) {
			let bodyA = evt.pairs[i].bodyA,
				bodyB = evt.pairs[i].bodyB;

			if (isWall(bodyA)) {
				console.log(bodyB.label, "on", bodyA.label);
			} else {
				if (isWall(bodyB)) {
					console.log(bodyA.label, "on", bodyB.label);
				} else {
					console.log(bodyA.label, "collides with", bodyB.label);
					console.log(evt);
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

	Physics.prototype.update = function () {
		Matter.Engine.update(this.matter, 1000/60);
	};

	Physics.wallSegment = function (x, y, w, h, name) {
		let body = Matter.Bodies.rectangle(
			x + w/2, y + h/2, w, h,
			{	isStatic: true, label: name });
		//
		// We could wrap the Matter body with our own stuff here...
		//
		return body;
	};

	Physics.actorBody = function (properties) {
		let body = Matter.Bodies.circle(
			properties.pos.x, properties.pos.y,
			Game.const.ACTOR_RADIUS,
			// options:
			{
				angle: properties.aim,
				density: 1,
				friction: 0,
				frictionAir: 0,
				frictionStatic: 0,
				label: properties.name,
				// restitution: defaults to 0
			});
		//
		// Fill in our own wrapper stuff here, if needed.
		//
		return body;
	};

	Physics.prototype.addBody = function (body) {
		console.log('addBody', body);
		Matter.World.add(this.matter.world, body);
	};


	// EXPORTS
	ns.App = App;

	return ns;

})(MAGIC || {});


/**
* Start up
*/
window.onload = () => {
	let magic_app = new MAGIC.App();
	magic_app.start();
};

