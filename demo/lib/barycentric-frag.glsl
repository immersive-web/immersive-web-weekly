#extension GL_OES_standard_derivatives : enable

precision highp float;
precision highp int;

uniform float width;
uniform vec3 color;
uniform float alpha;
uniform vec3 wireframeColor;
uniform float wireframeAlpha;
varying vec2 vBC;

float gridFactor (vec2 vBC, float w) {
  vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y);
  vec3 d = fwidth(bary);
  vec3 a3 = smoothstep(d * (w - 0.5), d * (w + 0.5), bary);
  return min(min(a3.x, a3.y), a3.z);
}

void main() {
  float factor = gridFactor(vBC, width);
  vec3 color = mix(wireframeColor, color, factor);
  float a = mix(wireframeAlpha, alpha, factor);
  gl_FragColor = vec4(color, a);
}
