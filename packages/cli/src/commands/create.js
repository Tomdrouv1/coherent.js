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

// Helper function to get default Docker port for database
function getDefaultDockerPort(database) {
  const ports = {
    postgres: 5432,
    mysql: 3306,
    mongodb: 27017
  };
  return ports[database] || 5432;
}

export const createCommand = new Command('create')
  .description('Create a new Coherent.js project')
  .argument('[name]', 'project name')
  .option('-t, --template <template>', 'project template', 'basic')
  .option('--runtime <runtime>', 'runtime framework', 'koa')
  .option('--database <database>', 'database type')
  .option('--auth <auth>', 'authentication type')
  .option('--language <language>', 'language', 'javascript')
  .option('--skip-install', 'skip npm install')
  .option('--skip-git', 'skip git initialization')
  .option('--skip-prompts', 'skip interactive prompts')
  .option('--use-docker', 'include Docker configuration for database')
  .option('--docker-db-port <port>', 'Docker database port')
  .option('--docker-db-name <name>', 'Docker database name')
  .option('--docker-db-user <user>', 'Docker database user')
  .option('--docker-db-password <password>', 'Docker database password')
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
    if (!template || (template === 'basic' && !options.skipPrompts)) {
      if (!options.skipPrompts) {
        const response = await prompts({
          type: 'select',
          name: 'template',
          message: 'Which template would you like to use?',
          choices: [
            { title: '🏃‍♂️ Basic App', value: 'basic', description: 'Simple Coherent.js app with routing' },
            { title: '🌐 Full Stack', value: 'fullstack', description: 'API + SSR with database integration' },
            { title: '⚡ Express Integration', value: 'express', description: 'Coherent.js with Express.js' },
            { title: '🚀 Fastify Integration', value: 'fastify', description: 'Coherent.js with Fastify' },
            { title: '📱 Component Library', value: 'components', description: 'Reusable component library' },
            { title: '🎨 Custom Setup', value: 'custom', description: 'Choose your own runtime and packages' }
          ],
          initial: 0
        });

        if (!response.template) {
          console.log(picocolors.yellow('👋 Project creation cancelled'));
          process.exit(0);
        }

        template = response.template;
      }
    }

    // Collect additional configuration options
    let runtime = options.runtime || 'built-in';
    let database = options.database || null;
    let auth = options.auth || null;
    let packages = [];
    let language = options.language || 'javascript';

    // Language selection (TypeScript vs JavaScript)
    if (!options.skipPrompts) {
      const languageResponse = await prompts({
        type: 'select',
        name: 'language',
        message: 'Would you like to use TypeScript or JavaScript?',
        choices: [
          { title: '📘 JavaScript', value: 'javascript', description: 'JavaScript with JSDoc type hints (recommended)' },
          { title: '📕 TypeScript', value: 'typescript', description: 'Full TypeScript with static type checking' }
        ],
        initial: 0
      });

      if (!languageResponse.language) {
        console.log(picocolors.yellow('👋 Project creation cancelled'));
        process.exit(0);
      }

      language = languageResponse.language;
    }

    // Runtime selection for applicable templates
    if ((template === 'custom' || template === 'basic' || template === 'fullstack' || template === 'components') && !options.skipPrompts) {
      const runtimeResponse = await prompts({
        type: 'select',
        name: 'runtime',
        message: 'Which server runtime would you like to use?',
        choices: [
          { title: '🔧 Built-in HTTP Server', value: 'built-in', description: 'Node.js http module (no dependencies)' },
          { title: '⚡ Express', value: 'express', description: 'Popular Node.js web framework' },
          { title: '🚀 Fastify', value: 'fastify', description: 'Fast and low overhead web framework' },
          { title: '🎯 Koa', value: 'koa', description: 'Next generation web framework' }
        ],
        initial: 0
      });

      if (!runtimeResponse.runtime) {
        console.log(picocolors.yellow('👋 Project creation cancelled'));
        process.exit(0);
      }

      runtime = runtimeResponse.runtime;
    } else if (template === 'express') {
      runtime = 'express';
    } else if (template === 'fastify') {
      runtime = 'fastify';
    }

    // Fullstack and Custom templates get additional options
    if (template === 'fullstack' || template === 'custom') {
      // Database selection
      if (!options.skipPrompts) {
        const dbResponse = await prompts({
          type: 'select',
          name: 'database',
          message: 'Which database would you like to use?',
          choices: [
            { title: '🐘 PostgreSQL', value: 'postgres', description: 'Powerful, open source relational database' },
            { title: '🐬 MySQL', value: 'mysql', description: 'Popular open source relational database' },
            { title: '📦 SQLite', value: 'sqlite', description: 'Lightweight, file-based database' },
            { title: '🍃 MongoDB', value: 'mongodb', description: 'NoSQL document database' },
            { title: '❌ None', value: 'none', description: 'Skip database setup' }
          ],
          initial: 0
        });

        if (!dbResponse.database) {
          console.log(picocolors.yellow('👋 Project creation cancelled'));
          process.exit(0);
        }

        database = dbResponse.database === 'none' ? null : dbResponse.database;
      } else {
        // Use database from CLI options when skip-prompts is enabled
        database = options.database || null;
      }

      // Optional packages
      if (!options.skipPrompts) {
        const pkgResponse = await prompts({
          type: 'multiselect',
          name: 'packages',
          message: 'Select optional packages (space to select, enter to confirm):',
          choices: [
            { title: '@coherent.js/api', value: 'api', description: 'API framework with validation & OpenAPI', selected: template === 'fullstack' },
            { title: '@coherent.js/client', value: 'client', description: 'Client-side hydration & progressive enhancement' },
            { title: '@coherent.js/i18n', value: 'i18n', description: 'Internationalization utilities' },
            { title: '@coherent.js/forms', value: 'forms', description: 'Form handling utilities' },
            { title: '@coherent.js/devtools', value: 'devtools', description: 'Development tools & debugging' },
            { title: '@coherent.js/seo', value: 'seo', description: 'SEO optimization utilities' },
            { title: '@coherent.js/testing', value: 'testing', description: 'Testing utilities & helpers' }
          ]
        });

        packages = pkgResponse.packages || [];
      } else {
        // Use sensible defaults when skip-prompts is enabled
        packages = template === 'fullstack' ? ['api'] : [];
      }

      // Auth scaffolding
      if (!options.skipPrompts && (packages.includes('api') || database)) {
        const authResponse = await prompts({
          type: 'select',
          name: 'auth',
          message: 'Would you like to include authentication scaffolding?',
          choices: [
            { title: '🔑 JWT Authentication', value: 'jwt', description: 'Token-based auth with jsonwebtoken' },
            { title: '🍪 Session Authentication', value: 'session', description: 'Cookie-based session auth' },
            { title: '❌ None', value: 'none', description: 'Skip authentication setup' }
          ],
          initial: 0
        });

        auth = authResponse.auth === 'none' ? null : authResponse.auth;
      }
    } else if (template === 'basic' || template === 'components') {
      // Basic and components get simplified package selection
      const pkgResponse = await prompts({
        type: 'multiselect',
        name: 'packages',
        message: 'Select optional packages (space to select, enter to confirm):',
        choices: [
          { title: '@coherent.js/client', value: 'client', description: 'Client-side hydration' },
          { title: '@coherent.js/i18n', value: 'i18n', description: 'Internationalization' },
          { title: '@coherent.js/forms', value: 'forms', description: 'Form handling' },
          { title: '@coherent.js/seo', value: 'seo', description: 'SEO utilities' }
        ]
      });

      packages = pkgResponse.packages || [];
    }

    // Package manager selection
    let packageManager = 'npm';
    if (!options.skipInstall && !options.skipPrompts) {
      const pmResponse = await prompts({
        type: 'select',
        name: 'packageManager',
        message: 'Which package manager would you like to use?',
        choices: [
          { title: '📦 pnpm (recommended)', value: 'pnpm', description: 'Fast, disk space efficient package manager' },
          { title: '📦 npm', value: 'npm', description: 'Node.js default package manager' },
          { title: '📦 yarn', value: 'yarn', description: 'Fast, reliable package manager' }
        ],
        initial: 0
      });

      if (!pmResponse.packageManager) {
        console.log(picocolors.yellow('👋 Project creation cancelled'));
        process.exit(0);
      }

      packageManager = pmResponse.packageManager;
    }

    // Docker configuration for database - handle both interactive and non-interactive modes
    let dockerConfig = null;
    if (database && database !== 'sqlite' && !options.skipPrompts) {
      const dockerResponse = await prompts({
        type: 'confirm',
        name: 'useDocker',
        message: 'Would you like to include Docker configuration for the database?',
        initial: true
      });

      if (dockerResponse.useDocker) {
        // Get Docker configuration details
        const dockerDetailsResponse = await prompts([
          {
            type: 'number',
            name: 'dbPort',
            message: 'What port should the database use?',
            initial: getDefaultDockerPort(database)
          },
          {
            type: 'text',
            name: 'dbName',
            message: 'What should the database be named?',
            initial: 'coherent_db'
          },
          {
            type: 'text',
            name: 'dbUser',
            message: 'What should the database user be?',
            initial: 'coherent_user'
          },
          {
            type: 'text',
            name: 'dbPassword',
            message: 'What should the database password be?',
            initial: 'coherent_pass'
          }
        ]);

        dockerConfig = {
          port: dockerDetailsResponse.dbPort || getDefaultDockerPort(database),
          name: dockerDetailsResponse.dbName,
          user: dockerDetailsResponse.dbUser,
          password: dockerDetailsResponse.dbPassword
        };
      }
    } else if (database && database !== 'sqlite' && options.useDocker) {
      // Use CLI flags or defaults for non-interactive mode
      dockerConfig = {
        port: options.dockerDbPort || getDefaultDockerPort(database),
        name: options.dockerDbName || 'coherent_db',
        user: options.dockerDbUser || 'coherent_user',
        password: options.dockerDbPassword || 'coherent_pass'
      };
    }

    const spinner = ora('Scaffolding project...').start();

    try {
      // Create project directory
      mkdirSync(projectPath, { recursive: true });

      // Scaffold project
      await scaffoldProject(projectPath, {
        name: projectName,
        template,
        runtime,
        database,
        auth,
        packages,
        language,
        packageManager,
        dockerConfig,
        skipInstall: options.skipInstall,
        skipGit: options.skipGit
      });

      spinner.succeed('Project created successfully!');

      // Success message
      console.log();
      console.log(picocolors.green('✅ Project created successfully!'));
      console.log();

      // Show configuration summary
      console.log(picocolors.cyan('📋 Project Configuration:'));
      console.log(picocolors.gray('  Language:'), picocolors.bold(language === 'typescript' ? 'TypeScript' : 'JavaScript'));
      console.log(picocolors.gray('  Runtime:'), picocolors.bold(runtime));
      if (database) {
        console.log(picocolors.gray('  Database:'), picocolors.bold(database));
      }
      if (auth) {
        console.log(picocolors.gray('  Authentication:'), picocolors.bold(auth.toUpperCase()));
      }
      if (packages.length > 0) {
        console.log(picocolors.gray('  Packages:'), picocolors.bold(packages.join(', ')));
      }
      console.log();

      console.log(picocolors.cyan('Next steps:'));
      console.log(picocolors.gray('  cd'), picocolors.bold(projectName));

      if (database) {
        console.log(picocolors.gray('  # Configure database in .env.example'));
      }

      // Show commands for selected package manager
      const pmCommands = {
        npm: { install: 'npm install', dev: 'npm run dev' },
        yarn: { install: 'yarn install', dev: 'yarn dev' },
        pnpm: { install: 'pnpm install', dev: 'pnpm dev' }
      };

      const commands = pmCommands[packageManager] || pmCommands.npm;

      if (!options.skipInstall) {
        console.log(picocolors.gray(`  ${commands.dev}`));
      } else {
        console.log(picocolors.gray(`  ${commands.install}`));
        console.log(picocolors.gray(`  ${commands.dev}`));
      }

      console.log();
      console.log(picocolors.gray('Happy coding! 🎉'));

    } catch (_error) {
      spinner.fail('Failed to create project');
      console.error(picocolors.red('❌ Error:'), _error.message);
      process.exit(1);
    }
  });
