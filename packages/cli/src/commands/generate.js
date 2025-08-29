/**
 * Generate command - Generates components, pages, and APIs
 */

import { Command } from 'commander';
import prompts from 'prompts';
import ora from 'ora';
import picocolors from 'picocolors';
import { existsSync } from 'fs';
import { generateComponent } from '../generators/component-generator.js';
import { generatePage } from '../generators/page-generator.js';
import { generateAPI } from '../generators/api-generator.js';
import { validateComponentName } from '../utils/validation.js';

export const generateCommand = new Command('generate')
  .alias('g')
  .description('Generate components, pages, and APIs')
  .argument('[type]', 'type to generate (component, page, api)')
  .argument('[name]', 'name of the item to generate')
  .option('-p, --path <path>', 'custom output path')
  .option('-t, --template <template>', 'template to use')
  .option('--skip-test', 'skip generating test file')
  .option('--skip-story', 'skip generating story file')
  .action(async (type, name, options) => {
    let generationType = type;
    let itemName = name;

    // Interactive type selection if not provided
    if (!generationType) {
      const response = await prompts({
        type: 'select',
        name: 'type',
        message: 'What would you like to generate?',
        choices: [
          { title: '🧩 Component', value: 'component', description: 'Reusable UI component' },
          { title: '📄 Page', value: 'page', description: 'Full page with routing' },
          { title: '🔌 API Route', value: 'api', description: 'API endpoint with validation' },
          { title: '📊 Database Model', value: 'model', description: 'Database model with migrations' },
          { title: '🔄 Middleware', value: 'middleware', description: 'Express/Fastify middleware' }
        ]
      });

      if (!response.type) {
        console.log(picocolors.yellow('👋 Generation cancelled'));
        process.exit(0);
      }

      generationType = response.type;
    }

    // Interactive name input if not provided
    if (!itemName) {
      const response = await prompts({
        type: 'text',
        name: 'name',
        message: `What is the ${generationType} name?`,
        validate: validateComponentName
      });

      if (!response.name) {
        console.log(picocolors.yellow('👋 Generation cancelled'));
        process.exit(0);
      }

      itemName = response.name;
    }

    // Validate name
    const nameValidation = validateComponentName(itemName);
    if (nameValidation !== true) {
      console.error(picocolors.red('❌ Invalid name:'), nameValidation);
      process.exit(1);
    }

    console.log();
    console.log(picocolors.cyan(`🚀 Generating ${generationType}...`));
    console.log(picocolors.gray('📝 Name:'), picocolors.bold(itemName));
    
    if (options.path) {
      console.log(picocolors.gray('📍 Path:'), options.path);
    }
    
    console.log();

    const spinner = ora(`Generating ${generationType}...`).start();

    try {
      let result;

      switch (generationType) {
        case 'component':
        case 'comp':
        case 'c':
          result = await generateComponent(itemName, options);
          break;

        case 'page':
        case 'p':
          result = await generatePage(itemName, options);
          break;

        case 'api':
        case 'route':
        case 'r':
          result = await generateAPI(itemName, options);
          break;

        case 'model':
        case 'm':
          result = await generateModel(itemName, options);
          break;

        case 'middleware':
        case 'mw':
          result = await generateMiddleware(itemName, options);
          break;

        default:
          throw new Error(`Unknown generation type: ${generationType}`);
      }

      spinner.succeed(`${generationType} generated successfully!`);

      // Success message
      console.log();
      console.log(picocolors.green(`✅ ${generationType} generated successfully!`));
      console.log();
      
      // Show generated files
      if (result?.files && result.files.length > 0) {
        console.log(picocolors.cyan('📁 Generated files:'));
        result.files.forEach(file => {
          console.log(picocolors.gray('  ✨'), file);
        });
        console.log();
      }

      // Show next steps
      if (result?.nextSteps && result.nextSteps.length > 0) {
        console.log(picocolors.cyan('Next steps:'));
        result.nextSteps.forEach(step => {
          console.log(picocolors.gray('  •'), step);
        });
        console.log();
      }

    } catch (error) {
      spinner.fail(`Failed to generate ${generationType}`);
      console.error(picocolors.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Placeholder for additional generators
async function generateModel(name, options) {
  throw new Error('Model generation not implemented yet');
}

async function generateMiddleware(name, options) {
  throw new Error('Middleware generation not implemented yet');
}