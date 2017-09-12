var MAGIC = ((ns) => {

let GunTurret = `
# GunTurret
#
# For debugging the vision system
#

LABEL Main
GT sys.range 0 A
IFNZ A DoFire
ADD 1 sys.aim sys.aim
JUMP Main
LABEL DoFire
STORE 5 sys.fire
JUMP Main
`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.GunTurret = GunTurret;

	return ns;

})(MAGIC || {});
