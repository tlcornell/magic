////////////////////////////////////////////////////////////////////////////
// Debugger.js

var MAGIC = ((ns) => {

	// IMPORTS
	let e_ = ns.e_;
	let Compiler = ns.Compiler;

	function Debugger (game, agent) {
		this.parent = game;
		this.agent = agent;
	}

	Debugger.prototype.start = function () {
		let container = e_('debug-container');

		// Set up the HTML elements
		let dbgGutter = document.createElement('div');
		dbgGutter.id = 'dbg-gutter';
		container.appendChild(dbgGutter);
		let dbgViewer = document.createElement('div');
		dbgViewer.id = 'dbg-viewer';
		container.appendChild(dbgViewer);
		let dbgHighlighter = document.createElement('div');
		dbgHighlighter.id = 'dbg-highlighter';
		container.appendChild(dbgHighlighter);

		// Get the program text
		let lines = Compiler.decompile(this.agent),
				start = 0,
				len = 40;
		lines.slice(start, start + len).forEach((line, i) => {
			dbgGutter.innerText += `${i + 1}` + '\n';
			dbgViewer.innerText += line + '\n';
		});
		let currentLine = 0;
		dbgHighlighter.style.top = '0pt';

		container.style.display = 'block';
	};

	Debugger.prototype.stop = function () {
		let container = e_('debug-container');
		while (container.lastChild) {
			container.removeChild(container.lastChild);
		}
		container.style.display = 'none';
	}

	// EXPORTS
	ns.Debugger = Debugger;

	return ns;

})(MAGIC || {});
