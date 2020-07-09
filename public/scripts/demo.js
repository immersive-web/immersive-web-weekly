(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('three')) :
	typeof define === 'function' && define.amd ? define(['three'], factory) :
	(factory(global.THREE));
}(this, (function (THREE) { 'use strict';

var THREE__default = 'default' in THREE ? THREE['default'] : THREE;

class App$1 {
  constructor() {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.autoClear = false;
    document.body.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.getAspect(), 0.1, 1000);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.init();
    this.lastTick = 0;
    this.onTick = this.onTick.bind(this);
    requestAnimationFrame(this.onTick);
  }
  onTick() {
    const t = performance.now();
    const delta = performance.now() - this.lastTick;
    if (this.update) {
      this.update(t, delta);
    }
    if (this.render) {
      this.render(t, delta);
    }
    this.lastTick = t;
    requestAnimationFrame(this.onTick);
  }
  getAspect() {
    return window.innerWidth / window.innerHeight;
  }
  onResize() {
    this.camera.aspect = this.getAspect();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

var vertexShader = "#define GLSLIFY 1\nattribute vec2 barycentric;\n\nvarying vec2 vBC;\n\nvoid main() {\n  vBC = barycentric;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}\n"; // eslint-disable-line

var fragmentShader = "#extension GL_OES_standard_derivatives : enable\n\nprecision highp float;\nprecision highp int;\n#define GLSLIFY 1\n\nuniform float width;\nuniform vec3 color;\nuniform float alpha;\nuniform vec3 wireframeColor;\nuniform float wireframeAlpha;\nvarying vec2 vBC;\n\nfloat gridFactor (vec2 vBC, float w) {\n  vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y);\n  vec3 d = fwidth(bary);\n  vec3 a3 = smoothstep(d * (w - 0.5), d * (w + 0.5), bary);\n  return min(min(a3.x, a3.y), a3.z);\n}\n\nvoid main() {\n  float factor = gridFactor(vBC, width);\n  vec3 color = mix(wireframeColor, color, factor);\n  float a = mix(wireframeAlpha, alpha, factor);\n  gl_FragColor = vec4(color, a);\n}\n"; // eslint-disable-line

var glslSolidWireframe = function (mesh, opts) {
  if (!opts) opts = {};
  var vars = opts.attributes ? {} : null;
  var vkeys = vars && Object.keys(opts.attributes);
  if (vars) {
    for (var k = 0; k < vkeys.length; k++) {
      vars[vkeys[k]] = [];
    }
  }
  var i, j;
  var pts = [];
  var cells = [];
  var barycentricAttrs = [];
  var mpts = mesh.positions;
  var mcells = mesh.cells;
  var c = 0;
  for (i = 0; i < mesh.cells.length; i++) {
    var cell = mcells[i];
    if (cell.length === 3) {
      pts.push(mpts[cell[0]]);
      pts.push(mpts[cell[1]]);
      pts.push(mpts[cell[2]]);
      barycentricAttrs.push([0, 0]);
      barycentricAttrs.push([1, 0]);
      barycentricAttrs.push([0, 1]);
      cells.push(c++);
      cells.push(c++);
      cells.push(c++);
      if (vkeys) {
        for (j = 0; j < vkeys.length; j++) {
          var vkey = vkeys[j];
          vars[vkey].push(opts.attributes[vkey][cell[0]]);
          vars[vkey].push(opts.attributes[vkey][cell[1]]);
          vars[vkey].push(opts.attributes[vkey][cell[2]]);
        }
      }
    }
  }
  var ret = {
    positions: pts,
    attributes: vars,
    barycentric: barycentricAttrs
  };
  if (mesh.cells) {
    ret.cells = cells;
  }
  return ret;
};

const DEFAULTS = {
  color: new THREE.Color(0x333333),
  wireframeColor: new THREE.Color(0xeeeeee),
  alpha: 0.0,
  wireframeAlpha: 1.0,
  width: 5.0,
  vertexShader,
  fragmentShader,
  transparent: false,
  side: THREE.DoubleSide,
};
class BarycentricMaterial extends THREE.ShaderMaterial {
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
    });
  }
  static applyBarycentricCoordinates(geometry) {
    const positions = [];
    const cells = [];
    const verts = geometry.attributes.position.array;
    const vertCount = geometry.attributes.position.count;
    const faces = [];
    if (!faces.length) {
      for (let i = 0; i < vertCount - 2; i++) {
        faces.push(i);
        faces.push(i + 1);
        faces.push(i + 2);
      }
    }
    const faceCount = faces.length / 3;
    for (let i = 0; i < vertCount; i++) {
      positions.push([verts[i * 3 + 0], verts[i * 3 + 1], verts[i * 3 + 2]]);
    }
    for (let i = 0; i < faceCount; i++) {
      cells.push([faces[i * 3 + 0], faces[i * 3 + 1], faces[i * 3 + 2]]);
    }
    const ret = glslSolidWireframe({
      positions,
      cells,
    });
    const barycentric = new Float32Array(ret.barycentric.length * 2);
    let count = 0;
    for (let i = 0; i < ret.barycentric.length; i++) {
      barycentric[count++] = ret.barycentric[i][0];
      barycentric[count++] = ret.barycentric[i][1];
    }
    geometry.addAttribute('barycentric', new THREE.BufferAttribute(barycentric, 2));
  }
}

var noisyVertex = "#define GLSLIFY 1\nuniform float time;\nuniform float noiseMod;\nuniform float posDampen;\n\nvarying float vDistance;\n\n//\n// GLSL textureless classic 3D noise \"cnoise\",\n// with an RSL-style periodic variant \"pnoise\".\n// Author:  Stefan Gustavson (stefan.gustavson@liu.se)\n// Version: 2011-10-11\n//\n// Many thanks to Ian McEwan of Ashima Arts for the\n// ideas for permutation and gradient selection.\n//\n// Copyright (c) 2011 Stefan Gustavson. All rights reserved.\n// Distributed under the MIT license. See LICENSE file.\n// https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289(vec3 x)\n{\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289(vec4 x)\n{\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute(vec4 x)\n{\n  return mod289(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nvec3 fade(vec3 t) {\n  return t*t*t*(t*(t*6.0-15.0)+10.0);\n}\n\n// Classic Perlin noise\nfloat cnoise(vec3 P)\n{\n  vec3 Pi0 = floor(P); // Integer part for indexing\n  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1\n  Pi0 = mod289(Pi0);\n  Pi1 = mod289(Pi1);\n  vec3 Pf0 = fract(P); // Fractional part for interpolation\n  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0\n  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n  vec4 iy = vec4(Pi0.yy, Pi1.yy);\n  vec4 iz0 = Pi0.zzzz;\n  vec4 iz1 = Pi1.zzzz;\n\n  vec4 ixy = permute(permute(ix) + iy);\n  vec4 ixy0 = permute(ixy + iz0);\n  vec4 ixy1 = permute(ixy + iz1);\n\n  vec4 gx0 = ixy0 * (1.0 / 7.0);\n  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;\n  gx0 = fract(gx0);\n  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\n  vec4 sz0 = step(gz0, vec4(0.0));\n  gx0 -= sz0 * (step(0.0, gx0) - 0.5);\n  gy0 -= sz0 * (step(0.0, gy0) - 0.5);\n\n  vec4 gx1 = ixy1 * (1.0 / 7.0);\n  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;\n  gx1 = fract(gx1);\n  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\n  vec4 sz1 = step(gz1, vec4(0.0));\n  gx1 -= sz1 * (step(0.0, gx1) - 0.5);\n  gy1 -= sz1 * (step(0.0, gy1) - 0.5);\n\n  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);\n  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);\n  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);\n  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);\n  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);\n  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);\n  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);\n  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);\n\n  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\n  g000 *= norm0.x;\n  g010 *= norm0.y;\n  g100 *= norm0.z;\n  g110 *= norm0.w;\n  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\n  g001 *= norm1.x;\n  g011 *= norm1.y;\n  g101 *= norm1.z;\n  g111 *= norm1.w;\n\n  float n000 = dot(g000, Pf0);\n  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\n  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\n  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\n  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\n  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\n  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\n  float n111 = dot(g111, Pf1);\n\n  vec3 fade_xyz = fade(Pf0);\n  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\n  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\n  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);\n  return 2.2 * n_xyz;\n}\n\nfloat quadraticOut(float t) {\n  return -t * (t - 2.0);\n}\n\nvoid main() {\n  float t = time + 20.0;\n  float noise = cnoise(noiseMod * t * vec3(position.x, position.y, 3.0 * position.z+100.0) * 0.5 + 0.5);\n\n  float isEdge = step(0.01, uv.x) * step(0.01, uv.y) * step(0.01, 1.0 - uv.x) * step(0.01, 1.0 - uv.y);\n  vec3 pos = position + (vec3(0, 100, 0) * noise * posDampen * isEdge);\n  vec4 modelPosition = modelViewMatrix * vec4(pos, 1.0);\n\n  vDistance = distance(vec4(cameraPosition, 1.0), modelPosition);\n\n  gl_Position = projectionMatrix * modelPosition;\n}\n"; // eslint-disable-line

var noisyFrag = "#extension GL_OES_standard_derivatives : enable\n\nprecision highp float;\nprecision highp int;\n#define GLSLIFY 1\n\nuniform vec3 nearColor;\nuniform vec3 farColor;\nuniform float nearEdge;\nuniform float farEdge;\n\nvarying float vDistance;\n\nvoid main() {\n  float factor = smoothstep(nearEdge, farEdge, vDistance);\n  vec3 color = mix(nearColor, farColor, factor);\n  gl_FragColor = vec4(color, 1.0);\n}\n"; // eslint-disable-line

'use strict';
var processShader = function processShader(vertexShaderCode, fragmentShaderCode) {
  var regExp = /uniform\s+([^\s]+)\s+([^\s]+)\s*;/gi;
  var regExp2 = /uniform\s+([^\s]+)\s+([^\s]+)\s*\[\s*(\w+)\s*\]*\s*;/gi;
  var typesMap = {
    sampler2D: { type: 't', value: function() { return new THREE__default.Texture(); } },
    samplerCube: { type: 't', value: function() {} },
    bool: { type: 'b', value: function() { return 0; } },
    int: { type: 'i', value: function() { return 0; } },
    float: { type: 'f', value: function() { return 0; } },
    vec2: { type: 'v2', value: function() { return new THREE__default.Vector2(); } },
    vec3: { type: 'v3', value: function() { return new THREE__default.Vector3(); } },
    vec4: { type: 'v4', value: function() { return new THREE__default.Vector4(); } },
    bvec2: { type: 'v2', value: function() { return new THREE__default.Vector2(); } },
    bvec3: { type: 'v3', value: function() { return new THREE__default.Vector3(); } },
    bvec4: { type: 'v4', value: function() { return new THREE__default.Vector4(); } },
    ivec2: { type: 'v2', value: function() { return new THREE__default.Vector2(); } },
    ivec3: { type: 'v3', value: function() { return new THREE__default.Vector3(); } },
    ivec4: { type: 'v4', value: function() { return new THREE__default.Vector4(); } },
    mat2: { type: 'v2', value: function() { return new THREE__default.Matrix2(); } },
    mat3: { type: 'v3', value: function() { return new THREE__default.Matrix3(); } },
    mat4: { type: 'v4', value: function() { return new THREE__default.Matrix4(); } }
  };
  var arrayTypesMap = {
    float: { type: 'fv', value: function() { return []; } },
    vec3: { type: 'v3v', value: function() { return []; } }
  };
  var matches;
  var uniforms = {
    resolution: { type: 'v2', value: new THREE__default.Vector2( 1, 1 ), default: true },
    time: { type: 'f', value: Date.now(), default: true },
    tInput: { type: 't', value: new THREE__default.Texture(), default: true }
  };
  var uniformType, uniformName;
  while ((matches = regExp.exec(fragmentShaderCode)) !== null) {
    if (matches.index === regExp.lastIndex) {
      regExp.lastIndex++;
    }
    uniformType = matches[1];
    uniformName = matches[2];
    uniforms[uniformName] = {
      type: typesMap[uniformType].type,
      value: typesMap[uniformType].value()
    };
  }
  while ((matches = regExp2.exec(fragmentShaderCode)) !== null) {
    if (matches.index === regExp.lastIndex) {
      regExp.lastIndex++;
    }
    uniformType = matches[1];
    uniformName = matches[2];
    uniforms[uniformName] = {
      type: arrayTypesMap[uniformType].type,
      value: arrayTypesMap[uniformType].value()
    };
  }
  var shader = new THREE__default.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShaderCode,
    fragmentShader: fragmentShaderCode,
    shading: THREE__default.FlatShading,
    depthWrite: false,
    depthTest: false,
    transparent: true
  });
  return shader;
};

