
var MAGIC = ((ns) => {

	// IMPORTS
	let SpriteDecorations = ns.SpriteDecorations;


	function renderAgentBody (ctx, x, y, r, stroke, fill) {
		ctx.strokeStyle = stroke;
		ctx.fillStyle = fill;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, 2 * Math.PI);
		ctx.fill();
		ctx.stroke();
	}

	function renderAgentCannon (ctx, x, y, length, angle, stroke) {
		ctx.strokeStyle = stroke;
		ctx.moveTo(x, y);
		let x2 = x + (length * Math.cos(angle)),
				y2 = y + (length * Math.sin(angle));
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	function GenericAgentSpriteMaster (props, gfx) {
		this.properties = props;		// parent reference
		this.sprites = {
			notDead: gfx.getSprite(this, `${props.type}/notDead`) 
				|| new GenericAgentNotDeadSprite(this, gfx),
			portrait: gfx.getSprite(this, `${props.type}/portrait`) 
				|| gfx.getSprite(this, `${props.type}/notDead`)
				|| new GenericAgentNotDeadSprite(this, gfx),
			dead: gfx.getSprite(this, `${props.type}/dead`) 
				|| new GenericAgentDeadSprite(this, gfx),
		};
		this.decorations = new SpriteDecorations(this);
		this.currentSprite = null; // set this by calling `activate(spriteKey)`
	}
	GenericAgentSpriteMaster.prototype.preRender = function (model) {
		if (this.currentSprite) this.currentSprite.preRender(model);
		if (this.decorations) this.decorations.preRender(model);
	};
	GenericAgentSpriteMaster.prototype.getName = function () {
		return this.properties.name;
	};
	GenericAgentSpriteMaster.prototype.getBaseHue = function () {
		return this.properties.baseHue;
	};
	GenericAgentSpriteMaster.prototype.getRadius = function () {
		return this.properties.radius;
	}
	GenericAgentSpriteMaster.prototype.getMaxHealth = function () {
		return this.properties.maxHealth;
	}
	GenericAgentSpriteMaster.prototype.getInitialPosition = function () {
		return this.properties.pos;
	};
	GenericAgentSpriteMaster.prototype.getInitialAim = function () {
		return this.properties.aim;
	};
	GenericAgentSpriteMaster.prototype.deactivate = function (sceneGraph) {
		if (this.currentSprite) {
			this.currentSprite.deactivate(sceneGraph);
			this.currentSprite = null;
		}
		this.decorations.deactivate(sceneGraph);
		// REVIEW: That needs to be idempotent, so make sure we have that property.
	};
	GenericAgentSpriteMaster.prototype.activate = function (key, sceneGraph) {
		this.sprites[key].activate(sceneGraph);
		this.currentSprite = this.sprites[key];
		if (key === 'notDead') {
			this.decorations.activate(sceneGraph);
		}
	};
	GenericAgentSpriteMaster.prototype.drawPortrait = function (ctx, pos) {
		this.sprites.portrait.preRender({
			getPosition: () => pos, 
			getAim: () => 0,
		});
		this.sprites.portrait.render(ctx);
	};



	function GenericAgentDeadSprite (master, gfx) {
		this.name = master.getName();
		this.radius = master.getRadius();
	}
	GenericAgentDeadSprite.prototype.preRender = function (model) {
		this.x = model.getPosition().x;
		this.y = model.getPosition().y;
		this.angle = model.getAim();
	};
	GenericAgentDeadSprite.prototype.render = function (ctx) {
		renderAgentBody(ctx, this.x, this.y, this.radius, '#888', '#AAA');
		renderAgentCannon(ctx, this.x, this.y, this.radius, this.angle, '#888');
		let lblX = this.x,
				lblY = this.y + this.radius + 12;
		ctx.font = '8px sans';
		ctx.textAlign = 'center';
		ctx.fillStyle = '#888';
		ctx.fillText(this.name, lblX, lblY);
	};
	GenericAgentDeadSprite.prototype.deactivate = function (sceneGraph) {
		sceneGraph.removeChild(this);
	};
	GenericAgentDeadSprite.prototype.activate = function (sceneGraph) {
		sceneGraph.addChild(['ground'], this.name, this);
	};




	function GenericAgentNotDeadSprite (master, gfx) {
		this.name = master.getName();
		this.baseHue = master.getBaseHue();		// [0,360)
		this.radius = master.getRadius();
		this.x = master.getInitialPosition().x;
		this.y = master.getInitialPosition().y;
		this.length = this.radius;
		this.angle = master.getInitialAim();
	}
	GenericAgentNotDeadSprite.prototype.preRender = function (model) {
		this.x = model.getPosition().x;
		this.y = model.getPosition().y;
		this.angle = model.getAim();
	};
	GenericAgentNotDeadSprite.prototype.render = function (ctx) {
		let stroke = `hsl(${this.baseHue}, 50%, 33%)`,
				fill = `hsl(${this.baseHue}, 50%, 67%)`;
		renderAgentBody(ctx, this.x, this.y, this.radius, stroke, fill);
		renderAgentCannon(ctx, this.x, this.y, this.length, this.angle, stroke);
	};
	GenericAgentNotDeadSprite.prototype.activate = function (sceneGraph) {
		sceneGraph.addChild(['active'], this.name, this);
	};
	GenericAgentNotDeadSprite.prototype.deactivate = function (sceneGraph) {
		sceneGraph.removeChild(this);
	};



	// EXPORTS
	ns.GenericAgentSpriteMaster = GenericAgentSpriteMaster;

	return ns;

})(MAGIC || {});
