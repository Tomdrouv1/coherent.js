/**
 * Coherent.js CLI Types
 * TypeScript definitions for the CLI tools
 *
 * @version 1.0.0-beta.1
 */

// ============================================================================
// Command Types
// ============================================================================

/** CLI command interface */
export interface CLICommand {
  name: string;
  description: string;
  usage: string;
  options: CLIOption[];
  action: (args: string[], options: CLIOptions) => Promise<void> | void;
  aliases?: string[];
  examples?: string[];
}

/** CLI option definition */
export interface CLIOption {
  name: string;
  short?: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  default?: any;
  required?: boolean;
  choices?: string[];
}

/** CLI options object */
export interface CLIOptions {
  [key: string]: string | number | boolean | undefined;
  help?: boolean;
  version?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  config?: string;
}

// ============================================================================
// Project Creation Types
// ============================================================================

/** Project template configuration */
export interface ProjectTemplate {
  name: string;
  description: string;
  path: string;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  files: TemplateFile[];
  prompts?: TemplatePrompt[];
  postInstall?: string[];
}

/** Template file definition */
export interface TemplateFile {
  src: string;
  dest: string;
  template?: boolean;
  executable?: boolean;
  encoding?: 'utf8' | 'binary';
}

/** Template prompt for user input */
export interface TemplatePrompt {
  name: string;
  type: 'input' | 'select' | 'multiselect' | 'confirm';
  message: string;
  default?: any;
  choices?: Array<{ title: string; value: any }>;
  validate?: (value: any) => boolean | string;
}

/** Project creation options */
export interface CreateProjectOptions {
  template: string;
  name: string;
  directory?: string;
  force?: boolean;
  install?: boolean;
  git?: boolean;
  typescript?: boolean;
  eslint?: boolean;
  prettier?: boolean;
  testing?: 'jest' | 'vitest' | 'none';
  css?: 'none' | 'css' | 'scss' | 'tailwind';
}

// ============================================================================
// Generation Types
// ============================================================================

/** Component generation options */
export interface GenerateComponentOptions {
  name: string;
  type?: 'functional' | 'class';
  directory?: string;
  typescript?: boolean;
  stories?: boolean;
  tests?: boolean;
  styles?: boolean;
  props?: ComponentProp[];
}

/** Component property definition */
export interface ComponentProp {
  name: string;
  type: string;
  required?: boolean;
  default?: any;
  description?: string;
}

/** Page generation options */
export interface GeneratePageOptions {
  name: string;
  route: string;
  directory?: string;
  layout?: string;
  typescript?: boolean;
  ssr?: boolean;
  api?: boolean;
}

/** API generation options */
export interface GenerateApiOptions {
  name: string;
  route: string;
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
  directory?: string;
  typescript?: boolean;
  validation?: boolean;
  auth?: boolean;
  database?: boolean;
}

/** Model generation options */
export interface GenerateModelOptions {
  name: string;
  fields: ModelField[];
  directory?: string;
  typescript?: boolean;
  database?: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  migration?: boolean;
}

/** Model field definition */
export interface ModelField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';
  required?: boolean;
  unique?: boolean;
  index?: boolean;
  default?: any;
  length?: number;
  relation?: {
    type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';
    model: string;
  };
}

// ============================================================================
// Development Server Types
// ============================================================================

/** Development server configuration */
export interface DevServerConfig {
  port: number;
  host: string;
  https?: boolean;
  open?: boolean;
  proxy?: Record<string, string>;
  watchFiles?: string[];
  ignore?: string[];
  hmr?: {
    enabled: boolean;
    port?: number;
    overlay?: boolean;
  };
}

