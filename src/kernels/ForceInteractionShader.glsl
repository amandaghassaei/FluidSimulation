// Modify velocity field on interaction.
precision lowp float;

varying vec2 vUV;
varying vec2 vUV_local;
uniform sampler2D u_velocity;
uniform vec2 u_vector;
uniform float u_scaleFactor;

void main() {
	vec2 radialVec = (vUV_local * 2.0 - 1.0);
	float radiusSq = dot(radialVec, radialVec);
	vec2 velocity = texture2D(u_velocity, vUV).xy + (1.0 - radiusSq) * u_vector * u_scaleFactor;
	gl_FragColor = vec4(velocity, 0, 0);
}