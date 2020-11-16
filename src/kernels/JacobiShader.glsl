precision highp float;
precision highp int;

varying vec2 vUV;

uniform float u_alpha;
uniform float u_beta;
uniform vec2 u_pxSize;
uniform sampler2D u_previousState;
uniform sampler2D u_divergence;


void main() {
	vec4 n = texture2D(u_previousState, vUV + vec2(0, u_pxSize.y));
	vec4 s = texture2D(u_previousState, vUV - vec2(0, u_pxSize.y));
	vec4 e = texture2D(u_previousState, vUV + vec2(u_pxSize.x, 0));
	vec4 w = texture2D(u_previousState, vUV - vec2(u_pxSize.x, 0));
	vec4 d = texture2D(u_divergence, vUV);

	gl_FragColor = (n + s + e + w + u_alpha * d) * u_beta;
}