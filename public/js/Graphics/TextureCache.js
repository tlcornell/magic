/////////////////////////////////////////////////////////////////////////////
// TextureCache.js

var MAGIC = ((ns) => {

	// IMPORTS

	function TextureCache (_gfx) {
		this.storage = {};
	}

	TextureCache.prototype.add = function (dictItem) {
		console.log('Cache adding', dictItem);
		this.storage[dictItem.key] = dictItem.img;
	};

	TextureCache.prototype.get = function (key) {
		return this.storage[key];
	}

	// EXPORTS
	ns.TextureCache = TextureCache;

	return ns;

})(MAGIC || {});

