var MAGIC = ((ns) => {

let WallBouncer = `
# WallBouncer

	store sys.random A
	store sys.random B
	log "raw values" A B
	mul A 6 A
	sub A 3 X0
	mul B 6 B
	sub B 3 Y0
	log "X0" X0 "Y0" Y0
	store2 X0 Y0 sys.velocity
#	mul sys.random 360 RandomDirection
#	store2 4 RandomDirection sys.heading
#	args 4 RandomDirection
#	call Polar2Vector

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

# Args: radius, azimuth
LABEL Polar2Vector
	cos args.2 args.1 X
	sin args.2 args.1 Y
	#store2 X Y sys.velocity
	store X sys.speedx
	store Y sys.speedy
	return
`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.WallBouncer = WallBouncer;

	return ns;

})(MAGIC || {});
