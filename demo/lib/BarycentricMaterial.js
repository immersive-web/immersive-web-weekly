import { ShaderMaterial, DoubleSide, BufferAttribute, Color } from 'three';
import vertexShader from './barycentric-vert.glsl';
import fragmentShader from './barycentric-frag.glsl';
import solidWireframe from 'glsl-solid-wireframe';

const DEFAULTS = {
  color: new Color(0x333333),
  wireframeColor: new Color(0xeeeeee),
  alpha: 0.0,
  wireframeAlpha: 1.0,
  width: 5.0,
  vertexShader,
  fragmentShader,
  transparent: false,
  side: DoubleSide,
};

export default class BarycentricMaterial extends ShaderMaterial {
  constructor(config={}) {
    const props = Object.assign({}, DEFAULTS, config);
    super({
      uniforms: {
        color: { value: props.color },
        wireframeColor: { value: props.wireframeColor },
        alpha: { value: props.alpha },
        wireframeAlpha: { value: props.wireframeAlpha },
        width: { value: props.width / window.devicePixelRatio },
      },
      vertexShader: props.vertexShader,
      fragmentShader: props.fragmentShader,
      transparent: props.transparent,
      side: props.side,
 //     depthWrite: false,
    });
  }

  static applyBarycentricCoordinates(geometry) {
    const positions = [];
    const cells = [];
    const verts = geometry.attributes.position.array;
    const vertCount = geometry.attributes.position.count;
    const faces = [];//geometry.index ? geometry.index.array : [];

    if (!faces.length) {
      for (let i = 0; i < vertCount - 2; i++) {
        faces.push(i);
        faces.push(i + 1);
        faces.push(i + 2);
      }
    }

    const faceCount = faces.length / 3;

    // Convert from long arrays to array-of-arrays
    for (let i = 0; i < vertCount; i++) {
      positions.push([verts[i * 3 + 0], verts[i * 3 + 1], verts[i * 3 + 2]]);
    }
    for (let i = 0; i < faceCount; i++) {
      cells.push([faces[i * 3 + 0], faces[i * 3 + 1], faces[i * 3 + 2]]);
    }

    const ret = solidWireframe({
      positions,
      cells,
    });
    // Convert back from array-of-arrays to long array
    const barycentric = new Float32Array(ret.barycentric.length * 2);
    let count = 0;
    for (let i = 0; i < ret.barycentric.length; i++) {
      barycentric[count++] = ret.barycentric[i][0];
      barycentric[count++] = ret.barycentric[i][1];
    }
/*
    count = 0;
    for (let i = 0; i < ret.positions.length; i++) {
      verts[count++] = ret.positions[i][0];
      verts[count++] = ret.positions[i][1];
      verts[count++] = ret.positions[i][2];
    }

    count = 0;
    for (let i = 0; i < ret.cells.length; i++) {
      faces[count++] = ret.cells[i][0];
      faces[count++] = ret.cells[i][1];
      faces[count++] = ret.cells[i][2];
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.index.needsUpdate = true;
*/
    geometry.addAttribute('barycentric', new BufferAttribute(barycentric, 2));
  }
}
