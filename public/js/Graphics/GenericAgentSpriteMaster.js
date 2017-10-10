
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
			portrait: new GenericAgentPortrait(this, gfx),
			notDead: new GenericAgentNotDeadSprite(this, gfx),
			dead: new GenericAgentDeadSprite(this, gfx),
		};
		// BUG: portrait and notDead sprites are not the same. Portrait lacks 
		// decorations, and has a fixed aim
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
		}
	};
	GenericAgentSpriteMaster.prototype.activate = function (key, sceneGraph) {
		this.sprites[key].activate(sceneGraph);
	};
	GenericAgentSpriteMaster.prototype.drawPortrait = function (ctx, pos) {
		this.sprites.portrait.preRender({pos: pos, aim: 0});
		this.sprites.portrait.render(ctx);
		/*
		let hue = this.getBaseHue(),
				stroke = `hsl(${hue}, 50%, 33%)`,
				fill = `hsl(${hue}, 50%, 67%)`,
				angle = 0,
				radius = this.getRadius();
		renderAgentBody(ctx, pos.x, pos.y, radius, stroke, fill);
		renderAgentCannon(ctx, pos.x, pos.y, radius, angle, stroke);
		*/
	};

	function GenericAgentPortrait (master, gfx) {
		this.parts = {
			body: null,
			cannon: null,
		};
		this.createParts(master);
	}
	GenericAgentPortrait.prototype.createParts = function (master) {
		this.parts.body = new GenericAgentBodySprite(master);
		this.parts.cannon = new GenericAgentCannonSprite(master);
	};
	GenericAgentPortrait.prototype.preRender = function (model) {
		Object.keys(this.parts).forEach((part) => part.preRender(model));
	};
	GenericAgentPortrait.prototype.render = function (ctx) {
		Object.keys(this.parts).forEach((part) => part.render(ctx));
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
			cannon: new GenericAgentCannonSprite(master, gfx),
			health: new GenericAgentHealthBarSprite(master, gfx),
			label: new GenericAgentLabelSprite(master, gfx),
		};
	};
	GenericAgentNotDeadSprite.prototype.preRender = function (model) {
		Object.keys(this.parts).forEach((part) => part.preRender(model));
	};
	GenericAgentNotDeadSprite.prototype.deactivate = function (sceneGraph) {
		Object.keys(this.parts).forEach((part) => part.deactivate(sceneGraph));
	};
	GenericAgentNotDeadSprite.prototype.activate = function (sceneGraph) {
		Object.keys(this.parts).forEach((part) => part.activate(sceneGraph));
	};



	function GenericAgentBodySprite (master, gfx) {
		this.baseHue = master.getBaseHue();		// [0,360)
		this.radius = master.getRadius();
		this.x = master.getInitialPosition().x;
		this.y = master.getInitialPosition().y;
	}
	GenericAgentBodySprite.prototype.preRender = function (data) {
		this.x = data.pos.x;
		this.y = data.pos.y;
	};
	GenericAgentBodySprite.prototype.render = function (ctx) {
		let stroke = `hsl(${this.baseHue}, 50%, 33%)`,
				fill = `hsl(${this.baseHue}, 50%, 67%)`;
		renderAgentBody(ctx, this.x, this.y, this.radius, stroke, fill);
	};
	GenericAgentBodySprite.prototype.activate = function (sceneGraph) {
		this.sg_parent = sceneGraph.addChild('active', this);
	};
	GenericAgentBodySprite.prototype.deactivate = function (sceneGraph) {
		this.sg_parent.removeChild(this);
	}

	function GenericAgentCannonSprite (master, gfx) {
		this.length = master.getRadius();
		this.baseHue = master.getBaseHue();
		this.x = master.getInitialPosition().x;
		this.y = master.getInitialPosition().y;
		this.angle = master.getInitialAim();
	}
	GenericAgentCannonSprite.prototype.preRender = function (data) {
		this.x = data.pos.x;
		this.y = data.pos.y;
		this.angle = data.aim;
	};
	GenericAgentCannonSprite.prototype.render = function (ctx) {
		let stroke = `hsl(${this.baseHue}, 50%, 33%)`;
		renderAgentCannon(ctx, this.x, this.y, this.length, this.angle, stroke);
	};

	function GenericAgentHealthBarSprite (master, gfx) {
		this.width = master.getRadius;
		this.height = 3;
		this.health = this.maxHealth = master.getMaxHealth();
		this.offset = master.getRadius();
		this.x = master.getInitialPosition().x - this.offset;
		this.y = master.getInitialPosition().y - this.offset - 8;
	}
	GenericAgentHealthBarSprite.prototype.preRender = function (data) {
		this.x = data.pos.x - this.offset;
		this.y = data.pos.y - this.offset - 8;
		this.health = data.health;
	};
	GenericAgentHealthBarSprite.prototype.render = function (ctx) {
		ctx.fillStyle = 'red';
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.fillStyle = 'green';
		let hp = this.width * (this.health / this.maxHealth);
		ctx.fillRect(this.x, this.y, hp, this.height);
	};

	function GenericAgentLabelSprite (master, gfx) {
		this.name = master.getName();
		this.offset = master.getRadius();
		this.x = master.getInitialPosition().x;
		this.y = master.getInitialPosition().y + this.offset + 12;
	}
	GenericAgentLabelSprite.prototype.preRender = function (data) {
		this.x = data.pos.x;
		this.y = data.pos.y + this.offset + 12;
	};
	GenericAgentLabelSprite.prototype.render = function (ctx) {
		ctx.font = '8px sans';
		ctx.textAlign = 'center';
		ctx.fillStyle = 'black';
		ctx.fillText(this.name, this.x, this.y);
	};

	// EXPORTS
	ns.GenericAgentSpriteMaster = GenericAgentSpriteMaster;

	return ns;

})(MAGIC || {});
