/**
 * Webpack Plugin for Coherent.js
 */

export class CoherentWebpackPlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('CoherentPlugin', (_compilation) => {
      // Add Coherent.js specific compilation logic
    });
  }
}

export function createWebpackPlugin(options = {}) {
  return new CoherentWebpackPlugin(options);
}