/**
 * Validation utilities for CLI inputs
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Validate project name according to npm and filesystem rules.
 *
 * The name is used both as the directory created under the current
 * directory and as the package.json name, so it must be a valid,
 * unscoped npm package name and a single path segment: no separators
 * (`foo/../../x` would write outside the working directory), lowercase,
 * starting with a letter or digit.
 */
export function validateProjectName(name) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'Project name is required';
  }

  const trimmed = name.trim();

  // Check length
  if (trimmed.length > 214) {
    return 'Project name must be less than 214 characters';
  }

  // A single directory name: no path separators
  if (/[\\/]/.test(trimmed)) {
    return 'Project name cannot contain path separators (/ or \\); run the command from the parent directory instead';
  }

  // Cannot start with . or _
  if (trimmed.startsWith('.') || trimmed.startsWith('_')) {
    return 'Project name cannot start with . or _';
  }

  // Cannot be reserved words
  const reserved = [
    'node_modules', 'favicon.ico', '.git', '.gitignore', '.env',
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 
    'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 
    'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
  ];

  if (reserved.includes(trimmed.toLowerCase())) {
    return `Project name "${trimmed}" is reserved`;
  }

  // npm package names cannot contain capital letters
  if (trimmed !== trimmed.toLowerCase()) {
    return 'Project name must be lowercase (npm package names cannot contain capital letters)';
  }

  // URL-safe npm name characters
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(trimmed)) {
    return 'Project name must start with a letter or number and contain only lowercase letters, numbers, hyphens, underscores, and dots';
  }

  // Check if directory already exists
  const projectPath = resolve(trimmed);
  if (existsSync(projectPath)) {
    return `Directory "${trimmed}" already exists`;
  }

  return true;
}

/**
 * Validate component/page/API name
 */
export function validateComponentName(name) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'Name is required';
  }

  const trimmed = name.trim();

  // Check for valid identifier
  if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(trimmed)) {
    return 'Name must start with a letter and contain only letters, numbers, hyphens, and underscores';
  }

  // Check length
  if (trimmed.length > 100) {
    return 'Name must be less than 100 characters';
  }

  // Should be PascalCase for components
  if (!/^[A-Z]/.test(trimmed)) {
    return 'Name should start with a capital letter (PascalCase)';
  }

  return true;
}

/**
 * Validate file path
 */
export function validatePath(path) {
  if (!path || path.trim().length === 0) {
    return true; // Optional
  }

  const trimmed = path.trim();

  // Check for invalid characters
  if (!/^[a-zA-Z0-9-_/.]+$/.test(trimmed)) {
    return 'Path can only contain letters, numbers, hyphens, underscores, dots, and slashes';
  }

  // Cannot start with /
  if (trimmed.startsWith('/')) {
    return 'Path should be relative (don\'t start with /)';
  }

  return true;
}

/**
 * Validate template name
 */
export function validateTemplate(template) {
  const validTemplates = [
    'basic',
    'fullstack', 
    'express',
    'fastify',
    'components',
    'nextjs'
  ];

  if (!validTemplates.includes(template)) {
    return `Invalid template. Available: ${validTemplates.join(', ')}`;
  }

  return true;
}