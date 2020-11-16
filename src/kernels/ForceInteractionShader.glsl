// Modify velocity field on interaction.
precision highp float;

#define SCALE 0.3

varying vec2 vUV;
varying vec2 vUV_local;
uniform sampler2D u_velocity;
uniform vec2 u_vector;

void main() {
	vec2 radialVec = vUV_local * 2.0 - 1.0;
	float radiusSq = dot(radialVec, radialVec);
	vec2 velocity = texture2D(u_velocity, vUV).xy;
	gl_FragColor = vec4(velocity + (SCALE * (1.0 - radiusSq)) * u_vector, 0, 0);
}