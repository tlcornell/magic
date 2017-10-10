var MAGIC = ((ns) => {

	// IMPORTS
	let SceneGraph = ns.SceneGraph,
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
	function Graphics (theGame) {
		Object.assign(this, {
			game: theGame,
			width: constants.ARENA.WIDTH,
			height: constants.ARENA.HEIGHT,
			surface: null,
			sceneGraph: new SceneGraph(this),
		});
	};

	Graphics.prototype.initialize = function () {
		this.el = e_("arena");
		let canvas = document.createElement("canvas");
		canvas.width = this.width;
		canvas.height = this.height;
		this.el.appendChild(canvas);
		this.surface = canvas;
	};

	Graphics.prototype.preLoadImages = function () {
		// not yet implemented
	};

	Graphics.prototype.getContext = function (layer) {
		return this.surface.getContext('2d');
	};

	Graphics.createSprite = function (key, properties) {
		switch (key) {
			case 'agent':
				return new GenericAgentSpriteMaster(properties, this);
			case 'bullet':
				return new BulletSprite(properties, this);
			case 'wall':
				return new WallSprite(properties, this);
			default:
				throw Error(`Unrecognized sprite master key: ${key}`);
		}
	};

	Graphics.prototype.clearViewport = function () {
		let ctx = this.surface.getContext('2d');
		ctx.clearRect(0, 0, constants.ARENA.WIDTH, constants.ARENA.HEIGHT);
	};

	Graphics.prototype.renderSceneGraph = function () {
		this.sceneGraph.render(this.surface.getContext('2d'));
	};

	Graphics.prototype.activate = function (spriteMaster, key) {
		spriteMaster.deactivate(this.sceneGraph);
		spriteMaster.activate(key, this.sceneGraph);
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
	WallSprite.prototype.preRender = function () {
		// nothing to do
	};
	WallSprite.prototype.render = function (gfx) {
		// Walls draw in the GROUND layer, so get the right context
		let ground = Graphics.Layer.GROUND;
		let ctx = gfx.getContext(ground);
		ctx.fillStyle = "#AAA";
		ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
	};




	function BulletSprite(properties) {
		Object.assign(this, properties);
	}
	BulletSprite.prototype.preRender = function (model) {
		this.pos = model.pos;
	};
	BulletSprite.prototype.render = function (gfx, model) {
		let ctx = gfx.getContext(Graphics.Layer.ACTIVE);
		let pos = this.pos;
		ctx.fillStyle = '#444';
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, constants.BULLET_RADIUS, 0, 2 * Math.PI);
		ctx.fill();
	}

	// EXPORTS
	ns.Graphics = Graphics;
	ns.WallSprite = WallSprite;
	ns.BulletSprite = BulletSprite;

	return ns;

})(MAGIC || {});