'use strict';
function Pass() {
  this.shader = null;
  this.loaded = null;
  this.params = {};
  this.isSim = false;
}
var Pass_1 = Pass;
Pass.prototype.setShader = function(vs, fs) {
  this.shader = processShader(vs, fs);
};
Pass.prototype.run = function(composer) {
  composer.pass(this.shader);
};
Pass.prototype.getOfflineTexture = function(w, h, useRGBA) {
  return new THREE__default.WebGLRenderTarget(w, h, {
    minFilter: THREE__default.LinearFilter,
    magFilter: THREE__default.LinearFilter,
    format: useRGBA ? THREE__default.RGBAFormat : THREE__default.RGBFormat
  });
};

var basic = "#define GLSLIFY 1\nvarying vec2 vUv;\n\nvoid main() {\n\n  vUv = uv;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n}"; // eslint-disable-line

var basic$1 = Object.freeze({
	default: basic
});

var copyFs = "#define GLSLIFY 1\nvarying vec2 vUv;\nuniform sampler2D tInput;\n\nvoid main() {\n  gl_FragColor = texture2D( tInput, vUv );\n\n}"; // eslint-disable-line

var copyFs$1 = Object.freeze({
	default: copyFs
});

var vertex = ( basic$1 && basic ) || basic$1;

