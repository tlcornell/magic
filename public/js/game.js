var MAGIC = ((ns) => {

	// IMPORTS
	// --------
	let AgentFactory = ns.AgentFactory,
			GenericAgent = ns.GenericAgent;
	let e_ = ns.e_,
			a2v = ns.a2v,
			degrees = ns.degrees,
			intersectLineCircle = ns.intersectLineCircle;
	let Graphics = ns.Graphics;
	let LOG = ns.LOG;


	///////////////////////////////////////////////////////////////////////////
	// App is for loading resources, talking to servers, interacting with UI

	let App = function () {
		this.resetCtl = e_('reset');
		this.startCtl = e_('start'); 
		this.pauseCtl = e_('pause'); 
		// 'Pause' may be replaced by keyboard controls, 
		// so it wouldn't be a visible UI control any more...
		this.game = null;
	};

	/**
	 * Start this web app
	 *
	 * Right now, starting the app immediately launches a pre-configured 
	 * game. Later, a UI action by the user will be required to actually
	 * start a game, once it has been configured.
	 */
	App.prototype.init = function () {
		console.log("Starting MAGIC: The Metaprogram for Agent Generation Interaction and Control...");
		this.setupUI();
		this.game = new Game(this);
		this.game.init();
	};

	/**
	 * Set up the application UI.
	 */
	App.prototype.setupUI = function () {
		this.resetCtl.onclick = this.reset.bind(this);
		this.startCtl.onclick = this.start.bind(this);
		this.pauseCtl.onclick = this.pause.bind(this);
		this.pauseCtl.disabled = true;
	};

	App.prototype.reset = function () {
		e_('show-log').checked = false;
		this.game.exitGameLoop();
		this.game.clearGameWorld();
		this.game.resetRosterManager();
		this.clearLog();
		this.setPauseCtl('Pause', false);
		this.setStartCtl('Start', true);
	};

	App.prototype.restart = function () {
		this.game.exitGameLoop();
		this.game.clearGameWorld();
		this.clearLog();
		this.setPauseCtl('Pause', false);
		this.start();
	};

	App.prototype.start = function () {
		this.game.commitRosterManager();
		this.game.populateGameWorld();
		this.game.bindStatusDisplays();
		this.run();
	};

	App.prototype.run = function () {
		this.setPauseCtl('Pause', true);
		this.setStartCtl('Restart', true);
		this.game.enterGameLoop();
	};

	App.prototype.pause = function () {
		this.game.exitGameLoop();
		this.setPauseCtl('Continue', true);
	};

	App.prototype.endGame = function () {
		this.game.exitGameLoop();
		this.setPauseCtl('Pause', false);
		if (ns.TRACE_ON) {
			this.game.objects.agents.forEach((agent) => {
				if (agent.interpreter.doTrace) {
					this.displayTrace(agent);
				}
			});
		} else {
		}
		// We need the following trivial timeout so as to get the final
		// animation frame displayed before we go into what may be a long
		// wait for the the log to display.
		window.setTimeout(this.displayLog.bind(this), 10);
	};

	App.prototype.setStartCtl = function (label, enabled) {
		this.startCtl.innerText = label;
		this.startCtl.disabled = !enabled;
		if (label === 'Start') {
			this.startCtl.onclick = this.start.bind(this);
		} else if (label === 'Restart') {
			this.startCtl.onclick = this.restart.bind(this);
		} else {
			throw new Error(`setStartCtl: Label value (${label}) unrecognized`);
		}
	};

	App.prototype.setPauseCtl = function (label, enabled) {
		this.pauseCtl.innerText = label;
		this.pauseCtl.disabled = !enabled;
		if (label === 'Pause') {
			this.pauseCtl.onclick = this.pause.bind(this);
		} else if (label === 'Continue') {
			this.pauseCtl.onclick = this.run.bind(this);
		} else {
			throw new Error(`setPauseCtl: Label value (${label}) unrecognized`);
		}
	};


	App.prototype.displayLog = function () {
		if (!e_('show-log').checked) {
			return;
		}
		let div = e_('log-div');
		div.innerHTML = `<textarea id="log-display" rows="10" wrap="off" style="width: 90%;"></textarea>`;
		let display = e_('log-display');
		ns.log.display(display);
		//display.append(ns.log);
		display.scrollTop = display.scrollHeight;
		window.scrollTo(0, 0);
	};

	App.prototype.clearLog = function () {
		ns.log.clear();
		e_('log-div').innerHTML = '';
	}

	App.prototype.displayTrace = function (agent) {
		let div = e_('trace-container');
		div.innerHTML = `<textarea id="trace-display" rows="40" cols="72"></textarea>`;
		let display = e_('trace-display');
		let trace = "";
		agent.interpreter.trace.forEach((line) => {
			//console.log(line);
			trace += line + "\n";
		});
		display.value = trace;
	}


	////////////////////////////////////////////////////////////////////////////
	// Game: Main game object.

	function Game(theApp) {
		Object.assign(this, {
			app: theApp,		// Back reference to container
			loopCounter: 0,
			startTime: 0,
			requestId: 0,		// returned from requestAnimationFrame
			objects: {
				map: [],
				agents: [],
				projectiles: [],
			},
			flags: {
				soloMode: false,
			},
		});
		this.rosterManager = null; 
		this.graphics = new Graphics(this);
		this.physics = new Physics(this);
		this.agentFactory = new AgentFactory(this);
	};

	/**
	 * These are constants within a game, but could be considered parameters
	 * of variation between different types of game.
	 */
	Game.const = ns.constants;

	Game.prototype.init = function () {
		this.initializeSubsystems();
		this.createMap();
		this.render();
	};

	Game.prototype.initializeSubsystems = function () {
		this.graphics.initialize();
		this.physics.initialize();
		this.agentFactory.initialize(this.continueInit.bind(this));
		// Async function -- Pass continueInit as a continuation
	};

	/**
	 * Continue subsystems initialization with things that depend on 
	 * agent factory initialization to have finished.
	 */
	Game.prototype.continueInit = function (kitList, imgDict) {
		this.createRosterManager(kitList);
		this.graphics.preLoadImages(imgDict, () => {console.log('images all loaded')});
	}

	Game.prototype.createMap = function () {
		let wd = Game.const.ARENA.WIDTH;
		let ht = Game.const.ARENA.HEIGHT;
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
		let wall = new WallObject(this, properties);
		let body = Physics.wallSegment(x, y, w, h, name, wall);
		this.physics.addBody(body);
		let sprite = this.graphics.createSprite('wall', properties);
		wall.body = body;
		wall.sprite = sprite;
		this.objects.map.push(wall);
	};

	Game.prototype.createRosterManager = function (kitList) {
		let widget = document.getElementsByClassName("status-widget")[0],
				count = Game.const.MAX_ROSTER_SLOTS;
		this.rosterManager = new ns.RosterManager(widget, count, kitList);
		this.rosterManager.createView();
	}

	// Control interface
	// Methods call by the App on UI events
	Game.prototype.populateGameWorld = function () {
		let roster = this.rosterManager.getRoster();
		this.populateTheArena(roster);
		this.render();
	};
	Game.prototype.clearGameWorld = function () {
		this.resetGameData();
		this.physics.reset();
		this.graphics.reset();
		this.graphics.clearViewport();
		this.createMap();
		this.render();
	};
	Game.prototype.resetRosterManager = function () {
		this.rosterManager.reset();
	};
	Game.prototype.commitRosterManager = function () {
		this.rosterManager.acceptSelection();
	};
	Game.prototype.bindStatusDisplays = function () {
		this.populateStatusDisplay();
	};
	Game.prototype.enterGameLoop = function () {
		if (this.objects.agents.length === 1) {
			this.flags.soloMode = true;
		}
		this.loop();
	};
	Game.prototype.exitGameLoop = function () {
		if (this.requestId !== 0) {
			window.cancelAnimationFrame(this.requestId);
		}
	};

	Game.prototype.resetGameData = function () {
		// leave the map alone
		this.objects.walls = [];
		this.objects.agents = [];
		this.objects.projectiles = [];
		this.startTime = 0;
		this.loopCounter = 0;
		this.requestId = 0;
		this.flags.soloMode = false;
		this.agentFactory.reset();
	};

	Game.prototype.populateTheArena = function (roster) {
		let count = roster.length,
				initPosList = scatter(count);		// random positions, not too close
		roster.forEach((type, i) => {
			let agent = this.agentFactory.createAgent(type);
			agent.game = this;
			agent.pos = initPosList[i];
			agent.body = Physics.agentBody(agent);
			this.physics.addBody(agent.body);
			agent.initializeHardware();
			// Generic "sprite" properties, until we get proper sprite support
			// These belong somewhere else now...
			let spriteProperties = {
				name: agent.name,
				type: agent.type,
				baseHue: (360/count) * agent.number,
				pos: agent.pos,
				radius: Game.const.AGENT_RADIUS,
				maxHealth: agent.getMaxHealth(),
				aim: agent.getAim(),
			};
			agent.sprite = this.graphics.createSprite('agent',	spriteProperties);
			this.objects.agents.push(agent);
		});
	};

	/**
	 * Assign initial positions so no one is too close
	 *
	 * Divide the arena up into |agents| rows and columns, and
	 * assign row, col pairs randomly and uniquely.
	 */
	function scatter(n) {
		let rows = Array.from(Array(n).keys());
		let cols = rows.slice();
		Matter.Common.shuffle(rows);
		Matter.Common.shuffle(cols);
		let cw2 = Math.floor(Game.const.ARENA.WIDTH/(2*n)),
				rh2 = Math.floor(Game.const.ARENA.HEIGHT/(2*n)),
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

	Game.prototype.populateStatusDisplay = function () {
		this.objects.agents.forEach((a, i) => {
			this.rosterManager.attachAgent(a, i);
		});
	};

	Game.prototype.createProjectile = function (shooter, pos, vec, energy) {
		let proj = new Projectile(this, pos, vec, energy);
		let properties = {
			name: proj.name,
			shooter: shooter.number,
			pos: pos,
		};
		proj.body = Physics.projectileBody(proj, properties);
		proj.sprite = this.graphics.createSprite('bullet', properties);
		this.physics.addBody(proj.body);
		this.objects.projectiles.push(proj);
	};

	Game.prototype.remainingPlayers = function () {
		return this.objects.agents.filter((a) => a.isNotDead()).length;
	}

	/**
	 * Game acts as a mediator between object logic and other modules.
	 * In this case, we don't want objects to know anything about their
	 * physical bodies, so we mediate getPosition() calls.
	 */
	Game.prototype.getPosition = function (object) {
		if (object.body === null) {
			return object.pos;
		}
		return object.body.position;
	};

	/**
	 * See getPosition, above.
	 */
	Game.prototype.setBodyVelocity = function (object) {
		//let realV = Matter.Vector.mult(velocity, Game.const.CHRONONS_PER_FRAME);
		Matter.Body.setVelocity(object.body, object.drv);
		//let force = Matter.Vector.create(object.drv.x, object.drv.y);
		//Matter.Body.applyForce(object.body, this.getPosition(object), force);
	};

	function aimData(A, B) {
		let posA = A.getPosition(),
				posB = B.getPosition(),
				dx = posB.x - posA.x,
				dy = posB.y - posA.y,
				dist2 = dx * dx + dy * dy,
				dist = Math.sqrt(dist2),
				rad = Math.atan2(dy, dx),
				deg = degrees(rad);
		return {dist: dist, rad: rad, deg: deg};
	}

	/**
	 * Sets observer.hw.agents.data, if there is anything to see at
	 * observer.sight.angle + observer.sight.offset. 
	 * Object returned will be the closest, in case there are 
	 * multiple candidates.
	 */
	Game.prototype.checkSightEvents = function (observer) {
		let scanner = observer.hw.agents;
		scanner.data = null;
		let angle = observer.turret.angle + scanner.angle,
				pos = observer.getPosition(),
				sightRay = a2v(pos, angle, Game.const.SIGHT_DISTANCE);
		let agents = this.objects.agents;
		let candidates = [];
		for (var i = 0; i < agents.length; ++i) {
			let agent = agents[i];
			if (!agent.isNotDead() || observer === agent) {
				continue;
			}
			let C = agent.getPosition(),
					r = Game.const.AGENT_RADIUS;
			if (intersectLineCircle(pos, sightRay, C, r)) {
				candidates.push(agent);
			}
		}
		if (candidates.length === 0) {
			return;
		}
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
		if (argmin) {
			scanner.data = {
				thing: argmin,
				dist: Math.sqrt(min),
			};
		}
	};


	Game.prototype.loop = function () {

		this.requestId = requestAnimationFrame(this.loop.bind(this));

		// Count cycles and elapsed time
		++this.loopCounter;
		if (this.startTime === 0) {
			this.startTime = Date.now();
		} 
		let turnDisplay = e_("turn-number"),
				elapsedTime = (Date.now() - this.startTime)/1000,
				timeDisplay = e_("elapsed-time");
		turnDisplay.innerHTML = this.loopCounter;
		timeDisplay.innerHTML = elapsedTime.toString();
		LOG({
			type: 'frame-boundary', 
			loopCounter: this.loopCounter, 
			elapsedTime: elapsedTime,
		});

		this.update();
		this.logFrameData();
		this.render();
		this.rosterManager.updateView();

		let gameOver = 
			(this.flags.soloMode && this.remainingPlayers() === 0) ||
			(!this.flags.soloMode && this.remainingPlayers() <= 1);
		if (gameOver) {
			this.app.endGame();
			return;
		}

	};

	Game.prototype.update = function () {
		this.physics.update().forEach((task) => this.execute(task));
		this.objects.agents.forEach((agent) => {
			agent.update().forEach((task) => this.execute(task));
		});
		this.objects.projectiles.forEach((proj) => {
			proj.update().forEach((task) => this.execute(task));
		});
	};

	/**
	 * Execute game tasks.
	 */
	Game.prototype.execute = function (task) {
		//console.log("Execute game task", task);
		switch (task.op) {
			case 'agentDied':
				task.agent.onAgentDied();
				this.physics.removeBody(task.agent);
				break;
			case 'agentEliminated':
				task.agent.onAgentEliminated();
				// remove from render loop
				break;
			case 'hit':
				// A weapon hit something -- tell it to assess damage
				task.obj.queueEvent(task);
				break;
			case 'impact':
				// Remove the projectile that impacted something
				// Someday this might trigger an animation and sound...
				this.graphics.removeSprite(task.obj);
				this.physics.removeBody(task.obj);
				task.obj.sprite = null;
				task.obj.body = null;
				// Okay, which projectile do we remove from the objects list?
				let place = this.objects.projectiles.findIndex((p) => p === task.obj);
				if (place === -1) {
					//LOG("Projectile not found among game objects", task.obj.name);
				} else {
					this.objects.projectiles.splice(place, 1);
				}
				task.obj = null;
				break;
			case 'collision':
			case 'wall':
				task.obj.queueEvent(task);
				break;
			default:
				throw new Error(`Unknown task operator (${task.op})`);
		}
	};

	Game.prototype.logFrameData = function () {
		this.objects.projectiles.forEach((p) => p.logFrameData());
		this.objects.agents.forEach((a) => a.logFrameData());
	};

	Game.prototype.render = function () {
		// Pre-Render
		this.objects.map.forEach((wall) => wall.preRender());
		this.objects.projectiles.forEach((p) => p.preRender());
		this.objects.agents.forEach((agent) => agent.preRender());
		this.graphics.clearViewport();
		this.graphics.renderSceneGraph();
	};


	///////////////////////////////////////////////////////////////////////////
	// Walls and other map objects

	function WallObject(game, properties) {
		let p = properties;
		Object.assign(this, {
			game: game,
			name: p.name,
			pos: properties.pos,
			width: properties.width,
			height: properties.height,
		});
	}

	WallObject.prototype.update = function () {
		console.log("WallObject.prototype.update");	// should be unreachable
	};

	WallObject.prototype.preRender = function () {
		this.sprite.preRender(this);
	};

	WallObject.prototype.render = function (gfx) {
		this.sprite.render(gfx);
		// We might want to consider whether we really want to call this on 
		// game loop renders. The walls never change, in this version.
	};

	WallObject.prototype.logFrameData = function () {
		LOG({
			type: 'wall-frame-data',
			pos: this.pos,
			width: this.width,
			height: this.height,
		});
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

	Projectile.prototype.isNotDead = function () {
		return true;
	};

	Projectile.prototype.getPosition = function () {
		// Make sure pos registers are up to date
		let p = this.game.getPosition(this);
		if (p) {
			this.pos.x = p.x; //this.body.position.x;
			this.pos.y = p.y; //this.body.position.y;
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
		this.game.setBodyVelocity(this);
		//Matter.Body.setVelocity(this.body, this.drv);
		return gameTasks;	// we don't generate tasks yet...
	};

	/**
	 * When projectiles handle events, this can lead to tasks for other
	 * game objects (like calculating actual damage, removing this from 
	 * the game, etc.)
	 */
	Projectile.prototype.handleEvent = function (evt, tasks) {
		switch (evt.op) {
			case 'collision':
				tasks.push(createRemoveProjectileTask(this));
				break;
			case 'wall':
				console.log(this.name, "on wall", evt.data.bumped.name);
				tasks.push(createRemoveProjectileTask(this));
				break;
			default:
				throw new Error(`Agent does not recognize event op (${evt.op})`);
		}
	};

	function createRemoveProjectileTask(projectile) {
		return {
			op: 'removeProjectile',
			obj: projectile,
		};
	}

	Projectile.prototype.preRender = function () {
		this.sprite.preRender(this);
	};

	Projectile.prototype.render = function (gfx) {
		this.sprite.render(gfx, this);
	};

	Projectile.prototype.logFrameData = function () {
		LOG({
			type: 'projectile-frame-data',
			pos: this.getPosition(),
		});
	};





	////////////////////////////////////////////////////////////////////////////
	// Physics: A wrapper around the Matter.js physics engine.

	Physics = function (theGame) {
		Object.assign(this, {
			game: theGame,
			tasks: [],
			engine: null,
		});
	};

	Physics.prototype.initialize = function () {
		this.engine = Matter.Engine.create();
		this.engine.world.gravity.y = 0;
		Matter.Events.on(this.engine, 'collisionActive', this.handleCollisions.bind(this));
		Matter.Events.on(this.engine, 'collisionStart', this.handleCollisions.bind(this));
	};

	Physics.prototype.reset = function () {
		Matter.World.clear(this.engine.world);
		Matter.Engine.clear(this.engine);
	};

	Physics.prototype.update = function () {
		// Clear the task list
		this.tasks = [];
		Matter.Engine.update(this.engine, 1000/60);
		// Okay, maybe we have some events to deal with...
		// Event handlers registered with Matter will add tasks to 
		// this.tasks.
		return this.tasks;
	};

	Physics.wallSegment = function (x, y, w, h, name, agent) {
		let body = Matter.Bodies.rectangle(
			x + w/2, y + h/2, w, h,
			{	isStatic: true, label: name });
		// Extend Matter.js body with 'controller', a back-pointer
		body.controller = agent;
		return body;
	};

	Physics.agentBody = function (agent, properties) {
		let body = Matter.Bodies.circle(
			agent.pos.x, agent.pos.y,
			Game.const.AGENT_RADIUS,
			// options:
			{
				density: 1,
				friction: 0,
				frictionAir: 0,
				frictionStatic: 0,
				label: agent.name,
				// restitution: defaults to 0
			});
		// Extend Matter.js body with 'controller', a back-pointer
		body.controller = agent;
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
		body.collisionFilter.group = -1 /** properties.shooter*/;
		return body;
	};

	Physics.prototype.addBody = function (body) {
		Matter.World.add(this.engine.world, body);
	};

	Physics.prototype.removeBody = function (object) {
		if (object === null || object.body === null) {
			return;
		}
		Matter.World.remove(this.engine.world, object.body, true);
		object.body = null;
	};

	/** 
	 * First layer of collision handling. Our physics wrapper gets a chance
	 * to translate the raw physics engine events into something the game
	 * can handle. The next layer outside this is the game itself, which
	 * is able to handle the effects of collisions on objects and their
	 * sprites.
	 */
	Physics.prototype.handleCollisions = function (evt) {
		for (let i = 0; i < evt.pairs.length; ++i) {
			let bodyA = evt.pairs[i].bodyA,
					bodyB = evt.pairs[i].bodyB,
					A = bodyA.controller,
					B = bodyB.controller;

			if (A instanceof Projectile) {
				if (B instanceof Projectile) {
				} else if (isWall(bodyB)) {
					this.tasks.push(mkImpactEvt(A, B));
				} else {
					this.tasks.push(mkImpactEvt(A, B));
					this.tasks.push(mkTakeHitEvt(B, A));
				}
				// Everything else involves agents bumping into things
			} else if (isWall(bodyA)) {
				if (B instanceof Projectile) {
					this.tasks.push(mkImpactEvt(B, A));
				} else {
//					console.log(bodyB.label, "on", bodyA.label);
					this.tasks.push(mkWallEvt(B, A));
				}
			} else {
				if (B instanceof Projectile) {
					this.tasks.push(mkImpactEvt(B, A));
					this.tasks.push(mkTakeHitEvt(A, B));
				} else if (isWall(bodyB)) {
//					console.log(bodyA.label, "on", bodyB.label);
					this.tasks.push(mkWallEvt(A, B));
				} else {
//					console.log(bodyA.label, "collides with", bodyB.label);
					this.tasks.push(mkCollEvt(A, B));
					this.tasks.push(mkCollEvt(B, A));
				}
			}
		}
	};

	function createEvent(type, subject, data) {
		let task = {
			op: type,
			obj: subject,
			data: data,
		};
		return task;
	}

	function mkWallEvt(A, B) {
		return createEvent('wall', A, {bumped: B});
	}

	function mkCollEvt(A, B) {
		return createEvent('collision', A, {bumped: B});
	}

	/**
	 * 'A' is a projectile. The effect of this event should remove
	 * 'A' from the game. Someday there might be a brief smash or
	 * splatter animation... And a noise.
	 */
	function mkImpactEvt(A, B) {
		let task = {
			op: 'impact',
			type: 'projectile',
			obj: A,
			data: {
				hit: B,
			},
		};
		return task;
	}

	/**
	 * 'A' is an agent, 'B' is a weapon of some sort. 'A' needs to
	 * assess damage, given the type of strike.
	 */
	function mkTakeHitEvt(A, B) {
		return {
			op: 'hit',
			type: 'projectile',
			obj: A,
			data: {
				hitBy: B,
			},
		};
	}

	function isWall(body) {
		return body.controller instanceof WallObject;
	}


	// EXPORTS
	ns.App = App;
	ns.TRACE_ON = false;

	return ns;

})(MAGIC || {});


/**
* Start up
*/
window.onload = () => {
	window.scrollTo(0, 0);
	MAGIC.TRACE_ON = true;
	let magic_app = new MAGIC.App();
	magic_app.init();
};

