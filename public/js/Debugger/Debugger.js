////////////////////////////////////////////////////////////////////////////
// Debugger.js

var MAGIC = ((ns) => {

	// IMPORTS
	let e_ = ns.e_;
	let Compiler = ns.Compiler;

	function Debugger (game, agent) {
		this.parent = game;
		this.agent = agent;
		this.clock = 0;
	}

	Debugger.prototype.startOfChronon = function () {
		return this.clock === 0;
	};

	Debugger.prototype.endOfChronon = function () {
		return this.clock >= this.agent.getCPU();
	};

	Debugger.prototype.getClock = function () {
		return this.clock;
	};

	Debugger.prototype.advanceClock = function () {
		++this.clock;
	};

	Debugger.prototype.resetClock = function () {
		this.clock = 0;
	};

	/**
	 * This basically makes sure that endOfChronon() will return 'true'.
	 */
	Debugger.prototype.sync = function () {
		this.clock = this.agent.getCPU();
	};


	Debugger.prototype.start = function () {
		let container = e_('debug-container');

		// Set up the HTML elements
		this.dbgGutter = document.createElement('div');
		this.dbgGutter.id = 'dbg-gutter';
		container.appendChild(this.dbgGutter);
		this.dbgViewer = document.createElement('div');
		this.dbgViewer.id = 'dbg-viewer';
		container.appendChild(this.dbgViewer);
		this.dbgHighlighter = document.createElement('div');
		this.dbgHighlighter.id = 'dbg-highlighter';
		container.appendChild(this.dbgHighlighter);

		// Get the program text
		this.lines = Compiler.decompile(this.agent);
		this.displayText();

		container.style.display = 'block';
	};

	Debugger.prototype.displayText = function () {
		let pc = this.agent.interpreter.pc,
				start = pc < 15 ? 0 : pc - 15,
				len = 40;
		this.dbgGutter.innerText = "";
		this.dbgViewer.innerText = "";
		this.lines.slice(start, start + len).forEach((line, i) => {
			this.dbgGutter.innerText += `${start + i + 1}` + '\n';
			this.dbgViewer.innerText += line + '\n';
		});
		let currentLine = pc - start;
		this.dbgHighlighter.style.top = `${currentLine * 15}pt`;
	};

	Debugger.prototype.stop = function () {
		console.log('Debugger::stop');
		let container = e_('debug-container');
		while (container.lastChild) {
			container.removeChild(container.lastChild);
		}
		container.style.display = 'none';
	}

	Debugger.prototype.listen = function (instruction, decodedVals) {
		this.displayText();
	};



	// EXPORTS
	ns.Debugger = Debugger;

	return ns;

})(MAGIC || {});
