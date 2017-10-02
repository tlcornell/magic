///////////////////////////////////////////////////////////////////////////
// Public Config Settings
// (i.e., for the front-end code)
//

var MAGIC = ((ns) => {


	config = {
		server: "http://localhost:3000",
	};

	ns.config = config;

	return ns;

})(MAGIC || {});

