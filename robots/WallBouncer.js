var MAGIC = ((ns) => {

let wallBouncer = `
# WallBouncer

LABEL Main
	IFZ sys.wall Main
LABEL Bounce
	LT sys.X 36 A
	IFNZ A GetOffWestWall
	GT sys.X 764 A 
	IFNZ A GetOffEastWall
	LT sys.Y 36 A
	IFNZ A GetOffNorthWall
	GT sys.Y 604 A
	IFNZ A GetOffSouthWall
	JUMP Main		# should be unreachable. Unless value of wall changes on ch break?

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
	ns.samples.WallBouncer = wallBouncer;

	return ns;

})(MAGIC || {});