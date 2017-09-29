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


	// EXPORTS
	ns.Interpreter = Interpreter;

	return ns;

})(MAGIC || {});
