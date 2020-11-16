precision mediump float;

#define fadeTime 0.1

varying vec2 vParticleUV;
uniform sampler2D u_ages;
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
	gl_FragColor = vec4(0, 0, 0.2, opacity * 0.75);
}