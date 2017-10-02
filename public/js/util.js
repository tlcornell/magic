//////////////////////////////////////////////////////////////////////
// Utility functions:

var MAGIC = ((ns) => {

	/** 
	 * Short alias for getElementById
	 */
	ns.e_ = function (id) {
		return document.getElementById(id);
	}

	/**
	* Randomly shuffle an array in-place.
	*/
	ns.shuffle = function (array) {
		let i = 0, 
			j = 0, 
			temp = null;

		for (i = array.length - 1; i > 0; i -= 1) {
			j = Math.floor(Math.random() * (i + 1));
			temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
	}

	ns.normDegrees = function (degrees) {
			degrees %= 360;
			if (degrees < 0) {
				degrees += 360;
			}
		  return degrees;
	}

	// Converts from degrees to radians.
	// Result should fall in [0, 2pi).
	ns.radians = function (degrees) {
	  return ns.normDegrees(degrees) * Math.PI / 180;
	}

	// Converts from radians to degrees.
	// Result guaranteed to be in [0, 360).
	ns.degrees = function (radians) {
		let d = radians * 180 / Math.PI;
	  return ns.normDegrees(d);
	}

	// This assumes that we are starting from 0,0,
	// so don't forget to Vector.add an offset.
	// Angle in radians!
	ns.angle2vector = function (angle, distance) {
		let x = Math.cos(angle) * distance,
				y = Math.sin(angle) * distance;
		return Matter.Vector.create(x, y);
	}

	/**
	 * Return the vector from 'pos' at 'angle' with size 'length'.
	 * Angle in radians.
	 */
	ns.a2v = function (pos, angle, length) {
		let x = Math.cos(angle) * length + pos.x,
		    y = Math.sin(angle) * length + pos.y;
		return Matter.Vector.create(x, y);
	}

	ns.vector2angle = function (x, y) {
		let size2 = x * x + y * y,
				size = Math.sqrt(size2),
				angle = Math.atan2(dy, dx);
		return {r: size, th: angle};
	}

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

	ns.randomRadian = function () {
		return Math.random() * 2 * Math.PI;
	}

	ns.round = function (num) {
		if (num >= 0) {
			return Math.floor(num);
		} else {
			return Math.ceil(num);
		}
	}

	/**
	 * URL: https://stackoverflow.com/questions/1073336/circle-line-segment-collision-detection-algorithm
	 * E: Start of ray vector
	 * L: End of ray vector
	 * C: Center of circle
	 * r: Radius of circle
	 */
	ns.intersectLineCircle = function (E, L, C, r) {
		let d = Matter.Vector.sub(L, E),
				f = Matter.Vector.sub(E, C),
				a = Matter.Vector.dot(d, d),
				b = 2 * Matter.Vector.dot(f, d),
				c = Matter.Vector.dot(f, f) - (r * r),
				discriminant = (b * b) - (4 * a * c);
		if (discriminant < 0) {
			return false;
		}
		discriminant = Math.sqrt(discriminant);
		let t1 = (-b - discriminant) / (2 * a),
				t2 = (-b + discriminant) / (2 * a);
		if (t1 >= 0 && t1 <= 1) {
			return true;
		}
		if (t2 >= 0 && t2 <= 1) {
			return true;
		}
		return false;
	}


	// EXPORTS

	return ns;

})(MAGIC || {});
