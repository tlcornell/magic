var MAGIC = ((ns) => {


	constants = {
		AGENT_RADIUS: 15,
		BULLET_RADIUS: 2,
		BUMP_DAMAGE: 1,
		MAX_ROSTER_SLOTS: 6,
		SIGHT_DISTANCE: 1024,	// size of arena diagonal, apparently
		WALL_DAMAGE: 5,
		WALL_THICKNESS: 20,
		ARENA: {
			WIDTH: 800,
			HEIGHT: 640,
		},
		AGENT_STATE: {
			Q_NOT_DEAD: 3,
			Q_DEAD: 4,
			Q_ELIMINATED: 5,
		},
	};

	ns.constants = constants;

	return ns;

})(MAGIC || {});

