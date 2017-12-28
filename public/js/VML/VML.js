var MAGIC = ((ns) => {

	const OpCode = Object.freeze({
		abs: {args: [{type: 'NUMBER'}], opt: []},
		add: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		and: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		atan: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},	// Math.atan2(y, x)
		call: {args: [{type: 'ADDRESS'}], opt:[{type: 'ANY...'}]},
		cos: {args: [{type: 'NUMBER'}], opt: [{type: 'NUMBER'}]},
		debug: {args: [], opt: []},
		div: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		eq: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		gt: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		gte: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		if: {args: [{type: 'NUMBER'}, {type: 'ADDRESS'}], opt: [{type: 'ADDRESS'}]},	
		ifnz: {args: [{type: 'NUMBER'}, {type: 'ADDRESS'}], opt: [{type: 'ADDRESS'}]},
		ifz: {args: [{type: 'NUMBER'}, {type: 'ADDRESS'}], opt: [{type: 'ADDRESS'}]},
		ircall: {args: [{type: 'IDENTIFIER'}, {type: 'ADDRESS'}], opt: []},
		ircontinue: {args: [], opt: [{type: 'ADDRESS'}]},
		irparam: {args: [{type: 'IDENTIFIER'}, {type: 'NUMBER'}], opt: []},
		irstart: {args: [], opt: []},
		irstop: {args: [], opt: []},
		jump: {args: [{type: 'ADDRESS'}], opt: []},
		log: {args: [], opt: [{type: 'ANY...'}]},
		lt: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		lte: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		max: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		min: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		mod: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		mul: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		neq: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		noop: {args: [], opt:[]},
		not: {args: [{type: 'NUMBER'}], opt: []},
		or: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},	
		return: {args: [], opt: [{type: 'ANY'}]},
		round: {args: [{type: 'NUMBER'}], opt: []},
		sin: {args: [{type: 'NUMBER'}], opt: [{type: 'NUMBER'}]},
		store: {args: [{type: 'ANY'}], opt: []},
		sub: {args: [{type: 'NUMBER'}, {type: 'NUMBER'}], opt: []},
		sync: {args: [], opt: []},
		tuple: {args:[{type: 'ANY'}, {type: 'ANY'}], opt: [{type: 'ANY...'}]},
	});

	const OpSym = Object.freeze({
		'==': 'eq',
		'<=': 'lte',
		'>=': 'gte',
		'>': 'gt',
		'<': 'lt',
		'!=': 'neq',
		'&&': 'and',
		'||': 'or',
		'!': 'not',
		'+': 'add',
		'-': 'sub',
		'*': 'mul',
		'/': 'div',
		'%': 'mod',
	});

	// Exports
	ns.OpCode = OpCode;
	ns.OpSym = OpSym;

	return ns;
})(MAGIC || {});
