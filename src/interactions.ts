import { glcompute, canvas } from './gl';
import {
	MAX_TOUCH_FORCE_RADIUS_PX,
	MIN_TOUCH_FORCE_RADIUS_PX,
	TOUCH_FORCE_RADIUS,
} from './constants';
import {
	forceInteraction,
	velocityState,
} from './fluid';

// Set up interactions.

function calcTouchRadius(width: number, height: number) {
	return Math.max(Math.min(TOUCH_FORCE_RADIUS * Math.max(width, height), MAX_TOUCH_FORCE_RADIUS_PX), MIN_TOUCH_FORCE_RADIUS_PX);
}

// First set up an array to track mouse/touch deltas.
let inputTouches: { [key: string]: {
	current?: [number, number],
	last: [number, number],
}} = {};
canvas.addEventListener('mousemove', (e: MouseEvent) => {
	const x = e.clientX;
	const y = e.clientY;
	if (inputTouches.mouse === undefined) {
		inputTouches.mouse = {
			last: [x, y],
		}
		return;
	}
	const { current } = inputTouches.mouse;
	if (current) {
		inputTouches.mouse.last = current;
	}
	inputTouches.mouse.current = [x, y];
	
});
canvas.addEventListener("mouseout", (e: MouseEvent) => {
	if (e.button === 0) {
		delete inputTouches.mouse;
	}
});
canvas.addEventListener("touchstart", (e: TouchEvent) => {
	for (let i = 0; i < e.changedTouches.length; i++) {
		const touch = e.changedTouches[i];
		inputTouches[touch.identifier] = {
			last: [touch.clientX, touch.clientY],
		};
	}
});
canvas.addEventListener('touchmove', (e: TouchEvent) => {
	e.preventDefault();
	for (let i = 0; i < e.touches.length; i++) {
		const touch = e.touches[i];
		const x = touch.clientX;
		const y = touch.clientY;
		if (inputTouches[touch.identifier] === undefined) {
			// We should never really end up here.
			inputTouches[touch.identifier] = {
				last: [x, y],
			}
			return;
		}
		const { current } = inputTouches[touch.identifier];
		if (current) {
			// Move current position to last position.
			inputTouches[touch.identifier].last = current;
		}
		inputTouches[touch.identifier].current = [x, y];
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

// It works more consistently to do these draw calls from the render loop rather than the event handlers.
export function stepInteraction() {
	Object.values(inputTouches).forEach(touch => {
		const { last, current } = touch;
		console.log(last, current);
		if (!current) {
			return;
		}
		if (current[0] == last[0] && current[1] == last[1]) {
			return;
		}
		const vec = [current[0] - last[0], - (current[1] - last[1])] as [number, number];
		// Cap max vec length.
		// const length = Math.sqrt(vec[0]*vec[0] + vec[1]*vec[1]);
		// const maxLength = 20;
		// if (length > maxLength) {
		// 	vec[0] *= maxLength / length;
		// 	vec[1] *= maxLength / length;
		// }
		console.log(vec);
		forceInteraction.setUniform('u_vector', vec, 'FLOAT');
		glcompute.stepCircle(
			forceInteraction,
			[current[0], canvas.clientHeight - current[1]],
			calcTouchRadius(canvas.clientWidth, canvas.clientHeight),
			[velocityState],
			velocityState,
		);
		touch.last = current;
	});
}