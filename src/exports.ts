import { canvas, glcompute } from './gl';
import { initRandomPositions } from './particles';
import { PassThroughFragmentShader, PointsVertexShader, SingleColorFragShader } from 'glcompute';
import { DT } from './constants';
import { velocityState } from './fluid';
const advectParticlesSource = require('./kernels/AdvectSVGParticlesShader.glsl');
import { saveAs } from 'file-saver';
import { paths2DToGcode } from './plotterUtils';
import MicroModal from 'micromodal';

export const guiState = {
 	'Num Particles': 1000,
	'Trail Length': 1000,
	'Trail Subsampling': 10,
	'Regenerate': generateNewSVGParticles,
}

export const svgExportState = {
	'Min Segment Length (pt)': 1,
	'Save SVG': saveSVG,
}

export const gcodeExportState = {
	'Units': 'inch',
	'Width (in)': canvas.clientWidth / 72,
	'Height (in)': canvas.clientHeight / 72,
	'Min Segment Length (in)': 0.03,
	'Draw Height (in)': 0,
	'Retract Height (in)': 0.125,
	'Draw Both Directions': true,
	'Feed Rate (ipm)': 60,
	'Save G-Code': saveGcode,
}

let numSteps = 0;
let pathGenerator: PathGenerator | null = null;

let initialPositions = initRandomPositions(new Float32Array(guiState['Num Particles'] * 2), canvas.clientWidth, canvas.clientHeight);
const particlePositionState = glcompute.initDataLayer('position', {
	dimensions: guiState['Num Particles'],
	type: 'float32',
	numComponents: 2,
	data: initialPositions,
}, true, 2);
// Init a render target for trail effect.
const trailState = glcompute.initDataLayer('trails', {
	dimensions: [canvas.clientWidth, canvas.clientHeight],
	type: 'uint8',
	numComponents: 4,
}, true, 2);
const advectParticles = glcompute.initProgram('advectParticles', advectParticlesSource, [
	{
		name: 'u_positions',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_velocity',
		value: 1,
		dataType: 'INT',
	},
	{
		name: 'u_dt',
		value: DT / guiState['Trail Subsampling'],
		dataType: 'FLOAT',
	},
	{
		name: 'u_pxSize',
		value: [ 1 / canvas.clientWidth, 1 / canvas.clientHeight ],
		dataType: 'FLOAT',
	},
]);
const renderParticles = glcompute.initProgram('renderParticles', SingleColorFragShader, [], PointsVertexShader);
const overlayTexture = glcompute.initProgram('particleOverlay', PassThroughFragmentShader, [
	{
		name: 'u_state',
		value: 0,
		dataType: 'INT',
	},
]);

export function generateNewSVGParticles() {
	initialPositions = initRandomPositions(new Float32Array(guiState['Num Particles'] * 2), canvas.clientWidth, canvas.clientHeight)
	generateNewSVGTrails();
}
export function generateNewSVGTrails() {
	// Use same initial positions, just generate new trails.
	particlePositionState.resize(guiState['Num Particles'], initialPositions);
	// Clear the current particleTrails.
	trailState.clear();
	numSteps = 0;
}

export function stepSVGParticles() {
	if (pathGenerator) {
		pathGenerator.step();
		return;
	}
	for (let i = 0; i < 20 * guiState['Trail Subsampling']; i++) { // this helps to speeds things along with the visualization.
		if (numSteps++ < guiState['Trail Length'] * guiState['Trail Subsampling']) {
			// Advect particles.
			advectParticles.setUniform('u_dt', DT / guiState['Trail Subsampling'], 'FLOAT');
			glcompute.step(advectParticles, [particlePositionState, velocityState], particlePositionState);
			// Render particles to texture for trail effect.
			// TODO: draw line segments instead.
			glcompute.drawPoints(renderParticles, [particlePositionState], trailState);
			// Render to screen.
			glcompute.step(overlayTexture, [trailState], undefined);
		} else {
			return;
		}
	}
}

function getEdgeIntersectionWithBounds(p1: [number, number], p2: [number, number]) {
	let t = (0 - p2[0]) / (p1[0] - p2[0]);
	if (t < 0 || t > 1) {
		t = (canvas.clientWidth - p2[0]) / (p1[0] - p2[0]);
		if (t < 0 || t > 1) {
			t = (0 - p2[1]) / (p1[1] - p2[1]);
			if (t < 0 || t > 1) {
				t = (canvas.clientHeight - p2[1]) / (p1[1] - p2[1]);
			}
		}
	}
	if (t < 0 || t > 1) {
		return null;
	}

	return [p1[0] * t + p2[0] * (1 - t), p1[1] * t + p2[1] * (1 - t)] as [number, number];
}

