/**
 * TypeScript configuration generator
 */

/**
 * Generate tsconfig.json for Coherent.js projects
 */
export function generateTsConfig() {
  return {
    compilerOptions: {
      // Target and Module
      target: 'ES2022',
      module: 'ESNext',
      lib: ['ES2022'],

      // Module Resolution
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,

      // Emit
      outDir: './dist',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      removeComments: false,

      // Type Checking
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      allowUnusedLabels: false,
      allowUnreachableCode: false,

      // Interop Constraints
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,

      // Advanced
      noEmit: false,
      incremental: true
    },
    include: [
      'src/**/*'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '**/*.test.ts',
      '**/*.spec.ts'
    ]
  };
}

/**
 * Generate jsconfig.json for JavaScript projects with better IDE support
 */
export function generateJsConfig() {
  return {
    compilerOptions: {
      // Module
      module: 'ESNext',
      moduleResolution: 'bundler',
      target: 'ES2022',

      // Type Checking
      checkJs: true,
      allowJs: true,

      // Module Resolution
      resolveJsonModule: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,

      // Interop Constraints
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,

      // Advanced
      baseUrl: '.',
      paths: {
        '@/*': ['src/*']
      }
    },
    include: [
      'src/**/*'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build'
    ]
  };
}

/**
 * Get TypeScript dependencies
 */
export function getTypeScriptDependencies() {
  return {
    typescript: '^5.9.2',
    '@types/node': '^24.3.0'
  };
}
