////////////////////////////////////////////////////////////////////////////
// Sprite.js
//
// Static image-based (i.e., non-procedural) sprite class.
//

var MAGIC = ((ns) => {

	// IMPORTS

	function Sprite (master, img) {
		this.name = master.getName();
		this.x = master.getInitialPosition().x;
		this.y = master.getInitialPosition().y;
		this.aim = master.getInitialAim();
		this.radius = master.getRadius();
		this.img = img;
		this.w = img.width;
		this.h = img.height;
	}

	Sprite.prototype.preRender = function (model) {
		this.x = model.getPosition().x;
		this.y = model.getPosition().y;
		this.aim = model.getAim();
	};
	Sprite.prototype.render = function (ctx) {
		ctx.drawImage(this.img, this.x - this.w/2, this.y - this.h/2);
	};
	Sprite.prototype.drawPortrait = function (ctx, pos) {
		ctx.drawImage(this.img, pos.x, pos.y);
	};
	Sprite.prototype.activate = function (sceneGraph) {
		sceneGraph.addChild(['active'], this.name, this);
	};
	Sprite.prototype.deactivate = function (sceneGraph) {
		sceneGraph.removeChild(this);
	};

	// EXPORTS
	ns.Sprite = Sprite;

	return ns;

})(MAGIC || {});