var fragment = ( copyFs$1 && copyFs ) || copyFs$1;

'use strict';
function CopyPass$1() {
  Pass_1.call(this);
  this.setShader(vertex, fragment);
}
var CopyPass_1 = CopyPass$1;
CopyPass$1.prototype = Object.create(Pass_1.prototype);
CopyPass$1.prototype.constructor = CopyPass$1;

'use strict';
function Stack(shadersPool) {
  this.passItems = [];
  this.shadersPool = shadersPool;
  this.passes = [];
}
var Stack_1 = Stack;
Stack.prototype.addPass = function(shaderName, enabled, params, index) {
  var length = 0;
  var passItem = {
    shaderName: shaderName,
    enabled: enabled || false
  };
  this.passItems.push(passItem);
  length = this.passItems.length;
  this.updatePasses();
  if (index) {
    return this.movePassToIndex(this.passItems[length], index);
  }
  else {
    return length - 1;
  }
};
Stack.prototype.removePass = function(index) {
  this.passItems.splice(index, 1);
  this.updatePasses();
};
Stack.prototype.enablePass = function(index) {
  this.passItems[index].enabled = true;
  this.updatePasses();
};
Stack.prototype.disablePass = function(index) {
  this.passItems[index].enabled = false;
  this.updatePasses();
};
Stack.prototype.isPassEnabled = function(index) {
  return this.passItems[index].enabled;
};
Stack.prototype.movePassToIndex = function(index, destIndex) {
  this.passItems.splice(destIndex, 0, this.passItems.splice(index, 1)[0]);
  this.updatePasses();
  return destIndex;
};
Stack.prototype.reverse = function() {
  this.passItems.reverse();
  this.updatePasses();
};
Stack.prototype.updatePasses = function() {
  this.passes = this.shadersPool.getPasses(this.passItems);
  this.passItems.forEach(function(passItem, index) {
    if (passItem.params === undefined) {
      passItem.params = JSON.parse(JSON.stringify(this.passes[index].params));
    }
  }.bind(this));
};
Stack.prototype.getPasses = function() {
  return this.passes;
};

