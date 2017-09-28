////////////////////////////////////////////////////////////////////////////
//
// Interpreter.js

var MAGIC = ((ns) => {

	function ERROR (file, line, char, msg) {
		console.log(`[${file}:${line}.${char}] ERROR ${msg}`);
		throw new Error(msg);
	}


	function Interpreter (agent) {
		Object.assign(this, {
			pc: 0,
			program: agent.program,
			framestack: [{	// "main" stack frame
				locals: {},
				args: [],
			}],
			bot: agent,
			globals: {},
		});
	}

	Interpreter.OpCode = Object.freeze({
		abs: true,
		add: true,
		args: true,
		call: true,
		cos: true,
		div: true,
		gt: true,
		gte: true,
		if: true,			// equiv ifnz
		ifnz: true,
		ifz: true,
		jump: true,
		log: true,
		lt: true,
		lte: true,
		mul: true,
		or: true,	
		return: true,
		sin: true,
		store: true,
		store2: true,
		sub: true,
		sync: true,
	});

	Interpreter.HWRegister = Object.freeze({
		aim: true,
		fire: true,
		heading: true,
		look: true,
		random: true,
		range: true,
		velocity_dx: true,
		velocity_dy: true,
		velocity: true,
		wall: true,
		x: true,
		y: true,
	});

	Interpreter.prototype.error = function (msg) {
		ERROR(this.bot.getName(), this.pc, 0, msg);
	};

	Interpreter.prototype.step = function () {

		// Any events to handle?

		// Okay, execute the instruction at this.pc
		if (this.pc > this.program.length) {
			this.error(`Foops, out of rope! (${this.pc})`);
		}

		let self = this;

		let rawInstr = this.program.instructions[this.pc],
				instrToks = rawInstr.tokens,
				opcode = instrToks[0].value;
		// sanity check:
		if (this.pc !== rawInstr.location) {
			this.error(`PC does not match instr loc: ${this.pc}/${rawInstr.location}`);
		}

		//console.log("step:", rawInstr);

		var dest,
				val1,
				val2,
				cond,
				brThen,
				brElse;
		switch (opcode) {
			case 'abs':
				val1 = decodeRVal(instrToks[1]);
				dest = decodeLVal(instrToks[2]);
				storeLVal(dest, Math.abs(val1));
				++this.pc;
				break;
			case 'add':
				dest = decodeLVal(instrToks[3]);
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				storeLVal(dest, val1 + val2);
				++this.pc;
				break;
			case 'args':
				let argframe = pushNewFrame(this.framestack);
				instrToks.slice(1).forEach((x) => argframe.args.push(x));
				// Check that next instruction is indeed a CALL
				let next = this.pc + 1;
				rawInstr = this.program.instructions[next];
				instrToks = rawInstr.tokens;
				opcode = instrToks[0].value;
				if (opcode !== 'call') {
					this.error("ARGS instruction must be followed by CALL");
				}
				rawInstr.hasFrame = true;
				// The call will actually execute next step
				++this.pc;
				this.step();
				break;
			case 'call':
				// Do we need to create a new frame?
				var frame;
				if (!rawInstr.hasFrame) {
					frame = pushNewFrame(this.framestack);
				} else {
					frame = top(this.framestack);
				}
				let func = decodeRVal(instrToks[1]);
				if (instrToks.length === 3) {
					frame.retval = decodeLVal(instrToks[2]);
				} else {
					frame.retval = null;
				}
				frame.return = this.pc + 1;
				this.pc = func;
				break;
			case 'cos':
				val1 = decodeRVal(instrToks[1]);
				if (instrToks.length > 3) {
					val2 = decodeRVal(instrToks[2]);
					dest = decodeLVal(instrToks[3]);
				} else {
					val2 = 1;
					dest = decodeLVal(instrToks[2]);
				}
				storeLVal(dest, Math.cos(val1) * val2);
				++this.pc;
				break;
			case 'div':
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				dest = decodeLVal(instrToks[3]);
				storeLVal(dest, val1 / val2);
				++this.pc;
				break;
			case 'gt':
				dest = decodeLVal(instrToks[3]);
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				storeLVal(dest, (val1 > val2) ? 1 : 0);
				++this.pc;
				break;
			case 'gte':
				dest = decodeLVal(instrToks[3]);
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				storeLVal(dest, (val1 >= val2) ? 1 : 0);
				++this.pc;
				break;
			case 'if':
			case 'ifnz':
				cond = decodeRVal(instrToks[1]);
				brThen = decodeRVal(instrToks[2]);
				brElse = null;
				// There may or may not be an else branch
				if (instrToks.length === 4) {
					brElse = decodeRVal(instrToks[3]);
				}
				if (cond) {
					this.pc = brThen;
				} else if (brElse !== null) {
					this.pc = brElse;
				} else {
					++this.pc;
				}
				break;
			case 'ifz':
				cond = decodeRVal(instrToks[1]);
				brThen = decodeRVal(instrToks[2]);
				brElse = null;
				// There may or may not be an else branch
				if (instrToks.length === 4) {
					brElse = decodeRVal(instrToks[3]);
				}
				//console.log("ifz", instrToks[1], cond);
				if (!cond) {
					this.pc = brThen;
				} else if (brElse !== null) {
					this.pc = brElse;
				} else {
					++this.pc;
				}
				break;
			case 'jump':
				this.pc = decodeRVal(instrToks[1]);
				break;
			case 'label':
				++this.pc;
				this.step();
				break;
			case 'log':
				let logmsg = "LOG: ";
				instrToks.slice(1).forEach((t) => {
					logmsg += `${decodeRVal(t)} `;
				});
				console.log(logmsg);
				++this.pc;
				this.step();
				break;
			case 'lt':
				dest = decodeLVal(instrToks[3]);
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				storeLVal(dest, (val1 < val2) ? 1 : 0);
				++this.pc;
				break;
			case 'lte':
				dest = decodeLVal(instrToks[3]);
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				storeLVal(dest, (val1 <= val2) ? 1 : 0);
				++this.pc;
				break;
			case 'mul':
				dest = decodeLVal(instrToks[3]);
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				storeLVal(dest, val1 * val2);
				++this.pc;
				break;
			case 'or':
				dest = decodeLVal(instrToks[3]);
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				storeLVal(dest, val1 || val2);
				++this.pc;
				break;
			case 'return':
				frame = top(this.framestack);
				if (instrToks.length > 1) {
					storeLVal(frame.retval, decodeRVal(instrToks[1]));
				}
				if (isNaN(frame.return) || frame.return < 0) {
					this.error(`Bad return address: ${frame.return}`);
				}
				this.pc = frame.return;
				break;
			case 'sin':
				val1 = decodeRVal(instrToks[1]);
				if (instrToks.length > 3) {
					val2 = decodeRVal(instrToks[2]);
					dest = decodeLVal(instrToks[3]);
				} else {
					val2 = 1;
					dest = decodeLVal(instrToks[2]);
				}
				storeLVal(dest, Math.sin(val1) * val2);
				++this.pc;
				break;
			case 'store':
				dest = decodeLVal(instrToks[2]);
				val1 = decodeRVal(instrToks[1]);
				storeLVal(dest, val1);
				++this.pc;
				break;
			case 'store2':
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				dest = decodeLVal(instrToks[3]);
				storeObject(dest, val1, val2);
				++this.pc;
				break;
			case 'sub':
				val1 = decodeRVal(instrToks[1]);
				val2 = decodeRVal(instrToks[2]);
				dest = decodeLVal(instrToks[3]);
				storeLVal(dest, val1 - val2);
				++this.pc;
				break;
			case 'sync':
				this.syncFlag = true;
				break;
			default:
				console.log("------------------------------------------");
				console.log(rawInstr);
				console.log(this.framestack);
				this.error(`Unhandled opcode '${opcode}'`);
		}

		function top(framestack) {
			if (framestack.length === 0) {
				return null;
			}
			return framestack[framestack.length - 1];
		}

		/**
		 * Used mainly to access the caller's frame from within a function body,
		 * for decoding arguments.
		 */
		function antetop(framestack) {
			if (framestack.length < 2) {
				return null;
			}
			return framestack[framestack.length - 2];
		}

		function pushNewFrame(framestack) {
			let frame = {
				args: [{}],		// arg.0 is reserved
				locals: {},
			};
			framestack.push(frame);
			return frame;
		}

		function decodeRVal(token, context) {
			if (!context) {
				context = top(self.framestack);
			}
			if (token.type === 'NUMBER') {
				return token.value;
			}
			if (token.type === 'STRING') {
				return token.value;
			}
			if (token.type === 'IDENTIFIER') {
				let parts = token.value.split('.');
				if (parts[0] === 'sys') {
					// Load hardware register
					let reg = parts[1];
					return getFromHardware(self.bot, reg);
					//return self.bot[reg];
				} else if (parts[0] === 'user') {
					// Fetch contents of global register
					// Eventually we should consider recursively decoding that
					if (!self.globals.hasOwnProperty(parts[1])) {
						self.error(`Attempt to load undefined global (${parts[1]})`);
					}
					return self.globals[parts[1]];
				} else if (parts[0] === 'args') {
					// Fetch a token from the args list
					let i = parseInt(parts[1]);
					if (isNaN(i)) {
						self.error(`Args index is not a number: ${parts[1]}`);
					}
					if (i >= context.args.length) {
						self.error(`Args index out of bounds: ${i}`);
					}
					let argi = context.args[i];
					// Decode it (it's still a raw token)
					return decodeRVal(argi, antetop(self.framestack));
				} else if (self.program.labels.hasOwnProperty(parts[0])) {
					// Return the program location for this label
					return self.program.labels[parts[0]];
				} else {
					// Must be a local
					let name = parts[0];
					if (!context.locals.hasOwnProperty(name)) {
						self.error(`Attempt to load unknown local (${name})`);
					}
					// Someday we may want to decode the local value
					// Also someday there might be locals with more than one part
					return context.locals[name];
				}
			}
		}

		/**
		 * In general, an LValue will look like:
		 * { container: ..., key: ... }
		 */
		function decodeLVal(token) {
			//console.log("decodeLVal", token);
			let parts = token.value.split('.');
			var decoded;
			if (parts[0] === 'sys') {
				let reg = parts[1].toLowerCase();
				if (!Interpreter.HWRegister.hasOwnProperty(reg)) {
					self.error(`Unrecognized hardware register (${reg})`);
				}
				decoded = {container: self.bot, key: reg};
			} else if (parts[0] === 'user') {
				decoded = {container: self.globals, key: parts[1]};
			} else {
				let framePtr = self.framestack.length - 1,
						frame = self.framestack[framePtr];
				decoded = {container: frame.locals, key: parts[0]};
			}
			//console.log(decoded);
			return decoded;
		}

		function storeLVal(lval, x) {
			if (lval.container !== self.bot) {
				lval.container[lval.key] = x;
				return;
			}
			// Store to hardware registers:
			switch (lval.key) {
				case 'aim':
					self.bot.setAimDegrees(x);
					break;
				case 'fire':
					self.bot.addBulletEnergy(x);
					self.bot.fireWeapons();
					//self.bot.launchProjectile(self.bot.getAim(), x);
					break;
				case 'velocity_dx':
					self.bot.setSpeedX(x);
					break;
				case 'velocity_dy':
					self.bot.setSpeedY(x);
					break;
				default:
					self.error(`Attempt to store to unrecognized hardware register (${lval.key})`);
			}
		}

		function storeObject(lval, v1, v2) {
			// lval of the form {container: C, key: K}
			// lval.container should === self.bot in all cases (aka 'sys')
			// lval.key should be atomic ('velocity' or 'heading')
			switch (lval.key) {
				case 'velocity':
					// v1 -> dx, v2 -> dy
					self.bot.setVelocity(v1, v2);
					break;
				case 'heading':
					// v1 -> r, v2 -> th
					self.bot.setHeading(v1, v2);
					break;
				default:
					self.error(`Attempt to store to unrecognized hardware register (${lval.key})`);
			}
		}

		function getFromHardware(agent, reg) {
			reg = reg.toLowerCase();
			switch (reg) {
				case 'aim':
					return self.bot.getAimDegrees();
				case 'fire':
					return 0;
				case 'look':
					return self.bot.getLookDegrees();
				case 'random':
					return ns.random();
					//return Matter.Common.random(0,1);
					//return Math.random();
				case 'range':
					return self.bot.getSightDist();
				case 'velocity_dx':
					return self.bot.getSpeedX();
				case 'velocity_dy':
					return self.bot.getSpeedY();
				case 'wall':
					//console.log("getFromHardware:", self.bot.getWall());
					return self.bot.getWall();
				case 'x':
					return self.bot.getPosX();
				case 'y':
					return self.bot.getPosY();
				default:
					// Unreachable?
					self.error(`getFromHardware: Bad register (${reg})`);
			}
		}

	};


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
			return Interpreter.OpCode.hasOwnProperty(sym);
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
			destination: '',
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
		inst.destination = t1.value;

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

		// Sequence of <rval>
		// Ending in either a <label-decl> or <assignment> or <opcode>
		/*
		while (!this.atEnd()) {

			if (this.argsEnd()) {
				break;
			}

			let t1 = this.peek();
			this.currentInstruction.args.push(t1);

			this.advance();
		}
		*/
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

/**/
	let testBot = {
		sourceCode: shotBot,
		getName: function () { return "testBot"; }
	};

	let compiler = new Compiler();
	compiler.compile(testBot);
	testBot.program.instructions.forEach((i) => console.log(JSON.stringify(i, null, 2)));
	console.log(testBot.program.labels);

/**/

	// EXPORTS
	ns.Interpreter = Interpreter;
	ns.samples = ns.samples || {};
	ns.samples.ShotBot = shotBot;
	ns.Compiler = Compiler;

	return ns;

})(MAGIC || {});