const exportMsg = document.getElementById('exportMsg') as HTMLDivElement;

class PathGenerator {
	private readonly numParticles: number;
	private readonly trailLength: number;
	private readonly numSubsamples: number;
	private readonly minSegmentLength: number;
	private readonly paths: [number, number][][] = [];
	private readonly lastPositions: [number, number][] = [];
	private iternum = 0;
	private readonly onFinish: (paths: [number, number][][]) => void;

	constructor(minSegmentLength: number, onFinish: (paths: [number, number][][]) => void) {
		this.numParticles = guiState['Num Particles'];
		this.trailLength = guiState['Trail Length'];
		this.numSubsamples = guiState['Trail Subsampling'];
		this.minSegmentLength = minSegmentLength;
		this.onFinish = onFinish;

		// Set initial positions.
		for (let j = 0; j < this.numParticles; j++) {
			const position = [initialPositions[2 * j], initialPositions[2 * j + 1]] as [number, number];
			this.paths.push([position]);
			this.lastPositions.push(position);
		}
		// Set back to initial state.
		particlePositionState.resize(this.numParticles, initialPositions);
	}

	step() {
		// Init a place to store the current positions.
		let currentPositions!: Float32Array;
		const minSegmentLengthSq = this.minSegmentLength * this.minSegmentLength;
		for (let i = 0; i < 20 * this.numSubsamples; i++) {
			// Advect particles.
			advectParticles.setUniform('u_dt', DT / this.numSubsamples, 'FLOAT');
			glcompute.step(advectParticles, [particlePositionState, velocityState], particlePositionState);
			// Read data to CPU.
			currentPositions = glcompute.getValues(particlePositionState);
			exportMsg.innerHTML = `Saving particle paths ${this.iternum} / ${this.trailLength * this.numSubsamples}`;
			for (let j = 0; j < this.numParticles; j++) {
				const lastPosition = this.lastPositions[j];
				const position = [currentPositions[2*j], currentPositions[2*j+1]] as [number, number];
				// Check that segment is sufficiently large.
				// Too many short segments will slow down the plotting time.
				let segLengthSq = (lastPosition[0] - position[0]) * (lastPosition[0] - position[0]) + (lastPosition[1] - position[1]) * (lastPosition[1] - position[1]);
				if (segLengthSq < minSegmentLengthSq) {
					continue;
				}
				// Check that we haven't wrapped over the edge of the canvas onto the other side.
				if (Math.abs(lastPosition[0] - position[0]) / canvas.clientWidth > 0.9 ||
					Math.abs(lastPosition[1] - position[1]) / canvas.clientHeight > 0.9) {
					// Extend this to the edge of the canvas by calculating an intersection.
					const extendedPosition1 = position.slice() as [number, number];
					const extendedPosition2 = lastPosition.slice() as [number, number];
					if (Math.abs(lastPosition[0] - position[0]) / canvas.clientWidth > 0.9) {
						if (lastPosition[0] > position[0]) {
							extendedPosition1[0] += canvas.clientWidth;
							extendedPosition2[0] -= canvas.clientWidth;
						} else {
							extendedPosition1[0] -= canvas.clientWidth;
							extendedPosition2[0] += canvas.clientWidth;
						}
					}
					if (Math.abs(lastPosition[1] - position[1]) / canvas.clientHeight > 0.9) {
						if (lastPosition[1] > position[1]) {
							extendedPosition1[1] += canvas.clientHeight;
							extendedPosition2[1] -= canvas.clientHeight;
						} else {
							extendedPosition1[1] -= canvas.clientHeight;
							extendedPosition2[1] += canvas.clientHeight;
						}
					}

					const edge1 = getEdgeIntersectionWithBounds(lastPosition, extendedPosition1);
					if (edge1) {
						this.paths[j].push(edge1);
					}

					this.paths.push(this.paths[j].slice());// Push this path to the end of the list.
					// Start a new path at this index.
					this.paths[j] = [];

					const edge2 = getEdgeIntersectionWithBounds(extendedPosition2, position);
					if (edge2) {
						this.paths[j].push(edge2);
					}
				} else if (segLengthSq > 100){
					// TODO: sometimes there is a factor of two error from the float conversion.
					// I need to fix this.
					if (Math.round(position[0] / lastPosition[0]) === 2) {
						position[0] /= 2;
					}
					if (Math.round(position[1] / lastPosition[1]) === 2) {
						position[1] /= 2;
					}
					segLengthSq = (lastPosition[0] - position[0]) * (lastPosition[0] - position[0]) + (lastPosition[1] - position[1]) * (lastPosition[1] - position[1]);
					if (segLengthSq > 100) {
						console.warn('Bad position: ', lastPosition, position);
						continue;// Ignore this point.
					}
				}
				this.paths[j].push(position);
				this.lastPositions[j] = position;
			}
			this.iternum += 1;
			if (this.iternum >= this.trailLength * this.numSubsamples) {
				this.finalChecks(currentPositions);
				return;
			}
		}
	}

