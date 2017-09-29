var MAGIC = ((ns) => {

	// Imports
	let OpCode = ns.OpCode;

	function ERROR (file, line, char, msg) {
		logmsg = `[${file}:${line}.${char}] ERROR ${msg}`;
		console.log(logmsg);
		throw new Error(logmsg);
	}

	////////////////////////////////////////////////////////////////////////////
	// Scanner

	function Scanner (source, filename) {

		this.file = filename;
		this.line = 1;
		this.char = 0;

		this.source = source;
		this.pos = 0;

	}

	Scanner.prototype.error = function (msg) {
		ERROR(this.file, this.line, this.char, msg);
	};

	Scanner.prototype.scanToken = function () {

		var self = this;

		function advance(n) {
			let howFar = n ? n : 1;
			for (let i = 0; i < howFar; ++i) {
				if (peek() === '\n') {
					++self.line;
					self.char = 0;
				} else {
					++self.char;
				}
				++self.pos;
			}
		}

		function atEnd() {
			return self.pos >= self.source.length;
		}

		function peek() {
			return self.source.charAt(self.pos);
		}

		function skipComment() {
			if (atEnd()) {
				return;
			}
			if (peek() !== '#') {
				return;
			}
			advance();	// consume '#'
			while (!atEnd() && peek() !== '\n') {
				advance();
			}
			// atEnd() || peek() === \n
			advance(); 	// consume \n, or EOF, but that shouldn't matter
			// pos points past newline, and maybe past EOF
		}

		function skipSpace() {
			while (!atEnd()) {
				switch (peek()) {
					case '\n':
					case ' ':
					case '\t':
						advance();
						break;
					case '#':
						skipComment();
						break;
					default:
						return;
				}
			}
		}

		function createToken(type, value, start) {
			return {
				type: type,
				value: value,
				debug: {
					file: self.file,
					line: self.line,
					char: start,
				}
			}
		}

		function isspace(ch) {
			return ch === ' ' || ch === '\t' || ch === '\n';
		}

		function isdigit(ch) {
			return '0' <= ch && ch <= '9';
		}

		function islower(ch) {
			return 'a' <= ch && ch <= 'z';
		}

		function isupper(ch) {
			return 'A' <= ch && ch <= 'Z';
		}

		function isletter(ch) {
			return islower(ch) || isupper(ch);
		}

		/**
		 * Technically, this allows identifiers to start with a number,
		 * so only call it after handling the numeric token case.
		 */
		function isidchar(ch) {
			return isdigit(ch) || isletter(ch) || ch === '_' || ch === '.';
		}

		function scanNumber() {
			let start = self.pos,
					chStart = self.char,
			    hasPoint = false;
			if (peek() === '-') {
				advance();
			}
			while (!atEnd()) {
				if (peek() === '.') {
					if (hasPoint) {
						self.error(`Extra decimal point in number`);
					} else {
						hasPoint = true;
						advance();
					}
				}
				if (isdigit(peek())) {
					advance();
				} else {
					break;
				}
			}
			// atEnd || !isdigit -- better be whitespace!
			let str = self.source.substr(start, self.pos - start);
			var val;
			if (hasPoint) {
				val = parseFloat(str);
			} else {
				val = parseInt(str);
			}
			if (isNaN(val)) {
				self.error(`scanNumber failed (${str})`);
			}
			return createToken('NUMBER', val, chStart);
		}

		function scanString() {
			let start = self.pos,
					chStart = self.char;
			advance();
			while (!atEnd() && peek() !== '"') {
				let ch = peek();
				if (ch === '\\') {
					advance(2);
				} else {
					advance();
				}
			}
			if (peek() !== '"') {
				self.error(`Looks like the file ended in the middle of a string`);
			}
			let str = self.source.substr(start + 1, self.pos - start - 1);
			advance();
			return createToken('STRING', str, chStart);
		}

		function scanSymbol() {
			let start = self.pos;
			while (!atEnd() && isidchar(peek())) {
				advance();
			}
			let str = self.source.substr(start, self.pos - start);
			return str;
		}

		function isopcode(sym) {
			sym.toLowerCase();
			return OpCode.hasOwnProperty(sym);
		}

		skipSpace();
		if (atEnd()) {
			return createToken('EOF', -1, this.char);
		}
		let ch = peek();
		while (!atEnd() && !isspace(ch)) {
			if (ch === '-' || isdigit(ch)) {
				return scanNumber();
			} else if (ch === '"') {
				return scanString();
			} else if (ch === ':') {
				advance();
				return createToken(':', ':', this.char - 1);
			} else if (ch === '=') {
				advance();
				return createToken('=', '=', this.char - 1);
			} else {
				let start = this.pos,
						chStart = this.char;
				let sym = scanSymbol();
				let symL = sym.toLowerCase();
				if (isopcode(symL)) {
					return createToken('OPCODE', symL, chStart);
				} else if (sym.length) {
					return createToken('IDENTIFIER', sym, chStart);	
					// storage or address, we'll narrow it down later
				} else {
					this.error(`Unrecognized token '${sym}'`);
				}
			}
		}
	};

	Scanner.prototype.scanProgram = function () {

		let tokens = [];

		while (true) {
			let token = this.scanToken();
			tokens.push(token);
			if (token.type === 'EOF') {
				break;
			}
		}

		return tokens;
	}

	////////////////////////////////////////////////////////////////////////////
	// Compiler

	function Compiler () {
		this.tokenStream = [];
		this.tokenIndex = 0;
		this.instructionCounter = 0;
		this.currentInstruction = this.createInstruction();
		this.instructions = [];
		this.labelMap = {};
	};

	Compiler.prototype.createInstruction = function () {
		return {
			opcode: '',
			args: [],
			store: '',
			debug: {
				address: this.instructionCounter, 
				labels: [],
				file: '',
				line: 0,
				char: 0,
			},
		};
	}

	Compiler.prototype.error = function (msg) {
		let t = this.peek();
		if (!t) {
			throw new Error("Attempt to report syntax error after end of file");
		}
		let f = t.debug.file,
		    l = t.debug.line,
		    c = t.debug.char;
		ERROR(f, l, c, msg);
	};


	Compiler.prototype.compile = function (actor) {
		let source = actor.sourceCode,
				scanner = new Scanner(source, actor.getName());
		console.log("Scanning...");
		this.tokenStream = scanner.scanProgram();
		console.log("Compiling...");
		this.recognizeProgram();
		// will throw exception on compilation failure
		console.log("Done!");
		actor.program = {
			instructions: this.instructions,
			labels: this.labelMap,
		};
	};

	Compiler.prototype.testCompile = function (source, filename) {
		let scanner = new Scanner(source, filename);
		console.log("Scanning...");
		this.tokenStream = scanner.scanProgram();
		console.log("Compiling...");
		this.recognizeProgram();
		// will throw exception on compilation failure
		console.log("Done!");
		return {instructions: this.instructions, labels: this.labelMap};
	}


	/**
	 * Look ahead i tokens (defaults to 0).
	 * Does not consume the token you are looking at.
	 */
	Compiler.prototype.peek = function (i) {
		let offset = i ? i : 0,
				index = this.tokenIndex + offset;
		if (index >= this.tokenStream.length) {
			return null;
		}
		return this.tokenStream[index];
	}

	/**
	 * Consume n tokens (default = 1)
	 */
	Compiler.prototype.advance = function (n) {
		let howFar = n ? n : 1;
		this.tokenIndex += howFar;
	}

	Compiler.prototype.atEnd = function () {
		if (this.tokenIndex >= this.tokenStream.length) {
			return true;
		}
		if (this.peek().type === 'EOF') {
			return true;
		}
		return false;
	};

	Compiler.prototype.appendProgram = function (instruction) {
		this.instructions.push(instruction);
		++this.instructionCounter;			// really this should always == program.length, no?
	};

	Compiler.prototype.updateLabelMap = function (lbldecl) {
		let lbl = lbldecl.label,
		    addr = lbldecl.address;
		if (this.labelMap.hasOwnProperty(lbldecl.label)) {
			let otherAddr = this.labelMap[lbl];
			this.error(`Label ${lbl} already defined at address ${otherAddr}`);
		}
		this.labelMap[lbl] = addr;
	};

	/**
	 * Recognize a program, starting from the current token stream position.
	 */
	Compiler.prototype.recognizeProgram = function () {
		var result;
		while (!this.atEnd()) {
			if ((result = this.recognizeLabelDecl()).some) {
				this.updateLabelMap(result.value);
			} else if ((result = this.recognizeStatement()).some) {
				if (!checkArgs(result.value)) {
					this.error(`Wrong number of arguments in instruction: ${JSON.stringify(result.value,null,2)}`);
				}
				this.appendProgram(result.value);
				this.currentInstruction = this.createInstruction();
			} else {
				this.error("recognizeProgram: Expected <label-decl> or <statement>");
			}
		}
	};

	Compiler.prototype.recognizeLabelDecl = function () {
		// <label-decl> ::= <identifier> ':'
		let t1 = this.peek(),
				t2 = this.peek(1);
		if (t1.type !== 'IDENTIFIER') {
			return {some: false};
		}
		if (t2.type !== ':') {
			return {some: false};
		}
		// Consume those tokens
		this.advance(2);
		// Take action
		this.currentInstruction.debug.labels.push(t1.value);
		// Return mapping
		return {
			some: true, 
			value: {
				label: t1.value, 
				address: this.instructionCounter,
			},
		};
	};

	Compiler.prototype.recognizeStatement = function () {
		var result;
		if ((result = this.recognizeAssignment()).some) {
			return result;
		} else if ((result = this.recognizeOperation(true)).some) {
			return result;
		} else {
			return {some: false};
		}
	}

	Compiler.prototype.recognizeAssignment = function () {
		let t1 = this.peek(),
		    t2 = this.peek(1);
		if (t2 && t2.type !== '=') {
			return {some: false};
		}
		// This is the leading edge of an instruction, so set instruction
		// debug data from this token.
		let inst = this.currentInstruction,
				dbg = inst.debug;
		dbg.file = t1.debug.file;
		dbg.line = t1.debug.line;
		dbg.char = t1.debug.char;

		this.advance(2);	// consume the tokens

		// We're committed to this rule now!
		inst.store = t1.value;

		if ((result = this.recognizeRVal()).some) {
			this.currentInstruction.opcode = 'store';
			this.currentInstruction.args.push(result.value);
			return {some: true, value: this.currentInstruction};
		} else if ((result = this.recognizeOperation(false)).some) {
			return result;
		}

		this.error("Invalid assignment right hand side");
	}

	Compiler.prototype.recognizeRVal = function () {
		// This may be called in a loop, so running out of tokens
		// is a real possibility.
		if (this.atEnd()) {
			return {some: false};
		}
		let t1 = this.peek();
		if (t1.type === 'NUMBER' || t1.type === 'STRING') {
			this.advance();
			return {some: true, value: t1};
		}
		if (t1.type === 'IDENTIFIER') {
			let t2 = this.peek(1);
			if (t2 && (t2.type === ':' || t2.type === '=')) {
				return {some: false};
			}	else {
				this.advance();
				return {some: true, value: t1};
			}	
		}
		return {some: false};
	}

	Compiler.prototype.recognizeOperation = function (isLeadingEdge) {
		// <operation> ::= <operator> <rval>...
		let inst = this.currentInstruction;
		var result;

		// OPCODE token
		// Pass isLeadingEdge to tell recognizer if it's responsible for debug data
		if ((result = this.recognizeOpcode(isLeadingEdge)).some) {
			inst.opcode = result.value;
		} else {
			return {some: false};
		}

		while ((result = this.recognizeRVal()).some) {
			this.currentInstruction.args.push(result.value);
		}

		return {some: true, value: this.currentInstruction};

	};

	Compiler.prototype.argsEnd = function () {
		if (this.atEnd()) {
			return true;
		}
		let t1 = this.peek();
		if (t1.type === 'OPCODE') {
			return true;
		} else if (t1.type === 'IDENTIFIER') {
			// rval, or part of the next instruction?
			let t2 = this.peek(1);
			if (t2 && (t2.type === ':' || t2.type === '=')) {
				return true;
			}
		} 
		return false;
	}

	Compiler.prototype.recognizeAssignmentPrefix = function () {
		// <assignment> ::= <lval> '='
		let t1 = this.peek(),
		    t2 = this.peek(1);
		if (t2 && t2.type !== '=') {
			return {some: false};
		}
		// This is the leading edge of an instruction, so set instruction
		// debug data from this token.
		let dbg = this.currentInstruction.debug;
		dbg.file = t1.debug.file;
		dbg.line = t1.debug.line;
		dbg.char = t1.debug.char;

		this.advance(2);	// consume the tokens

		return {some: true, value: t1.value};
	};

	Compiler.prototype.recognizeOpcode = function (isLeadingEdge) {
		let t = this.peek();
		if (!t || t.type !== 'OPCODE') {
			return {some: false};
		}
		if (isLeadingEdge) {
			// No one has set instruction debug data yet
			let dbg = this.currentInstruction.debug;
			dbg.file = t.debug.file;
			dbg.line = t.debug.line;
			dbg.char = t.debug.char;
		}
		this.advance();
		return {some: true, value: t.value};
	};


	function checkArgs(instruction) {
		let opcode = instruction.opcode,
				req = OpCode[opcode].args,
				opt = OpCode[opcode].opt,
				iargs = instruction.args;
		if (iargs.length < req.length) {
			// too few arguments
			console.log("too few arguments");
			return false;
		} else if (iargs.length <= req.length + opt.length) {
			return true;
		}
		// We have some extra args 
		// The only way this is good is if there's an 'ARGS...' varargs slot
		// in opt
		for (let i = 0; i < opt.length; ++i) {
			if (opt[i].type === 'ANY...') {
				// Always room for more arguments
				return true;
			}
		}
		// Ran out of optional argument slots before we ran out of instruction
		// args -- too many args
		console.log("too many args", iargs.length, req.length + opt.length);
		return false;
	}



	////////////////////////////////////////////////////////////////////////////
	// Testing

	let shotBot = `
# ShotBot
# Written 1/3/90 by David Harris

# Translated to MAGIC/VML by Tom Cornell

Main:
	A = gt sys.range 0
	ifnz A CallFireSub CallRotateSub
CallRotateSub:
	call RotateSub -5 
	jump IfEnd
CallFireSub:
	call FireSub 20
IfEnd:
	jump Main

FireSub:
	sys.fire = args.1
	return

RotateSub:
	sys.aim = add sys.aim args.1
	return
	`;

/*

	let testBot = {
		sourceCode: shotBot,
		getName: function () { return "testBot"; }
	};

	let compiler = new Compiler();
	compiler.compile(testBot);
	testBot.program.instructions.forEach((i) => console.log(JSON.stringify(i, null, 2)));
	console.log(testBot.program.labels);

*/
	// EXPORTS
	ns.samples = ns.samples || {};
	ns.samples.ShotBot = shotBot;
	ns.Compiler = Compiler;

	return ns;

})(MAGIC || {});