'use strict';
function Composer$1(renderer, settings) {
  var pixelRatio = renderer.getPixelRatio();
  this.width  = Math.floor(renderer.context.canvas.width  / pixelRatio) || 1;
  this.height = Math.floor(renderer.context.canvas.height / pixelRatio) || 1;
  this.output = null;
  this.input = null;
  this.read = null;
  this.write = null;
  this.settings = settings || {};
  this.useRGBA = this.settings.useRGBA || false;
  this.renderer = renderer;
  this.copyPass = new CopyPass_1(this.settings);
  this.defaultMaterial = new THREE__default.MeshBasicMaterial({color: 0x00FF00, wireframe: false});
  this.scene = new THREE__default.Scene();
  this.quad = new THREE__default.Mesh(new THREE__default.PlaneBufferGeometry(1, 1), this.defaultMaterial);
  this.scene.add(this.quad);
  this.camera = new THREE__default.OrthographicCamera(1, 1, 1, 1, -10000, 10000);
  this.front = new THREE__default.WebGLRenderTarget(1, 1, {
    minFilter: this.settings.minFilter !== undefined ? this.settings.minFilter : THREE__default.LinearFilter,
    magFilter: this.settings.magFilter !== undefined ? this.settings.magFilter : THREE__default.LinearFilter,
    wrapS: this.settings.wrapS !== undefined ? this.settings.wrapS : THREE__default.ClampToEdgeWrapping,
    wrapT: this.settings.wrapT !== undefined ? this.settings.wrapT : THREE__default.ClampToEdgeWrapping,
    format: this.useRGBA ? THREE__default.RGBAFormat : THREE__default.RGBFormat,
    type: this.settings.type !== undefined ? this.settings.type : THREE__default.UnsignedByteType,
    stencilBuffer: this.settings.stencilBuffer !== undefined ? this.settings.stencilBuffer : true
  });
  this.back = this.front.clone();
  this.startTime = Date.now();
  this.passes = {};
  this.setSize(this.width, this.height);
}
var Composer_1 = Composer$1;
Composer$1.prototype.swapBuffers = function() {
  this.output = this.write;
  this.input = this.read;
  var t = this.write;
  this.write = this.read;
  this.read = t;
};
Composer$1.prototype.render = function(scene, camera, keep, output) {
  if (keep) this.swapBuffers();
  this.renderer.render(scene, camera, output ? output : this.write, true);
  if (!output) this.swapBuffers();
};
Composer$1.prototype.toScreen = function() {
  this.quad.material = this.copyPass.shader;
  this.quad.material.uniforms.tInput.value = this.read;
  this.quad.material.uniforms.resolution.value.set(this.width, this.height);
  this.renderer.render(this.scene, this.camera);
};
Composer$1.prototype.toTexture = function(t) {
  this.quad.material = this.copyPass.shader;
  this.quad.material.uniforms.tInput.value = this.read;
  this.renderer.render(this.scene, this.camera, t, false);
};
Composer$1.prototype.pass = function(pass) {
  if (pass instanceof Stack_1) {
    this.passStack(pass);
  }
  else {
    if (pass instanceof THREE__default.ShaderMaterial) {
      this.quad.material = pass;
    }
    if (pass instanceof Pass_1) {
      pass.run(this);
      return;
    }
    if (!pass.isSim) {
      this.quad.material.uniforms.tInput.value = this.read;
    }
    this.quad.material.uniforms.resolution.value.set(this.width, this.height);
    this.quad.material.uniforms.time.value = 0.001 * (Date.now() - this.startTime);
    this.renderer.render(this.scene, this.camera, this.write, false);
    this.swapBuffers();
  }
};
Composer$1.prototype.passStack = function(stack) {
  stack.getPasses().forEach(function(pass) {
    this.pass(pass);
  }.bind(this));
};
Composer$1.prototype.reset = function() {
  this.read = this.front;
  this.write = this.back;
  this.output = this.write;
  this.input = this.read;
};
Composer$1.prototype.setSource = function(src) {
  this.quad.material = this.copyPass.shader;
  this.quad.material.uniforms.tInput.value = src;
  this.renderer.render(this.scene, this.camera, this.write, true);
  this.swapBuffers();
};
Composer$1.prototype.setSize = function(w, h) {
  this.width = w;
  this.height = h;
  this.camera.projectionMatrix.makeOrthographic( w / - 2, w / 2, h / 2, h / - 2, this.camera.near, this.camera.far );
  this.quad.scale.set( w, h, 1 );
  this.front.setSize( w, h );
  this.back.setSize( w, h );
};

