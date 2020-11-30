precision mediump float;
precision mediump int;

varying vec2 vUV;
uniform float u_dt;
uniform sampler2D u_state;
uniform sampler2D u_velocity;

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
	// Implicitly solve advection.
	vec2 prevUV = getWrappedUV(fract(vUV - u_dt * texture2D(u_velocity, vUV).xy));
	gl_FragColor = texture2D(u_state, prevUV);
}