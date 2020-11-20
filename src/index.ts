import { glcompute } from './gl';
import { 
	advection,
	divergence2D,
	divergenceState,
	gradientSubtraction,
	jacobi,
	pressureState,
	velocityState,
	fluidOnResize,
} from './fluid';
import './interactions';
import MicroModal from 'micromodal';
import {
	DT,
	NUM_RENDER_STEPS,
	PRESSURE_CALC_ALPHA,
	PRESSURE_CALC_BETA,
} from './constants';
import {
	particlesOnResize,
	particlePositionState,
	particleAgeState,
	trailState,
	advectParticles,
	renderParticles,
	ageParticles,
	overlayTexture,
	fadeTrails,
} from './particles';
import { stepInteraction } from './interactions';

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
	// Apply interactions.
	stepInteraction();

	// Advect the velocity vector field.
	glcompute.step(advection, [velocityState, velocityState], velocityState);
	// // Diffuse the velocity vector field (optional).
	// jacobi.setUniform('u_alpha', 0.5, 'FLOAT');
	// jacobi.setUniform('u_beta', 1/4.5, 'FLOAT');
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

	// Increment particle age.
	glcompute.step(ageParticles, [particleAgeState], particleAgeState);
	// Fade current trails.
	glcompute.step(fadeTrails, [trailState], trailState);
	for (let i = 0; i < NUM_RENDER_STEPS; i++) {
		// Advect particles.
		advectParticles.setUniform('u_dt', DT / NUM_RENDER_STEPS , 'FLOAT');
		glcompute.step(advectParticles, [particlePositionState, velocityState, particleAgeState], particlePositionState);
		// Render particles to texture for trail effect.
		glcompute.drawPoints(renderParticles, [particlePositionState, particleAgeState, velocityState], trailState);
	}
	// Render to screen.
	glcompute.step(overlayTexture, [trailState], undefined, { shouldBlendAlpha: true });

	// Start a new render cycle.
	window.requestAnimationFrame(step);
}