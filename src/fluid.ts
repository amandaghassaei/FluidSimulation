import { canvas, glcompute } from './gl';
import { DT, PRESSURE_CALC_ALPHA, PRESSURE_CALC_BETA } from './constants';
const advectionSource = require('./kernels/AdvectionShader.glsl');
const forceInteractionSource = require('./kernels/ForceInteractionShader.glsl');
const divergence2DSource = require('./kernels/Divergence2DShader.glsl');
const jacobiSource = require('./kernels/JacobiShader.glsl');
const gradientSubtractionSource = require('./kernels/GradientSubtractionShader.glsl');

let SCALE_FACTOR = calcScaleFactor(canvas.clientWidth, canvas.clientHeight);
const FORCE_SCALE = 0.3;

function calcScaleFactor(width: number, height: number) {
	const largestDim = Math.max(width, height);
	if (largestDim <= 750) {
		return 1;
	}
	return Math.ceil(largestDim / 150);
}

// Init programs.
export const advection = glcompute.initProgram('advection', advectionSource, [
	{
		name: 'u_dt',
		value: DT,
		dataType: 'FLOAT',
	},
	{
		name: 'u_state',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_velocity',
		value: 1,
		dataType: 'INT',
	},
]);
export const forceInteraction = glcompute.initProgram('forceInteraction', forceInteractionSource, [
	{
		name: 'u_velocity',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_vector',
		value: [0, 0],
		dataType: 'FLOAT',
	},
	{
		name: 'u_scaleFactor',
		value: FORCE_SCALE,
		dataType: 'FLOAT',
	}
]);
export const divergence2D = glcompute.initProgram('divergence2D', divergence2DSource, [
	{
		name: 'u_vectorField',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_pxSize',
		value: [SCALE_FACTOR / canvas.clientWidth, SCALE_FACTOR / canvas.clientHeight],
		dataType: 'FLOAT',
	}
]);
export const jacobi = glcompute.initProgram('jacobi', jacobiSource, [
	{
		name: 'u_alpha',
		value: PRESSURE_CALC_ALPHA,
		dataType: 'FLOAT',
	},
	{
		name: 'u_beta',
		value: PRESSURE_CALC_BETA,
		dataType: 'FLOAT',
	},
	{
		name: 'u_pxSize',
		value: [SCALE_FACTOR / canvas.clientWidth, SCALE_FACTOR / canvas.clientHeight],
		dataType: 'FLOAT',
	},
	{
		name: 'u_previousState',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_divergence',
		value: 1,
		dataType: 'INT',
	},
]);
export const gradientSubtraction = glcompute.initProgram('gradientSubtraction', gradientSubtractionSource, [
	{
		name: 'u_pxSize',
		value: [SCALE_FACTOR / canvas.clientWidth, SCALE_FACTOR / canvas.clientHeight],
		dataType: 'FLOAT',
	},
	{
		name: 'u_scalarField',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_vectorField',
		value: 1,
		dataType: 'INT',
	},
]);

// Init state.
const width = canvas.clientWidth;
const height = canvas.clientHeight;
export const velocityState = glcompute.initDataLayer('velocity',
{
	dimensions: [Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)],
	type: 'float16',
	numComponents: 2,
	wrapS: 'REPEAT',
	wrapT: 'REPEAT',
}, true, 2);
export const divergenceState = glcompute.initDataLayer('divergence',
{
	dimensions: [Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)],
	type: 'float16',
	numComponents: 1,
	wrapS: 'REPEAT',
	wrapT: 'REPEAT',
}, true, 1);
export const pressureState = glcompute.initDataLayer('pressure',
{
	dimensions: [Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)],
	type: 'float16',
	numComponents: 1,
	wrapS: 'REPEAT',
	wrapT: 'REPEAT',
}, true, 2);

export function fluidOnResize(width: number, height: number) {
	// Re-init textures at new size.
	SCALE_FACTOR = calcScaleFactor(width, height);
	velocityState.resize([Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)]);
	divergenceState.resize([Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)]);
	pressureState.resize([Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)]);
	divergence2D.setUniform('u_pxSize', [SCALE_FACTOR / width, SCALE_FACTOR  / height], 'FLOAT');
	jacobi.setUniform('u_pxSize', [SCALE_FACTOR / width, SCALE_FACTOR / height], 'FLOAT');
	gradientSubtraction.setUniform('u_pxSize', [SCALE_FACTOR / width, SCALE_FACTOR / height], 'FLOAT');
	forceInteraction.setUniform('u_scaleFactor', FORCE_SCALE, 'FLOAT');
	glcompute.onResize(canvas);
}