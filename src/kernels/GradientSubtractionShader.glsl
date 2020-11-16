precision highp float;
precision highp int;

varying vec2 vUV;

uniform vec2 u_pxSize;
uniform sampler2D u_scalarField;
uniform sampler2D u_vectorField;

void main() {
	float n = texture2D(u_scalarField, vUV + vec2(0, u_pxSize.y)).r;
	float s = texture2D(u_scalarField, vUV - vec2(0, u_pxSize.y)).r;
	float e = texture2D(u_scalarField, vUV + vec2(u_pxSize.x, 0)).r;
	float w = texture2D(u_scalarField, vUV - vec2(u_pxSize.x, 0)).r;

	vec2 v = texture2D(u_vectorField, vUV).xy;
	v -= 0.5 * vec2(e - w, n - s);
	
	gl_FragColor = vec4(v, 0, 0);
}