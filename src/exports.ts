import { canvas, glcompute } from './gl';
import { initRandomPositions } from './particles';
import { PassThroughFragmentShader, PointsVertexShader, SingleColorFragShader } from 'glcompute';
import { DT } from './constants';
import { velocityState } from './fluid';
const advectParticlesSource = require('./kernels/AdvectSVGParticlesShader.glsl');
import { saveAs } from 'file-saver';

export const guiState = {
 	'Num Particles': 1000,
	'Trail Length': 1000,
	'Regenerate with new particles': generateNewSVGParticles,
}

export const svgExportState = {
	'Min Segment Length (pt)': 2,
	'Save SVG': saveSVG,
}

export const gcodeExportState = {
	'Units': 'inch',
	'Width (in)': canvas.clientWidth / 72,
	'Height (in)': canvas.clientHeight / 72,
	'Min Segment Length (in)': 0.05,
	'Feed Height (in)': -0.25,
	'Retract Height (in)': 0,
	'Feed Rate (ipm)': 45,
	// 'Rapid Rate (ipm)': 100,
	'Save Gcode': saveGcode,
}

let numSteps = 0;

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
		value: DT,
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
	for (let i = 0; i < 20; i++) { // this helps to speeds things along with the visualization.
		if (numSteps++ < guiState['Trail Length']) {
			// Advect particles.
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

function getPaths(minSegmentLength: number) {
	const paths: [number, number][][] = [];
	const lastPositions = [];
	for (let j = 0; j < guiState['Num Particles']; j++) {
		const position = [initialPositions[2 * j], initialPositions[2 * j + 1]] as [number, number];
		paths.push([position]);
		lastPositions.push(position);
	}

	// Set back to initial state.
	particlePositionState.resize(guiState['Num Particles'], initialPositions);
	// Init a place to store the current positions.
	let currentPositions!: Float32Array;
	const minSegmentLengthSq = minSegmentLength * minSegmentLength;
	for (let i = 0; i < guiState['Trail Length']; i++) {
		// Advect particles.
		glcompute.step(advectParticles, [particlePositionState, velocityState], particlePositionState);
		// Read data to CPU.
		currentPositions = glcompute.getValues(particlePositionState);
		for (let j = 0; j < guiState['Num Particles']; j++) {
			const lastPosition = lastPositions[j];
			const position = [currentPositions[2*j], currentPositions[2*j+1]] as [number, number];
			// Check that segment is sufficiently large.
			// To many short segments will slow down the plotting time.
			const segLengthSq = (lastPosition[0] - position[0]) * (lastPosition[0] - position[0]) + (lastPosition[1] - position[1]) * (lastPosition[1] - position[1]);
			if (segLengthSq < minSegmentLengthSq) {
				continue;
			}
			// Check that we haven't wrapped over the edge of the canvas onto the other side.
			if (
				Math.abs(lastPosition[0] - position[0]) / canvas.clientWidth > 0.9 ||
				Math.abs(lastPosition[1] - position[1]) / canvas.clientHeight > 0.9) {
				// TODO: it would be nice to extend this to the edge of the canvas by calculating an intersection.
				paths.push(paths[j].slice());// Push this path to the end of the list.
				// Start a new path at this index.
				paths[j] = [];
			}
			paths[j].push(position);
			lastPositions[j] = position;
		}
	}
	for (let j = 0; j < guiState['Num Particles']; j++) {
		// Check if any of these paths don't contain any segments.
		if (lastPositions[j][0] === initialPositions[2 * j] && lastPositions[j][1] === initialPositions[2 * j + 1]) {
			// Add a segment, even if it is < minSegLength;
			paths[j].push([currentPositions[2 * j], currentPositions[2 * j + 1]]);
		}
	}
	return paths;
}

function saveSVG() {
	const paths = getPaths(svgExportState['Min Segment Length (pt)']);
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
	saveAs(blob, "fluidsim.svg");
}

function getCacheIndex(position: [number, number], binIncr: number) {
	return [Math.floor(position[0] / binIncr), Math.floor(position[1] / binIncr)];
}

function cachePosition(i: number, position: [number, number], binIncr: number, cache: number[][][]) {
	const index = getCacheIndex(position, binIncr);
	cache[index[0]][index[1]].push(i);
}

// Gets nearby neighbors (not necessarily nearest, but don't think that's necessary here).
function getNearbyPath(cache: number[][][], index: [number, number], paths: [number, number][][]) {
	const indices = cache[index[0]][index[1]];
	if (indices.length) {
		const i = indices.pop() as number;
		return paths[i];
	}
	let cellsChecked = true;
	let radius = 1;
	while (cellsChecked) {
		cellsChecked = false;
		for (let x = -radius; x <= radius; x++) {
			for (let y = -radius; y <= radius; y++) {
				if (Math.abs(x) < radius && Math.abs(y) < radius) {
					continue;
				}
				// Check if in bounds.
				if (cache[index[0] + x] === undefined) {
					continue;
				}
				if (cache[index[0] + x][index[1] + y] === undefined) {
					continue;
				}
				const indices = cache[index[0] + x][index[1] + y];
				cellsChecked = true;
				if (indices.length) {
					const i = indices.pop() as number;
					return paths[i];
				}
			}
		}
		radius++;
	}
	return null;
}

function saveGcode() {
	const paths = getPaths(gcodeExportState['Min Segment Length (in)'] / gcodeExportState['Width (in)'] * canvas.clientWidth);
	
	// We need to optimize for travel time.
	// Sort paths so that the rapid length is minimized.
	// Bin all start and end positions of paths.
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	const maxDim = Math.max(width, height);
	const binIncr = maxDim / 20;
	const cacheDim = [Math.ceil(width / binIncr), Math.ceil(height / binIncr)] as [number, number];
	const paths2DCache: number[][][] = [];
	for (let x = 0; x < cacheDim[0]; x++) {
		paths2DCache.push([]);
		for (let y = 0; y < cacheDim[1]; y++) {
			paths2DCache[x].push([]);
		}
	}
	for (let j = 1; j < paths.length; j++) {
		const start = paths[j][0];
		cachePosition(j, start, binIncr, paths2DCache);
	}

	const sortedPaths = [paths[0]];
	for (let j = 1; j < paths.length; j++) {
		const lastPath = sortedPaths[j - 1];
		const lastPosition = lastPath[lastPath.length - 1];
		const index = getCacheIndex(lastPosition, binIncr) as [number, number];
		const nextPath = getNearbyPath(paths2DCache, index, paths);
		if (nextPath === null) {
			throw new Error(`Bad sorted path lookup at index ${j}, position ${lastPosition[0]}, ${lastPosition[1]}.`);
		}
		sortedPaths.push(nextPath);
	}
	
	
	// Get gcode params.
	const retractHeight = gcodeExportState['Retract Height (in)'];
	const feedHeight = gcodeExportState['Feed Height (in)'];
	const feedRate = gcodeExportState['Feed Rate (ipm)'];
	
	// G90 - Absolute positioning mode.
	// G94 - Feeds are in in/min.
	// G17 - XY plane.
	// G20 - unit in inches.
	// G54 - work coordinate system selection.
	let gcode = `
(FLUIDSIM_PENPLOT)\n
G0 G90 G94 G17\n
G20\n
G54\n
G0 Z${retractHeight}\n
G0 X0 Y0\n
\n`;
	const scale = width / canvas.clientWidth;
	for (let j = 0; j < sortedPaths.length; j++) {
		gcode += `G0 X${sortedPaths[j][0][0] * scale} Y${sortedPaths[j][0][1] * scale}\n`;
		gcode += `G1 Z${feedHeight} F${feedRate}\n`;
		for (let i = 1; i < sortedPaths[j].length; i++) {
			gcode += `G1 X${sortedPaths[j][i][0] * scale} Y${sortedPaths[j][i][1] * scale}\n`;
		}
		gcode += `G1 Z${retractHeight}\n`;
	}
	gcode += 'G0 X0 Y0\n';
	const blob = new Blob([gcode], {type: "text/plain;charset=utf-8"});
	saveAs(blob, "fluidsim.nc");
}