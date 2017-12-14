////////////////////////////////////////////////////////////////////////////
//
// Interpreter.js

var MAGIC = ((ns) => {

	// IMPORTS
	const constants = ns.constants,
				radians = ns.radians,
				zipForEach = ns.zipForEach;


	function ERROR (file, line, char, msg) {
		console.log(`[${file}:${line}.${char}] ERROR ${msg}`);
		throw new Error(msg);
	}


	function InterruptQueue () {
		this.queue = [];
	}

	InterruptQueue.prototype.clear = function () {
		this.queue = [];
	};

	InterruptQueue.prototype.length = function () {
		return this.queue.length;
	};

	InterruptQueue.prototype.forEach = function (f) {
		this.queue.forEach(f);
	};

	InterruptQueue.prototype.insert = function (sensor) {
		// Smaller priority value means higher priority
		// (Sort queue in ascending order of priority)
		let pri1 = sensor.getPriority();
		for (let i = 0; i < this.queue.length; ++i) {
			if (sensor === this.queue[i]) {
				return;		// already queued, somehow -- maybe never handled?
			}
			let pri2 = this.queue[i].getPriority();
			if (pri2 > pri1) {
				this.queue.splice(i, 0, sensor);
				return;
				// This will add this interrupt to the end of any sub-sequence of
				// interrupts all with the same priority as this. So, on priority
				// ties, first come, first served.
			}
		}
		// No lower priority interrupts on queue
		this.queue.push(sensor);
	};

	InterruptQueue.prototype.shift = function () {
		return this.queue.shift();
	};


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
			doTrace: false,
			trace: [],
			irflag: false,	// interrupts enabled
			irq: new InterruptQueue(),				// interrupt queue
			listeners: [],	// e.g., the debugger
		});
	}

	Interpreter.HWRegister = Object.freeze({
		agents: true,
		aim: true,
		energy: true,
		fire: true,
		heading: true,
		mv: true,
		random: true,
		velocity_dx: true,
		velocity_dy: true,
		velocity: true,
		wall: true,
		wall_north: true,
		wall_west: true,
		wall_south: true,
		wall_east: true,
		x: true,
		y: true,
	});

	Interpreter.prototype.error = function (msg) {
		ERROR(this.bot.getName(), this.pc, 0, msg);
	};

	Interpreter.prototype.queueInterrupt = function (sensor) {
		this.irq.insert(sensor);
	};

	Interpreter.prototype.registerListener = function (listener) {
		this.listeners.push(listener);
	};

	Interpreter.prototype.removeListener = function (listener) {
		let i = this.listeners.indexOf(listener);
		this.listeners.splice(i, 1);
	};

	Interpreter.prototype.clearListeners = function () {
		this.listeners = [];
	};

	Interpreter.prototype.step = function () {

		let top = (framestack) => {
			if (framestack.length === 0) {
				return null;
			}
			return framestack[framestack.length - 1];
		};

		/**
		 * Used mainly to access the caller's frame from within a function body,
		 * for decoding arguments.
		 */
		let antetop = (framestack) => {
			if (framestack.length < 2) {
				return null;
			}
			return framestack[framestack.length - 2];
		};

		let pushNewFrame = (framestack) => {
			let frame = {
				args: [{}],		// arg.0 is reserved
				locals: {},
			};
			framestack.push(frame);
			return frame;
		};

		let popFrame = (framestack) => {
			return framestack.pop();
		};

		let readFromPath = (object, path) => {
			if (path.length === 0) {
				return object;
			}
			else {
				let nxt = path.shift();
				if (!object.hasOwnProperty(nxt)) {
					this.error(`Attempt to read from non-existent location '${nxt}'`);
				}
				return readFromPath(object[nxt], path);
			}
		};

		let rval = (token, context) => {
			if (!context) {
				context = top(this.framestack);
			}
//			console.log("rval", token, context);
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
					parts.shift();	// discard 'sys' prefix
					return getFromHardware(this.bot, parts);
					//return this.bot[reg];
				} else if (parts[0] === 'user') {
					// Fetch contents of global register
					// Eventually we should consider recursively decoding that
					if (!this.globals.hasOwnProperty(parts[1])) {
						this.error(`Attempt to load undefined global (${parts[1]})`);
					}
					return this.globals[parts[1]];
				} else if (parts[0] === 'args') {
					// Fetch a token from the args list
					let i = parseInt(parts[1]);
					if (isNaN(i)) {
						this.error(`Args index is not a number: ${parts[1]}`);
					}
					--i;	// args in VML is 1-based; the args array in JS is 0-based
					if (i >= context.args.length) {
						this.error(`Args index out of bounds: ${i}`);
					}
					let argi = context.args[i];
					// Decode it (it's still a raw token)
					return rval(argi, antetop(this.framestack));
				} else if (this.program.labels.hasOwnProperty(parts[0])) {
					// Return the program location for this label
					return this.program.labels[parts[0]];
				} else {
					// Must be a local
					let val = readFromPath(context.locals, parts);
					/*
					let name = parts[0];
					if (!context.locals.hasOwnProperty(name)) {
						this.error(`Attempt to load unknown local (${name})`);
					}
					// Someday we may want to decode the local value
					// Also someday there might be locals with more than one part
					return context.locals[name];
					*/
					return val;
				}
			}
		};

		/**
		 * In general, an LValue will look like:
		 * { container: ..., key: ... }
		 */
		let decodeLVal = (storagePath) => {
			let parts = storagePath.split('.');
			var decoded;
			let prefix = parts.shift();
			if (prefix === 'sys') {
				let mod = parts[0];
				if (!Interpreter.HWRegister.hasOwnProperty(mod)) {
					this.error(`Unrecognized hardware module (${mod})`);
				}
				decoded = {container: this.bot, key: parts};
			} else if (prefix === 'user') {
				decoded = {container: this.globals, key: parts};
			} else {
				let frame = top(this.framestack);
				parts.unshift(prefix);
				decoded = {container: frame.locals, key: parts};
			}
			//console.log(decoded);
			return decoded;
		};

		let storeToPath = (obj, path, val) => {
			if (path.length === 1) {
				obj[path[0]] = val;
			}
			else {
				let nxt = path.shift();
				if (!obj.hasOwnProperty(nxt)) {
					obj[nxt] = {};
				}
				storeToPath(obj[nxt], path, val);
			}
		};

		let storeLVal = (lval, x) => {
			if (lval.container !== this.bot) {
				storeToPath(lval.container, lval.key, x);
				return;
			}
			// Store to hardware registers:
			let module = lval.key.shift();
			switch (module) {
				case 'agents':
					this.bot.module('agents').write(lval.key, x);
					break;
				case 'aim':
					// lval.key should be []
					this.bot.setAimDegrees(x);
					break;
				case 'fire':
					// lval.key should be []
					this.bot.addBulletEnergy(x);
					this.bot.fireWeapons();
					break;
				case 'mv':
					this.bot.module('mv').write(lval.key, x);
					break;
				case 'velocity_dx':
					// lval.key should be []
					this.bot.setSpeedX(x);
					break;
				case 'velocity_dy':
					// lval.key should be []
					this.bot.setSpeedY(x);
					break;
				case 'wall':
					this.bot.module('wall').write(lval.key, x);
					break;
				default:
					this.error(`Attempt to write to unrecognized or read-only hardware register (${module})`);
			}
		};

		let storeTuple = (lval, tuple) => {
			let path = lval.key,
					reg = path.shift();
			switch (reg) {
				case 'mv':
					this.bot.module('mv').writev(path, tuple);
					break;
				case 'velocity':
					// v1 -> dx, v2 -> dy
					this.bot.setVelocity(tuple[0], tuple[1]);
					break;
				case 'heading':
					// v1 -> r, v2 -> th
					this.bot.setHeading(tuple[0], radians(tuple[1]));
					break;
				default:
					this.error(`Attempt to store to unrecognized hardware register (${reg}.${path.join(".")})`);
			}
		};

		let getFromHardware = (agent, path) => {
			let reg0 = path.shift();
			switch (reg0) {
				case 'agents':
					return this.bot.module('agents').read(path);
				case 'aim':
					return this.bot.getAimDegrees();
				case 'energy':
					return this.bot.getEnergy();
				case 'fire':
					return 0;
				case 'mv':
					return this.bot.module('mv').read(path);
				case 'random':
					return Math.random();
				case 'velocity_dx':
					return this.bot.getSpeedX();
				case 'velocity_dy':
					return this.bot.getSpeedY();
				case 'wall':
					return this.bot.module('wall').read(path);
				case 'x':
					return this.bot.getPosX();
				case 'y':
					return this.bot.getPosY();
				default:
					// Unreachable?
					this.error(`getFromHardware: Bad register (${reg0})`);
			}
		};

		let unaryOp = (op, arg, dest) => {
			storeLVal(dest, op(arg));
			++this.pc;
		};

		let binOp = (op, arg1, arg2, dest) => {
			storeLVal(dest, op(arg1, arg2));
			++this.pc;
		};

		let doCall = (addr, args, dest) => {
			let frame = pushNewFrame(this.framestack);
			frame.args = args.slice(1);	// REVIEW: args is a slice, a shallow copy of instruction args
			frame.retval = dest ? dest : null;
			frame.return = this.pc + 1;
			if (isNaN(addr) 
				|| addr < 0 
				|| addr >= this.program.instructions.length) {
				this.error(`Bad jump address: ${addr}`);
			}
			this.pc = addr;
		};

		let doConditional = (cond, brThen, brElse) => {
			if (cond) {
				this.pc = brThen;
			} else if (brElse) {	// REVIEW: what if the else addr is actually zero?
				this.pc = brElse;
			} else {
				++this.pc;
			}
		};

		let setInterruptHandler = (name, hdlr) => {
			// @name should be the name of a sensor,
			// @hdlr should be the address of an interrupt handling routine
			// for interrupts generated by that sensor.
			let path = name.value.split('.');
			path.shift(); 	// discard 'sys'
			this.bot.setInterruptHandler(path, hdlr);
			++this.pc;
		};

		let setInterruptSensitivity = (name, param) => {
			let path = name.value.split('.');
			path.shift();		// discard 'sys'
			this.bot.setInterruptSensitivity(path, param);
			++this.pc;
		};

		let checkIRQ = () => {
			if (!this.irflag) {
				return;
			}
			let hdlr = -1;
			// Get us the first interrupt with a valid handler address
			while (this.irq.length() > 0 && hdlr === -1) {
				let sensor = this.irq.shift();
				hdlr = sensor.getHandler();
			}
			// irq empty OR hdlr exists
			if (hdlr === -1) {
				// Queue empty. No interrupts to service
				return;
			}
			if (isNaN(hdlr) || hdlr < 0 || hdlr >= this.program.instructions.length) {
				this.error(`Bad interrupt handler address: ${hdlr}`);
			}
			// Call interrupt handler as if it was a subroutine, 
			let frame = pushNewFrame(this.framestack);
			frame.return = this.pc;
			// Don't add 1 to PC. We haven't executed this instruction yet.
			this.irflag = false;	// turn off interrupts on branching to a handler
			this.pc = hdlr;
		};

		let checkTrace = (instruction) => {
			if (this.doTrace) {
				let name = this.bot.getName(),
						line = instruction.debug.line;
				let traceRecord = `[${name}.${line}] `;
				if (instruction.store) {
					traceRecord += `${instruction.store} = `;
				}
				if (instruction.opcode != 'store') {
					traceRecord += `${instruction.opcode} `;
				}
				instruction.args.forEach((arg) => {
					traceRecord += `${arg.value} `;
				});
				this.trace.push(traceRecord);
			}
		};

		//
		//---------------------- Mainline -----------------------------------
		//

		// Any interrupts to handle? This will set the PC to the handler
		// address, if so.
		checkIRQ();

		// Okay, execute the instruction at this.pc
		if (this.pc > this.program.length) {
			this.error(`Foops, out of rope! (${this.pc})`);
		}
		let instruction = this.program.instructions[this.pc],
				opcode = instruction.opcode;

