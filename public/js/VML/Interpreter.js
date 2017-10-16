////////////////////////////////////////////////////////////////////////////
//
// Interpreter.js

var MAGIC = ((ns) => {

	// IMPORTS
	const constants = ns.constants,
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
		});
	}

	Interpreter.HWRegister = Object.freeze({
		aim: true,
		energy: true,
		fire: true,
		heading: true,
		look: true,
		random: true,
		range: true,
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
					let name = parts[0];
					if (!context.locals.hasOwnProperty(name)) {
						this.error(`Attempt to load unknown local (${name})`);
					}
					// Someday we may want to decode the local value
					// Also someday there might be locals with more than one part
					return context.locals[name];
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
			if (parts[0] === 'sys') {
				let reg = parts[1];
				if (!Interpreter.HWRegister.hasOwnProperty(reg)) {
					this.error(`Unrecognized hardware register (${reg})`);
				}
				decoded = {container: this.bot, key: reg};
			} else if (parts[0] === 'user') {
				decoded = {container: this.globals, key: parts[1]};
			} else {
				let frame = top(this.framestack);
				decoded = {container: frame.locals, key: parts[0]};
			}
			//console.log(decoded);
			return decoded;
		};

		let storeLVal = (lval, x) => {
			if (lval.container !== this.bot) {
				lval.container[lval.key] = x;
				return;
			}
			// Store to hardware registers:
			switch (lval.key) {
				case 'aim':
					this.bot.setAimDegrees(x);
					break;
				case 'fire':
					this.bot.addBulletEnergy(x);
					this.bot.fireWeapons();
					//this.bot.launchProjectile(this.bot.getAim(), x);
					break;
				case 'velocity_dx':
					this.bot.setSpeedX(x);
					break;
				case 'velocity_dy':
					this.bot.setSpeedY(x);
					break;
				default:
					this.error(`Attempt to write to unrecognized or read-only hardware register (${lval.key})`);
			}
		};

		let storeObject = (lval, v1, v2) => {
			// lval of the form {container: C, key: K}
			// lval.container should === this.bot in all cases (aka 'sys')
			// lval.key should be atomic ('velocity' or 'heading')
			switch (lval.key) {
				case 'velocity':
					// v1 -> dx, v2 -> dy
					this.bot.setVelocity(v1, v2);
					break;
				case 'heading':
					// v1 -> r, v2 -> th
					this.bot.setHeading(v1, v2);
					break;
				default:
					this.error(`Attempt to store to unrecognized hardware register (${lval.key})`);
			}
		};

		let getFromHardware = (agent, path) => {
			let reg0 = path.shift();
			switch (reg0) {
				case 'aim':
					return this.bot.getAimDegrees();
				case 'energy':
					return this.bot.getEnergy();
				case 'fire':
					return 0;
				case 'look':
					return this.bot.getLookDegrees();
				case 'random':
					return Math.random();
				case 'range':
					return this.bot.getSightDist();
				case 'velocity_dx':
					return this.bot.getSpeedX();
				case 'velocity_dy':
					return this.bot.getSpeedY();
				case 'wall':
					return this.bot.module('wall').get(path);
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

		//
		//---------------------- Mainline -----------------------------------
		//

		// Any interrupts to handle?
		if (this.irflag && this.irq.length()) {
			this.irq.forEach((sensor) => {
				let hdlr = sensor.getHandler();
				if (isNaN(hdlr) || hdlr < 0 || hdlr >= this.program.instructions.length) {
					this.error(`Bad return address: ${hdlr}`);
				}
				let frame = pushNewFrame(this.framestack);
				frame.return = this.pc;
				this.irflag = false;	// turn off interrupts on branching to a handler
				this.pc = hdlr;
			});
		}

		// Okay, execute the instruction at this.pc
		if (this.pc > this.program.length) {
			this.error(`Foops, out of rope! (${this.pc})`);
		}

		let instruction = this.program.instructions[this.pc],
				opcode = instruction.opcode;
		// sanity check:
		if (this.pc !== instruction.debug.address) {
			this.error(`PC does not match instr addr: ${this.pc}/${instruction.debug.address}`);
		}

		//console.log("step:", instruction);
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

		let args = instruction.args,
				dest = decodeLVal(instruction.store),
		    val1,
				val2,
				scale,
				brElse;
		switch (opcode) {
			case 'abs':
				unaryOp(Math.abs, rval(args[0]), dest);
				break;
			case 'add':
				binOp((a,b)=>a+b, rval(args[0]), rval(args[1]), dest);
				break;
			case 'call':
				doCall(rval(args[0]), args/*.slice(1)*/, dest);
				break;
			case 'cos':
				scale = (args.length > 1) ? rval(args[1]) : 1;
				binOp((a,b)=>Math.cos(a)*b, rval(args[0]), scale, dest);
				break;
			case 'debug':
				console.log(`Turning tracing on for ${this.bot.getName()}`);
				this.doTrace = true;
				++this.pc;
				this.step();
				break;
			case 'div':
				binOp((a,b)=>a/b, rval(args[0]), rval(args[1]), dest);
				break;
			case 'eq':
				binOp((a,b)=>(a===b) ? 1 : 0, rval(args[0]), rval(args[1]), dest);
				break;
			case 'flushint':
				this.irq.clear();
				++this.pc;
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
			case 'intoff':
				this.irflag = false;
				++this.pc;
				break;
			case 'inton':
				this.irflag = true;
				++this.pc;
				break;
			case 'jump':
				let addr = rval(args[0]);
				if (isNaN(addr) 
					|| addr < 0 
					|| addr >= this.program.instructions.length) {
					this.error(`Bad jump address: ${addr}`);
				}
				this.pc = addr;
				break;
			case 'log':
				let logmsg = "LOG: ";
				args.forEach((arg) => {
					logmsg += `${rval(arg)} `;
				});
				console.log(logmsg);
				++this.pc;
				this.step();	// log is a free instruction, so do one more
				break;
			case 'lt':
				binOp((a,b) => (a<b) ? 1 : 0, rval(args[0]), rval(args[1]), dest);
				break;
			case 'lte':
				binOp((a,b) => (a<=b) ? 1 : 0, rval(args[0]), rval(args[1]), dest);
				break;
			case 'mul':
				binOp((a,b)=>a*b, rval(args[0]), rval(args[1]), dest);
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
					this.pc = frame.return;
				}
				break;
			case 'rti': {
					let frame = top(this.framestack);
					this.irflag = true;
					if (isNaN(frame.return) 
						|| frame.return < 0 
						|| frame.return >= this.program.instructions.length) {
						this.error(`Bad return address: ${frame.return}`);
					}
					this.pc = frame.return;
				}
				break;
			case 'setint': 	// <interrupt name> <addr> 
				setInterruptHandler(args[0], rval(args[1]));
				break;
			case 'setlimit':
				setInterruptSensitivity(args[0], rval(args[1]));
				break;
			case 'sin':
				scale = (args.length > 1) ? rval(args[1]) : 1;
				binOp((a,b) => Math.sin(a) * b, rval(args[0]), scale, dest);
				break;
			case 'store':
				unaryOp((a)=>a, rval(args[0]), dest);
				break;
			case 'store2':
				val1 = rval(args[0]);
				val2 = rval(args[1]);
				storeObject(dest, val1, val2);
				++this.pc;
				break;
			case 'sub':
				binOp((a,b)=>a-b, rval(args[0]), rval(args[1]), dest);
				break;
			case 'sync':
				this.syncFlag = true;
				break;
			default:
				console.log("------------------------------------------");
				console.log(instruction);
				console.log(this.framestack);
				this.error(`Unhandled opcode '${opcode}'`);
		}

	};


	// EXPORTS
	ns.Interpreter = Interpreter;

	return ns;

})(MAGIC || {});
