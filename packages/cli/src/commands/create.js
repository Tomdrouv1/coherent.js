/**
 * Create command - Scaffolds new Coherent.js projects
 */

import { Command } from 'commander';
import prompts from 'prompts';
import ora from 'ora';
import picocolors from 'picocolors';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { scaffoldProject } from '../generators/project-scaffold.js';
import { validateProjectName } from '../utils/validation.js';

export const createCommand = new Command('create')
  .description('Create a new Coherent.js project')
  .argument('[name]', 'project name')
  .option('-t, --template <template>', 'project template', 'basic')
  .option('--skip-install', 'skip npm install')
  .option('--skip-git', 'skip git initialization')
  .action(async (name, options) => {
    let projectName = name;

    // Interactive project name if not provided
    if (!projectName) {
      const response = await prompts({
        type: 'text',
        name: 'name',
        message: 'What is your project name?',
        initial: 'my-coherent-app',
        validate: validateProjectName
      });

      if (!response.name) {
        console.log(picocolors.yellow('👋 Project creation cancelled'));
        process.exit(0);
      }
      
      projectName = response.name;
    }

    // Validate project name
    const nameValidation = validateProjectName(projectName);
    if (nameValidation !== true) {
      console.error(picocolors.red('❌ Invalid project name:'), nameValidation);
      process.exit(1);
    }

    const projectPath = resolve(projectName);

    // Check if directory exists
    if (existsSync(projectPath)) {
      console.error(picocolors.red('❌ Directory already exists:'), projectName);
      process.exit(1);
    }

    console.log();
    console.log(picocolors.cyan('🚀 Creating Coherent.js project...'));
    console.log(picocolors.gray('📁 Project:'), picocolors.bold(projectName));
    console.log(picocolors.gray('📍 Location:'), projectPath);
    console.log();

    // Template selection
    let template = options.template;
    if (!template || template === 'basic') {
      const response = await prompts({
        type: 'select',
        name: 'template',
        message: 'Which template would you like to use?',
        choices: [
          { title: '🏃‍♂️ Basic App', value: 'basic', description: 'Simple Coherent.js app with routing' },
          { title: '🌐 Full Stack', value: 'fullstack', description: 'API + SSR with database integration' },
          { title: '⚡ Express Integration', value: 'express', description: 'Coherent.js with Express.js' },
          { title: '🚀 Fastify Integration', value: 'fastify', description: 'Coherent.js with Fastify' },
          { title: '📱 Component Library', value: 'components', description: 'Reusable component library' }
        ],
        initial: 0
      });

      if (!response.template) {
        console.log(picocolors.yellow('👋 Project creation cancelled'));
        process.exit(0);
      }

      template = response.template;
    }

    const spinner = ora('Scaffolding project...').start();

    try {
      // Create project directory
      mkdirSync(projectPath, { recursive: true });

      // Scaffold project
      await scaffoldProject(projectPath, {
        name: projectName,
        template,
        skipInstall: options.skipInstall,
        skipGit: options.skipGit
      });

      spinner.succeed('Project created successfully!');

      // Success message
      console.log();
      console.log(picocolors.green('✅ Project created successfully!'));
      console.log();
      console.log(picocolors.cyan('Next steps:'));
      console.log(picocolors.gray('  cd'), picocolors.bold(projectName));
      
      if (!options.skipInstall) {
        console.log(picocolors.gray('  npm run dev'));
      } else {
        console.log(picocolors.gray('  npm install'));
        console.log(picocolors.gray('  npm run dev'));
      }
      
      console.log();
      console.log(picocolors.gray('Happy coding! 🎉'));

    } catch (_error) {
      spinner.fail('Failed to create project');
      console.error(picocolors.red('❌ Error:'), _error.message);
      process.exit(1);
    }
  });