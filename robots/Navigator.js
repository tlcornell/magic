var MAGIC = ((ns) => {

let Navigator = `
# Navigator

LABEL PreMain
	GT sys.Y 320 A
	IFNZ A MaybeNorth MaybeSouth
LABEL MaybeNorth
	LT sys.X sys.Y A
	IFNZ A StartWest StartNorth
LABEL StartWest
	STORE -3 sys.speedX
	JUMP Main
LABEL StartNorth
	STORE -3 sys.speedY
	JUMP Main
LABEL MaybeSouth
	GT sys.X sys.Y A
	IFNZ A StartEast StartSouth
LABEL StartEast
	STORE 3 sys.speedX
	JUMP Main
LABEl StartSouth
	STORE 3 sys.speedY
	JUMP Main



LABEL Main
	IFZ sys.wall CheckMovement
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
	GT sys.speedX 0 A 	# Already heading out of danger
	IFNZ A HugWestWall
	STORE 1 sys.speedx
	JUMP CheckRange
LABEL GetOffEastWall
	LT sys.speedX 0 A
	IFNZ A HugEastWall
	STORE -1 sys.speedX
	JUMP CheckRange
LABEL GetOffNorthWall
	GT sys.speedy 0 A
	IFNZ A HugNorthWall
	STORE 1 sys.speedy
	JUMP CheckRange
LABEL GetOffSouthWall
	LT sys.speedy 0 A
	IFNZ A HugSouthWall
	STORE -1 sys.speedy
	JUMP CheckRange

LABEL CheckMovement
	LT sys.X 40 A
	IFNZ A HugWestWall
	GT sys.X 760 A
	IFNZ A HugEastWall
	LT sys.Y 40 A
	IFNZ A HugNorthWall
	GT sys.Y 600 HugSouthWall
	JUMP CheckRange # unreachable

LABEL HugWestWall
LABEL HugEastWall
	STORE 0 sys.speedx
	GT sys.Y 590 A
	IFNZ A HeadNorth
	LT sys.Y 50 A
	IFNZ A HeadSouth
	IFNZ sys.speedY CheckRange
	STORE 3 sys.speedY
	JUMP CheckRange
LABEL HugNorthWall
LABEl HugSouthWall
	STORE 0 sys.speedy
	GT sys.X 750 A
	IFNZ A HeadWest
	LT sys.X 50 A
	IFNZ A HeadEast
	IFNZ sys.speedX CheckRange
	STORE 3 sys.speedX
	JUMP CheckRange

LABEL HeadSouth
	STORE 3 sys.speedY
	JUMP CheckRange
LABEL HeadNorth
	STORE -3 sys.speedY
	JUMP CheckRange
LABEL HeadEast
	STORE 3 sys.speedX
	JUMP CheckRange
LABEL HeadWest
	STORE -3 sys.speedX
	JUMP CheckRange

LABEL CheckRange
	GT sys.range 0 A
	IFNZ A DoFire DoRotate

LABEL DoFire
	STORE 10 sys.fire
	JUMP Main

LABEL DoRotate
	ADD sys.aim 7 sys.aim
	JUMP Main
`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.Navigator = Navigator;

	return ns;

})(MAGIC || {});
