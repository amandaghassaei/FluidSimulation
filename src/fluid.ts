import { canvas, glcompute } from './gl';
import { DT, PRESSURE_CALC_ALPHA, PRESSURE_CALC_BETA } from './constants';
const advectionSource = require('./kernels/AdvectionShader.glsl');
const materialInteractionSource = require('./kernels/MaterialInteractionShader.glsl');
const forceInteractionSource = require('./kernels/ForceInteractionShader.glsl');
const dissipateMaterialSource = require('./kernels/DissipateMaterialShader.glsl');
const divergence2DSource = require('./kernels/Divergence2DShader.glsl');
const jacobiSource = require('./kernels/JacobiShader.glsl');
const gradientSubtractionSource = require('./kernels/GradientSubtractionShader.glsl');
const renderFluidSource = require('./kernels/RenderFluidShader.glsl');

const SCALE = 4;

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
export const materialInteraction = glcompute.initProgram('materialInteraction', materialInteractionSource, [
	{
		name: 'u_material',
		value: 0,
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
]);
export const dissipateMaterial = glcompute.initProgram('dissipateMaterial', dissipateMaterialSource, [
	{
		name: 'u_material',
		value: 0,
		dataType: 'INT',
	},
]);
export const divergence2D = glcompute.initProgram('divergence2D', divergence2DSource, [
	{
		name: 'u_vectorField',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_pxSize',
		value: [SCALE / canvas.clientWidth, SCALE / canvas.clientHeight],
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
		value: [SCALE / canvas.clientWidth, SCALE / canvas.clientHeight],
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
		value: [SCALE / canvas.clientWidth, SCALE / canvas.clientHeight],
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
export const renderFluid = glcompute.initProgram('render', renderFluidSource, [
	{
		name: 'u_material',
		value: 0,
		dataType: 'INT',
	},
]);

// Init state.
const width = canvas.clientWidth;
const height = canvas.clientHeight;
export const materialState = glcompute.initDataLayer('material',
{
	dimensions: [width, height],
	type: 'float16',
	numComponents: 1,
	wrapS: 'REPEAT',
	wrapT: 'REPEAT',
}, true, 2);
export const velocityState = glcompute.initDataLayer('velocity',
{
	dimensions: [width / SCALE, height / SCALE],
	type: 'float16',
	numComponents: 2,
	wrapS: 'REPEAT',
	wrapT: 'REPEAT',
}, true, 2);
export const divergenceState = glcompute.initDataLayer('divergence',
{
	dimensions: [width / SCALE, height / SCALE],
	type: 'float16',
	numComponents: 1,
	wrapS: 'REPEAT',
	wrapT: 'REPEAT',
}, true, 1);
export const pressureState = glcompute.initDataLayer('pressure',
{
	dimensions: [width / SCALE, height / SCALE],
	type: 'float16',
	numComponents: 1,
	wrapS: 'REPEAT',
	wrapT: 'REPEAT',
}, true, 2);

export function fluidOnResize(width: number, height: number) {
	// Re-init textures at new size.
	materialState.resize([width, height]);
	velocityState.resize([width / SCALE, height / SCALE]);
	divergenceState.resize([width / SCALE, height / SCALE]);
	pressureState.resize([width / SCALE, height / SCALE]);
	divergence2D.setUniform('u_pxSize', [SCALE / width, SCALE  / height], 'FLOAT');
	jacobi.setUniform('u_pxSize', [SCALE / width, SCALE / height], 'FLOAT');
	gradientSubtraction.setUniform('u_pxSize', [SCALE / width, SCALE / height], 'FLOAT');
	glcompute.onResize(canvas);
}