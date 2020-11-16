precision highp float;
precision highp int;

varying vec2 vUV;
uniform float u_dt;
uniform vec2 u_pxSize;
uniform sampler2D u_positions;
uniform sampler2D u_velocity;
uniform sampler2D u_ages;

/*
 * Random number generator with a vec2 seed
 *
 * Credits:
 * http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0
 * https://github.com/mattdesl/glsl-random
 */
highp float random2d(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a, b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
}

void main() {
	vec2 position = texture2D(u_positions, vUV).xy;
	vec2 canvasSize = 1.0 / u_pxSize;
	float age = texture2D(u_ages, vUV).x;
	// If this particle is being reborn, give it a random position.
	if (age < 1.0) {
		float x = random2d(position);
		float y = random2d(vUV);
		gl_FragColor = vec4((vec2(x, y) * 2.0 - 1.0) * canvasSize, 0, 0);
		return;
	}
	// Forward integrate via RK2.
	vec2 particleUV1 = position * u_pxSize;
	vec2 velocity1 = texture2D(u_velocity, particleUV1).xy;
	vec2 halfStep = position + velocity1 * 0.5 * u_dt * canvasSize;
	vec2 particleUV2 = halfStep * u_pxSize;
	vec2 velocity2 = texture2D(u_velocity, particleUV2).xy;
	vec2 nextPosition = position + velocity2 * u_dt * canvasSize;

	// Check if position is outside bounds.
	if (nextPosition.x < 0.0) {
		nextPosition.x += canvasSize.x;
	} else if (nextPosition.x > canvasSize.x) {
		nextPosition.x -= canvasSize.x;
	}
	if (nextPosition.y < 0.0) {
		nextPosition.y += canvasSize.y;
	} else if (nextPosition.y > canvasSize.y) {
		nextPosition.y -= canvasSize.y;
	}

	gl_FragColor = vec4(nextPosition, 0, 0);
}