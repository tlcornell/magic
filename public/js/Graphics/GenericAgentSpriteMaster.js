
var MAGIC = ((ns) => {

	// IMPORTS

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
		// REVIEW: Note that pos is not a permanant property, unlike the others.
		// It really just means "initial position", which is mostly useless.
		this.sprites = {
			portrait: new GenericAgentBodySprite(this, gfx),
			notDead: new GenericAgentNotDeadSprite(this, gfx),
			dead: new GenericAgentDeadSprite(this, gfx),
		};
		this.currentSprite = null; // set this by calling `activate(spriteKey)`
	}
	GenericAgentSpriteMaster.prototype.preRender = function (model) {
		this.currentSprite.preRender(model);
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
	};
	GenericAgentSpriteMaster.prototype.activate = function (key, sceneGraph) {
		this.sprites[key].activate(sceneGraph);
		this.currentSprite = this.sprites[key];
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
	};
	GenericAgentDeadSprite.prototype.deactivate = function (sceneGraph) {
		sceneGraph.removeChild(this);
	};
	GenericAgentDeadSprite.prototype.activate = function (sceneGraph) {
		sceneGraph.addChild(['ground'], this.name, this);
	};

	/**
	 * An example of a composite sprite. 
	 *
	 * Also procedural, if we consider that a sprite can inherit proceduralness
	 * when all its parts are procedural.
	 */
	function GenericAgentNotDeadSprite (master, gfx) {
		this.parts = {
			body: new GenericAgentBodySprite(master, gfx),
			deco: new GenericAgentDecorationsSprite(master, gfx),
		};
	};
	GenericAgentNotDeadSprite.prototype.preRender = function (model) {
		this.parts.body.preRender(model);
		this.parts.deco.preRender(model);
	};
	GenericAgentNotDeadSprite.prototype.deactivate = function (sceneGraph) {
		this.parts.body.deactivate(sceneGraph);
		this.parts.deco.deactivate(sceneGraph);
	};
	GenericAgentNotDeadSprite.prototype.activate = function (sceneGraph) {
		this.parts.body.activate(sceneGraph);
		this.parts.deco.activate(sceneGraph);
	};



	function GenericAgentBodySprite (master, gfx) {
		this.baseHue = master.getBaseHue();		// [0,360)
		this.radius = master.getRadius();
		this.x = master.getInitialPosition().x;
		this.y = master.getInitialPosition().y;
		this.length = this.radius;
		this.angle = master.getInitialAim();
	}
	GenericAgentBodySprite.prototype.preRender = function (model) {
		this.x = model.getPosition().x;
		this.y = model.getPosition().y;
		this.angle = model.getAim();
	};
	GenericAgentBodySprite.prototype.render = function (ctx) {
		let stroke = `hsl(${this.baseHue}, 50%, 33%)`,
				fill = `hsl(${this.baseHue}, 50%, 67%)`;
		renderAgentBody(ctx, this.x, this.y, this.radius, stroke, fill);
		renderAgentCannon(ctx, this.x, this.y, this.length, this.angle, stroke);
	};
	GenericAgentBodySprite.prototype.activate = function (sceneGraph) {
		sceneGraph.addChild(['active'], this.name, this);
	};
	GenericAgentBodySprite.prototype.deactivate = function (sceneGraph) {
		sceneGraph.removeChild(this);
	};

	function GenericAgentDecorationsSprite (master, gfx) {
		this.name = master.getName();
		this.width = master.getRadius() * 2;
		this.height = 3;
		this.health = this.maxHealth = master.getMaxHealth();
		this.offset = master.getRadius();
		this.x = master.getInitialPosition().x /*- this.offset*/;
		this.y = master.getInitialPosition().y /*- this.offset - 8*/;
	}
	GenericAgentDecorationsSprite.prototype.preRender = function (data) {
		this.x = data.pos.x /*- this.offset*/;
		this.y = data.pos.y /*- this.offset - 8*/;
		this.health = data.health;
	};
	GenericAgentDecorationsSprite.prototype.render = function (ctx) {
		let barX = this.x - this.offset,
				barY = this.y - this.offset - 8,
				lblX = this.x,
				lblY = this.y + this.offset + 12;
		ctx.fillStyle = 'red';
		ctx.fillRect(barX, barY, this.width, this.height);
		ctx.fillStyle = 'green';
		let hp = this.width * (this.health / this.maxHealth);
		ctx.fillRect(barX, barY, hp, this.height);
		ctx.font = '8px sans';
		ctx.textAlign = 'center';
		ctx.fillStyle = 'black';
		ctx.fillText(this.name, lblX, lblY);
	};
	GenericAgentDecorationsSprite.prototype.activate = function (sceneGraph) {
		sceneGraph.addChild(['labels'], this.name, this);
	};
	GenericAgentDecorationsSprite.prototype.deactivate = function (sceneGraph) {
		sceneGraph.removeChild(this);
	};


	// EXPORTS
	ns.GenericAgentSpriteMaster = GenericAgentSpriteMaster;

	return ns;

})(MAGIC || {});
