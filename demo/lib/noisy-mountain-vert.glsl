uniform float time;
uniform float noiseMod;
uniform float posDampen;

varying float vDistance;

#pragma glslify: snoise3 = require(glsl-noise/classic/3d)
#pragma glslify: ease = require(glsl-easings/quadratic-out)

void main() {
  float t = time + 20.0;
  float noise = snoise3(noiseMod * t * vec3(position.x, position.y, 3.0 * position.z+100.0) * 0.5 + 0.5);

  float isEdge = step(0.01, uv.x) * step(0.01, uv.y) * step(0.01, 1.0 - uv.x) * step(0.01, 1.0 - uv.y);
  vec3 pos = position + (vec3(0, 100, 0) * noise * posDampen * isEdge);
  vec4 modelPosition = modelViewMatrix * vec4(pos, 1.0);

  vDistance = distance(vec4(cameraPosition, 1.0), modelPosition);

  gl_Position = projectionMatrix * modelPosition;
}
