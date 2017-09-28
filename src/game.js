var MAGIC = ((ns) => {

	/*
	ns.RandomEngine = Random.engines.mt19937().autoSeed();
	ns.Real01 = Random.real(0, 1);
	ns.random = function () {
		return ns.Real01(ns.RandomEngine);
	}
	*/
	ns.random = Math.random;

	/////////////////////////////////////////////////////////////////////////
	// Logging

	ns.log = new EventLog();

	function EventLog () {
		this.log = [];
	}

	EventLog.prototype.post = function (event) {
		this.log.push(JSON.stringify(event));
	};

	EventLog.prototype.read = function (item) {
		return this.log[item];
	};

	EventLog.prototype.clear = function () {
		this.log = [];
	}

	EventLog.prototype.display = function (elt) {
		this.log.forEach((item) => elt.append(item + '\n'));
	};

	function LOG (event) {
		ns.log.post(event);
	}


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
			j = Math.floor(ns.random() * (i + 1));
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

	/**
	 * Return the vector from 'pos' at 'angle' with size 'length'.
	 * Angle in radians.
	 */
	function a2v(pos, angle, length) {
		let x = Math.cos(angle) * length + pos.x,
		    y = Math.sin(angle) * length + pos.y;
		return Matter.Vector.create(x, y);
	}

	function vector2angle(x, y) {
		let size2 = x * x + y * y,
				size = Math.sqrt(size2),
				angle = Math.atan2(dy, dx);
		return {r: size, th: angle};
	}

	function randomInt(lo, hi) {
		let rand = Math.floor(ns.random() * (hi - lo + 1));
		rand += lo;
		return rand;
	}

	function randomFloat(lo, hi) {
		let rand = ns.random() * (hi - lo);
		rand += lo;
		return rand;
	}

	function randomRadian() {
		return ns.random() * 2 * Math.PI;
	}

	function round(num) {
		if (num >= 0) {
			return Math.floor(num);
		} else {
			return Math.ceil(num);
		}
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

	let App = function () {
		this.resetCtl = e_('reset');
		this.startCtl = e_('start'); 
		this.pauseCtl = e_('pause'); 
		// 'Pause' may be replaced by keyboard controls, 
		// so it wouldn't be a visible UI control any more...
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
	};

	/**
	 * These are constants within a game, but could be considered parameters
	 * of variation between different types of game.
	 */
	Game.const = {
		AGENT_RADIUS: 15,
		BULLET_RADIUS: 2,
		BUMP_DAMAGE: 1,
		MAX_ROSTER_SLOTS: 6,
		SIGHT_DISTANCE: 1024,	// size of arena diagonal, apparently
		WALL_DAMAGE: 5,
		WALL_THICKNESS: 20,
		arena: {
			width: 800,
			height: 640,
		},
	};

	Game.prototype.init = function () {
		this.initializeSubsystems();
		this.createMap();
		this.render();
	};

	Game.prototype.initializeSubsystems = function () {
		this.graphics.initialize();
		this.physics.initialize();
		this.createRosterManager();
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
		let wall = new WallObject(this, properties);
		let body = Physics.wallSegment(x, y, w, h, name, wall);
		this.physics.addBody(body);
		let sprite = Graphics.createSprite('wall', properties);
		wall.body = body;
		wall.sprite = sprite;
		this.objects.map.push(wall);
	};

	Game.prototype.createRosterManager = function () {
		let widget = document.getElementsByClassName("status-widget")[0],
				count = Game.const.MAX_ROSTER_SLOTS;
		this.rosterManager = new ns.RosterManager(widget, count);
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
	};

	Game.prototype.populateTheArena = function (roster) {
		this.createAgents(roster);
	};

	Game.prototype.createAgents = function (roster) {
		let count = roster.length;
		let initPosList = scatter(count);		// random positions, not too close
		roster.forEach((type, i) => {
			let ord = i + 1;
			let properties = {
				name: `${type} #${ord}`,
				number: ord,
				color: ((360/count) % 360) * i,
				type: 'agent/generic',
				sourceCode: ns.samples[type],
				pos: initPosList[i],
				radius: Game.const.AGENT_RADIUS,
				hw: this.selectLoadout(type),
			};
			this.createAgent(properties);
		});
	};

	Game.prototype.selectLoadout = function (agentType) {
		switch (agentType) {
			case 'GunTurret':
				return {
					cpu: 40,
					energy: 40,
					damage: 150,
					shields: 30,
				};
			case 'ModifiedShotBot':
				return {
					cpu: 20,
					energy: 20,
					damage: 100,
					shields: 30,
				};
			case 'Navigator':
				return {
					cpu: 20,
					energy: 20,
					damage: 100,
					shields: 30,
				};
			case 'WallBouncer':
				return {
					cpu: 20,
					energy: 20,
					damage: 300,
					shields: 30,
				};
			default:
				return {
					cpu: 20,
					energy: 20,
					damage: 100,
					shields: 30,
				};
		}
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
	 * In this function, we create a sprite master with a generic 'agent' 
	 * key. In real life, the key would be the name of a particular bot,
	 * and would connect it to the sprite sheets for that character.
	 */
	Game.prototype.createAgent = function (properties) {
		let agent = new GenericAgent(this, properties);
		agent.number = properties.number;
		agent.body = Physics.agentBody(agent, properties);
		agent.sprite = Graphics.createSprite('agent',	properties);
		agent.sourceCode = properties.sourceCode; 
		ns.Compiler.compile(agent);	// --> agent.program
		agent.interpreter = new ns.Interpreter(agent);
		this.physics.addBody(agent.body);
		this.objects.agents.push(agent);
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
		proj.sprite = Graphics.createSprite('bullet', properties);
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
	 * Sets observer.sight.thing if there is anything to see at
	 * observer.sight.angle + observer.sight.offset. 
	 * Object returned will be the closest, in case there are 
	 * multiple candidates.
	 */
	Game.prototype.checkSightEvents = function (observer) {
		observer.sight.thing = null;
		let angle = observer.sight.angle + observer.sight.offset,
				pos = observer.getPosition(),
				sightRay = a2v(pos, angle, Game.const.SIGHT_DISTANCE);
		let agents = this.objects.agents;
		let candidates = [];
		for (var i = 0; i < agents.length; ++i) {
			let agent = agents[i];
			if (!agent.isNotDead() || observer === agent) {
				continue;
			}
			let debug = aimData(observer, agent),
					dbgWhere = a2v(pos, angle, debug.dist);
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
		observer.sight.thing = argmin;
		observer.sight.dist = Math.sqrt(min);
		
		if (observer.sight.thing !== null) {
			observer.onSight();
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
				task.agent.setState(Q_DEAD);
				task.agent.deathCounter = 200;
				this.physics.removeBody(task.agent);
				break;
			case 'agentEliminated':
				task.agent.setState(Q_ELIMINATED);
				// remove from render loop
				break;
			case 'hit':
				// A weapon hit something -- tell it to assess damage
				task.obj.queueEvent(task);
				break;
			case 'impact':
				// Remove the projectile that impacted something
				// Someday this might trigger an animation and sound...
				this.physics.removeBody(task.obj);
				// Okay, which projectile do we remove from the objects list?
				let place = this.objects.projectiles.findIndex((p) => p === task.obj);
				if (place === -1) {
					//LOG("Projectile not found among game objects", task.obj.name);
				} else {
					this.objects.projectiles.splice(place, 1);
					// don't render
					task.obj.sprite = null;
					// don't do any physics
					task.obj.body = null;
				}
				break;
			case 'interrupt':
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
		//if (this.norender) return;	// for debugging
		this.graphics.clearViewport();
		this.objects.map.forEach((wall) => wall.render(this.graphics));
		this.objects.projectiles.forEach((p) => p.render(this.graphics));
		this.objects.agents.forEach((agent) => agent.render(this.graphics));
	};

	///////////////////////////////////////////////////////////////////////////
	// Agents
	
	const Q_NOT_DEAD = 3;
	const Q_DEAD = 4;
	const Q_ELIMINATED = 5;

	/**
	 * Properties assignable from outside include:
	 *
	 * name: robot identifier
	 * pos: initial position
	 * -- Hardware/Loadout --
	 * cpu: CPU speed bought from the hardware store
	 * energy: Max energy
	 * health: Sustainable damage
	 * -- Not Yet Supported --
	 * shields: Max shields (at normal drain rates)
	 * weapon: Currently only plain bullets are supported
	 */
	function GenericAgent(game, properties) {
		let a0 = randomRadian();
		Object.assign(this, {
			game: game,
			name: properties.name,
			eventQueue: [],
			state: Q_NOT_DEAD,
			// "Hardware Registers"
			pos: properties.pos,
			cpuSpeed: properties.hw.cpu,
			energy: properties.hw.energy,
			maxEnergy: properties.hw.energy,
			fire: 0,
			health: properties.hw.damage,
			maxHealth: properties.hw.damage,
			shields: properties.hw.shields,
			maxShields: properties.hw.shields,
			drv: {
				x: 0,
				y: 0,
			},
			sight: {
				angle: 0,
				offset: 0,
				thing: null,
				dist: 0,
			},
			wall: 0,
		});
		this.prog = {
			main: beNotDead,
		};
	}

	GenericAgent.prototype.isNotDead = function () {
		return this.getState() === Q_NOT_DEAD;
	};

	GenericAgent.prototype.isDead = function () {
		return this.getState() === Q_DEAD;
	};

	GenericAgent.prototype.isEliminated = function () {
		return this.getState() === Q_ELIMINATED;
	};

	GenericAgent.prototype.getCondition = function () {
		switch (this.getState()) {
			case Q_NOT_DEAD:
				return 'GOOD';
			case Q_DEAD:
			case Q_ELIMINATED:
				return 'DEAD';
			default:
				return 'UNKNOWN';
		}
	}

	GenericAgent.prototype.getName = function () {
		return this.name;
	};

	GenericAgent.prototype.getPosition = function () {
		// Make sure pos registers are up to date
		let p = this.game.getPosition(this);	// delegates to Game.Physics
		if (p) {
			this.pos.x = p.x;
			this.pos.y = p.y;
			/*
			this.pos.x = this.body.position.x;
			this.pos.y = this.body.position.y;
			*/
		}
		return this.pos;
	};

	GenericAgent.prototype.getPosX = function () {
		return this.getPosition().x;
	};

	GenericAgent.prototype.getPosY = function () {
		return this.getPosition().y;
	};

	/** 
	* Return contents of AIM register, which are natively in radians.
	*/
	GenericAgent.prototype.getAim = function () {
		return this.sight.angle;
	};

	GenericAgent.prototype.getAimDegrees = function () {
		return degrees(this.getAim());
	};

	GenericAgent.prototype.setAim = function (rad) {
		this.sight.angle = rad;
		this.checkSightEvents();
	};

	GenericAgent.prototype.setAimDegrees = function (deg) {
		this.setAim(radians(deg));
	};

	GenericAgent.prototype.setAimVector = function (vec) {
		let angle = Matter.Vector.angle(this.getPosition(), vec);
		this.setAim(angle);
	};

	GenericAgent.prototype.getLookDegrees = function () {
		return degrees(this.sight.offset);
	}

	GenericAgent.prototype.setLook = function (rad) {
		this.vision.offset = rad;
		this.checkSightEvents();
	}

	GenericAgent.prototype.setLookDegrees = function (deg) {
		this.setLook(radians(deg));
	}

	GenericAgent.prototype.getSightDist = function () {
		if (this.sight.dist) {
			return this.sight.dist;
		} else {
			return 0;
		}
	};

	GenericAgent.prototype.getCPU = function () {
		return this.cpuSpeed;
	}

	GenericAgent.prototype.getBulletEnergy = function () {
		return this.fire;
	}

	GenericAgent.prototype.addBulletEnergy = function (e) {
		this.fire += e;
		this.energy -= e;
	}

	GenericAgent.prototype.clearBulletEnergy = function () {
		this.fire = 0;
	}

	GenericAgent.prototype.getEnergy = function () {
		return this.energy;
	}

	GenericAgent.prototype.rechargeEnergy = function () {
		this.energy = Math.min(this.maxEnergy, this.energy + 2);
	}

	GenericAgent.prototype.getMaxEnergy = function () {
		return this.maxEnergy;
	}

	GenericAgent.prototype.getHealth = function () {
		return this.health;
	};

	GenericAgent.prototype.setHealth = function (amt) {
		this.health = Math.max(amt, 0);
	}

	GenericAgent.prototype.removeHealth = function (amt) {
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

	GenericAgent.prototype.getMaxHealth = function () {
		return this.maxHealth;
	};

	GenericAgent.prototype.getShields = function () {
		return this.shields;
	}

	GenericAgent.prototype.getMaxShields = function () {
		return this.maxShields;
	}


	////////////////////////////////////////////////////////////////////////
	// Course Control
	//
	// There are two ways to control movement: using vectors (dx,dy), 
	// or using polar-style coordinates (radius, azimuth) (here called (r, th)).
	// 
	// The primitive control data is conveyed to the physics system via the
	// 'drv' property (drv:{x,y}), for "drive".
	// So all API calls ultimately boil down to setting drv.x and drv.y.
	// 

	GenericAgent.prototype.getSpeedX = function () {
		return this.drv.x;
	};

	GenericAgent.prototype.setSpeedX = function (dx) {
		this.setVelocity(dx, this.drv.y);
	}

	GenericAgent.prototype.getSpeedY = function () {
		return this.drv.y;
	};

	GenericAgent.prototype.setSpeedY = function (dy) {
		this.setVelocity(this.drv.x, dy);
	};

	/**
	 * This is the core method that all other API calls should reduce to.
	 * That will assure that energy costs are assessed uniformly.
	 */
	GenericAgent.prototype.setVelocity = function (dx, dy) {
		let dx0 = this.drv.x,
				xcost = Math.abs(dx - dx0),
				dy0 = this.drv.y,
				ycost = Math.abs(dy - dy0),
				cost = Math.round(xcost + ycost);
		this.energy -= cost;
		this.energy = Math.min(this.maxEnergy, this.energy);
		this.drv.x = dx;
		this.drv.y = dy;
	};

	/**
	 * Return {r, th}, where th (the azimuth) is in degrees, converted 
	 * from radians. So this is meant for clients, not internal use,
	 * which should maingain all angles in radians.
	 */
	GenericAgent.prototype.getHeading = function () {
		let hdg = vector2angle(this.drv.x, this.drv.y),
				deg = degrees(hdg.th);
		return {r: hdg.r, th: deg};
	};

	GenericAgent.prototype.setHeading = function (r, th) {
		let vec = angle2vector(th, r);
		this.setVelocity(vec.x, vec.y);
	};

	//
	// End of course control
	//////////////////////////////////////////////////////////////////////////


	GenericAgent.prototype.getWall = function () {
		return this.wall;
	}

	GenericAgent.prototype.getState = function () {
		return this.state;
	};

	GenericAgent.prototype.setState = function (qNew) {
		this.state = qNew;
	};

	GenericAgent.prototype.fireWeapons = function () {
		let payload = this.getBulletEnergy(),
				angle = this.getAim();
		// Cap the energy payload at this agent's available energy
		//payload = Math.min(this.getEnergy(), payload);
		if (payload > 0) {
			this.launchProjectile(angle, payload);
			this.clearBulletEnergy();
		}
		// No other attacks supported at this time
	}

	GenericAgent.prototype.launchProjectile = function (angle, energy) {
		let norm = angle2vector(angle, 1),	// direction of shot
				drv = Matter.Vector.mult(norm, 12),	// scale by velocity
				offset = Matter.Vector.mult(norm, Game.const.AGENT_RADIUS + 1), // start outside of shooter bot
				pos = Matter.Vector.add(this.getPosition(), offset);
		this.game.createProjectile(this, pos, drv, energy);
	}

	GenericAgent.prototype.update = function () {

		let generatedTasks = [];

		// Handle event notifications (event queue) for "external" events 
		// coming in from the Game object.
		// Right now there's no prioritization; it's just a flat list
		this.wall = 0;
		this.sight.dist = 0;
		this.sight.thing = null;
		this.eventQueue.forEach((evt) => this.handleEvent(evt));
		this.eventQueue = [];
		// Trigger events if warranted (e.g., we just died)
		// We might add some generated tasks here.

		this.prog.main.call(this, generatedTasks);

		return generatedTasks;

	};

	/**
	 * This is the main agent state, where we run an interpreter over
	 * the agent control program. This wrapper handles tasks that must
	 * be executed before and after the actual interpreter cycle.
	 */
	let beNotDead = function (gameTasks) {
		if (this.getHealth() === 0) {
			gameTasks.push({
				op: 'agentDied',
				agent: this,
			});
			this.prog.main = beDead;
		} else {

			this.rechargeEnergy();
			// Even without interrupts, we need to do this in case a bot
			// has moved into our sights.
			this.checkSightEvents();

			//---------------------------------------------------
			// This is where the bot program gets advanced
			// (While the bot has any energy)

			for (var i = 0; i < this.getCPU(); ++i) {
				if (this.getEnergy() > 0) {
					this.interpreter.step();
					if (this.interpreter.syncFlag) {
						this.interpreter.syncFlag = false;
						break;
					}
				}
			}

			// End of bot program cycle (i.e., end of chronon?)
			//---------------------------------------------------		

			// If any energy has been stored in a weapon register,
			// fire that weapon now.
			//this.fireWeapons();
			
			if (this.getEnergy() > 0) {
				this.game.setBodyVelocity(this);
			}
		}
	};

	let beDead = function (gameTasks) {
		if (--this.deathCounter === 0) {
			gameTasks.push({
				op: 'agentEliminated',
				agent: this,
			});
			this.prog.main = beEliminated;
		}
	}

	let beEliminated = function (gameTasks) {
	}

	GenericAgent.prototype.onSight = function () {
		let seen = this.sight.thing;
//		console.log(this.name, "sees", seen.name);
		let p1 = this.getPosition(),
				p2 = seen.getPosition();
		//this.game.graphics.drawLine(p1, p2);
		//this.game.togglePaused();
	};

	GenericAgent.prototype.checkSightEvents = function () {
		this.game.checkSightEvents(this);
	};

	GenericAgent.prototype.queueEvent = function (evt) {
		this.eventQueue.push(evt);
	};

	GenericAgent.prototype.render = function (gfx) {
		this.sprite.render(gfx, this);
	};

	GenericAgent.prototype.logFrameData = function () {
		LOG({
			type: 'agent-frame-data',
			name: this.getName(),
			pos: this.getPosition(),
			sprite: {
				radius: this.sprite.radius,
				color: this.sprite.color,
				aim: this.getAim(),
			},
			health: this.getHealth(),
			maxHealth: this.getMaxHealth(),
			state: this.getState(),
			energy: this.getEnergy(),
			shields: this.getShields(),
			condition: this.getCondition(),
		});
	};

	GenericAgent.prototype.handleEvent = function (evt) {
//		console.log(this.name, "handleEvent", evt);
		switch (evt.op) {
			case 'interrupt':
				this.handleInterrupt(evt);
				break;
			case 'hit':
				this.projectileImpact(evt.data.hitBy);
				break;
			default:
				throw new Error(`Agent does not recognize event operator (${evt.op})`);
		}
	};

	GenericAgent.prototype.handleInterrupt = function (evt) {
		switch (evt.type) {
			case 'collision':
				this.environmentalDamage(Game.const.BUMP_DAMAGE);
				// TODO: Raise in-collision condition, maybe triggering an interrupt
				// in the interpreter
				break;
			case 'wall':
				this.environmentalDamage(Game.const.WALL_DAMAGE);
				this.raiseWallCondition(evt);
				// TODO: Maybe trigger an interrupt in the interpreter?
				break;
			default:
				throw new Error(`Agent does not recognize event type (${evt.type})`);
		}
	};

	GenericAgent.prototype.raiseWallCondition = function (evt) {
		let name = evt.data.bumped.name;
		switch (name) {
			case 'NORTH':
				this.wall = 1;
				break;
			case 'WEST':
				this.wall = 2;
				break;
			case 'SOUTH':
				this.wall = 3;
				break;
			case 'EAST':
				this.wall = 4;
				break;
			default:
				throw new Error(`raiseWallCondition: Unknown wall '${name}'`);
		}
	};

	GenericAgent.prototype.environmentalDamage = function (rawDmg) {
		// Theoretically, we could have factors like shields and armor that
		// lessen the effect of the impact. 
		// For now, we just assess the full raw damage.
		this.removeHealth(rawDmg);
	};

	GenericAgent.prototype.projectileImpact = function (projectile) {
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
			pos: properties.pos,
			width: properties.width,
			height: properties.height,
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
		switch (evt.type) {
			case 'collision':
				tasks.push(createRemoveProjectileTask(this));
				break;
			case 'wall':
				console.log(this.name, "on wall", evt.data.bumped.name);
				tasks.push(createRemoveProjectileTask(this));
				break;
			default:
				throw new Error(`Agent does not recognize event type (${evt.type})`);
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

	Projectile.prototype.logFrameData = function () {
		LOG({
			type: 'projectile-frame-data',
			pos: this.getPosition(),
		});
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
			case 'agent':
				return new GenericAgentSprite(properties);
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


	function GenericAgentSprite(properties) {
		Object.assign(this, properties);
	}

	/**
	 * This is tricky, because the layer(s) we draw to varies with the
	 * state of the agent model.
	 */
	GenericAgentSprite.prototype.render = function (gfx, model) {
		let radius = Game.const.AGENT_RADIUS,
				name = model.getName(),
				pos = model.getPosition(),
				aim = model.getAim(),
				health = model.getHealth(),
				maxHealth = model.getMaxHealth();
		if (model.isNotDead()) {
			let ctx = gfx.getContext(Graphics.Layer.ACTIVE);
			this.renderBodyCannon(ctx, pos, aim);
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

	GenericAgentSprite.prototype.renderBodyCannon = function (ctx, pos, aim) {
		let radius = this.radius,
				stroke = `hsl(${this.color}, 50%, 33%)`,
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
	}


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
			properties.pos.x, properties.pos.y,
			Game.const.AGENT_RADIUS,
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
	ns.round = round;

	return ns;

})(MAGIC || {});


/**
* Start up
*/
window.onload = () => {
	window.scrollTo(0, 0);
	let magic_app = new MAGIC.App();
	magic_app.init();
};

