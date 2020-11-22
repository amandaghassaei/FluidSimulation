import { stepSVGParticles } from './exports';
import { 
	fluidOnResize,
	stepFluid,
} from './fluid';
import './interactions';
import MicroModal from 'micromodal';
import {
	particlesOnResize,
	stepParticles,
} from './particles';
import { stepInteraction } from './interactions';
import { guiOnResize, hideGUI, showGUI } from './gui';
import { canvas } from './gl';

// Init help modal.
MicroModal.init();

let paused = false;
// Keyboard handlers.
window.addEventListener('keydown', (e: KeyboardEvent) => {
	if (e.code === 'Space') {
		paused = !paused;
		paused ? showGUI() : hideGUI();
	}
});

// Add resize listener.
onResize();
window.addEventListener('resize', onResize);
let needsResize = false;
function onResize() {
	if (paused) {
		needsResize = true;
		return;
	}
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	particlesOnResize(width, height);
	fluidOnResize(width, height);
	guiOnResize(width, height);
	needsResize = false;
}

// Start render loop.
window.requestAnimationFrame(step);
function step() {
	// Start a new render cycle.
	window.requestAnimationFrame(step);

	if (paused) {
		stepSVGParticles();
		return;
	}

	if (needsResize) {
		onResize();
	}

	// Apply interactions.
	stepInteraction();

	// Step simulation.
	stepFluid();
	stepParticles();
}