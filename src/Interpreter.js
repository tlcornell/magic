////////////////////////////////////////////////////////////////////////////
//
// Interpreter.js

var MAGIC = ((ns) => {

	function ERROR (line, char, msg) {
		console.log(`[${line}.${char}] ERROR ${msg}`);
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
		div: true,
		gt: true,
		ifnz: true,
		ifz: true,
		jump: true,
		label: true,
		log: true,
		lt: true,
		mul: true,
		or: true,	
		return: true,
		store: true,
		sync: true,
	});

	Interpreter.HWRegister = Object.freeze({
		aim: true,
		fire: true,
		look: true,
		range: true,
		speedx: true,
		speedy: true,
		wall: true,
		x: true,
		y: true,
	});

	Interpreter.prototype.step = function () {

		// Any events to handle?

		// Okay, execute the instruction at this.pc
		if (this.pc > this.program.length) {
			ERROR(this.pc, 0, `Foops, out of rope! (${this.pc})`);
		}

		let self = this;

		let rawInstr = this.program.instructions[this.pc],
				instrToks = rawInstr.tokens,
				opcode = instrToks[0].value;
		// sanity check:
		if (this.pc !== rawInstr.location) {
			ERROR(this.pc, 0, `PC does not match instr loc: ${this.pc}/${rawInstr.location}`);
		}

//		console.log("step:", rawInstr);

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
				let next = this.pc + 1;
				rawInstr = this.program.instructions[next];
				instrToks = rawInstr.tokens;
				opcode = instrToks[0].value;
				if (opcode !== 'call') {
					ERROR(this.pc, 0, "ARGS instruction must be followed by CALL");
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
					ERROR(this.pc, 0, `Bad return address: ${frame.return}`);
				}
				this.pc = frame.return;
				break;
			case 'store':
				dest = decodeLVal(instrToks[2]);
				val1 = decodeRVal(instrToks[1]);
				storeLVal(dest, val1);
				++this.pc;
				break;
			case 'sync':
				this.syncFlag = true;
				break;
			default:
				console.log("------------------------------------------");
				console.log(rawInstr);
				console.log(this.framestack);
				ERROR(this.pc, 0, `Unhandled opcode '${opcode}'`);
		}

		function top(framestack) {
			if (framestack.length === 0) {
				return null;
			}
			return framestack[framestack.length - 1];
		}

		function pushNewFrame(framestack) {
			let frame = {
				args: [{}],		// arg.0 is reserved
				locals: {},
			};
			framestack.push(frame);
			return frame;
		}

		function decodeRVal(token) {
			if (token.type === 'NUMBER') {
				return token.value;
			}
			if (token.type === 'STRING') {
				return token.value;
			}
			if (token.type === 'IDENTIFIER') {
				let framePtr = self.framestack.length - 1,
						frame = self.framestack[framePtr];
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
						ERROR(self.pc, 0, `Attempt to load undefined global (${parts[1]})`);
					}
					return self.globals[parts[1]];
				} else if (parts[0] === 'args') {
					// Fetch a token from the args list
					let i = parseInt(parts[1]);
					if (isNaN(i)) {
						ERROR(self.pc, 0, `Args index is not a number: ${parts[1]}`);
					}
					if (i >= frame.args.length) {
						ERROR(self.pc, 0, `Args index out of bounds: ${i}`);
					}
					let argi = frame.args[i];
					// Decode it (it's still a raw token)
					return decodeRVal(argi);
				} else if (self.program.labels.hasOwnProperty(parts[0])) {
					// Return the program location for this label
					return self.program.labels[parts[0]];
				} else {
					// Must be a local
					let name = parts[0];
					if (!frame.locals.hasOwnProperty(name)) {
						ERROR(self.pc, 0, `Attempt to load unknown local (${name})`);
					}
					// Someday we may want to decode the local value
					// Also someday there might be locals with more than one part
					return frame.locals[name];
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
					ERROR(self.pc, 0, `Unrecognized hardware register (${reg})`);
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
				case 'speedx':
					self.bot.setSpeedX(x);
					break;
				case 'speedy':
					self.bot.setSpeedY(x);
					break;
				default:
					ERROR(self.pc, 0, `Attempt to store to unrecognized hardware register (${lval.key})`);
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
				case 'range':
					return self.bot.getSightDist();
				case 'speedx':
					return self.bot.getSpeedX();
				case 'speedy':
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
					ERROR(self.pc, 0, `getFromHardware: Bad register (${reg})`);
			}
		}

	};


	////////////////////////////////////////////////////////////////////////////
	// Scanner

	function Scanner (source) {

		this.line = 1;
		this.char = 0;

		this.source = source;
		this.pos = 0;

	}

	Scanner.prototype.scanToken = function () {

		var self = this;

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
			++self.pos;	// consume '#'
			while (!atEnd() && peek() !== '\n') {
				++self.pos;
			}
			// atEnd() || peek() === \n
			++self.pos; 	// consume \n, or EOF, but that shouldn't matter
			++self.line;
			self.char = 0;
			// pos points past newline, and maybe past EOF
		}

		function skipSpace() {
			while (!atEnd()) {
				switch (peek()) {
					case '\n':
						++self.line;
						self.char = 0;
					case ' ':
					case '\t':
						++self.pos;
						break;
					case '#':
						skipComment();
						break;
					default:
						return;
				}
			}
		}

		function createToken(type, value) {
			return {
				type: type,
				value: value,
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
			let start = self.pos;
			if (peek() === '-') {
				++self.pos;
			}
			while (!atEnd() && isdigit(peek())) {
				++self.pos;
			}
			// atEnd || !isdigit -- better be whitespace!
			let str = self.source.substr(start, self.pos - start),
					val = parseInt(str);
			if (isNaN(val)) {
				ERROR(self.line, self.char, `scanNumber failed (${str})`);
			}
			return createToken('NUMBER', val);
		}

		function scanString() {
			let start = self.pos;
			++self.pos;
			while (!atEnd() && peek() !== '"') {
				let ch = peek();
				if (ch === '\\') {
					self.pos += 2;
				} else {
					++self.pos;
				}
			}
			if (peek() !== '"') {
				ERROR(self.line, self.char, `Looks like the file ended in the middle of a string`);
			}
			let str = self.source.substr(start + 1, self.pos - start - 1);
			++self.pos;
			return createToken('STRING', str);
		}

		function scanSymbol() {
			let start = self.pos;
			while (!atEnd() && isidchar(peek())) {
				++self.pos;
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
			return createToken('EOF', -1);
		}
		let ch = peek();
		while (!atEnd() && !isspace(ch)) {
			if (ch === '-' || isdigit(ch)) {
				return scanNumber();
			} else if (ch === '"') {
				return scanString();
			} else {
				let sym = scanSymbol();
				let symL = sym.toLowerCase();
				if (isopcode(symL)) {
					return createToken('OPCODE', symL);
				} else if (sym.length) {
					return createToken('IDENTIFIER', sym);	
					// storage or address, we'll narrow it down later
				} else {
					ERROR(self.line, self.char, `Unrecognized token`);
				}
			}
		}
	};

	Scanner.prototype.scanProgram = function () {

		function createInstruction(num, instr, map) {
			//console.log(num, instr);
			if (instr[0].value === 'label') {
				map[instr[1].value] = num + 1;	// label maps to following instruction
			}
			return {location: num, tokens: instr};
		}

		let instruction = [],
				counter = 0,
				labelMap = {},
				instructions = [];
		while (true) {
			let token = this.scanToken();
			if (token.type === 'EOF') {
				break;
			}
			if (token.type === 'OPCODE') {
				if (instruction.length) {
					instructions.push(createInstruction(counter, instruction, labelMap));
					++counter;
					instruction = [];
				}
			}
			instruction.push(token);
		}
		if (instruction.length) {
			instructions.push(createInstruction(counter, instruction, labelMap));
		}

		return {instructions: instructions, labels: labelMap};
	}

	////////////////////////////////////////////////////////////////////////////
	// Compiler

	let Compiler = {};

	Compiler.compile = function (actor) {
		let source = actor.sourceCode,
				scanner = new Scanner(source);
		actor.program = scanner.scanProgram();
	}

	////////////////////////////////////////////////////////////////////////////
	// Testing

	let shotBot = `
# ShotBot
# Written 1/3/90 by David Harris

# Translated to MAGIC/VML by Tom Cornell

LABEL Main
	GT sys.range 0 A
	IFNZ A CallFireSub CallRotateSub
LABEL CallRotateSub
	ARGS -5
	CALL RotateSub 	# no return value to store
	JUMP IfEnd
LABEL CallFireSub
	ARGS 20
	CALL FireSub 	# no return value to store
LABEL IfEnd
	JUMP Main

LABEL FireSub
	STORE args.1 sys.fire
	RETURN

LABEL RotateSub
	ADD sys.aim args.1 sys.aim
	RETURN
	`;

/*
	let testBot = {
		sourceCode: shotBot,
		// Hardware Registers:
		aim: 0,
		fire: 0,
		range: 111,
	};

	testBot.isActive = function () {
		return true;
	}

	Compiler.compile(testBot);
	testBot.program.instructions.forEach((i) => console.log(i));
	console.log("map", testBot.program.labels);

	let interp = new Interpreter(testBot);
	while (true) {
		interp.step();		
	}
*/

	// EXPORTS
	ns.Interpreter = Interpreter;
	ns.samples = ns.samples || {};
	ns.samples.ShotBot = shotBot;
	ns.Compiler = Compiler;

	return ns;

})(MAGIC || {});
