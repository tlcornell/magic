var MAGIC = (function (ns) {

	ns.e_ = function (id) {
		return document.getElementById(id);
	}

	// Converts from degrees to radians.
	Math.radians = function(degrees) {
	  return degrees * Math.PI / 180;
	};

	// Converts from radians to degrees.
	Math.degrees = function(radians) {
	  return radians * 180 / Math.PI;
	};

	ns.randomInt = function (lo, hi) {
		let rand = Math.floor(Math.random() * (hi - lo + 1));
		rand += lo;
		return rand;
	}

	ns.randomFloat = function (lo, hi) {
		let rand = Math.random() * (hi - lo);
		rand += lo;
		return rand;
	}


	ns.Layer = Object.freeze({
		MIN: 1,
		GROUND: 1,
		ACTIVE: 2,
		LABELS: 3,
		MAX: 3,
	});

	return ns;

})(MAGIC || {});
