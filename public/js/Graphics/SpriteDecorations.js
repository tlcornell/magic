//////////////////////////////////////////////////////////////////////////////
// SpriteDecorations.js

var MAGIC = ((ns) => {

	// IMPORTS


	function SpriteDecorations (master) {
		this.name = master.getName();
		this.width = master.getRadius() * 2;
		this.height = 3;
		this.health = this.maxHealth = master.getMaxHealth();
		this.offset = master.getRadius();
		this.x = master.getInitialPosition().x;
		this.y = master.getInitialPosition().y;
	}
	SpriteDecorations.prototype.preRender = function (data) {
		this.x = data.pos.x;
		this.y = data.pos.y;
		this.health = data.getHealth();
	};
	SpriteDecorations.prototype.render = function (ctx) {
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
	SpriteDecorations.prototype.activate = function (sceneGraph) {
		sceneGraph.addChild(['labels'], this.name, this);
	};
	SpriteDecorations.prototype.deactivate = function (sceneGraph) {
		sceneGraph.removeChild(this);
	};


	// EXPORTS
	ns.SpriteDecorations = SpriteDecorations;

	return ns;

})(MAGIC || {});
