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

	function randomRadian() {
		return Math.random() * 2 * Math.PI;
	}

	/**
	 * URL: https://stackoverflow.com/questions/1073336/circle-line-segment-collision-detection-algorithm
	 * E: Start of ray vector
	 * L: End of ray vector
	 * C: Center of circle
	 * r: Radius of circle
	 */
	function intersectLineCircle(E, L, C, r) {
		let d = Matter.Vector.sub(L, E),
				f = Matter.Vector.sub(E, C),
				a = Matter.Vector.dot(d, d),
				b = 2 * Matter.Vector.dot(f, d),
				c = Matter.Vector.dot(f, f) - (r * r),
				discriminant = (b * b) - (4 * a * c);
		if (discriminant < 0) {
			return false;
		}
		discriminant = Math.sqrt(discriminant);
		let t1 = (-b - discriminant) / (2 * a),
				t2 = (-b + discriminant) / (2 * a);
		if (t1 >= 0 && t1 <= 1) {
			return true;
		}
		if (t2 >= 0 && t2 <= 1) {
			return true;
		}
		return false;
	}


	///////////////////////////////////////////////////////////////////////////
	// App is for loading resources, talking to servers, interacting with UI

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


	////////////////////////////////////////////////////////////////////////////
	// Game: Main game object.

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
				projectiles: [],
			},
		});
		this.graphics = new Graphics(this);
		this.physics = new Physics(this);
	};

	/**
	 * These are constants within a game, but could be considered parameters
	 * of variation between different types of game.
	 */
	Game.const = {
		ACTOR_RADIUS: 15,
		BULLET_RADIUS: 3,
		SIGHT_DISTANCE: 1024,	// size of arena diagonal, apparently
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
		let wall = this.createGameObject(properties);
		let body = Physics.wallSegment(x, y, w, h, name, wall);
		this.physics.addBody(body);
		let sprite = Graphics.createSprite('wall', properties);
		wall.body = body;
		wall.sprite = sprite;
		this.objects.map.push(wall);
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
		actor.body = Physics.actorBody(actor, properties);
		actor.sprite = Graphics.createSprite('actor',	properties);
		actor.sourceCode = ns.samples.ModifiedShotBot;
		ns.Compiler.compile(actor);	// --> actor.program
		actor.interpreter = new ns.Interpreter(actor);
		this.physics.addBody(actor.body);
		this.objects.actors.push(actor);
	};

	Game.prototype.createProjectile = function (pos, vec, energy) {
		let proj = new Projectile(this, pos, vec, energy);
		let properties = {
			name: proj.name,
			pos: pos,
		};
		proj.body = Physics.projectileBody(proj, properties);
		proj.sprite = Graphics.createSprite('bullet', properties);
		this.physics.addBody(proj.body);
		this.objects.projectiles.push(proj);
		console.log(proj);
	};

	Game.prototype.createGameObject = function (properties) {
		switch (properties.type) {
			case 'actor/generic':
				return new GenericActor(this, properties);
			case 'wall':
				return new WallObject(this, properties);
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

	/**
	 * Sets observer.sight.thing if there is anything to see at
	 * observer.sight.angle + observer.sight.offset. 
	 * Object returned will be the closest, in case there are 
	 * multiple candidates.
	 */
	Game.prototype.checkSightEvents = function (observer) {
		observer.sight.thing = null;
		let sightRay = Matter.Vector.create(Game.const.SIGHT_DISTANCE, 0),
				angle = observer.sight.angle + observer.sight.offset,
				pos = observer.getPosition(),
				actors = this.objects.actors;
		sightRay = Matter.Vector.rotateAbout(sightRay, angle, pos);
		let candidates = [];
		for (var i = 0; i < actors.length; ++i) {
			let actor = actors[i];
			if (!actor.isNotDead() || observer === actor) {
				continue;
			}
			let C = actor.getPosition(),
					r = Game.const.ACTOR_RADIUS;
			if (intersectLineCircle(pos, sightRay, C, r)) {
				candidates.push(actor);
			}
		}
		if (candidates.length === 1) {
			observer.sight.thing = candidates[0];
		} else if (candidates.length > 1) {
			let min = Infinity,
					argmin = null;
			for (var i = 0; i < candidates.length; ++i) {
				let thing = candidates[i],
						pos1 = thing.getPosition(),
						dx = pos1.x - pos.x,
						dy = pos1.y - pos.y,
						dist2 = (dx * dx) + (dy * dy);	// distance squared, good enough
				if (dist2 < min) {
					min = dist2;
					argmin = thing;
				}
			}
			observer.sight.thing = argmin;
			observer.sight.dist = Math.sqrt(min);
		}
		
		if (observer.sight.thing !== null) {
			observer.onSight();
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
		this.physics.update()
			.forEach((task) => this.execute(task));
		this.objects.actors
			.reduce((ts, actor) => ts.concat(actor.update()), [])
			.forEach((task) => this.execute(task));
		this.objects.projectiles
			// collect tasks from each projectile
			.reduce((tasks, proj) => tasks.concat(proj.update()), [])
			.forEach((task) => this.execute(task));
	};

	/**
	 * Execute game tasks.
	 */
	Game.prototype.execute = function (task) {
		//console.log("Execute game task", task);
		switch (task.op) {
			case 'actorDied':
				task.actor.setState(Q_DEAD);
				task.actor.deathCounter = 200;
				this.physics.removeBody(task.actor);
				break;
			case 'actorEliminated':
				task.actor.setState(Q_ELIMINATED);
				// remove from render loop
				break;
			case 'interrupt':
				task.obj.queueEvent(task);
				break;
			case 'removeProjectile':
				this.physics.removeBody(task.obj);
				// Okay, which projectile do we remove from the objects list?
				let place = this.objects.projectiles.findIndex((p) => p === task.obj);
				this.objects.projectiles.splice(place, 1);
				break;
			default:
				throw new Error(`Unknown task operator (${task.op})`);
		}
	};

	Game.prototype.render = function () {
		//if (this.norender) return;	// for debugging
		this.graphics.clearViewport();
		this.objects.map.forEach((wall) => wall.render(this.graphics));
		this.objects.projectiles.forEach((p) => p.render(this.graphics));
		this.objects.actors.forEach((actor) => actor.render(this.graphics));
	};

	///////////////////////////////////////////////////////////////////////////
	// Actors
	
	const Q_NOT_DEAD = 3;
	const Q_DEAD = 4;
	const Q_ELIMINATED = 5;

	function GenericActor(game, properties) {
		let a0 = randomRadian();
		Object.assign(this, {
			game: game,
			name: properties.name,
			eventQueue: [],
			state: Q_NOT_DEAD,
			cpuSpeed: 50,
			health: 100,
			maxHealth: 100,
			pos: properties.pos,
			drv: {
				x: randomFloat(-2, 2),
				y: randomFloat(-2, 2),
			},
			sight: {
				angle: a0,
				offset: 0,
				thing: null,
				dist: 0,
			},
			wall: 0,
		});
		this.prog = {
			main: beNotDead,
			onWall: bounceOffWall,
			onBump: pushThroughCollisions,
		};
	}

	GenericActor.prototype.isNotDead = function () {
		return this.getState() === Q_NOT_DEAD;
	};

	GenericActor.prototype.isDead = function () {
		return this.getState() === Q_DEAD;
	};

	GenericActor.prototype.isEliminated = function () {
		return this.getState() === Q_ELIMINATED;
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

	GenericActor.prototype.getPosX = function () {
		return this.getPosition().x;
	};

	GenericActor.prototype.getPosY = function () {
		return this.getPosition().y;
	};

	/** 
	* Return contents of AIM register, which are natively in radians.
	*/
	GenericActor.prototype.getAim = function () {
		return this.sight.angle;
	};

	GenericActor.prototype.getAimDegrees = function () {
		return degrees(this.getAim());
	};

	GenericActor.prototype.setAim = function (rad) {
		this.sight.angle = rad;
		this.checkSightEvents();
	};

	GenericActor.prototype.setAimDegrees = function (deg) {
		this.setAim(radians(deg));
	};

	GenericActor.prototype.setAimVector = function (vec) {
		let angle = Matter.Vector.angle(this.getPosition(), vec);
		this.setAim(angle);
	};

	GenericActor.prototype.getLookDegrees = function () {
		return degrees(this.sight.offset);
	}

	GenericActor.prototype.setLook = function (rad) {
		this.vision.offset = rad;
		this.checkSightEvents();
	}

	GenericActor.prototype.setLookDegrees = function (deg) {
		this.setLook(radians(deg));
	}

	GenericActor.prototype.getSightDist = function () {
		if (this.sight.dist) {
			return this.sight.dist;
		} else {
			return 0;
		}
	};

	GenericActor.prototype.getCPU = function () {
		return this.cpuSpeed;
	}

	GenericActor.prototype.getHealth = function () {
		return this.health;
	};

	GenericActor.prototype.setHealth = function (amt) {
		this.health = Math.max(amt, 0);
	}

	GenericActor.prototype.removeHealth = function (amt) {
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

	GenericActor.prototype.getMaxHealth = function () {
		return this.maxHealth;
	};

	GenericActor.prototype.getSpeedX = function () {
		return this.drv.x;
	};

	GenericActor.prototype.setSpeedX = function (dx) {
		this.drv.x = dx;
	}

	GenericActor.prototype.getSpeedY = function () {
		return this.drv.y;
	};

	GenericActor.prototype.setSpeedY = function (dy) {
		this.drv.y = dy;
	};

	GenericActor.prototype.driveVector = function (vec) {
		this.drv.x = vec.x;
		this.drv.y = vec.y;
		Matter.Body.setVelocity(this.body, this.drv);
		//let force = Matter.Vector.create(this.drv.x, this.drv.y);
		//Matter.Body.applyForce(this.body, this.getPosition(), force);
	};

	GenericActor.prototype.getWall = function () {
		return this.wall;
	}

	GenericActor.prototype.getState = function () {
		return this.state;
	};

	GenericActor.prototype.setState = function (qNew) {
		this.state = qNew;
	};

	GenericActor.prototype.launchProjectile = function (angle, energy) {
		let norm = angle2vector(angle, 1),
				drv = Matter.Vector.mult(norm, 5),
				offset = Matter.Vector.mult(norm, Game.const.ACTOR_RADIUS + 1),
				pos = Matter.Vector.add(this.getPosition(), offset);
		console.log(this.name, "firing", energy, "at angle", degrees(angle),
			"start pos =", pos, "drive = ", drv);
		this.game.createProjectile(pos, drv, energy);
	}

	GenericActor.prototype.update = function () {

		let gameTasks = [];

		// Handle event notifications (event queue)
		// Right now there's no prioritization; it's just a flat list
		this.wall = 0;
		this.sight.dist = 0;
		this.sight.thing = null;
		this.eventQueue.forEach((evt) => this.handleEvent(evt));
		this.eventQueue = [];
		// Trigger events if warranted (e.g., we just died)

		this.prog.main.call(this, gameTasks);

		return gameTasks;

	};

	let beNotDead = function (gameTasks) {
		if (this.getHealth() === 0) {
			gameTasks.push({
				op: 'actorDied',
				actor: this,
			});
			this.prog.main = beDead;
		} else {

			//this.checkSightEvents();
//			console.log(this.name, "at", this.getPosition(), "heading", this.drv);

			//---------------------------------------------------
			// This is where the bot program gets advanced
			// (While the bot has any energy)

//			console.log(this.name, "-----------------------------");
			for (var i = 0; i < this.getCPU(); ++i) {
				this.interpreter.step();
				if (this.interpreter.syncFlag) {
					this.interpreter.syncFlag = false;
					break;
				}
			}

			// End of bot program cycle (i.e., end of chronon?)
			//---------------------------------------------------		
			
			this.driveVector(this.drv);
		}
	};

	let beDead = function (gameTasks) {
		if (--this.deathCounter === 0) {
			gameTasks.push({
				op: 'actorEliminated',
				actor: this,
			});
			this.prog.main = beEliminated;
		}
	}

	let beEliminated = function (gameTasks) {
	}

	let bounceOffWall = function (whichWall) {
		if (whichWall === 'NORTH' || whichWall === 'SOUTH') {
			this.driveVector({x: this.drv.x, y: -1 * this.drv.y});
		} else {
			this.driveVector({x: -1 * this.drv.x, y: this.drv.y});
		}
	}

	let pushThroughCollisions = function (otherActor) {
		this.setAimVector(otherActor.getPosition());
	};

	GenericActor.prototype.onSight = function () {
		let seen = this.sight.thing;
//		console.log(this.name, "sees", seen.name);
		let p1 = this.getPosition(),
				p2 = seen.getPosition();
		//this.game.graphics.drawLine(p1, p2);
		//this.game.togglePaused();
	};

	GenericActor.prototype.checkSightEvents = function () {
		this.game.checkSightEvents(this);
	};

	GenericActor.prototype.queueEvent = function (evt) {
		this.eventQueue.push(evt);
	};

	GenericActor.prototype.render = function (gfx) {
		this.sprite.render(gfx, this);
	};

	GenericActor.prototype.handleEvent = function (evt) {
		console.log(this.name, "handleEvent", evt);
		switch (evt.type) {
			case 'collision':
				if (evt.data.bumped instanceof Projectile) {
					this.projectileImpact(evt.data.bumped);
				} else {
					// If data.bumped is a bot:
					this.removeHealth(1);
				}
				break;
			case 'wall':
				console.log(this.name, "on wall", evt.data.bumped.name);
				this.removeHealth(5);
				this.wall = 1;
				break;
			default:
				throw new Error(`Actor does not recognize event type (${evt.type})`);
		}
	};

	GenericActor.prototype.projectileImpact = function (projectile) {
		// Theoretically, we could have factors like shields and armor that
		// lessen the effect of the impact. 
		// For now, we just assess the full raw damage.
		this.removeHealth(projectile.energy);
	};




	///////////////////////////////////////////////////////////////////////////
	// Walls and other map objects

	function WallObject(game, properties) {
		let p = properties;
		Object.assign(this, {
			game: game,
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
	// Projectile objects
	//
	// For now there's only one generic projectile type

	function Projectile(game, startpos, velocity, energy) {
		Object.assign(this, {
			game: game,
			name: `Projectile_${Projectile.idCounter++}`,
			drv: velocity,
			pos: startpos,
			energy: energy,
			eventQueue: [],
		});
	}

	Projectile.idCounter = 0;

	Projectile.prototype.getPosition = function () {
		// Make sure pos registers are up to date
		if (this.body) {
			this.pos.x = this.body.position.x;
			this.pos.y = this.body.position.y;
		}
		return this.pos;
	};

	Projectile.prototype.queueEvent = function (evt) {
		this.eventQueue.push(evt);
	};

	Projectile.prototype.update = function () {
		let gameTasks = [];
		this.eventQueue.forEach((evt) => this.handleEvent(evt, gameTasks));
		this.eventQueue = [];
		Matter.Body.setVelocity(this.body, this.drv);
		return gameTasks;	// we don't generate tasks yet...
	};

	/**
	 * When projectiles handle events, this can lead to tasks for other
	 * game objects (like calculating actual damage, removing this from 
	 * the game, etc.)
	 */
	Projectile.prototype.handleEvent = function (evt, tasks) {
		switch (evt.type) {
			case 'collision':
				tasks.push(createRemoveProjectileTask(this));
				break;
			case 'wall':
				console.log(this.name, "on wall", evt.data.bumped.name);
				tasks.push(createRemoveProjectileTask(this));
				break;
			default:
				throw new Error(`Actor does not recognize event type (${evt.type})`);
		}
	};

	function createRemoveProjectileTask(projectile) {
		return {
			op: 'removeProjectile',
			obj: projectile,
		};
	}

	Projectile.prototype.render = function (gfx) {
		this.sprite.render(gfx, this);
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
			case 'bullet':
				return new BulletSprite(properties);
			case 'wall':
				return new WallSprite(properties);
			default:
				throw Error(`Unrecognized sprite master key: ${key}`);
		}
	};

	Graphics.prototype.clearViewport = function () {
		this.surface.clear();
	};

	// for debugging:
	Graphics.prototype.drawLine = function (p1, p2) {
		console.log("drawLine", p1, p2);
		let ctx = this.getContext(Graphics.Layer.LABELS);
		ctx.strokeStyle = 'black';
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();
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


	function BulletSprite(properties) {
		Object.assign(this, properties);
	}

	BulletSprite.prototype.render = function (gfx, model) {
		let ctx = gfx.getContext(Graphics.Layer.ACTIVE);
		let pos = model.getPosition();
		ctx.fillStyle = '#444';
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, Game.const.BULLET_RADIUS, 0, 2 * Math.PI);
		ctx.fill();
	}


	////////////////////////////////////////////////////////////////////////////
	// Physics: A wrapper around the Matter.js physics engine.

	Physics = function (theGame) {
		Object.assign(this, {
			game: theGame,
		});
	};

	Physics.prototype.initialize = function () {
		console.log("Physics.prototype.initialize");
		this.matter = Matter.Engine.create();
		this.matter.world.gravity.y = 0;
		Matter.Events.on(this.matter, 'collisionActive', this.handleCollisions.bind(this));
		Matter.Events.on(this.matter, 'collisionStart', this.handleCollisions.bind(this));
	};

	Physics.prototype.update = function () {
		this.tasks = [];
		Matter.Engine.update(this.matter, 1000/60);
		// Okay, maybe we have some events to deal with...
		// Event handlers registered with Matter will add tasks to 
		// this.tasks.
		return this.tasks;
	};

	Physics.wallSegment = function (x, y, w, h, name, actor) {
		let body = Matter.Bodies.rectangle(
			x + w/2, y + h/2, w, h,
			{	isStatic: true, label: name });
		// Extend Matter.js body with 'controller', a back-pointer
		body.controller = actor;
		return body;
	};

	Physics.actorBody = function (actor, properties) {
		let body = Matter.Bodies.circle(
			properties.pos.x, properties.pos.y,
			Game.const.ACTOR_RADIUS,
			// options:
			{
				density: 1,
				friction: 0,
				frictionAir: 0,
				frictionStatic: 0,
				label: properties.name,
				// restitution: defaults to 0
			});
		// Extend Matter.js body with 'controller', a back-pointer
		body.controller = actor;
		return body;
	};

	Physics.projectileBody = function (projectile, properties) {
		let body = Matter.Bodies.circle(
			properties.pos.x, properties.pos.y,
			Game.const.BULLET_RADIUS,
			{
				density: 1,
				friction: 0,
				frictionAir: 0,
				frictionStatic: 0,
				label: properties.name,
			});
		body.controller = projectile;
		return body;
	};

	Physics.prototype.addBody = function (body) {
		console.log('addBody', body);
		Matter.World.add(this.matter.world, body);
	};

	Physics.prototype.removeBody = function (actor) {
		console.log('removeBody', actor.body);
		Matter.World.remove(this.matter.world, actor.body, true);
	};

	Physics.prototype.handleCollisions = function (evt) {
		for (let i = 0; i < evt.pairs.length; ++i) {
			let bodyA = evt.pairs[i].bodyA,
					bodyB = evt.pairs[i].bodyB;

			if (bodyA.controller instanceof Projectile && 
					bodyB.controller instanceof Projectile) {
				return;
			}

			if (isWall(bodyA)) {
				console.log(bodyB.label, "on", bodyA.label);
				this.tasks.push(mkWallEvt(bodyB.controller, bodyA.controller));
			} else {
				if (isWall(bodyB)) {
					console.log(bodyA.label, "on", bodyB.label);
					this.tasks.push(mkWallEvt(bodyA.controller, bodyB.controller));
				} else {
					console.log(bodyA.label, "collides with", bodyB.label);
					//console.log(evt);
					this.tasks.push(mkCollEvt(bodyA.controller, bodyB.controller));
					this.tasks.push(mkCollEvt(bodyB.controller, bodyA.controller));
				}
			}
		}
	};

	function createInterrupt(type, subject, data) {
		let task = {};
		task.op = 'interrupt';
		task.type = type;
		task.obj = subject;
		task.data = data;
		return task;
	}

	function mkWallEvt(A, B) {
		return createInterrupt('wall', A, {bumped: B});
	}

	function mkCollEvt(A, B) {
		return createInterrupt('collision', A, {bumped: B});
	}

	function isWall(body) {
		return body.label === 'NORTH' ||
			body.label === 'SOUTH' ||
			body.label === 'EAST' ||
			body.label === 'WEST';
	}


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

