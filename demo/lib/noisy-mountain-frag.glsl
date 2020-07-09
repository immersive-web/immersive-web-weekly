#extension GL_OES_standard_derivatives : enable

precision highp float;
precision highp int;

uniform vec3 nearColor;
uniform vec3 farColor;
uniform float nearEdge;
uniform float farEdge;

varying float vDistance;

void main() {
  float factor = smoothstep(nearEdge, farEdge, vDistance);
  vec3 color = mix(nearColor, farColor, factor);
  gl_FragColor = vec4(color, 1.0);
}
