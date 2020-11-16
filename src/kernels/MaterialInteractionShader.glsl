// Add material on interaction.
precision highp float;

#define SCALE 0.3

varying vec2 vUV;
varying vec2 vUV_local;
uniform sampler2D u_material;

void main() {
	vec2 radialVec = vUV_local * 2.0 - 1.0;
	float radiusSq = dot(radialVec, radialVec);
	float material = texture2D(u_material, vUV).x;
	gl_FragColor = vec4(material + SCALE * (1.0 - radiusSq), 0, 0, 0);
}