var MAGIC = ((ns) => {

let Navigator = `
# Navigator

##########################################################3
# Find the closest wall
#
# 1. NW->SE line: y = 4x/5  (640/800 = 4/5)
#
	A = mul 4 sys.x 
	A = div A 5 
	NorE = lt sys.y A 
#
# 2. NE -> SW line: y = -4x/5 + 640
#
	B = mul -1 A 
	B = add B 640 
	NorW = lt sys.y B 

	ifnz NorE GoNorthOrEast
	# !NorE => !N and !E
	# !N and (N or W) => W
	# !N and !E and !W => S
	ifnz NorW GoWest GoSouth
GoNorthOrEast:
	ifnz NorW GoNorth GoEast

# Set red zone to (arena edge +/- wall thickness +/- radius +/- 25)
# 0 + 20 + 15 + 25 = 60
# 640 - 20 - 15 - 25 = 580
# 800 - 20 - 15 - 25 = 740
GoNorth:
	sys.velocity_dy = -3 
	sys.velocity_dy = call SeekingWall sys.y 40 
	jump CheckWall
GoWest:
	sys.velocity_dx = -3 
	sys.velocity_dx = call SeekingWall sys.x 40
	jump CheckWall
GoSouth:
	sys.velocity_dy = 3 
	sys.velocity_dy = call SeekingWall 600 sys.y
	jump CheckWall
GoEast:
	sys.velocity_dx = 3 
	sys.velocity_dx = call SeekingWall 760 sys.x
	jump CheckWall

SeekingWall:
SeekLoop:
	inRedZone = lt args.1 args.2 
	ifz inRedZone SeekLoop
	return 0
	

CheckWall:
	JumpTableOffset = add sys.wall Bounce 
	jump JumpTableOffset
Bounce:
	jump CheckMovement
	jump GetOffNorthWall
	jump GetOffWestWall
	jump GetOffSouthWall
	jump GetOffEastWall

GetOffNorthWall:
	courseCorrected = gt sys.velocity_dy 0 
	ifnz courseCorrected HugNorthWall
	# Otherwise move S slowly until the wall sensor shuts off
	sys.velocity_dy = 1 
	jump CheckRange							# do something useful while waiting to move
GetOffWestWall:
	courseCorrected = gt sys.velocity_dx 0  	# Already heading out of danger
	ifnz courseCorrected HugWestWall
	sys.velocity_dx = 1 
	jump CheckRange
GetOffSouthWall:
	A = lt sys.velocity_dy 0 
	ifnz A HugSouthWall
	sys.velocity_dy = -1 
	jump CheckRange
GetOffEastWall:
	A = lt sys.velocity_dx 0 
	ifnz A HugEastWall
	sys.velocity_dx = -1 
	jump CheckRange

CheckMovement:
# Are we close enough to a wall to go into wall-hugging mode?
	A = lte sys.y 40 
	ifnz A HugNorthWall
	A = lte sys.x 40 
	ifnz A HugWestWall
	A = gte sys.y 600 
	ifnz A HugSouthWall
	A = gte sys.x 760 
	ifnz A HugEastWall
	jump CheckRange 

HugWestWall:
HugEastWall:
	sys.velocity_dx = 0 
	A = gt sys.y 590 
	ifnz A HeadNorth
	A = lt sys.y 50 
	ifnz A HeadSouth
	ifnz sys.velocity_dy CheckRange
	sys.velocity_dy = 3 
	jump CheckRange
HugNorthWall:
HugSouthWall:
	sys.velocity_dy = 0 
	A = gt sys.x 750 
	ifnz A HeadWest
	A = lt sys.x 50 
	ifnz A HeadEast
	ifnz sys.velocity_dx CheckRange
	sys.velocity_dx = 3 
	jump CheckRange

HeadSouth:
	sys.velocity_dy = 3 
	jump CheckRange
HeadNorth:
	sys.velocity_dy = -3 
	jump CheckRange
HeadEast:
	sys.velocity_dx = 3 
	jump CheckRange
HeadWest:
	sys.velocity_dx = -3 
	jump CheckRange

CheckRange:
	A = gt sys.range 0 
	ifnz A DoFire DoRotate

DoFire:
	sys.fire = 10 
	jump CheckWall

DoRotate:
	sys.aim = add sys.aim 7 
	jump CheckWall
`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.Navigator = Navigator;

	return ns;

})(MAGIC || {});
