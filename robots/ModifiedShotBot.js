var MAGIC = ((ns) => {

	let modifiedShotBot = `
# ModifiedShotBot

LABEL Main
	IFZ sys.wall CheckRange
LABEL Bounce
	LT sys.X 36 A
	IFNZ A GetOffWestWall
	GT sys.X 764 A 
	IFNZ A GetOffEastWall
	LT sys.Y 36 A
	IFNZ A GetOffNorthWall
	GT sys.Y 604 A
	IFNZ A GetOffSouthWall
	JUMP CheckRange		# should be unreachable. Unless value of wall changes on ch break?

LABEL GetOffWestWall
	GT sys.speedX 0 A
	IFNZ A CheckRange
	MUL sys.speedX -1 sys.speedX
	#LOG sys.speedX
	JUMP CheckRange
LABEL GetOffEastWall
	LT sys.speedX 0 A
	IFNZ A CheckRange
	MUL sys.speedX -1 sys.speedX
	JUMP CheckRange
LABEL GetOffNorthWall
	GT sys.speedy 0 A
	IFNZ A CheckRange
	MUL sys.speedY -1 sys.speedY
	JUMP CheckRange
LABEL GetOffSouthWall
	LT sys.speedy 0 A
	IFNZ A CheckRange
	MUL sys.speedY -1 sys.speedY
	JUMP CheckRange


LABEL CheckRange
	GT sys.range 0 A
	IFNZ A DoFire DoRotate

LABEL DoFire
	STORE 5 sys.fire
	JUMP Main

LABEL DoRotate
	ADD sys.aim 7 sys.aim
	JUMP Main
	`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.ModifiedShotBot = modifiedShotBot;

	return ns;

})(MAGIC || {});