'use strict';
var Composer = Composer_1;
var CopyPass = CopyPass_1;
var BlendMode = {
  Normal: 1,
  Dissolve: 2,
  Darken: 3,
  Multiply: 4,
  ColorBurn: 5,
  LinearBurn: 6,
  DarkerColor: 7,
  Lighten: 8,
  Screen: 9,
  ColorDodge: 10,
  LinearDodge: 11,
  LighterColor: 12,
  Overlay: 13,
  SoftLight: 14,
  HardLight: 15,
  VividLight: 16,
  LinearLight: 17,
  PinLight: 18,
  HardMix: 19,
  Difference: 20,
  Exclusion: 21,
  Substract: 22,
  Divide: 23
};
var wagner = {
	Composer: Composer,
	CopyPass: CopyPass,
	BlendMode: BlendMode
};

var boxBlurFs = "#define GLSLIFY 1\nvarying vec2 vUv;\nuniform sampler2D tInput;\nuniform vec2 delta;\nuniform vec2 resolution;\n\nvoid main() {\n\n  vec4 sum = vec4( 0. );\n  vec2 inc = delta / resolution;\n\n  sum += texture2D( tInput, ( vUv - inc * 4. ) ) * 0.051;\n  sum += texture2D( tInput, ( vUv - inc * 3. ) ) * 0.0918;\n  sum += texture2D( tInput, ( vUv - inc * 2. ) ) * 0.12245;\n  sum += texture2D( tInput, ( vUv - inc * 1. ) ) * 0.1531;\n  sum += texture2D( tInput, ( vUv + inc * 0. ) ) * 0.1633;\n  sum += texture2D( tInput, ( vUv + inc * 1. ) ) * 0.1531;\n  sum += texture2D( tInput, ( vUv + inc * 2. ) ) * 0.12245;\n  sum += texture2D( tInput, ( vUv + inc * 3. ) ) * 0.0918;\n  sum += texture2D( tInput, ( vUv + inc * 4. ) ) * 0.051;\n\n  gl_FragColor = sum;\n\n}"; // eslint-disable-line

var boxBlurFs$1 = Object.freeze({
	default: boxBlurFs
});

var fragment$1 = ( boxBlurFs$1 && boxBlurFs ) || boxBlurFs$1;

'use strict';
function BoxBlurPass(deltaX, deltaY) {
  Pass_1.call(this);
  this.setShader(vertex, fragment$1);
  this.params.delta = new THREE__default.Vector2(deltaX || 0, deltaY || 0);
}
var BoxBlurPass_1 = BoxBlurPass;
BoxBlurPass.prototype = Object.create(Pass_1.prototype);
BoxBlurPass.prototype.constructor = BoxBlurPass;
BoxBlurPass.prototype.run = function(composer) {
  this.shader.uniforms.delta.value.copy(this.params.delta);
  composer.pass(this.shader);
};

'use strict';
function FullBoxBlurPass(amount) {
  Pass_1.call(this);
  amount = amount || 2;
  this.boxPass = new BoxBlurPass_1(amount, amount);
  this.params.amount = amount;
}
var FullBoxBlurPass_1 = FullBoxBlurPass;
FullBoxBlurPass.prototype = Object.create(Pass_1.prototype);
FullBoxBlurPass.prototype.constructor = FullBoxBlurPass;
FullBoxBlurPass.prototype.run = function(composer) {
  var s = this.params.amount;
  this.boxPass.params.delta.set( s, 0 );
  composer.pass( this.boxPass );
  this.boxPass.params.delta.set( 0, s );
  composer.pass( this.boxPass );
};

