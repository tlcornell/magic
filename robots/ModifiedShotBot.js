var MAGIC = ((ns) => {

let ModifiedShotBot = `
# ModifiedShotBot

	mul sys.random 360 RandomDirection
	store2 4 RandomDirection sys.heading

LABEL Main
	add Bounce sys.wall A
	jump A
LABEL Bounce
	jump CheckRange
	jump GetOffNorthWall
	jump GetOffWestWall
	jump GetOffSouthWall
	jump GetOffEastWall

LABEL GetOffNorthWall
	# make sure velocity_dy is positive
	abs sys.velocity_dy sys.velocity_dy
	jump CheckRange
LABEL GetOffWestWall
	abs sys.velocity_dx sys.velocity_dx
	jump CheckRange
LABEL GetOffSouthWall
	# make sure velocity_dy is negative
	abs sys.velocity_dy A
	mul -1 A sys.velocity_dy
	jump CheckRange
LABEL GetOffEastWall
	abs sys.velocity_dx A
	mul -1 A sys.velocity_dx
	jump CheckRange


LABEL CheckRange
	GT sys.range 0 A
	IFNZ A DoFire DoRotate

LABEL DoFire
	STORE 20 sys.fire
	JUMP Main

LABEL DoRotate
	ADD sys.aim 7 sys.aim
	JUMP Main
`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.ModifiedShotBot = ModifiedShotBot;

	return ns;

})(MAGIC || {});