//		console.log("step:", instruction);

		checkTrace(instruction);

		let args = instruction.args,
				dest = decodeLVal(instruction.store),
				vals,
				scale,
				brElse,
				thisOnesFree = false;
		switch (opcode) {
			case 'abs':
				unaryOp(Math.abs, rval(args[0]), dest);
				break;
			case 'add':
				binOp((a,b)=>a+b, rval(args[0]), rval(args[1]), dest);
				break;
			case 'call':
				doCall(rval(args[0]), args, dest);
				break;
			case 'cos':
				scale = (args.length > 1) ? rval(args[1]) : 1;
				binOp((a,b)=>Math.cos(a)*b, rval(args[0]), scale, dest);
				break;
			case 'debug':
				console.log(`Turning tracing on for ${this.bot.getName()}`);
				this.doTrace = true;
				++this.pc;
				thisOnesFree = true;
				break;
			case 'div':
				binOp((a,b)=>a/b, rval(args[0]), rval(args[1]), dest);
				break;
			case 'eq':
				binOp((a,b)=>(a===b) ? 1 : 0, rval(args[0]), rval(args[1]), dest);
				break;
			case 'gt':
				binOp((a,b)=>(a>b) ? 1 : 0, rval(args[0]), rval(args[1]), dest);
				break;
			case 'gte':
				binOp((a,b)=>(a>=b) ? 1 : 0, rval(args[0]), rval(args[1]), dest);
				break;
			case 'if':
			case 'ifnz':
				brElse = (args.length === 3) ? rval(args[2]) : null;
				doConditional(rval(args[0]), rval(args[1]), brElse);
				break;
			case 'ifz':
				brElse = (args.length === 3) ? rval(args[2]) : null;
				doConditional(!rval(args[0]), rval(args[1]), brElse);
				break;
			case 'ircall': 	// <interrupt name> <addr> 
				setInterruptHandler(args[0], rval(args[1]));
				break;
			case 'ircontinue': {
					let frame = popFrame(this.framestack);
					this.irflag = true;
					if (args.length === 1) {
						frame.return = rval(args[0]);
					}
					if (isNaN(frame.return) 
						|| frame.return < 0 
						|| frame.return >= this.program.instructions.length) {
						this.error(`ircontinue: Bad return address: ${frame.return}`);
					}
					this.pc = frame.return;
				}
				break;
			case 'irflush':
				this.irq.clear()
				++this.pc;
				break;
			case 'irparam':
				setInterruptSensitivity(args[0], rval(args[1]));
				break;
			case 'irstart':
				this.irflag = true;
				++this.pc;
				break;
			case 'irstop':
				this.irflag = false;
				++this.pc;
				break;
			case 'jump':
				let addr = rval(args[0]);
				if (isNaN(addr) 
					|| addr < 0 
					|| addr >= this.program.instructions.length) {
					this.error(`jump: Bad address: ${addr}`);
				}
				this.pc = addr;
				break;
			case 'log':
				let logmsg = `[${this.bot.getName()}] LOG: `;
				args.forEach((arg) => {
					logmsg += `${rval(arg)} `;
				});
				console.log(logmsg);
				++this.pc;
				thisOnesFree = true;
				break;
			case 'lt':
				binOp((a,b) => (a<b) ? 1 : 0, rval(args[0]), rval(args[1]), dest);
				break;
			case 'lte':
				binOp((a,b) => (a<=b) ? 1 : 0, rval(args[0]), rval(args[1]), dest);
				break;
			case 'max':
				binOp(Math.max, rval(args[0]), rval(args[1]), dest);
				break;
			case 'min':
				binOp(Math.min, rval(args[0]), rval(args[1]), dest);
				break;
			case 'mod':
				binOp((a,b) => a % b, rval(args[0]), rval(args[1]), dest);
				break;
			case 'mul':
				binOp((a,b)=>a*b, rval(args[0]), rval(args[1]), dest);
				break;
			case 'neq':
				binOp((a,b)=>(a!==b) ? 1 : 0, rval(args[0]), rval(args[1]), dest);
				break;
			case 'noop':
				++this.pc;
				break;
			case 'not':
				unaryOp((a)=>!a, rval(args[0]), dest);
				break;
			case 'or':
				binOp((a,b)=>a||b, rval(args[0]), rval(args[1]), dest);
				break;
			case 'return': {
					let frame = top(this.framestack);
					if (args.length > 0 && frame.retval) {
						storeLVal(frame.retval, rval(args[0]));
					}
					if (isNaN(frame.return) 
						|| frame.return < 0 
						|| frame.return >= this.program.instructions.length) {
						this.error(`Bad return address: ${frame.return}`);
					}
					popFrame(this.framestack);
					this.pc = frame.return;
				}
				break;
			case 'sin':
				scale = (args.length > 1) ? rval(args[1]) : 1;
				binOp((a,b) => Math.sin(a) * b, rval(args[0]), scale, dest);
				break;
			case 'store':
				unaryOp((a)=>a, rval(args[0]), dest);
				break;
			case 'sub':
				binOp((a,b)=>a-b, rval(args[0]), rval(args[1]), dest);
				break;
			case 'sync':
				this.syncFlag = true;
				++this.pc;
				break;
			case 'tuple': {
					let t = [];
					args.forEach((a) => t.push(rval(a)));
					storeTuple(dest, t);
					++this.pc;
				}
				break;
			default:
				console.log("------------------------------------------");
				console.log(instruction);
				console.log(this.framestack);
				this.error(`Unhandled opcode '${opcode}'`);
		}

		this.listeners.forEach((l) => l.listen(instruction, vals));

		if (thisOnesFree) {
			this.step();
		}

	};


	// EXPORTS
	ns.Interpreter = Interpreter;

	return ns;

})(MAGIC || {});
