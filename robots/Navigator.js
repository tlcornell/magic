var MAGIC = ((ns) => {

let Navigator = `
# Navigator

##########################################################3
# Find the closest wall
#
# 1. NW->SE line: y = 4x/5  (640/800 = 4/5)
#
	mul 4 sys.x A
	div A 5 A
	lt sys.y A NorE
#
# 2. NE -> SW line: y = -4x/5 + 640
#
	mul -1 A B
	add B 640 B
	lt sys.y B NorW

	ifnz NorE GoNorthOrEast
	# !NorE => !N and !E
	# !N and (N or W) => W
	# !N and !E and !W => S
	ifnz NorW GoWest GoSouth
LABEL GoNorthOrEast
	ifnz NorW GoNorth GoEast

# Set red zone to (arena edge +/- wall thickness +/- radius +/- 25)
# 0 + 20 + 15 + 25 = 60
# 640 - 20 - 15 - 25 = 580
# 800 - 20 - 15 - 25 = 740
LABEL GoNorth
	store -3 sys.velocity_dy
	args sys.y 40 
	call SeekingWall sys.velocity_dy
	jump CheckWall
LABEL GoWest
	store -3 sys.velocity_dx
	args sys.x 40
	call SeekingWall sys.velocity_dx
	jump CheckWall
LABEL GoSouth
	store 3 sys.velocity_dy
	args 600 sys.y
	call SeekingWall sys.velocity_dy
	jump CheckWall
LABEL GoEast
	store 3 sys.velocity_dx
	args 750 sys.x
	call SeekingWall sys.velocity_dx
	jump CheckWall

LABEL SeekingWall
LABEL SeekLoop
	lt args.1 args.2 inRedZone
	ifz inRedZone SeekLoop
	return 0
	

LABEL CheckWall
	add sys.wall Bounce JumpTableOffset
	jump JumpTableOffset
LABEL Bounce
	jump CheckMovement
	jump GetOffNorthWall
	jump GetOffWestWall
	jump GetOffSouthWall
	jump GetOffEastWall

LABEL GetOffNorthWall
	GT sys.velocity_dy 0 courseCorrected
	IFNZ courseCorrected HugNorthWall
	# Otherwise move S slowly until the wall sensor shuts off
	STORE 1 sys.velocity_dy
	JUMP CheckRange							# do something useful while waiting to move
LABEL GetOffWestWall
	GT sys.velocity_dx 0 courseCorrected 	# Already heading out of danger
	IFNZ courseCorrected HugWestWall
	STORE 1 sys.velocity_dx
	JUMP CheckRange
LABEL GetOffSouthWall
	LT sys.velocity_dy 0 A
	IFNZ A HugSouthWall
	STORE -1 sys.velocity_dy
	JUMP CheckRange
LABEL GetOffEastWall
	LT sys.velocity_dx 0 A
	IFNZ A HugEastWall
	STORE -1 sys.velocity_dx
	JUMP CheckRange

LABEL CheckMovement
# Are we close enough to a wall to go into wall-hugging mode?
	LTE sys.Y 40 A
	IFNZ A HugNorthWall
	LTE sys.X 40 A
	IFNZ A HugWestWall
	GTE sys.Y 600 A
	IFNZ A HugSouthWall
	GTE sys.X 760 A
	IFNZ A HugEastWall
	JUMP CheckRange 

LABEL HugWestWall
LABEL HugEastWall
	STORE 0 sys.velocity_dx
	GT sys.Y 590 A
	IFNZ A HeadNorth
	LT sys.Y 50 A
	IFNZ A HeadSouth
	IFNZ sys.velocity_dy CheckRange
	STORE 3 sys.velocity_dy
	JUMP CheckRange
LABEL HugNorthWall
LABEl HugSouthWall
	STORE 0 sys.velocity_dy
	GT sys.X 750 A
	IFNZ A HeadWest
	LT sys.X 50 A
	IFNZ A HeadEast
	IFNZ sys.velocity_dx CheckRange
	STORE 3 sys.velocity_dx
	JUMP CheckRange

LABEL HeadSouth
	STORE 3 sys.velocity_dy
	JUMP CheckRange
LABEL HeadNorth
	STORE -3 sys.velocity_dy
	JUMP CheckRange
LABEL HeadEast
	STORE 3 sys.velocity_dx
	JUMP CheckRange
LABEL HeadWest
	STORE -3 sys.velocity_dx
	JUMP CheckRange

LABEL CheckRange
	GT sys.range 0 A
	IFNZ A DoFire DoRotate

LABEL DoFire
	STORE 10 sys.fire
	JUMP CheckWall

LABEL DoRotate
	ADD sys.aim 7 sys.aim
	JUMP CheckWall
`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.Navigator = Navigator;

	return ns;

})(MAGIC || {});
