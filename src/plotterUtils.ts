import { canvas } from './gl';

type Bounds = {
	min: [number, number],
	max: [number, number],
};

function getCacheIndex(position: [number, number], bounds: Bounds, binIncr: number) {
	const { min, max } = bounds;
	const width = max[0] - min[0];
	const height = max[1] - min[1];
	const x = Math.min(Math.max(position[0] + bounds.min[0], 0), width);
	const y = Math.min(Math.max(position[1] + bounds.min[1], 0), height);
	return [Math.floor(x / binIncr), Math.floor(y / binIncr)] as [number, number];
}

function cachePosition(
	i: number,
	position: [number, number],
	bounds: Bounds,
	binIncr: number,
	cache: number[][][],
) {
	const index = getCacheIndex(position, bounds, binIncr);
	cache[index[0]][index[1]].push(i);
} 

function indexInCacheBounds(x: number, y: number, cache: number[][][]) {
	if (cache[x] === undefined) {
		return false;
	}
	if (cache[x][y] === undefined) {
		return false;
	}
	return true;
}

function lookupPath(
	x: number,
	y: number,
	cache: number[][][],
	paths: [number, number][][],
	preservePathDirection: boolean,
	bounds: Bounds,
	binIncr: number,
) {
	const indices = cache[x][y];
	if (indices.length) {
		const i = indices.pop() as number;
		const path = paths[Math.abs(i)];
		if (!preservePathDirection) {
			const position = i < 0 ? path[0] : path[path.length - 1];
			const index = getCacheIndex(position, bounds, binIncr);
			const oppositeIndices = cache[index[0]][index[1]];
			const indexPosition = oppositeIndices.indexOf(-i);
			if (indexPosition < 0) {
				throw new Error(`Unable to find corresponding index: ${-i}`);
			}
			oppositeIndices.splice(indexPosition, 1);
		}
		// Reverse path if needed.
		return i < 0 ? path.slice().reverse() : path;
	}
	return null;
}

