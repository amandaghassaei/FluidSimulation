precision lowp float;
precision lowp int;

varying vec2 vUV;
uniform sampler2D u_ages;
uniform float u_maxAge;

void main() {
	float age = texture2D(u_ages, vUV).x + 1.0;
	if (age > u_maxAge) age = 0.0;
	gl_FragColor = vec4(age, 0, 0, 0);
}