/** Build configuration */
export interface BuildConfig {
  entry: string;
  output: {
    path: string;
    filename: string;
    publicPath?: string;
  };
  target: 'web' | 'node';
  mode: 'development' | 'production';
  optimization?: {
    minimize: boolean;
    splitChunks: boolean;
  };
  externals?: Record<string, string>;
  plugins?: any[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Coherent.js project configuration */
export interface CoherentConfig {
  // Project information
  name: string;
  version: string;
  description?: string;

  // Build settings
  build: {
    entry: string;
    output: string;
    target: 'web' | 'node' | 'both';
    typescript: boolean;
    sourceMaps: boolean;
    minify: boolean;
  };

  // Development settings
  dev: {
    port: number;
    host: string;
    https: boolean;
    open: boolean;
    hmr: boolean;
    overlay: boolean;
  };

  // Framework settings
  framework?: {
    type: 'express' | 'koa' | 'fastify' | 'nextjs' | 'none';
    config?: any;
  };

  // Database settings
  database?: {
    type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
    connection: any;
    migrations: string;
    models: string;
  };

  // Testing settings
  testing?: {
    framework: 'jest' | 'vitest';
    coverage: boolean;
    watchMode: boolean;
  };

  // Linting and formatting
  linting?: {
    eslint: boolean;
    prettier: boolean;
    rules?: any;
  };

  // Directories
  directories: {
    src: string;
    build: string;
    public: string;
    components: string;
    pages: string;
    api: string;
    models: string;
    tests: string;
  };
}

// ============================================================================
// Generator Types
// ============================================================================

/** Code generator interface */
export interface CodeGenerator {
  name: string;
  description: string;
  generate(options: any): Promise<GenerationResult>;
  validate(options: any): string[];
}

/** Generation result */
export interface GenerationResult {
  success: boolean;
  files: GeneratedFile[];
  errors?: string[];
  warnings?: string[];
  duration: number;
}

/** Generated file information */
export interface GeneratedFile {
  path: string;
  content: string;
  action: 'create' | 'update' | 'skip';
  size: number;
}

// ============================================================================
// Plugin System Types
// ============================================================================

/** CLI plugin interface */
export interface CLIPlugin {
  name: string;
  version: string;
  commands?: CLICommand[];
  generators?: CodeGenerator[];
  templates?: ProjectTemplate[];
  hooks?: {
    beforeCommand?: (command: string, args: string[], options: CLIOptions) => void;
    afterCommand?: (command: string, args: string[], options: CLIOptions) => void;
    beforeGenerate?: (type: string, options: any) => void;
    afterGenerate?: (type: string, result: GenerationResult) => void;
  };
}

/** Plugin manager interface */
export interface PluginManager {
  plugins: Map<string, CLIPlugin>;
  install(name: string): Promise<void>;
  uninstall(name: string): Promise<void>;
  load(plugin: CLIPlugin): void;
  unload(name: string): void;
  getPlugin(name: string): CLIPlugin | undefined;
  getAllPlugins(): CLIPlugin[];
}

// ============================================================================
// Validation Types
// ============================================================================

/** Validation rule for CLI inputs */
export interface ValidationRule {
  name: string;
  validate: (value: any) => boolean | string;
  message?: string;
}

/** Project structure validator */
export interface ProjectValidator {
  validateStructure(path: string): ValidationResult;
  validateConfig(config: CoherentConfig): ValidationResult;
  validateDependencies(dependencies: string[]): ValidationResult;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Utilities Types
// ============================================================================

/** File system utilities */
export interface FileSystem {
  exists(path: string): Promise<boolean>;
  read(path: string, encoding?: string): Promise<string | Buffer>;
  write(path: string, content: string | Buffer): Promise<void>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  copy(src: string, dest: string): Promise<void>;
  remove(path: string): Promise<void>;
  glob(pattern: string, options?: any): Promise<string[]>;
}

/** Logger interface */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;

  startSpinner(message: string): void;
  stopSpinner(success?: boolean): void;
  updateSpinner(message: string): void;
}

// ============================================================================
// Main CLI Functions
// ============================================================================

/** Create a new project */
export function createProject(options: CreateProjectOptions): Promise<void>;

/** Generate component */
export function generateComponent(options: GenerateComponentOptions): Promise<GenerationResult>;

/** Generate page */
export function generatePage(options: GeneratePageOptions): Promise<GenerationResult>;

/** Generate API route */
export function generateApi(options: GenerateApiOptions): Promise<GenerationResult>;

/** Generate model */
export function generateModel(options: GenerateModelOptions): Promise<GenerationResult>;

/** Start development server */
export function startDevServer(options?: Partial<DevServerConfig>): Promise<void>;

/** Build project */
export function buildProject(config?: Partial<BuildConfig>): Promise<void>;

/** Run tests */
export function runTests(options?: { watch?: boolean; coverage?: boolean }): Promise<void>;

/** Lint project */
export function lintProject(options?: { fix?: boolean }): Promise<void>;

/** Format project */
export function formatProject(): Promise<void>;

// ============================================================================
// CLI Utilities
// ============================================================================

/** Parse command line arguments */
export function parseArgs(argv: string[]): { command: string; args: string[]; options: CLIOptions };

/** Load project configuration */
export function loadConfig(path?: string): Promise<CoherentConfig>;

/** Save project configuration */
export function saveConfig(config: CoherentConfig, path?: string): Promise<void>;

/** Get project templates */
export function getTemplates(): ProjectTemplate[];

/** Get available generators */
export function getGenerators(): CodeGenerator[];

/** Create logger instance */
export function createLogger(level?: 'debug' | 'info' | 'warn' | 'error'): Logger;

/** Create file system utilities */
export function createFileSystem(): FileSystem;

/** Create plugin manager */
export function createPluginManager(): PluginManager;

/** Validate project structure */
export function validateProject(path: string): Promise<ValidationResult>;

// ============================================================================
// Default Export
// ============================================================================

declare const coherentCli: {
  // Project creation
  createProject: typeof createProject;

  // Generators
  generateComponent: typeof generateComponent;
  generatePage: typeof generatePage;
  generateApi: typeof generateApi;
  generateModel: typeof generateModel;

  // Development
  startDevServer: typeof startDevServer;
  buildProject: typeof buildProject;
  runTests: typeof runTests;
  lintProject: typeof lintProject;
  formatProject: typeof formatProject;

  // Utilities
  parseArgs: typeof parseArgs;
  loadConfig: typeof loadConfig;
  saveConfig: typeof saveConfig;
  getTemplates: typeof getTemplates;
  getGenerators: typeof getGenerators;
  createLogger: typeof createLogger;
  createFileSystem: typeof createFileSystem;
  createPluginManager: typeof createPluginManager;
  validateProject: typeof validateProject;
};

export default coherentCli;
