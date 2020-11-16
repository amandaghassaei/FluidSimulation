precision highp float;
precision highp int;

varying vec2 vUV;
uniform float u_dt;
uniform sampler2D u_state;
uniform sampler2D u_velocity;

// vec2 bilinearInterp(vec2 uv, sampler2D texture, vec2 pxSize){
// 	//bilinear interp between nearest cells
// 	vec2 pxCenter = vec2(0.5, 0.5);

// 	vec2 ceiled = ceil(pos);
// 	vec2 floored = floor(pos);

// 	vec2 n = texture2D(texture, (ceiled+pxCenter)/size).xy;//actually ne
// 	vec2 s = texture2D(texture, (floored+pxCenter)/size).xy;//actually sw
// 	if (ceiled.x != floored.x){
// 		vec2 se = texture2D(texture, (vec2(ceiled.x, floored.y)+pxCenter)/size).xy;
// 		vec2 nw = texture2D(texture, (vec2(floored.x, ceiled.y)+pxCenter)/size).xy;
// 		n = n*(pos.x-floored.x) + nw*(ceiled.x-pos.x);
// 		s = se*(pos.x-floored.x) + s*(ceiled.x-pos.x);
// 	}
// 	vec2 materialVal = n;
// 	if (ceiled.y != floored.y){
// 		materialVal = n*(pos.y-floored.y) + s*(ceiled.y-pos.y);
// 	}
// 	return materialVal;
// }	

void main() {
	// Implicitly solve advection.
	vec2 prevUV = fract(vUV - u_dt * texture2D(u_velocity, vUV).xy);
	gl_FragColor = texture2D(u_state, prevUV);
}