var blendFs = "#define GLSLIFY 1\nvarying vec2 vUv;\nuniform sampler2D tInput;\nuniform sampler2D tInput2;\nuniform vec2 resolution;\nuniform vec2 resolution2;\nuniform float aspectRatio;\nuniform float aspectRatio2;\nuniform int mode;\nuniform int sizeMode;\nuniform float opacity;\n\nvec2 vUv2;\n\nfloat applyOverlayToChannel( float base, float blend ) {\n\n  return (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));\n\n}\n\nfloat applySoftLightToChannel( float base, float blend ) {\n\n  return ((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)));\n\n}\n\nfloat applyColorBurnToChannel( float base, float blend ) {\n\n  return ((blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0));\n\n}\n\nfloat applyColorDodgeToChannel( float base, float blend ) {\n\n  return ((blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0));\n\n}\n\nfloat applyLinearBurnToChannel( float base, float blend ) {\n\n  return max(base + blend - 1., 0.0 );\n\n}\n\nfloat applyLinearDodgeToChannel( float base, float blend ) {\n\n  return min( base + blend, 1. );\n\n}\n\nfloat applyLinearLightToChannel( float base, float blend ) {\n\n  return ( blend < .5 ) ? applyLinearBurnToChannel( base, 2. * blend ) : applyLinearDodgeToChannel( base, 2. * ( blend - .5 ) );\n\n}\n\nvoid main() {\n\n  vUv2 = vUv;\n  \n  if( sizeMode == 1 ) {\n    \n    if( aspectRatio2 > aspectRatio ) {\n      vUv2.x = vUv.x * aspectRatio / aspectRatio2;\n      vUv2.x += .5 * ( 1. - aspectRatio / aspectRatio2 ); \n      vUv2.y = vUv.y;\n    }\n\n    if( aspectRatio2 < aspectRatio ) {\n      vUv2.x = vUv.x;\n      vUv2.y = vUv.y * aspectRatio2 / aspectRatio;\n      vUv2.y += .5 * ( 1. - aspectRatio2 / aspectRatio );\n    }\n\n  }\n\n  vec4 base = texture2D( tInput, vUv );\n  vec4 blend = texture2D( tInput2, vUv2 );\n\n  if( mode == 1 ) { // normal\n\n    gl_FragColor = base;\n    gl_FragColor.a *= opacity;\n    return;\n\n  }\n\n  if( mode == 2 ) { // dissolve\n\n  }\n\n  if( mode == 3 ) { // darken\n\n    gl_FragColor = min( base, blend );\n    return;\n\n  }\n\n  if( mode == 4 ) { // multiply\n\n    gl_FragColor = base * blend;\n    return;\n\n  }\n\n  if( mode == 5 ) { // color burn\n\n    gl_FragColor = vec4(\n      applyColorBurnToChannel( base.r, blend.r ),\n      applyColorBurnToChannel( base.g, blend.g ),\n      applyColorBurnToChannel( base.b, blend.b ),\n      applyColorBurnToChannel( base.a, blend.a )\n    );\n    return;\n\n  }\n\n  if( mode == 6 ) { // linear burn\n\n    gl_FragColor = max(base + blend - 1.0, 0.0);\n    return;\n\n  }\n\n  if( mode == 7 ) { // darker color\n\n  }\n\n  if( mode == 8 ) { // lighten\n\n    gl_FragColor = max( base, blend );\n    return;\n\n  }\n\n  if( mode == 9 ) { // screen\n\n    gl_FragColor = (1.0 - ((1.0 - base) * (1.0 - blend)));\n    gl_FragColor = gl_FragColor * opacity + base * ( 1. - opacity );\n    return;\n\n  }\n\n  if( mode == 10 ) { // color dodge\n\n    gl_FragColor = vec4(\n      applyColorDodgeToChannel( base.r, blend.r ),\n      applyColorDodgeToChannel( base.g, blend.g ),\n      applyColorDodgeToChannel( base.b, blend.b ),\n      applyColorDodgeToChannel( base.a, blend.a )\n    );\n    return;\n\n  }\n\n  if( mode == 11 ) { // linear dodge\n\n    gl_FragColor = min(base + blend, 1.0);\n    return;\n\n  }\n\n  if( mode == 12 ) { // lighter color\n\n  }\n\n  if( mode == 13 ) { // overlay\n\n    gl_FragColor = gl_FragColor = vec4( \n      applyOverlayToChannel( base.r, blend.r ),\n      applyOverlayToChannel( base.g, blend.g ),\n      applyOverlayToChannel( base.b, blend.b ),\n      applyOverlayToChannel( base.a, blend.a )\n    );\n    gl_FragColor = gl_FragColor * opacity + base * ( 1. - opacity );\n  \n    return;\n\n  }\n\n  if( mode == 14 ) { // soft light\n\n    gl_FragColor = vec4( \n      applySoftLightToChannel( base.r, blend.r ),\n      applySoftLightToChannel( base.g, blend.g ),\n      applySoftLightToChannel( base.b, blend.b ),\n      applySoftLightToChannel( base.a, blend.a )\n    );\n    return;\n\n  }\n\n  if( mode == 15 ) { // hard light\n\n    gl_FragColor = vec4( \n      applyOverlayToChannel( base.r, blend.r ),\n      applyOverlayToChannel( base.g, blend.g ),\n      applyOverlayToChannel( base.b, blend.b ),\n      applyOverlayToChannel( base.a, blend.a )\n    );\n    gl_FragColor = gl_FragColor * opacity + base * ( 1. - opacity );\n    return;\n\n  }\n\n  if( mode == 16 ) { // vivid light\n\n  }\n\n  if( mode == 17 ) { // linear light\n\n    gl_FragColor = vec4( \n      applyLinearLightToChannel( base.r, blend.r ),\n      applyLinearLightToChannel( base.g, blend.g ),\n      applyLinearLightToChannel( base.b, blend.b ),\n      applyLinearLightToChannel( base.a, blend.a )\n    );\n    return;\n\n  }\n\n  if( mode == 18 ) { // pin light\n\n  }\n\n  if( mode == 19 ) { // hard mix\n\n  }\n\n  if( mode == 20 ) { // difference\n\n    gl_FragColor = abs( base - blend );\n    gl_FragColor.a = base.a + blend.b;\n    return;\n\n  }\n\n  if( mode == 21 ) { // exclusion\n\n    gl_FragColor = base + blend - 2. * base * blend;\n    \n  }\n\n  if( mode == 22 ) { // substract\n\n  }\n\n  if( mode == 23 ) { // divide\n\n  }\n\n  gl_FragColor = vec4( 1., 0., 1., 1. );\n\n}"; // eslint-disable-line

var blendFs$1 = Object.freeze({
	default: blendFs
});

var fragment$2 = ( blendFs$1 && blendFs ) || blendFs$1;

