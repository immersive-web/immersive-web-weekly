import { ShaderMaterial, Color, Mesh, PlaneBufferGeometry, MeshBasicMaterial, Matrix4, Vector3 } from 'three';
import ThreeApp from '@jsantell/three-app';
import BarycentricMaterial from './lib/BarycentricMaterial.js';
import noisyVertex from './lib/noisy-mountain-vert.glsl';
import noisyFrag from './lib/noisy-mountain-frag.glsl';
import WAGNER from './lib/wagner/index.js';
import BloomPass from './lib/wagner/src/passes/bloom/MultiPassBloomPass';
import VPass from './lib/wagner/src/passes/vignette/VignettePass.js';

const CYCLE_TIME = 1000;
const MOVEMENT = 10;
const MOUNTAIN_NOISE_MOD = 0.2;
const MOUNTAIN_POS_DAMPEN = 0.006;
const MOUNTAIN_DEFORM_SPEED = 0.00001;

class App extends ThreeApp {
  init() {

    /* Create grid */

    const gridGeo = new PlaneBufferGeometry(1, 1, 10, 10);
    gridGeo.applyMatrix(new Matrix4().makeRotationAxis(new Vector3(1, 0, 0), Math.PI / -2));
    BarycentricMaterial.applyBarycentricCoordinates(gridGeo);

    const gridMat = new BarycentricMaterial({
      color: new Color(0x222222),
      wireframeColor: new Color(0x46d6fd),
      alpha: 1.0,
      wireframeAlpha: 1.0,
      width: 2,
    });

    this.grid = new Mesh(gridGeo, gridMat);
    this.grid.scale.multiplyScalar(100);
    this.grid.position.z = -50;
    this.scene.add(this.grid);

    /* create mountains */

    const mountainGeo = new PlaneBufferGeometry(2, 1, 20, 10);
    mountainGeo.applyMatrix(new Matrix4().makeRotationAxis(new Vector3(1, 0, 0), Math.PI / -2.5));

    const mountainMat = new ShaderMaterial({
      uniforms: {
        noiseMod: { value: MOUNTAIN_NOISE_MOD },
        posDampen: { value: MOUNTAIN_POS_DAMPEN },
        time: { value: 0 },
        nearColor: { value: new Color(0xb450ce) },
        farColor: { value: new Color(0x461d50) },
        nearEdge: { value: 50 },
        farEdge: { value: 150 },
      },
      vertexShader: noisyVertex,
      fragmentShader: noisyFrag,
    });

    this.mountain = new Mesh(mountainGeo, mountainMat);
    this.mountain.scale.multiplyScalar(100);
    this.mountain.position.z = -100;
    this.scene.add(this.mountain);

    /* scene settings */

    this.composer = new WAGNER.Composer(this.renderer);
    this.pass = new BloomPass({
      blurAmount: 0.4,
      applyZoomBlur: true,
      zoomBlurStrength: 4,
    });
    this.vpass = new VPass(2, 1.5);

    this.camera.position.y = 5;
    this.camera.rotation.x = -0.2;
    this.lastCycle = 0;

    /* events */
    this.onMouseMove = this.onMouseMove.bind(this);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  onMouseMove(e) {
    this.camera.rotation.y = (-(e.clientX / window.innerWidth) * 2 + 1) * 0.2;
    this.camera.rotation.x = (((e.clientY / window.innerHeight) * 2 - 1) * 0.1) - 0.2;
  }

  update(t, delta) {
    if ((t - this.lastCycle) > CYCLE_TIME) {
      this.grid.position.z = -50;
      this.lastCycle = t;
    } else {
      this.grid.position.z += delta * MOVEMENT * 0.001;
    }
    this.grid.position.x = Math.sin(t * 0.001) * 2;
    this.mountain.material.uniforms.time.value = t * MOUNTAIN_DEFORM_SPEED;
  }

  render() {
    this.composer.reset();
    this.composer.render(this.scene, this.camera);
    this.composer.pass(this.pass);
    this.composer.pass(this.vpass);
    this.composer.toScreen();
  }
}

window.app = new App();
