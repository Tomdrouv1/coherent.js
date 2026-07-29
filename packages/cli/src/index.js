/**
 * Coherent.js CLI - Main entry point
 * Provides project scaffolding, component generation, and build tools
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import picocolors from 'picocolors';

// Import commands
import { createCommand } from './commands/create.js';
import { generateCommand } from './commands/generate.js';
import { buildCommand } from './commands/build.js';
import { devCommand } from './commands/dev.js';
import { debugCommand } from './commands/debug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get package version
let version = '1.0.1';
try {
  const packagePath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  version = packageJson.version;
} catch {
  // Use fallback version
}

export async function createCLI() {
  const program = new Command();

  program
    .name('coherent')
    .description(picocolors.cyan('🚀 Coherent.js CLI - Build modern web applications with pure JavaScript objects'))
    .version(version, '-v, --version', 'display version number')
    // Point at --help on a bad command/option instead of leaving a bare error.
    .showHelpAfterError('(run "coherent --help" to see available commands)');

  // Banner
  const banner = `
${picocolors.cyan('  ╔══════════════════════════════════════╗')}
${picocolors.cyan('  ║')}  ${picocolors.bold('🚀 Coherent.js CLI')}                 ${picocolors.cyan('║')}
${picocolors.cyan('  ║')}  ${picocolors.gray('Pure objects, pure performance')}      ${picocolors.cyan('║')}
${picocolors.cyan('  ╚══════════════════════════════════════╝')}
  `;

  // Add commands
  program
    .addCommand(createCommand)
    .addCommand(generateCommand)
    .addCommand(buildCommand)
    .addCommand(devCommand)
    .addCommand(debugCommand);

  // Custom help
  program.configureHelp({
    beforeAll: () => banner,
    afterAll: () => `
${picocolors.gray('Examples:')}
  ${picocolors.green('coherent create my-app')}           Create a new project
  ${picocolors.green('coherent generate component Button')} Generate a component  
  ${picocolors.green('coherent generate page Home')}       Generate a page
  ${picocolors.green('coherent build')}                   Build for production
  ${picocolors.green('coherent dev')}                     Start development server
  ${picocolors.green('coherent debug component')}         Analyze component performance
  ${picocolors.green('coherent debug performance')}       Profile application performance

${picocolors.gray('Learn more:')} ${picocolors.blue('https://github.com/Tomdrouv1/coherent.js')}
`
  });

  // Handle no command
  if (process.argv.length === 2) {
    console.log(banner);
    program.help();
    return;
  }

  // Parse arguments
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(picocolors.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

// Export for direct usage
export { createCommand, generateCommand, buildCommand, devCommand, debugCommand };