var MAGIC = ((ns) => {

let WallBouncer = `
# WallBouncer
#
# Basically a clay pigeon, with no weapons.
#

	RandomDirection = mul sys.random 360 
	sys.heading = store2 3 RandomDirection 

Main:
	A = add Bounce sys.wall 
	jump A
Bounce:
	jump Main
	jump GetOffNorthWall
	jump GetOffWestWall
	jump GetOffSouthWall
	jump GetOffEastWall

GetOffNorthWall:
	# make sure velocity_dy is positive
	sys.velocity_dy = abs sys.velocity_dy 
	jump Main
GetOffWestWall:
	sys.velocity_dx = abs sys.velocity_dx 
	jump Main
GetOffSouthWall:
	# make sure velocity_dy is negative
	A = abs sys.velocity_dy 
	sys.velocity_dy = mul -1 A 
	jump Main
GetOffEastWall:
	A = abs sys.velocity_dx 
	sys.velocity_dx = mul -1 A 
	jump Main

`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.WallBouncer = WallBouncer;

	return ns;

})(MAGIC || {});
