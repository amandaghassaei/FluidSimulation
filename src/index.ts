import { glcompute } from './gl';
import { 
	advection,
	dissipateMaterial,
	divergence2D,
	divergenceState,
	gradientSubtraction,
	jacobi,
	materialState,
	pressureState,
	velocityState,
	renderFluid,
	fluidOnResize,
} from './fluid';
import './interactions';
import MicroModal from 'micromodal';
import {
	PRESSURE_CALC_ALPHA,
	PRESSURE_CALC_BETA,
	VELOCITY_DIFFUSION_ALPHA,
	VELOCITY_DIFFUSION_BETA,
} from './constants';
import {
	particlesOnResize,
	particlePositionState,
	particleAgeState,
	advectParticles,
	renderParticles,
	ageParticles,
} from './particles';

// Init help modal.
MicroModal.init();

// Add resize listener.
onResize();
window.addEventListener('resize', onResize);
function onResize() {
	const width = window.innerWidth;
	const height = window.innerHeight;
	particlesOnResize(width, height);
	fluidOnResize(width, height);
}

// Start render loop.
window.requestAnimationFrame(step);
function step() {
	// Dissipate material.
	glcompute.step(dissipateMaterial, [materialState], materialState);
	// Advect the velocity vector field.
	glcompute.step(advection, [velocityState, velocityState], velocityState);
	// // Diffuse the velocity vector field (optional).
	// jacobi.setUniform('u_alpha', VELOCITY_DIFFUSION_ALPHA, 'FLOAT');
	// jacobi.setUniform('u_beta', VELOCITY_DIFFUSION_BETA, 'FLOAT');
	// for (let i = 0; i < 1; i++) {
	// 	glcompute.step(jacobi, [velocityState, velocityState], velocityState);
	// }
	// Compute divergence of advected velocity field.
	glcompute.step(divergence2D, [velocityState], divergenceState);
	// Compute the pressure gradient of the advected velocity vector field (using jacobi iterations).
	jacobi.setUniform('u_alpha', PRESSURE_CALC_ALPHA, 'FLOAT');
	jacobi.setUniform('u_beta', PRESSURE_CALC_BETA, 'FLOAT');
	for (let i = 0; i < 20; i++) {
		glcompute.step(jacobi, [pressureState, divergenceState], pressureState);
	}
	// Subtract the pressure gradient from velocity to obtain a velocity vector field with zero divergence.
	glcompute.step(gradientSubtraction, [pressureState, velocityState], velocityState);
	// Advect the material with the divergence-free velocity vector field.
	glcompute.step(advection, [materialState, velocityState], materialState);
	// Render current state.
	glcompute.step(renderFluid, [materialState]);

	// Advect particles.
	glcompute.step(advectParticles, [particlePositionState, velocityState, particleAgeState], particlePositionState);
	// Increment particle age.
	glcompute.step(ageParticles, [particleAgeState], particleAgeState);
	// Render particles on top.
	// TODO: init larger particles for hd displays.
	glcompute.drawPoints(renderParticles, [particlePositionState, particleAgeState]);

	// Start a new render cycle.
	window.requestAnimationFrame(step);
}