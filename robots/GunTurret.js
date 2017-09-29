var MAGIC = ((ns) => {

let GunTurret = `
# GunTurret
#
# For debugging the vision system
#

Main:
	A = gt sys.range 0
	ifnz A DoFire
	sys.aim = add 7 sys.aim 
	jump Main
DoFire:
	sys.fire = 50 
	jump Main
`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.GunTurret = GunTurret;

	return ns;

})(MAGIC || {});
