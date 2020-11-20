import { glcompute, canvas } from './gl';
import { PointsVertexShader, PassThroughFragmentShader } from 'glcompute';
import { PARTICLE_DENSITY, MAX_NUM_PARTICLES, DT, PARTICLE_LIFETIME, TRAIL_LIFETIME } from './constants';
const particleFragmentSource = require('./kernels/ParticleFragmentShader.glsl');
const advectParticlesSource = require('./kernels/AdvectParticlesShader.glsl');
const ageParticlesSource = require('./kernels/AgeParticlesShader.glsl');
const incrementOpacitySource = require('./kernels/IncrementOpacityShader.glsl');

function calcNumParticles(width: number, height: number) {
	return Math.min(Math.ceil(width * height * ( PARTICLE_DENSITY)), MAX_NUM_PARTICLES);
}

let NUM_PARTICLES = calcNumParticles(canvas.clientWidth, canvas.clientHeight);

// Init particles.
let positions = initRandomPositions(new Float32Array(NUM_PARTICLES * 2), canvas.clientWidth, canvas.clientHeight);
export const particlePositionState = glcompute.initDataLayer('position', {
	dimensions: NUM_PARTICLES,
	type: 'float32',
	numComponents: 2,
	data: positions,
}, true, 2);
export const particleAgeState = glcompute.initDataLayer('age', {
	dimensions: NUM_PARTICLES,
	type: 'float32',
	numComponents: 1,
	data: initRandomAges(new Float32Array(NUM_PARTICLES)),
}, true, 2);

// Init a render target for trail effect.
export const trailState = glcompute.initDataLayer('trails', {
	dimensions: [canvas.clientWidth, canvas.clientHeight],
	type: 'uint8',
	numComponents: 4,
}, true, 2);

function initRandomAges(_ages: Float32Array) {
	for (let i = 0; i < NUM_PARTICLES; i++) {
		_ages[i] = Math.round(Math.random() * PARTICLE_LIFETIME);
	}
	return _ages;
}
function initRandomPositions(_positions: Float32Array, width: number, height: number) {
	for (let i = 0; i < NUM_PARTICLES; i++) {
		_positions[2 * i] = Math.random() * width;;
		_positions[2 * i + 1] = Math.random() * height;
	}
	return _positions;
}

// Init programs.
export const renderParticles = glcompute.initProgram('renderParticles', particleFragmentSource, [
	{
		name: 'u_positions',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_ages',
		value: 1,
		dataType: 'INT',
	},
	{
		name: 'u_velocity',
		value: 2,
		dataType: 'INT',
	},
	{
		name: 'u_maxAge',
		value: PARTICLE_LIFETIME,
		dataType: 'FLOAT',
	},
], PointsVertexShader);
export const ageParticles = glcompute.initProgram('ageParticles', ageParticlesSource, [
	{
		name: 'u_ages',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_maxAge',
		value: PARTICLE_LIFETIME,
		dataType: 'FLOAT',
	},
]);
export const advectParticles = glcompute.initProgram('advectParticles', advectParticlesSource, [
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
		name: 'u_ages',
		value: 2,
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
export const overlayTexture = glcompute.initProgram('particleOverlay', PassThroughFragmentShader, [
	{
		name: 'u_state',
		value: 0,
		dataType: 'INT',
	},
]);
export const fadeTrails = glcompute.initProgram('fadeTrails', incrementOpacitySource, [
	{
		name: 'u_image',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_increment',
		value: -1 / TRAIL_LIFETIME,
		dataType: 'FLOAT',
	},
]);

export function particlesOnResize(width: number, height: number) {
	NUM_PARTICLES = calcNumParticles(width, height);
	positions = initRandomPositions(new Float32Array(NUM_PARTICLES * 2), width, height);
	particlePositionState.resize(NUM_PARTICLES, positions);
	advectParticles.setUniform('u_pxSize', [1 / width, 1 / height], 'FLOAT');
	trailState.resize([width, height]);
}