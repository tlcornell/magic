	/////////////////////////////////////////////////////////////////////////
	// Logging

var MAGIC = ((ns) => {


	ns.log = new EventLog();

	function EventLog () {
		this.log = [];
	}

	EventLog.prototype.post = function (event) {
		this.log.push(JSON.stringify(event));
	};

	EventLog.prototype.read = function (item) {
		return this.log[item];
	};

	EventLog.prototype.clear = function () {
		this.log = [];
	}

	EventLog.prototype.display = function (elt) {
		this.log.forEach((item) => elt.append(item + '\n'));
	};

	function LOG (event) {
		ns.log.post(event);
	}

	// EXPORTS
	ns.LOG = LOG;
	ns.EventLog = EventLog;
	
	return ns;

})(MAGIC || {});
