////////////////////////////////////////////////////////////////////////////
// SceneGraph.js

var MAGIC = ((ns) => {

	// IMPORTS



	function SceneGraphNode (parent, key, sprite) {
		this.parent = parent;
		this.first = null;
		this.last = null;
		this.next = null;
		this.prev = null;
		this.sprite = sprite || null;
		this.key = key || "";
		this.index = -1;
	}

	SceneGraphNode.prototype.iterate = function (f) {
		for (let n = this.first; n !== null; n = n.next) {
			f(n);
		}
	};
	/**
	 * Note that we never examine the key of the root node.
	 * This means we can write ['ground'] instead of ['root', 'ground'].
	 * Since all paths must start with 'root', it seems tedious and redundant
	 * to have to speicify it.
	 *
	 * @keypath: an array of strings
	 */
	SceneGraphNode.prototype._find = function (keypath) {
		if (keypath.length === 0) {
			return [this];
		}
		let key = keypath.shift();
		for (let n = this.first; n !== null; n = n.next) {
			if (n.key === key) {
				let found = n._find(keypath);
				if (found.length > 0) {
					return found;
				}
			}
		}
		return [];
	};

	SceneGraphNode.prototype.render = function (ctx) {
		if (this.sprite) this.sprite.render(ctx);
		this.iterate((node) => node.render(ctx));
	};
	SceneGraphNode.prototype.clear = function () {
		this.next 
		= this.prev 
		= this.first 
		= this.last 
		= this.parent 
		= this.sprite 
		= null;
		this.key = "";
		// Leave this.index alone -- it should remain valid
	};
	/**
	 * @child is a scene graph node
	 */
	SceneGraphNode.prototype.addChild = function (child) {
		// 1. Empty list
		if (!this.first) {
			this.first = this.last = child;
		} else {
			// 2. Non-empty: last child exists
			this.last.next = child;
			child.prev = this.last;
			this.last = child;
		}
		child.parent = this;
	};
	/**
	 * On exit, child still has all its pointers intact.
	 */
	SceneGraphNode.prototype.removeChild = function (child) {
		// 1. child is this.first
		if (child === this.first) {
			// 2. child is also this.last
			if (child === this.last) {
				this.first = null;
				this.last = null;
				// List is now officially empty
			} else {
				// 3. there is a new first
				this.first = child.next;
				this.first.prev = null;
			}
		} else if (child === this.last) {
			// 4. there is a new last
			this.last = child.prev;
			this.last.next = null;
		} else {
			child.prev.next = child.next;
			child.next.prev = child.prev;
		}
	};


	//--------------------------------------------------------------------------
	// SceneGraph
	//

	function SceneGraph (gfx) {
		this.nodeList = [];
		this.freeList = [];

		this.root = new SceneGraphNode(null, 'root');
		this.root.index = 0;
		this.nodeList.push(this.root);
		// Set up layers
		this.addChild([], 'ground', null);
		this.addChild([], 'active', null);
		this.addChild([], 'labels', null);
	}

	SceneGraph.prototype.render = function (ctx) {
		this.root.iterate((ch) => ch.render(ctx));
	};
	SceneGraph.prototype.addChild = function (keypath, keyNew, sprite) {
		let container = this.root._find(keypath);
		if (container.length === 0) {
			// None
			throw new Error(`Scene Graph: Can't find node with keypath '${keypath}'`);
		}
		// Some(node)
		return this._add(container[0], keyNew, sprite);
	};
	/**
	 * @par is a scene graph node
	 * @chi is a sprite
	 */
	SceneGraph.prototype._add = function (container, keyNew, sprite) {
		let node;
		if (this.freeList.length === 0) {
			node = new SceneGraphNode(container, keyNew, sprite);
			node.index = this.nodeList.length;
			this.nodeList.push(node);
		} else {
			let index = this.freeList.pop();
			node = this.nodeList[index];
			node.index = index;  // actually, I think that may be redundant
			node.sprite = sprite;
			node.key = keyNew;
		}
		if (sprite) sprite.sg_node = node;
		container.addChild(node);
		return node;
	};
	SceneGraph.prototype.removeChild = function (sprite) {
		let node = sprite.sg_node,
				container = node.parent;
		// Remove the child tree from its container, leaving the container's
		// child list consistent and correct.
		container.removeChild(node);
		// Clear all the nodes in this node's tree (if any), and store their
		// indices in the free list
		this._remove(node);
	};
	/**
	 * Private auxiliary function for removeChild
	 */
	SceneGraph.prototype._remove = function (node) {
		let n = node.first;
		while (n !== null) {
			// _remove will clear n, so save a copy of its next pointer
			let n1 = n.next;
			this._remove(n);
			n = n1;
		}
		let i = node.index;
		this.freeList.push(i);
		node.clear();
		// Note that we don't call Node::remove here. We are removing all children,
		// so it's pointless to worry about the integrity of the child list structure.
	};


	// EXPORTS
	ns.SceneGraph = SceneGraph;

	return ns;

})(MAGIC || {});

