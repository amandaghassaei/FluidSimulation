precision mediump float;
precision mediump int;

varying vec2 vUV;
uniform float u_dt;
uniform vec2 u_pxSize;
uniform sampler2D u_positions;
uniform sampler2D u_velocity;
uniform sampler2D u_ages;
uniform sampler2D u_initialPositions;

// This is needed for safari support.
vec2 getWrappedUV(vec2 uv) {
	if (uv.x < 0.0) {
		uv.x += 1.0;
	} else if (uv.x > 1.0) {
		uv.x -= 1.0;
	}
	if (uv.y < 0.0) {
		uv.y += 1.0;
	} else if (uv.y > 1.0) {
		uv.y -= 1.0;
	}
	return uv;
}

void main() {
	int age = int(texture2D(u_ages, vUV).x);
	// If this particle is being reborn, give it a random position.
	if (age < 1) {
		gl_FragColor = texture2D(u_initialPositions, vUV);
		return;
	}

	vec2 canvasSize = 1.0 / u_pxSize;

	// Store small displacements as separate number until they acumulate sufficiently.
	// Then add them to the absolution position.
	// This prevents small offsets on large abs positions from being lost in float16 precision.
	vec4 positionData = texture2D(u_positions, vUV);
	vec2 absolutePosition = positionData.rg;
	vec2 previousDisplacement = positionData.ba;
	if (dot(previousDisplacement, previousDisplacement) > 20.0) {
		absolutePosition += previousDisplacement;
		// Check if position is outside bounds.
		if (absolutePosition.x < 0.0) {
			absolutePosition.x += canvasSize.x;
		} else if (absolutePosition.x > canvasSize.x) {
			absolutePosition.x -= canvasSize.x;
		}
		if (absolutePosition.y < 0.0) {
			absolutePosition.y += canvasSize.y;
		} else if (absolutePosition.y > canvasSize.y) {
			absolutePosition.y -= canvasSize.y;
		}
		previousDisplacement = vec2(0.0);
	}
	vec2 position = absolutePosition + previousDisplacement;

	// Forward integrate via RK2.
	vec2 particleUV1 = getWrappedUV(position * u_pxSize);
	vec2 velocity1 = texture2D(u_velocity, particleUV1).xy;
	vec2 halfStep = position + velocity1 * 0.5 * u_dt * canvasSize;
	vec2 particleUV2 = getWrappedUV(halfStep * u_pxSize);
	vec2 velocity2 = texture2D(u_velocity, particleUV2).xy;
	vec2 displacement = previousDisplacement + velocity2 * u_dt * canvasSize;

	gl_FragColor = vec4(absolutePosition, displacement);
}