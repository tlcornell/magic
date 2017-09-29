var MAGIC = ((ns) => {

	const OpCode = Object.freeze({
		abs: {args: [{type: 'NUMBER'}], opt: []},
		add: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		call: {args: [{type: 'ADDRESS'}], opt:[{type: 'ANY...'}]},
		cos: {args: [{type: 'NUMBER'}], opt: [{type: 'NUMBER'}]},
		div: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		gt: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		gte: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		if: {args: [{type: 'NUMBER'}, {type: 'ADDRESS'}], opt: [{type: 'ADDRESS'}]},	
		ifnz: {args: [{type: 'NUMBER'}, {type: 'ADDRESS'}], opt: [{type: 'ADDRESS'}]},
		ifz: {args: [{type: 'NUMBER'}, {type: 'ADDRESS'}], opt: [{type: 'ADDRESS'}]},
		jump: {args: [{type: 'ADDRESS'}], opt: []},
		log: {args: [], opt: [{type: 'ANY...'}]},
		lt: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		lte: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		mul: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		or: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},	
		return: {args: [], opt: [{type: 'ANY'}]},
		sin: {args: [{type: 'NUMBER'}], opt: [{type: 'NUMBER'}]},
		store: {args: [{type: 'ANY'}], opt: []},
		store2: {args:[{type: 'ANY'}, {type: 'ANY'}], opt: []},
		sub: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		sync: {args: [], opt: []},
	});

	// Exports
	ns.OpCode = OpCode;

	return ns;
})(MAGIC || {});
