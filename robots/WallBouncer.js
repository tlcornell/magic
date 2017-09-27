var MAGIC = ((ns) => {

let WallBouncer = `
# WallBouncer

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
	# make sure speedy is positive
	abs sys.speedy sys.speedy
	jump Main
LABEL GetOffWestWall
	abs sys.speedx sys.speedx
	jump Main
LABEL GetOffSouthWall
	# make sure speedy is negative
	abs sys.speedy A
	mul -1 A sys.speedy
	jump Main
LABEL GetOffEastWall
	abs sys.speedx A
	mul -1 A sys.speedx
	jump Main

`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.WallBouncer = WallBouncer;

	return ns;

})(MAGIC || {});