	finalChecks(currentPositions: Float32Array) {
		for (let j = 0; j < this.numParticles; j++) {
			// Check if any of these paths don't contain any segments.
			if (this.paths[j].length === 1) {
				// Add a segment, even if it is < minSegLength;
				this.paths[j].push([currentPositions[2 * j], currentPositions[2 * j + 1]]);
			}
		}
		this.onFinish(this.paths);
	}

	cancel() {
		pathGenerator = null;
	}
}


function saveSVG() {
	// Get params.
	const numParticles = guiState['Num Particles'];
	const trailLength = guiState['Trail Length'];

	pathGenerator = new PathGenerator(svgExportState['Min Segment Length (pt)'], (paths: [number, number][][]) => {
		let svg = `<?xml version="1.0" standalone="no"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.clientWidth}" height="${canvas.clientHeight}">`;
		for (let j = 0; j < paths.length; j++) {
			svg += `<path fill="none" stroke="black" stroke-width="1" d="M${paths[j][0][0]} ${canvas.clientHeight - paths[j][0][1]} `;
			for (let i = 1; i < paths[j].length; i++) {
				svg += `L${paths[j][i][0]} ${canvas.clientHeight - paths[j][i][1]} `;
			}
			svg += '" />';
		}
		svg += '</svg>';

		const blob = new Blob([svg], {type: "image/svg+xml;charset=utf-8"});
		saveAs(blob, `fluidsim_${numParticles}particles_${trailLength}length.svg`);
		MicroModal.close('exportModal');
		pathGenerator = null;
	});

	exportMsg.innerHTML = 'Saving SVG...';
	MicroModal.show('exportModal', {
		onClose: pathGenerator.cancel,
	});
}

function saveGcode() {
	// Get gcode params.
	const retractHeight = gcodeExportState['Retract Height (in)'];
	const feedHeight = gcodeExportState['Draw Height (in)'];
	const feedRate = gcodeExportState['Feed Rate (ipm)'];
	const scale = gcodeExportState['Width (in)'] / canvas.clientWidth;
	const preservePathDirection = !gcodeExportState['Draw Both Directions'];
	const numParticles = guiState['Num Particles'];
	const trailLength = guiState['Trail Length'];

	pathGenerator = new PathGenerator(gcodeExportState['Min Segment Length (in)'] / gcodeExportState['Width (in)'] * canvas.clientWidth, (paths: [number, number][][]) => {
		exportMsg.innerHTML = `Sorting paths...`;
		const gcode = paths2DToGcode(paths, {
			bounds: {
				min: [0, 0],
				max: [canvas.clientWidth, canvas.clientHeight],
			},
			retractHeight,
			feedHeight,
			feedRate,
			scale,
			preservePathDirection,
		});

		const blob = new Blob([gcode], {type: "text/plain;charset=utf-8"});
		saveAs(blob, `fluidsim_${numParticles}particles_${trailLength}length.nc`);
		MicroModal.close('exportModal');
		pathGenerator = null;
	});

	exportMsg.innerHTML = 'Saving G-Code...';
	MicroModal.show('exportModal', {
		onClose: pathGenerator.cancel,
	});
}

export function exportsOnResize(width: number, height: number) {
	trailState.resize([width, height]);
	advectParticles.setUniform('u_pxSize', [1 / width, 1 / height], 'FLOAT');
}