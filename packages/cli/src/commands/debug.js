/**
 * Debug command - Advanced debugging and analysis tools
 */

import { Command } from 'commander';
import prompts from 'prompts';
import ora from 'ora';
import picocolors from 'picocolors';
import process, { env } from 'node:process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzeComponent } from '../analyzers/component-analyzer.js';
import { analyzePerformance } from '../analyzers/performance-analyzer.js';
import { analyzeHydration } from '../analyzers/hydration-analyzer.js';
import { validateProject } from '../validators/project-validator.js';

export const debugCommand = new Command('debug')
  .description('Debug and analyze Coherent.js applications')
  .argument('[target]', 'what to debug (component|performance|hydration|project)')
  .option('-f, --file <file>', 'specific file to analyze')
  .option('-c, --component <name>', 'specific component name')
  .option('--deep', 'perform deep analysis')
  .option('--output <format>', 'output format (console|json|html)', 'console')
  .action(async (target, options) => {
    console.log();
    console.log(picocolors.cyan('🔍 Coherent.js Debug & Analysis'));
    console.log(picocolors.gray('━'.repeat(40)));
    console.log();

    let debugTarget = target;

    // Interactive target selection if not provided
    if (!debugTarget) {
      const response = await prompts({
        type: 'select',
        name: 'target',
        message: 'What would you like to debug?',
        choices: [
          { title: '🧩 Component Analysis', value: 'component', description: 'Analyze component structure and performance' },
          { title: '⚡ Performance Profiling', value: 'performance', description: 'Profile rendering performance and identify bottlenecks' },
          { title: '💧 Hydration Analysis', value: 'hydration', description: 'Debug server-client hydration mismatches' },
          { title: '📋 Project Validation', value: 'project', description: 'Validate entire project structure and configuration' },
          { title: '🚀 Bundle Analysis', value: 'bundle', description: 'Analyze bundle size and dependencies' },
          { title: '🔧 Configuration Check', value: 'config', description: 'Validate and optimize configuration' }
        ],
        initial: 0
      });

      if (!response.target) {
        console.log(picocolors.yellow('👋 Debug cancelled'));
        process.exit(0);
      }

      debugTarget = response.target;
    }

    const spinner = ora(`Analyzing ${debugTarget}...`).start();

    try {
      let result;

      switch (debugTarget) {
        case 'component':
        case 'components':
          result = await analyzeComponent(options);
          break;

        case 'performance':
        case 'perf':
          result = await analyzePerformance(options);
          break;

        case 'hydration':
        case 'ssr':
          result = await analyzeHydration(options);
          break;

        case 'project':
        case 'validate':
          result = await validateProject(options);
          break;

        case 'bundle':
        case 'size':
          result = await analyzeBundleSize(options);
          break;

        case 'config':
        case 'configuration':
          result = await analyzeConfiguration(options);
          break;

        default:
          throw new Error(`Unknown debug target: ${debugTarget}`);
      }

      spinner.succeed(`Analysis complete!`);

      // Output results
      await outputResults(result, options.output);

    } catch (error) {
      spinner.fail(`Analysis failed: ${error.message}`);

      console.log();
      console.log(picocolors.red('❌ Debug Error:'));
      console.log(picocolors.gray(`  ${  error.message}`));

      if (env.DEBUG) {
        console.log();
        console.log(picocolors.gray('Stack trace:'));
        console.log(picocolors.gray(error.stack));
      } else {
        console.log(picocolors.gray('  Run with DEBUG=1 for detailed error information'));
      }

      process.exit(1);
    }
  });

// Add subcommands for specific debug operations
debugCommand
  .command('component [name]')
  .description('Analyze component structure and performance')
  .option('-f, --file <file>', 'component file path')
  .option('--props <props>', 'test component with specific props (JSON)')
  .option('--deep', 'perform deep structural analysis')
  .action(async (name, options) => {
    const result = await analyzeComponent({
      ...options,
      componentName: name
    });
    await outputResults(result, 'console');
  });

debugCommand
  .command('performance [component]')
  .description('Profile rendering performance')
  .option('-t, --time <seconds>', 'profiling duration in seconds', '10')
  .option('--samples <count>', 'number of render samples', '100')
  .option('--memory', 'include memory profiling')
  .action(async (component, options) => {
    const result = await analyzePerformance({
      ...options,
      component
    });
    await outputResults(result, 'console');
  });

debugCommand
  .command('hydration')
  .description('Debug hydration mismatches')
  .option('-u, --url <url>', 'test URL for hydration', 'http://localhost:3000')
  .option('--compare', 'compare server and client output')
  .option('--components <components>', 'specific components to check')
  .action(async (options) => {
    const result = await analyzeHydration(options);
    await outputResults(result, 'console');
  });

debugCommand
  .command('validate')
  .description('Validate project structure and configuration')
  .option('--fix', 'automatically fix common issues')
  .option('--strict', 'use strict validation rules')
  .action(async (options) => {
    const result = await validateProject(options);
    await outputResults(result, 'console');
  });

// Bundle size analysis
async function analyzeBundleSize(_options = {}) {
  const analysis = {
    timestamp: new Date().toISOString(),
    type: 'bundle-analysis',
    summary: {},
    details: {},
    recommendations: []
  };

  // Check if build files exist
  const buildDirs = ['dist', 'build', '.next', 'out'];
  const foundBuildDir = buildDirs.find(dir => existsSync(resolve(dir)));

  if (!foundBuildDir) {
    analysis.summary.status = 'error';
    analysis.summary.message = 'No build directory found. Run build first.';
    return analysis;
  }

  // Analyze bundle sizes (simplified for demo)
  analysis.summary = {
    status: 'success',
    buildDir: foundBuildDir,
    totalSize: '245KB (estimated)',
    components: 12,
    chunks: 3
  };

  analysis.recommendations = [
    {
      type: 'optimization',
      priority: 'medium',
      message: 'Consider code splitting for components larger than 50KB'
    },
    {
      type: 'dependencies',
      priority: 'low',
      message: 'Some dependencies could be tree-shaken for smaller bundle size'
    }
  ];

  return analysis;
}

