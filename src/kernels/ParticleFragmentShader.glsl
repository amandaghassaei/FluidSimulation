precision mediump float;

#define fadeTime 0.1

varying vec2 vParticleUV;
varying vec2 vUV;
uniform sampler2D u_ages;
uniform sampler2D u_velocity;
uniform float u_maxAge;

void main() {
	float age = texture2D(u_ages, vParticleUV).x / u_maxAge;
	float opacity = 1.0;
	if (age < fadeTime) {
		opacity = age / fadeTime;
	}
	if (age > 1.0 - fadeTime) {
		opacity = 1.0 - (age - 1.0 + fadeTime) / fadeTime;
	}
	vec2 velocity = texture2D(u_velocity, vUV).xy;
	float multiplier = clamp(length(velocity) * 0.5 + 0.7, 0.0, 1.0);
	gl_FragColor = vec4(0, 0, 0.2, opacity * multiplier);
}