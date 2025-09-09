/**
 * Project Validation Tools
 * Validates project structure and configuration
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export async function validateProject(_options = {}) {
  const validation = {
    timestamp: new Date().toISOString(),
    type: 'project-validation',
    summary: {},
    checks: [],
    issues: [],
    recommendations: []
  };

  try {
    // Check essential files
    const essentialFiles = [
      { file: 'package.json', required: true, description: 'Project configuration' },
      { file: 'coherent.config.js', required: false, description: 'Coherent.js configuration' },
      { file: 'src/', required: false, description: 'Source directory' },
      { file: 'README.md', required: false, description: 'Project documentation' }
    ];

    essentialFiles.forEach(({ file, required, description }) => {
      const exists = existsSync(resolve(file));
      const check = {
        name: file,
        description,
        required,
        status: exists ? 'pass' : (required ? 'fail' : 'warning'),
        exists
      };
      
      validation.checks.push(check);
      
      if (required && !exists) {
        validation.issues.push({
          type: 'missing-file',
          message: `Required file missing: ${file}`,
          suggestion: file === 'package.json' ? 'Run npm init to create package.json' : `Create ${file}`
        });
      }
    });

    // Validate package.json
    if (existsSync('package.json')) {
      const packageValidation = validatePackageJson();
      validation.checks.push(...packageValidation.checks);
      validation.issues.push(...packageValidation.issues);
      validation.recommendations.push(...packageValidation.recommendations);
    }

    // Check project structure
    const structureValidation = validateProjectStructure();
    validation.checks.push(...structureValidation.checks);
    validation.recommendations.push(...structureValidation.recommendations);

    // Generate summary
    const passedChecks = validation.checks.filter(c => c.status === 'pass').length;
    const totalChecks = validation.checks.length;
    const failedChecks = validation.checks.filter(c => c.status === 'fail').length;

    validation.summary = {
      status: failedChecks === 0 ? (validation.issues.length === 0 ? 'excellent' : 'good') : 'needs-attention',
      passedChecks,
      totalChecks,
      failedChecks,
      issuesFound: validation.issues.length,
      score: Math.round((passedChecks / totalChecks) * 100)
    };

  } catch (error) {
    validation.summary.status = 'error';
    validation.summary.error = error.message;
  }

  return validation;
}

function validatePackageJson() {
  const checks = [];
  const issues = [];
  const recommendations = [];

  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));

    // Check basic fields
    const requiredFields = ['name', 'version', 'description'];
    requiredFields.forEach(field => {
      const hasField = packageJson[field];
      checks.push({
        name: `package.json.${field}`,
        description: `Package ${field} is defined`,
        required: true,
        status: hasField ? 'pass' : 'fail',
        value: hasField ? packageJson[field] : 'missing'
      });

      if (!hasField) {
        issues.push({
          type: 'package-field',
          message: `package.json missing required field: ${field}`,
          suggestion: `Add "${field}" field to package.json`
        });
      }
    });

    // Check for Coherent.js dependencies
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const hasCoherentDeps = Object.keys(dependencies).some(dep => dep.startsWith('@coherentjs/'));
    
    checks.push({
      name: 'coherent-dependencies',
      description: 'Coherent.js dependencies present',
      required: false,
      status: hasCoherentDeps ? 'pass' : 'warning',
      value: hasCoherentDeps ? 'found' : 'missing'
    });

    if (!hasCoherentDeps) {
      recommendations.push({
        type: 'dependencies',
        priority: 'medium',
        message: 'No Coherent.js dependencies found. Install with: npm install @coherentjs/core'
      });
    }

    // Check scripts
    const recommendedScripts = ['dev', 'build', 'start', 'test'];
    const hasScripts = packageJson.scripts || {};
    
    recommendedScripts.forEach(script => {
      const hasScript = hasScripts[script];
      checks.push({
        name: `script.${script}`,
        description: `${script} script defined`,
        required: false,
        status: hasScript ? 'pass' : 'warning',
        value: hasScript ? hasScripts[script] : 'missing'
      });
    });

    if (!hasScripts.dev && !hasScripts.start) {
      recommendations.push({
        type: 'scripts',
        priority: 'medium',
        message: 'Add dev/start scripts for easier development workflow'
      });
    }

  } catch (error) {
    issues.push({
      type: 'package-validation',
      message: `Invalid package.json: ${error.message}`,
      suggestion: 'Check package.json syntax and formatting'
    });
  }

  return { checks, issues, recommendations };
}

function validateProjectStructure() {
  const checks = [];
  const recommendations = [];

  // Check common directory structure
  const directories = [
    { name: 'src', description: 'Source code directory' },
    { name: 'src/components', description: 'Components directory' },
    { name: 'src/pages', description: 'Pages directory' },
    { name: 'public', description: 'Static assets directory' },
    { name: 'test', description: 'Test directory' },
    { name: 'dist', description: 'Build output directory' }
  ];

  directories.forEach(({ name, description }) => {
    const exists = existsSync(resolve(name));
    checks.push({
      name: `directory.${name}`,
      description,
      required: false,
      status: exists ? 'pass' : 'info',
      exists
    });
  });

  // Check for common config files
  const configFiles = [
    'tsconfig.json',
    'eslint.config.js',
    '.eslintrc.js',
    'prettier.config.js',
    '.gitignore'
  ];

  configFiles.forEach(file => {
    const exists = existsSync(resolve(file));
    checks.push({
      name: `config.${file}`,
      description: `${file} configuration`,
      required: false,
      status: exists ? 'pass' : 'info',
      exists
    });
  });

  // Generate structure recommendations
  if (!existsSync('src')) {
    recommendations.push({
      type: 'structure',
      priority: 'medium',
      message: 'Consider creating a "src" directory to organize your source code'
    });
  }

  if (!existsSync('src/components') && existsSync('src')) {
    recommendations.push({
      type: 'structure',
      priority: 'low',
      message: 'Create "src/components" directory to organize your components'
    });
  }

  if (!existsSync('.gitignore')) {
    recommendations.push({
      type: 'version-control',
      priority: 'medium',
      message: 'Add .gitignore file to exclude node_modules and build files from version control'
    });
  }

  if (!existsSync('README.md')) {
    recommendations.push({
      type: 'documentation',
      priority: 'low',
      message: 'Add README.md to document your project setup and usage'
    });
  }

  return { checks, recommendations };
}