#!/bin/bash
#
# Script to wrap a plain text MAGIC/VML source file
# in JavaScript boilerplate, so it can be loaded
# as a JS script.
#

BOTNAME=$(basename $1 .txt)

cat << EOT
var MAGIC = ((ns) => {

let $BOTNAME = \`
EOT

while read -r LINE
do
	echo $LINE
done < $1

cat << EOT
\`;

	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.$BOTNAME = $BOTNAME;

	return ns;

})(MAGIC || {});
EOT
