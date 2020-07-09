const rollup = require('rollup');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const cleanup = require('rollup-plugin-cleanup');
const glslify = require('rollup-plugin-glslify');

export default {
  input: 'demo/index.js',
  output: [{
    file: './public/scripts/demo.js',
    format: 'umd',
    name: 'App',
  }],
  external: ['three'],
  globals: {
    'three': 'THREE',
  },
  watch: {
    include: 'demo/**',
  },
  plugins: [
    resolve(),
    glslify({
      include: ['demo/**/*.glsl'],
    }),
    commonjs(),
    cleanup(),
  ],
};