// Gets nearby neighbors (not necessarily nearest, but don't think that's necessary here).
function getNearbyPath(
	cache: number[][][],
	index: [number, number],
	paths: [number, number][][],
	preservePathDirection: boolean,
	bounds: Bounds,
	binIncr: number,
) {
	// Lookup in current index.
	const path = lookupPath(index[0], index[1], cache, paths, preservePathDirection, bounds, binIncr);
	if (path) {
		return path;
	}
	// If not found, check surrounding indices in cache until a path is found.
	let cellsChecked = true;
	let radius = 1;
	while (cellsChecked) {
		cellsChecked = false;
		let y = -radius;
		let x = -radius;
		for (x = -radius; x <= radius; x++) {
			// Check if in bounds.
			if (!indexInCacheBounds(index[0] + x, index[1] + y, cache)) {
				continue;
			}
			cellsChecked = true;
			const path = lookupPath(index[0] + x, index[1] + y, cache, paths, preservePathDirection, bounds, binIncr);
			if (path) {
				return path;
			}
		}
		y = radius;
		for (x = -radius; x <= radius; x++) {
			// Check if in bounds.
			if (!indexInCacheBounds(index[0] + x, index[1] + y, cache)) {
				continue;
			}
			cellsChecked = true;
			const path = lookupPath(index[0] + x, index[1] + y, cache, paths, preservePathDirection, bounds, binIncr);
			if (path) {
				return path;
			}
		}
		x = -radius;
		for (y = -radius + 1; y < radius; y++) {
			// Check if in bounds.
			if (!indexInCacheBounds(index[0] + x, index[1] + y, cache)) {
				continue;
			}
			cellsChecked = true;
			const path = lookupPath(index[0] + x, index[1] + y, cache, paths, preservePathDirection, bounds, binIncr);
			if (path) {
				return path;
			}
		}
		x = radius;
		for (y = -radius + 1; y < radius; y++) {
			// Check if in bounds.
			if (!indexInCacheBounds(index[0] + x, index[1] + y, cache)) {
				continue;
			}
			cellsChecked = true;
			const path = lookupPath(index[0] + x, index[1] + y, cache, paths, preservePathDirection, bounds, binIncr);
			if (path) {
				return path;
			}
		}
		radius++;
	}
	return null;
}
export function paths2DToGcode(paths: [number, number][][], params: {
	bounds: Bounds,
	retractHeight: number,
	feedHeight: number,
	feedRate: number,
	scale: number,
	preservePathDirection?: boolean,
	rampIn?: boolean,
	rampOut?: boolean,
	rampLength?: number,
	rampHeight?: number,
}) {

	const {
		bounds,
		retractHeight,
		feedHeight,
		feedRate,
		scale,
	} = params;

	// Set optional params false by default.
	const rampIn = !!params.rampIn;
	const rampOut = !!params.rampOut;
	const rampLength = params.rampLength || 0;
	const rampHeight = params.rampHeight || params.feedHeight;
	const preservePathDirection = !!params.preservePathDirection;
	// Calc height and width.
	const { min, max } = bounds;
	const width = max[0] - min[0];
	const height = max[1] - min[1];

	// We need to optimize for travel time.
	// Sort paths so that the rapid length is minimized.
	// Bin all start and end positions of paths.
	const maxDim = Math.max(width, height);
	const binIncr = maxDim / 500;
	const cacheDim = [Math.ceil(width / binIncr), Math.ceil(height / binIncr)] as [number, number];
	const paths2DCache: number[][][] = [];
	for (let x = 0; x <= cacheDim[0]; x++) {
		paths2DCache.push([]);
		for (let y = 0; y <= cacheDim[1]; y++) {
			paths2DCache[x].push([]);
		}
	}
	for (let j = 1; j < paths.length; j++) {
		const path = paths[j];
		const start = path[0];
		cachePosition(j, start, bounds, binIncr, paths2DCache);
		if (!preservePathDirection) {
			// Cache reverse direction with a neg number.
			// Note that we are not including the zero path here, we always start there in the toolpath.
			const end = path[path.length - 1];
			cachePosition(-j, end, bounds, binIncr, paths2DCache);
		}
	}

	const sortedPaths = [paths[0]];
	for (let j = 1; j < paths.length; j++) {
		const lastPath = sortedPaths[j - 1];
		const lastPosition = lastPath[lastPath.length - 1];
		const index = getCacheIndex(lastPosition, bounds, binIncr);
		const nextPath = getNearbyPath(paths2DCache, index, paths, preservePathDirection, bounds, binIncr);
		if (nextPath === null) {
			throw new Error(`Bad sorted path lookup at index ${j}, position ${lastPosition[0]}, ${lastPosition[1]}.`);
		}
		sortedPaths.push(nextPath);
	}
		
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
	for (let j = 0; j < sortedPaths.length; j++) {
		gcode += `G0 X${sortedPaths[j][0][0] * scale} Y${sortedPaths[j][0][1] * scale}\n`;
		let currentZ = rampIn ? rampHeight : feedHeight
		gcode += `G1 Z${currentZ} F${feedRate}\n`;
		let pathLength = 0;
		for (let i = 1; i < sortedPaths[j].length; i++) {
			const nextPosition = sortedPaths[j][i];
			let z = currentZ;
			if (rampIn && pathLength < rampLength) {
				const lastPosition = sortedPaths[j][i - 1];
				const vec = [nextPosition[0] - lastPosition[0], nextPosition[1] - lastPosition[1]];
				const length = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]) * scale;
				pathLength += length;
				const t = pathLength / rampLength;
				z = rampHeight * (1 - t) + feedHeight * t;
				if (z < feedHeight) z = feedHeight;
			}
			if (currentZ !== z) {
				gcode += `G1 X${nextPosition[0] * scale} Y${nextPosition[1] * scale} Z${z}\n`;
				currentZ = z;
			} else {
				gcode += `G1 X${nextPosition[0] * scale} Y${nextPosition[1] * scale}\n`;
			}
		}
		gcode += `G1 Z${retractHeight}\n`;
	}
	gcode += 'G0 X0 Y0\n';
	return gcode;

}