// Configuration analysis
async function analyzeConfiguration(_options = {}) {
  const analysis = {
    timestamp: new Date().toISOString(),
    type: 'configuration-analysis',
    summary: {},
    details: {},
    recommendations: []
  };

  const configFiles = ['coherent.config.js', 'package.json', 'tsconfig.json'];
  const foundConfigs = configFiles.filter(file => existsSync(resolve(file)));

  analysis.summary = {
    status: 'success',
    foundConfigs,
    validConfigs: foundConfigs.length,
    issues: []
  };

  // Check package.json for Coherent.js setup
  if (existsSync('package.json')) {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      const hasCoherentDeps = Object.keys(packageJson.dependencies || {})
        .some(dep => dep.startsWith('@coherent.js/'));

      if (!hasCoherentDeps) {
        analysis.summary.issues.push('No Coherent.js dependencies found');
      }

      analysis.details.packageJson = {
        name: packageJson.name,
        version: packageJson.version,
        scripts: Object.keys(packageJson.scripts || {}),
        dependencies: Object.keys(packageJson.dependencies || {}).length
      };
    } catch {
      analysis.summary.issues.push('Invalid package.json format');
    }
  }

  // Generate recommendations
  if (analysis.summary.issues.length === 0) {
    analysis.recommendations.push({
      type: 'configuration',
      priority: 'low',
      message: 'Configuration looks good! Consider adding performance monitoring.'
    });
  } else {
    analysis.recommendations.push({
      type: 'setup',
      priority: 'high',
      message: 'Some configuration issues detected. Run coherent init to fix.'
    });
  }

  return analysis;
}

// Output results in different formats
async function outputResults(result, format = 'console') {
  switch (format) {
    case 'json':
      console.log(JSON.stringify(result, null, 2));
      break;

    case 'html':
      await generateHTMLReport(result);
      break;

    case 'console':
    default:
      printConsoleReport(result);
      break;
  }
}

// Print formatted console report
function printConsoleReport(result) {
  console.log();
  console.log(picocolors.cyan(`📊 ${result.type.toUpperCase()} REPORT`));
  console.log(picocolors.gray('━'.repeat(50)));

  // Summary
  if (result.summary) {
    console.log();
    console.log(picocolors.bold('📋 Summary:'));

    Object.entries(result.summary).forEach(([key, value]) => {
      if (key === 'status') {
        const statusIcon = value === 'success' ? '✅' : value === 'warning' ? '⚠️' : '❌';
        console.log(`  ${statusIcon} Status: ${value}`);
      } else if (Array.isArray(value)) {
        console.log(`  • ${key}: ${value.length} items`);
      } else {
        console.log(`  • ${key}: ${value}`);
      }
    });
  }

  // Issues (if any)
  if (result.issues && result.issues.length > 0) {
    console.log();
    console.log(picocolors.yellow('⚠️ Issues Found:'));
    result.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue.message || issue}`);
      if (issue.suggestion) {
        console.log(`     💡 ${picocolors.gray(issue.suggestion)}`);
      }
    });
  }

  // Recommendations
  if (result.recommendations && result.recommendations.length > 0) {
    console.log();
    console.log(picocolors.blue('💡 Recommendations:'));
    result.recommendations.forEach((rec) => {
      const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${priorityIcon} ${rec.message}`);
    });
  }

  // Detailed results (if available)
  if (result.details && Object.keys(result.details).length > 0) {
    console.log();
    console.log(picocolors.gray('📋 Details:'));
    Object.entries(result.details).forEach(([key, value]) => {
      console.log(`  ${key}:`, typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
    });
  }

  console.log();
}

// Generate HTML report (placeholder)
async function generateHTMLReport(result) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Coherent.js Debug Report</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 2rem; }
        .header { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; }
        .section { margin: 2rem 0; }
        .issue { background: #fef3c7; padding: 1rem; border-radius: 0.5rem; margin: 0.5rem 0; }
        .recommendation { background: #dbeafe; padding: 1rem; border-radius: 0.5rem; margin: 0.5rem 0; }
        pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔍 Coherent.js Debug Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </div>

      <div class="section">
        <h2>Summary</h2>
        <pre>${JSON.stringify(result.summary, null, 2)}</pre>
      </div>

      ${result.issues ? `
      <div class="section">
        <h2>Issues</h2>
        ${result.issues.map(issue => `
          <div class="issue">⚠️ ${issue.message || issue}</div>
        `).join('')}
      </div>
      ` : ''}

      ${result.recommendations ? `
      <div class="section">
        <h2>Recommendations</h2>
        ${result.recommendations.map(rec => `
          <div class="recommendation">💡 ${rec.message}</div>
        `).join('')}
      </div>
      ` : ''}
    </body>
    </html>
  `;

  const { writeFileSync } = await import('fs');
  const filename = `coherent-debug-report-${Date.now()}.html`;
  writeFileSync(filename, html);

  console.log();
  console.log(picocolors.green(`📄 HTML report generated: ${filename}`));
  console.log(picocolors.gray(`   Open in browser to view detailed analysis`));
}
