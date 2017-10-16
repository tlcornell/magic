var MAGIC = ((ns) => {

	// IMPORTS
	let SceneGraph = ns.SceneGraph,
			TextureCache = ns.TextureCache,
			Sprite = ns.Sprite,
			GenericAgentSpriteMaster = ns.GenericAgentSpriteMaster,
			Game = ns.Game,
			constants = ns.constants,
			e_ = ns.e_;

	///////////////////////////////////////////////////////////////////////////
	// Graphics Subsystem

	/**
	 * The graphics subsystem. Someday this will probably be a wrapper around
	 * a lower level drawing library like Pixi.js or something.
	 * The main thing we have to do here is to manage a multi-layer canvas
	 * collection, consisting of several canvases layered on top of each other.
	 */
	function Graphics (game) {
		Object.assign(this, {
			game: game,
			width: constants.ARENA.WIDTH,
			height: constants.ARENA.HEIGHT,
			surface: null,
			sceneGraph: new SceneGraph(this),
			cache: new TextureCache(this),
		});
	};

	Graphics.prototype.reset = function () {
		this.sceneGraph = new SceneGraph(this);
	};

	Graphics.prototype.initialize = function () {
		this.el = e_("arena");
		let canvas = document.createElement("canvas");
		canvas.width = this.width;
		canvas.height = this.height;
		this.el.appendChild(canvas);
		this.surface = canvas;
	};

	Graphics.prototype.preLoadImages = function (imgDict, callback) {
		let keys = Object.keys(imgDict),
				remaining = (keys.length);
		keys.forEach((key) => {
			let item = imgDict[key];
			item.img = new Image();
			item.img.onerror = () => {
				console.log(`ERROR: Could not download image ${item.src}`);
				if (--remaining === 0) {
					callback();
				}
			}
			item.img.onload = () => {
				this.cache.add(item);
				if (--remaining === 0) {
					callback();
				}
			};
			item.img.src = item.src;
		});
	};

	Graphics.prototype.getContext = function (layer) {
		return this.surface.getContext('2d');
	};

	/**
	 * Really this should be 'createSpriteMaster'
	 */
	Graphics.prototype.createSprite = function (key, properties) {
		switch (key) {
			case 'agent':
				// if sprites specified for this kit, use them
				// else
				return new GenericAgentSpriteMaster(properties, this);
			case 'bullet':
				return new BulletSprite(properties, this);
			case 'wall':
				return new WallSprite(properties, this);
			default:
				throw Error(`Unrecognized sprite master key: ${key}`);
		}
	};

	Graphics.prototype.getSprite = function (master, key) {
		let spriteImg = this.cache.get(key);
		if (!spriteImg) {
			return null;
		}
		return new Sprite(master, spriteImg);
	}

	Graphics.prototype.removeSprite = function (gameObj) {
		gameObj.sprite.deactivate(this.sceneGraph);
	};

	Graphics.prototype.clearViewport = function () {
		let ctx = this.surface.getContext('2d');
		ctx.clearRect(0, 0, constants.ARENA.WIDTH, constants.ARENA.HEIGHT);
	};

	Graphics.prototype.renderSceneGraph = function () {
		this.sceneGraph.render(this.surface.getContext('2d'));
	};

	Graphics.prototype.activate = function (spriteMaster, spriteKey) {
		spriteMaster.deactivate(this.sceneGraph);
		spriteMaster.activate(spriteKey, this.sceneGraph);
	};



	/**
	 * A SpriteMaster is a drawable that may draw different actual sprites
	 *
	 * The idea is that it controls a collection of graphical resources,
	 * like sprite sheets, and it handles figuring out which is the
	 * current one to draw.
	 * In our current situation, we actually just draw shapes, not
	 * sprites, so it doesn't do much.
	 *
	 * A WallSprite only controls a single sprite, so we collapse the 
	 * SpriteMaster and the Sprite into a single object.
	 */
	function WallSprite(properties, gfx) {
		Object.assign(this, {
			pos: properties.pos,
			width: properties.width,
			height: properties.height,
			name: properties.name,
		});
		this.activate('unused', gfx.sceneGraph);
	};
	WallSprite.prototype.deactivate = function (sceneGraph) {
		// Does nothing
	};
	WallSprite.prototype.activate = function (_, sceneGraph) {
		sceneGraph.addChild(['ground'], this.name, this);
	}
	WallSprite.prototype.preRender = function () {
		// nothing to do
	};
	WallSprite.prototype.render = function (ctx) {
		ctx.fillStyle = "#AAA";
		ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
	};



	/**
	 * Like walls, bullets only have one sprite, so we combine the 
	 * SpriteMaster trait with the Sprite trait.
	 */
	function BulletSprite(properties, gfx) {
		Object.assign(this, properties);
		this.activate('unused', gfx.sceneGraph);
	}
	BulletSprite.prototype.deactivate = function (sceneGraph) {
		sceneGraph.removeChild(this);
	};
	BulletSprite.prototype.activate = function (_whichSprite, sceneGraph) {
		sceneGraph.addChild(['active'], 'bullet', this);
	};
	BulletSprite.prototype.preRender = function (model) {
		this.pos = model.pos;
	};
	BulletSprite.prototype.render = function (ctx) {
		let pos = this.pos;
		ctx.fillStyle = '#444';
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, constants.BULLET_RADIUS, 0, 2 * Math.PI);
		ctx.fill();
	};




	// EXPORTS
	ns.Graphics = Graphics;
	ns.WallSprite = WallSprite;
	ns.BulletSprite = BulletSprite;

	return ns;

})(MAGIC || {});

