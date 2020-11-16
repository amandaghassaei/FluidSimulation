precision highp float;
precision highp int;

#define DECAY_RATE 0.001

varying vec2 vUV;
uniform sampler2D u_material;

void main() {
	float material = texture2D(u_material, vUV).x;
	if (material > 0.0) material -= DECAY_RATE;
	gl_FragColor = vec4(material, 0, 0, 0);
}