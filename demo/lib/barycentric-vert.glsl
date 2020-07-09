
attribute vec2 barycentric;

varying vec2 vBC;

void main() {
  vBC = barycentric;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
