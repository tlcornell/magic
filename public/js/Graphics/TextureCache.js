/////////////////////////////////////////////////////////////////////////////
// TextureCache.js

var MAGIC = ((ns) => {

	// IMPORTS

	/**
	 * The index maps sprite keys to image paths,
	 * and the storage maps the paths to actual images.
	 * That way the same image can be used for many different keys.
	 */
	function TextureCache (_gfx) {
		this.storage = {};
		this.index = {};
	}

	TextureCache.prototype.add = function (dictItem) {
		console.log('Cache adding', dictItem);
		this.index[dictItem.key] = dictItem.path;
		if (!this.storage.hasOwnProperty(dictItem.path)) {
			this.storage[dictItem.path] = dictItem.img;
		}
	};

	TextureCache.prototype.get = function (key) {
		return this.storage[this.index[key]];
	};

	// EXPORTS
	ns.TextureCache = TextureCache;

	return ns;

})(MAGIC || {});