'use strict';
function BlendPass(options) {
  Pass_1.call(this);
  options = options || {};
  this.setShader(vertex, fragment$2);
  this.params.mode = options.mode || 1;
  this.params.opacity = options.opacity || 1;
  this.params.tInput2 = options.tInput2 || null;
  this.params.resolution2 = options.resolution2 || new THREE__default.Vector2();
  this.params.sizeMode = options.sizeMode || 1;
  this.params.aspectRatio = options.aspectRatio || 1;
  this.params.aspectRatio2 = options.aspectRatio2 || 1;
}
var BlendPass_1 = BlendPass;
BlendPass.prototype = Object.create(Pass_1.prototype);
BlendPass.prototype.constructor = BlendPass;
BlendPass.prototype.run = function(composer) {
  this.shader.uniforms.mode.value = this.params.mode;
  this.shader.uniforms.opacity.value = this.params.opacity;
  this.shader.uniforms.tInput2.value = this.params.tInput2;
  this.shader.uniforms.sizeMode.value = this.params.sizeMode;
  this.shader.uniforms.aspectRatio.value = this.params.aspectRatio;
  this.shader.uniforms.aspectRatio2.value = this.params.aspectRatio2;
  composer.pass(this.shader);
};

var zoomBlurFs = "#define GLSLIFY 1\nuniform sampler2D tInput;\nuniform vec2 center;\nuniform float strength;\nuniform vec2 resolution;\nvarying vec2 vUv;\n\nfloat random(vec3 scale,float seed){return fract(sin(dot(gl_FragCoord.xyz+seed,scale))*43758.5453+seed);}\n\nvoid main(){\n  vec4 color=vec4(0.0);\n  float total=0.0;\n  vec2 toCenter=center-vUv*resolution;\n  float offset=random(vec3(12.9898,78.233,151.7182),0.0);\n  for(float t=0.0;t<=40.0;t++){\n    float percent=(t+offset)/40.0;\n    float weight=4.0*(percent-percent*percent);\n    vec4 sample=texture2D(tInput,vUv+toCenter*percent*strength/resolution);\n    sample.rgb*=sample.a;\n    color+=sample*weight;\n    total+=weight;\n  }\n  gl_FragColor=color/total;\n  gl_FragColor.rgb/=gl_FragColor.a+0.00001;\n}"; // eslint-disable-line

var zoomBlurFs$1 = Object.freeze({
	default: zoomBlurFs
});

var fragment$3 = ( zoomBlurFs$1 && zoomBlurFs ) || zoomBlurFs$1;

'use strict';
function ZoomBlurPass(options) {
  Pass_1.call(this);
  options = options || {};
  this.setShader(vertex, fragment$3);
  this.params.center = new THREE__default.Vector2(options.centerX || 0.5, options.centerY || 0.5);
  this.params.strength = options.strength || 0.1;
}
var ZoomBlurPass_1 = ZoomBlurPass;
ZoomBlurPass.prototype = Object.create(Pass_1.prototype);
ZoomBlurPass.prototype.constructor = ZoomBlurPass;
ZoomBlurPass.prototype.run = function(composer) {
  this.shader.uniforms.center.value.set(composer.width * this.params.center.x, composer.height * this.params.center.y);
  this.shader.uniforms.strength.value = this.params.strength;
  composer.pass(this.shader);
};

var brightnessContrastFs = "#define GLSLIFY 1\nuniform float brightness;\nuniform float contrast;\nuniform sampler2D tInput;\n\nvarying vec2 vUv;\n\nvoid main() {\n\n  vec3 color = texture2D(tInput, vUv).rgb;\n  vec3 colorContrasted = (color) * contrast;\n  vec3 bright = colorContrasted + vec3(brightness,brightness,brightness);\n  gl_FragColor.rgb = bright;\n  gl_FragColor.a = 1.;\n\n}"; // eslint-disable-line

var brightnessContrastFs$1 = Object.freeze({
	default: brightnessContrastFs
});

var fragment$4 = ( brightnessContrastFs$1 && brightnessContrastFs ) || brightnessContrastFs$1;

'use strict';
function BrightnessContrastPass(brightness, contrast) {
  Pass_1.call(this);
  this.setShader(vertex, fragment$4);
  this.params.brightness = brightness || 1;
  this.params.contrast = contrast || 1;
}
var BrightnessContrastPass_1 = BrightnessContrastPass;
BrightnessContrastPass.prototype = Object.create(Pass_1.prototype);
BrightnessContrastPass.prototype.constructor = BrightnessContrastPass;
BrightnessContrastPass.prototype.run = function(composer) {
  this.shader.uniforms.brightness.value = this.params.brightness;
  this.shader.uniforms.contrast.value = this.params.contrast;
  composer.pass(this.shader);
};

