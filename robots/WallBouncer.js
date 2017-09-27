var MAGIC = ((ns) => {

let WallBouncer = `
# WallBouncer

	store 2 sys.speedx
	store -2 sys.speedy

LABEL Main
	add Bounce sys.wall A
	add 1 A A
	jump A
LABEL Bounce
	jump Main
	jump GetOffNorthWall
	jump GetOffWestWall
	jump GetOffSouthWall
	jump GetOffEastWall

LABEL GetOffWestWall
	GT sys.speedX 0 A
	IFNZ A Main
	MUL sys.speedX -1 sys.speedX
	#LOG sys.speedX
	JUMP Main
LABEL GetOffEastWall
	LT sys.speedX 0 A
	IFNZ A Main
	MUL sys.speedX -1 sys.speedX
	JUMP Main
LABEL GetOffNorthWall
	GT sys.speedy 0 A
	IFNZ A Main
	MUL sys.speedY -1 sys.speedY
	JUMP Main
LABEL GetOffSouthWall
	LT sys.speedy 0 A
	IFNZ A Main
	MUL sys.speedY -1 sys.speedY
	JUMP Main
`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.WallBouncer = WallBouncer;

	return ns;

})(MAGIC || {});
