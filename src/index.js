
/**
* Declare our namespace
*/
((ns) => {


	function e_(id) {
		return document.getElementById(id);
	}

	/**
	* Position the agents in botList so that no one else is in their
	* row or col. That is, initializing AIM to 0, 90, 180, or 270 should
	* not see anyone right off the bat.
	*/
	function initialPositions(botList) {
		let n = botList.length;
		let rows = Array.from(Array(n).keys());
		let cols = rows.slice(); // clone array
		shuffle(rows);
		shuffle(cols);
		let cw = Math.floor(ns.arena.width/n),		// column width
			rh = Math.floor(ns.arena.height/n);		// row height
		botList.map((e,i) => {
			e.x = (rows[i] * cw) + (cw / 2); 
			e.y = (cols[i] * rh) + (rh / 2);
		});
	}

	/**
	* Randomly shuffle an array in-place.
	*/
	function shuffle (array) {
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

	ns.arena = {};
	ns.sprites = [];

	function configureArena() {
		let canvas = e_("arena");
		ns.arena.width = canvas.width;
		ns.arena.height = canvas.height;
		console.log("Arena:", ns.arena);
	}

	ns.main = () => {
		console.log("RoboWar starting...");
		configureArena();
		/// List of agents we will be running (PCs only, for now)
		ns.sprites = [
			{name: "Agent1", x: 0, y: 0},
			{name: "Agent2", x: 0, y: 0},
			{name: "Agent3", x: 0, y: 0},
			{name: "Agent4", x: 0, y: 0},
			{name: "Agent5", x: 0, y: 0},
			{name: "Agent6", x: 0, y: 0},
		];
		initialPositions(ns.sprites);
		console.log("Agents:", ns.sprites);
		render();
	}

	function render() {
		let arena = e_("arena");
		let ctx = arena.getContext("2d");
		let n = ns.sprites.length;
		for (var i = 0; i < n; ++i) {
			let s = ns.sprites[i];
			renderAgent(ctx, s, i, n);
		} 
	}

	function renderAgent(ctx, agent, index, count) {
		let color = ((360/count) % 360) * index;
		// circle
		ctx.strokeStyle = `hsl(${color}, 50%, 50%)`;
		ctx.beginPath();
		ctx.arc(agent.x, agent.y, 15, 0, 2 * Math.PI);
		// aim pointer
		ctx.moveTo(agent.x, agent.y);
		ctx.lineTo(agent.x + 15, agent.y);

		ctx.stroke();

	}

})(window.RoboWar = window.RoboWar || {});


/**
* Start up
*/
window.onload = () => {
	RoboWar.main();
};