'use strict';
var BlendMode$1 = wagner.BlendMode;
function MultiPassBloomPass(options) {
  Pass_1.call(this);
  options = options || {};
  this.composer = null;
  this.tmpTexture = this.getOfflineTexture( options.width, options.height, true );
  this.blurPass = new FullBoxBlurPass_1(2);
  this.blendPass = new BlendPass_1();
  this.zoomBlur = new ZoomBlurPass_1();
  this.brightnessContrastPass = new BrightnessContrastPass_1();
  this.width = options.width || 512;
  this.height = options.height || 512;
  this.params.blurAmount = options.blurAmount || 2;
  this.params.applyZoomBlur = options.applyZoomBlur || false;
  this.params.zoomBlurStrength = options.zoomBlurStrength || 0.2;
  this.params.useTexture = options.useTexture || false;
  this.params.zoomBlurCenter = options.zoomBlurCenter || new THREE__default.Vector2(0.5, 0.5);
  this.params.blendMode = options.blendMode || BlendMode$1.Screen;
  this.params.glowTexture = null;
}
var MultiPassBloomPass_1 = MultiPassBloomPass;
MultiPassBloomPass.prototype = Object.create(Pass_1.prototype);
MultiPassBloomPass.prototype.constructor = MultiPassBloomPass;
MultiPassBloomPass.prototype.run = function(composer) {
  if (!this.composer) {
    this.composer = new Composer_1(composer.renderer, {useRGBA: true});
    this.composer.setSize(this.width, this.height);
  }
  this.composer.reset();
  if (this.params.useTexture === true) {
    this.composer.setSource(this.params.glowTexture);
  } else {
    this.composer.setSource(composer.output);
  }
  this.blurPass.params.amount = this.params.blurAmount;
  this.composer.pass(this.blurPass);
  if (this.params.applyZoomBlur) {
    this.zoomBlur.params.center.set(
      this.params.zoomBlurCenter.x,
      this.params.zoomBlurCenter.y
    );
    this.zoomBlur.params.strength = this.params.zoomBlurStrength;
    this.composer.pass(this.zoomBlur);
  }
  if (this.params.useTexture === true) {
    this.blendPass.params.mode = BlendMode$1.Screen;
    this.blendPass.params.tInput = this.params.glowTexture;
    composer.pass(this.blendPass);
  }
  this.blendPass.params.mode = this.params.blendMode;
  this.blendPass.params.tInput2 = this.composer.output;
  composer.pass(this.blendPass);
};

var vignetteFs = "#define GLSLIFY 1\nvarying vec2 vUv;\nuniform sampler2D tInput;\nuniform vec2 resolution;\n\nuniform float reduction;\nuniform float boost;\n\nvoid main() {\n\n  vec4 color = texture2D( tInput, vUv );\n\n  vec2 center = resolution * 0.5;\n  float vignette = distance( center, gl_FragCoord.xy ) / resolution.x;\n  vignette = boost - vignette * reduction;\n\n  color.rgb *= vignette;\n  gl_FragColor = color;\n\n}"; // eslint-disable-line

var vignetteFs$1 = Object.freeze({
	default: vignetteFs
});

var fragment$5 = ( vignetteFs$1 && vignetteFs ) || vignetteFs$1;

'use strict';
function VignettePass(boost, reduction) {
  Pass_1.call(this);
  this.setShader(vertex, fragment$5);
  this.params.boost = boost || 2;
  this.params.reduction = reduction || 2;
}
var VignettePass_1 = VignettePass;
VignettePass.prototype = Object.create(Pass_1.prototype);
VignettePass.prototype.constructor = VignettePass;
VignettePass.prototype.run = function(composer) {
  this.shader.uniforms.boost.value = this.params.boost;
  this.shader.uniforms.reduction.value = this.params.reduction;
  composer.pass(this.shader);
};

const CYCLE_TIME = 1000;
const MOVEMENT = 10;
const MOUNTAIN_NOISE_MOD = 0.2;
const MOUNTAIN_POS_DAMPEN = 0.006;
const MOUNTAIN_DEFORM_SPEED = 0.00001;
class App extends App$1 {
  init() {
    const gridGeo = new THREE.PlaneBufferGeometry(1, 1, 10, 10);
    gridGeo.applyMatrix(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / -2));
    BarycentricMaterial.applyBarycentricCoordinates(gridGeo);
    const gridMat = new BarycentricMaterial({
      color: new THREE.Color(0x222222),
      wireframeColor: new THREE.Color(0x46d6fd),
      alpha: 1.0,
      wireframeAlpha: 1.0,
      width: 2,
    });
    this.grid = new THREE.Mesh(gridGeo, gridMat);
    this.grid.scale.multiplyScalar(100);
    this.grid.position.z = -50;
    this.scene.add(this.grid);
    const mountainGeo = new THREE.PlaneBufferGeometry(2, 1, 20, 10);
    mountainGeo.applyMatrix(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / -2.5));
    const mountainMat = new THREE.ShaderMaterial({
      uniforms: {
        noiseMod: { value: MOUNTAIN_NOISE_MOD },
        posDampen: { value: MOUNTAIN_POS_DAMPEN },
        time: { value: 0 },
        nearColor: { value: new THREE.Color(0xb450ce) },
        farColor: { value: new THREE.Color(0x461d50) },
        nearEdge: { value: 50 },
        farEdge: { value: 150 },
      },
      vertexShader: noisyVertex,
      fragmentShader: noisyFrag,
    });
    this.mountain = new THREE.Mesh(mountainGeo, mountainMat);
    this.mountain.scale.multiplyScalar(100);
    this.mountain.position.z = -100;
    this.scene.add(this.mountain);
    this.composer = new wagner.Composer(this.renderer);
    this.pass = new MultiPassBloomPass_1({
      blurAmount: 0.4,
      applyZoomBlur: true,
      zoomBlurStrength: 4,
    });
    this.vpass = new VignettePass_1(2, 1.5);
    this.camera.position.y = 5;
    this.camera.rotation.x = -0.2;
    this.lastCycle = 0;
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

})));
