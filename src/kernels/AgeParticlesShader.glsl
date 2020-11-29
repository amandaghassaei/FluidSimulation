precision mediump float;
precision mediump int;

varying vec2 vUV;
uniform sampler2D u_ages;
uniform int u_maxAge;

void main() {
	int age = int(texture2D(u_ages, vUV).x) + 1;
	if (age > u_maxAge) age = 0;
	gl_FragColor = vec4(age, 0, 0, 0);
}