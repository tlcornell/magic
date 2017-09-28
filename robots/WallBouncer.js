var MAGIC = ((ns) => {

let WallBouncer = `
# WallBouncer
#
# Basically a clay pigeon, with no weapons.
#

	mul sys.random 360 RandomDirection
	store2 3 RandomDirection sys.heading

LABEL Main
	add Bounce sys.wall A
	jump A
LABEL Bounce
	jump Main
	jump GetOffNorthWall
	jump GetOffWestWall
	jump GetOffSouthWall
	jump GetOffEastWall

LABEL GetOffNorthWall
	# make sure velocity_dy is positive
	abs sys.velocity_dy sys.velocity_dy
	jump Main
LABEL GetOffWestWall
	abs sys.velocity_dx sys.velocity_dx
	jump Main
LABEL GetOffSouthWall
	# make sure velocity_dy is negative
	abs sys.velocity_dy A
	mul -1 A sys.velocity_dy
	jump Main
LABEL GetOffEastWall
	abs sys.velocity_dx A
	mul -1 A sys.velocity_dx
	jump Main

`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.WallBouncer = WallBouncer;

	return ns;

})(MAGIC || {});
