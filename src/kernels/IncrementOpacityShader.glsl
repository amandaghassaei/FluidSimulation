precision lowp float;
precision lowp int;

varying vec2 vUV;
uniform sampler2D u_image;
uniform float u_increment;

void main() {
	vec4 px = texture2D(u_image, vUV);
	px.a = clamp(px.a + u_increment, 0.0, 1.0);
	gl_FragColor = px;
}