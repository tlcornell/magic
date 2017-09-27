var MAGIC = ((ns) => {

let WallBouncer = `
# WallBouncer

	store 4 sys.speedx
	store -4 sys.speedy

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
#	GT sys.speedy 0 A
#	IFNZ A Main
#	MUL sys.speedY -1 sys.speedY
#	JUMP Main
LABEL GetOffWestWall
	abs sys.speedx sys.speedx
	jump Main
#	GT sys.speedX 0 A
#	IFNZ A Main
#	MUL sys.speedX -1 sys.speedX
#	#LOG sys.speedX
#	JUMP Main
LABEL GetOffSouthWall
	# make sure speedy is negative
	abs sys.speedy A
	mul -1 A sys.speedy
	jump Main
#	LT sys.speedy 0 A
#	IFNZ A Main
#	MUL sys.speedY -1 sys.speedY
#	JUMP Main
LABEL GetOffEastWall
	abs sys.speedx A
	mul -1 A sys.speedx
	jump Main
#	LT sys.speedX 0 A
#	IFNZ A Main
#	MUL sys.speedX -1 sys.speedX
#	JUMP Main
`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.WallBouncer = WallBouncer;

	return ns;

})(MAGIC || {});
