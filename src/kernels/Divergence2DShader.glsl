precision highp float;
precision highp int;

varying vec2 vUV;
uniform sampler2D u_vectorField;
uniform vec2 u_pxSize;

void main() {
	float n = texture2D(u_vectorField, vUV + vec2(0, u_pxSize.y)).y;
	float s = texture2D(u_vectorField, vUV - vec2(0, u_pxSize.y)).y;
	float e = texture2D(u_vectorField, vUV + vec2(u_pxSize.x, 0)).x;
	float w = texture2D(u_vectorField, vUV - vec2(u_pxSize.x, 0)).x;
	float divergence = 0.5 * ( e - w + n - s);
	
	gl_FragColor = vec4(divergence, 0, 0, 0);
}