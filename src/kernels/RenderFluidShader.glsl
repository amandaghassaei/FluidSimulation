precision highp float;

#define NUM_COLORS 3.0

varying vec2 vUV;
uniform sampler2D u_material;

void main() {
	const vec3 background = vec3(0.96, 0.87, 0.68);
	const vec3 material1 = vec3(0.925, 0, 0.55);
	const vec3 material2 = vec3(0.0, 0.70, 0.63);
	const vec3 material3 = vec3(0.52, 0.81, 0.70);
	const vec3 material4 = vec3(1.0, 0.7, 0.07);

	float val = texture2D(u_material, vUV).x / 2.0;
	if (val > 1.0) val = 1.0;
	if (val < 0.0) val = 0.0;

	if (val <= 1.0 / NUM_COLORS) {
		val *= NUM_COLORS;
		gl_FragColor = vec4(background * (1.0 - val) + material1 * val, 1);
		return;
	}
	if (val <= 2.0 / NUM_COLORS) {
		val -= 1.0 / NUM_COLORS;
		val *= NUM_COLORS;
		gl_FragColor = vec4(material1 * (1.0 - val) + material2 * val, 1);
		return;
	}
	if (val <= 3.0 / NUM_COLORS) {
		val -= 2.0 / NUM_COLORS;
		val *= NUM_COLORS;
		gl_FragColor = vec4(material2 * (1.0 - val) + material3 * val, 1);
		return;
	}
	val -= 3.0 / NUM_COLORS;
	val *= NUM_COLORS;
	gl_FragColor = vec4(material3 * (1.0 - val) + material4 * val, 1);
}