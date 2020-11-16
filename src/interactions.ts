import { glcompute, canvas } from './gl';
import {
	TOUCH_COLOR_RADIUS,
	TOUCH_FORCE_RADIUS,
} from './constants';
import {
	forceInteraction,
	materialInteraction,
	materialState,
	velocityState,
} from './fluid';

// Set up interactions.

// First set up an array to track mouse/touch deltas.
let inputTouches: { [key: string]: [number, number] } = {};
canvas.addEventListener('mousemove', (e: MouseEvent) => {
	const x = e.clientX;
	const y = e.clientY;
	const lastPosition = inputTouches.mouse;
	if (lastPosition === undefined) {
		inputTouches.mouse = [e.clientX, e.clientY];
		return;
	}
	inputTouches.mouse = [x, y];
	forceInteraction.setUniform('u_vector', [x - lastPosition[0], - (y - lastPosition[1])], 'FLOAT');
	glcompute.stepCircle(forceInteraction, [x, canvas.clientHeight - y], TOUCH_FORCE_RADIUS, [velocityState], velocityState);
	glcompute.stepCircle(materialInteraction, [x, canvas.clientHeight - y], TOUCH_COLOR_RADIUS * 2, [materialState], materialState);
});
canvas.addEventListener("mouseout", (e: MouseEvent) => {
	if (e.button === 0) {
		delete inputTouches.mouse;
	}
});
canvas.addEventListener("touchstart", (e: TouchEvent) => {
	for (let i = 0; i < e.changedTouches.length; i++) {
		const touch = e.changedTouches[i];
		inputTouches[touch.identifier] = [touch.clientX, touch.clientY];
	}
});
canvas.addEventListener('touchmove', (e: TouchEvent) => {
	e.preventDefault();
	for (let i = 0; i < e.touches.length; i++) {
		const touch = e.touches[i];
		const x = touch.clientX;
		const y = touch.clientY;
		const lastPosition = inputTouches[touch.identifier];
		if (lastPosition === undefined) {
			return;
		}
		inputTouches[touch.identifier] = [x, y];
		forceInteraction.setUniform('u_vector', [x - lastPosition[0], - (y - lastPosition[1])], 'FLOAT');
		glcompute.stepCircle(forceInteraction, [x, canvas.clientHeight - y], TOUCH_FORCE_RADIUS, [velocityState], velocityState);
		glcompute.stepCircle(materialInteraction, [x, canvas.clientHeight - y], TOUCH_COLOR_RADIUS * 2, [materialState], materialState);
	}
});
canvas.addEventListener("touchend", (e: TouchEvent) => {
	for (let i = 0; i < e.changedTouches.length; i++) {
		const touch = e.changedTouches[i];
		delete inputTouches[touch.identifier]
	}
});
canvas.addEventListener("touchcancel", (e: TouchEvent) => {
	for (let i = 0; i < e.changedTouches.length; i++) {
		const touch = e.changedTouches[i];
		delete inputTouches[touch.identifier]
	}
});
// Disable other gestures.
document.addEventListener('gesturestart', disableZoom);
document.addEventListener('gesturechange', disableZoom); 
document.addEventListener('gestureend', disableZoom);
function disableZoom(e: Event) {
	e.preventDefault();
	const scale = 'scale(1)';
	// @ts-ignore
	document.body.style.webkitTransform =  scale;    // Chrome, Opera, Safari
	// @ts-ignore
	document.body.style.msTransform =   scale;       // IE 9
	document.body.style.transform = scale;
}