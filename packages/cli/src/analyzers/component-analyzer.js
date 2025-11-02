/**
 * Component Analysis Tools
 * Analyzes component structure, performance, and best practices
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { glob } from 'glob';

export async function analyzeComponent(options = {}) {
  const analysis = {
    timestamp: new Date().toISOString(),
    type: 'component-analysis',
    summary: {},
    components: [],
    issues: [],
    recommendations: []
  };

  try {
    // Determine what to analyze
    if (options.file) {
      // Analyze specific file
      const component = await analyzeComponentFile(options.file, options);
      analysis.components = [component];
    } else if (options.componentName) {
      // Find and analyze specific component by name
      const componentFile = await findComponentByName(options.componentName);
      if (componentFile) {
        const component = await analyzeComponentFile(componentFile, options);
        analysis.components = [component];
      } else {
        analysis.issues.push({
          type: 'not-found',
          message: `Component "${options.componentName}" not found`,
          suggestion: 'Check component name spelling or file location'
        });
      }
    } else {
      // Analyze all components in project
      const componentFiles = await findAllComponents();
      analysis.components = await Promise.all(
        componentFiles.map(file => analyzeComponentFile(file, options))
      );
    }

    // Generate summary
    analysis.summary = generateComponentSummary(analysis.components);
    
    // Generate recommendations
    analysis.recommendations = generateComponentRecommendations(analysis.components);

  } catch (error) {
    analysis.summary.status = 'error';
    analysis.summary.error = error.message;
    analysis.issues.push({
      type: 'analysis-error',
      message: `Failed to analyze components: ${error.message}`,
      suggestion: 'Check that component files are valid JavaScript'
    });
  }

  return analysis;
}

async function findAllComponents() {
  const patterns = [
    'src/**/*.component.js',
    'src/**/*Component.js', 
    'src/components/**/*.js',
    'components/**/*.js',
    'src/**/*.jsx', // In case they're using JSX syntax
    'components/**/*.jsx'
  ];

  const files = [];
  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern, { ignore: ['**/node_modules/**', '**/test/**', '**/*.test.*'] });
      files.push(...matches);
    } catch {
      // Continue if pattern fails
    }
  }

  return [...new Set(files)]; // Remove duplicates
}

async function findComponentByName(componentName) {
  const possibleFiles = [
    `src/components/${componentName}.js`,
    `src/components/${componentName}/${componentName}.js`,
    `components/${componentName}.js`,
    `components/${componentName}/${componentName}.js`,
    `src/${componentName}.component.js`,
    `src/${componentName}Component.js`
  ];

  for (const file of possibleFiles) {
    if (existsSync(resolve(file))) {
      return file;
    }
  }

  // Try glob search
  const patterns = [
    `**/${componentName}.js`,
    `**/${componentName}*.js`,
    `**/*${componentName}*.js`
  ];

  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern, { ignore: ['**/node_modules/**'] });
      if (matches.length > 0) {
        return matches[0];
      }
    } catch {
      // Continue searching
    }
  }

  return null;
}

async function analyzeComponentFile(filePath, _options = {}) {
  const analysis = {
    file: filePath,
    name: extractComponentName(filePath),
    size: 0,
    lines: 0,
    complexity: 'unknown',
    issues: [],
    metrics: {},
    suggestions: []
  };

  try {
    if (!existsSync(resolve(filePath))) {
      analysis.issues.push({
        type: 'file-not-found',
        message: `File not found: ${filePath}`
      });
      return analysis;
    }

    const content = readFileSync(resolve(filePath), 'utf-8');
    analysis.size = Buffer.byteLength(content, 'utf8');
    analysis.lines = content.split('\n').length;

    // Basic syntax analysis
    const syntaxAnalysis = analyzeSyntax(content, filePath);
    analysis.metrics = { ...analysis.metrics, ...syntaxAnalysis };

    // Complexity analysis
    analysis.complexity = calculateComplexity(content);

    // Performance analysis
    const perfAnalysis = analyzePerformancePatterns(content);
    analysis.suggestions.push(...perfAnalysis.suggestions);

    // Best practices check
    const practicesAnalysis = checkBestPractices(content, filePath);
    analysis.suggestions.push(...practicesAnalysis.suggestions);
    analysis.issues.push(...practicesAnalysis.issues);

    // Component structure validation
    const structureAnalysis = validateComponentStructure(content);
    analysis.issues.push(...structureAnalysis.issues);
    analysis.suggestions.push(...structureAnalysis.suggestions);

  } catch (error) {
    analysis.issues.push({
      type: 'analysis-error',
      message: `Failed to analyze ${filePath}: ${error.message}`
    });
  }

  return analysis;
}

function extractComponentName(filePath) {
  const fileName = filePath.split('/').pop().split('.')[0];
  return fileName
    .replace(/component$/i, '')
    .replace(/Component$/, '')
    .replace(/[-_]/g, '')
    || 'UnknownComponent';
}

function analyzeSyntax(content, _filePath) {
  const metrics = {
    functions: 0,
    exports: 0,
    imports: 0,
    hasDefaultExport: false,
    usesModernSyntax: false
  };

  // Count functions
  metrics.functions = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
  
  // Count exports
  metrics.exports = (content.match(/export\s+(default\s+)?/g) || []).length;
  metrics.hasDefaultExport = /export\s+default/.test(content);
  
  // Count imports
  metrics.imports = (content.match(/import\s+.*from/g) || []).length;
  
  // Check for modern syntax
  metrics.usesModernSyntax = /const\s+|let\s+|arrow functions|\.\.\.|async\s+|await\s+/.test(content);

  // Check for Coherent.js patterns
  metrics.usesCoherentPatterns = /render|withState|memo/.test(content);

  return metrics;
}

function calculateComplexity(content) {
  // Simple complexity calculation based on control structures
  const complexityPatterns = [
    /if\s*\(/g,
    /else\s+if\s*\(/g,
    /for\s*\(/g,
    /while\s*\(/g,
    /switch\s*\(/g,
    /catch\s*\(/g,
    /\?\s*.*:/g, // Ternary operators
  ];

  let totalComplexity = 1; // Base complexity
  
  complexityPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      totalComplexity += matches.length;
    }
  });

  if (totalComplexity <= 5) return 'low';
  if (totalComplexity <= 10) return 'medium';
  if (totalComplexity <= 20) return 'high';
  return 'very-high';
}

function analyzePerformancePatterns(content) {
  const suggestions = [];
  
  // Check for expensive operations
  if (/JSON\.(parse|stringify)/g.test(content)) {
    suggestions.push({
      type: 'performance',
      priority: 'medium',
      message: 'JSON operations detected. Consider memoization for expensive serialization.'
    });
  }
  
  // Check for large data structures
  if (/new Array\(\d{4,}\)|\.length\s*>\s*\d{4,}/.test(content)) {
    suggestions.push({
      type: 'performance', 
      priority: 'high',
      message: 'Large arrays detected. Consider pagination or virtualization.'
    });
  }
  
  // Check for nested loops
  const nestedLoops = content.match(/for\s*\([^}]*for\s*\(|while\s*\([^}]*while\s*\(/g);
  if (nestedLoops && nestedLoops.length > 0) {
    suggestions.push({
      type: 'performance',
      priority: 'high', 
      message: 'Nested loops detected. Consider optimizing algorithm complexity.'
    });
  }

  // Check for missing memoization
  if (!/memo\(/.test(content) && content.includes('function') && content.length > 500) {
    suggestions.push({
      type: 'performance',
      priority: 'medium',
      message: 'Large component without memoization. Consider using memo() wrapper.'
    });
  }

  return { suggestions };
}

function checkBestPractices(content, filePath) {
  const suggestions = [];
  const issues = [];

  // Check for proper error handling
  if (content.includes('try') && !content.includes('catch')) {
    issues.push({
      type: 'best-practice',
      message: 'Try block found without catch. Add proper error handling.'
    });
  }

  // Check for console.log statements (should be removed in production)
  const consoleLogs = content.match(/console\.log\(/g);
  if (consoleLogs && consoleLogs.length > 2) {
    suggestions.push({
      type: 'best-practice',
      priority: 'low',
      message: `${consoleLogs.length} console.log statements found. Remove before production.`
    });
  }

  // Check for proper component naming
  const fileName = extractComponentName(filePath);
  if (fileName.toLowerCase() === fileName) {
    suggestions.push({
      type: 'best-practice',
      priority: 'low',
      message: 'Component name should use PascalCase convention.'
    });
  }

  // Check for inline styles (should be minimal)
  const inlineStyles = content.match(/style\s*:\s*['"`]/g);
  if (inlineStyles && inlineStyles.length > 3) {
    suggestions.push({
      type: 'best-practice',
      priority: 'medium',
      message: 'Many inline styles detected. Consider using CSS classes or styled components.'
    });
  }

  // Check for proper prop validation
  if (content.includes('props') && !/typeof\s+props/.test(content)) {
    suggestions.push({
      type: 'best-practice',
      priority: 'medium',
      message: 'Consider adding prop type validation for better debugging.'
    });
  }

  return { suggestions, issues };
}

function validateComponentStructure(content) {
  const issues = [];
  const suggestions = [];

  // Check for valid Coherent.js component structure
  const hasValidReturn = /return\s*\{/.test(content) || /=>\s*\{/.test(content);
  if (!hasValidReturn && content.includes('function')) {
    issues.push({
      type: 'structure',
      message: 'Component should return a valid object structure.'
    });
  }

  // Check for proper HTML tag usage
  const htmlTags = content.match(/['"]\w+['"]:\s*\{/g);
  if (htmlTags) {
    const validTags = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'input', 'form', 'ul', 'li', 'img'];
    htmlTags.forEach(tag => {
      const tagName = tag.match(/['"'](\w+)['"']/)[1];
      if (!validTags.includes(tagName) && !tagName.match(/^[A-Z]/)) {
        suggestions.push({
          type: 'structure',
          priority: 'low',
          message: `Consider using standard HTML tags. Found: ${tagName}`
        });
      }
    });
  }

  // Check for proper children handling
  if (content.includes('children') && !content.includes('Array.isArray')) {
    suggestions.push({
      type: 'structure',
      priority: 'medium',
      message: 'Consider validating children prop type (should handle arrays and single elements).'
    });
  }

  return { issues, suggestions };
}

function generateComponentSummary(components) {
  const summary = {
    status: 'success',
    totalComponents: components.length,
    averageSize: 0,
    averageLines: 0,
    complexityDistribution: { low: 0, medium: 0, high: 0, 'very-high': 0 },
    totalIssues: 0,
    totalSuggestions: 0
  };

  if (components.length === 0) {
    summary.status = 'warning';
    summary.message = 'No components found for analysis';
    return summary;
  }

  // Calculate averages
  const totalSize = components.reduce((sum, c) => sum + c.size, 0);
  const totalLines = components.reduce((sum, c) => sum + c.lines, 0);
  
  summary.averageSize = Math.round(totalSize / components.length);
  summary.averageLines = Math.round(totalLines / components.length);

  // Count complexity distribution
  components.forEach(c => {
    summary.complexityDistribution[c.complexity]++;
    summary.totalIssues += c.issues.length;
    summary.totalSuggestions += c.suggestions.length;
  });

  // Determine overall status
  if (summary.totalIssues > components.length * 2) {
    summary.status = 'warning';
    summary.message = 'Many issues found across components';
  } else if (summary.totalIssues === 0) {
    summary.status = 'excellent';
    summary.message = 'All components look great!';
  }

  return summary;
}

function generateComponentRecommendations(components) {
  const recommendations = [];
  
  // Large component recommendation
  const largeComponents = components.filter(c => c.size > 10000); // 10KB+
  if (largeComponents.length > 0) {
    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      message: `${largeComponents.length} components are larger than 10KB. Consider splitting into smaller components.`
    });
  }

  // High complexity recommendation  
  const complexComponents = components.filter(c => c.complexity === 'high' || c.complexity === 'very-high');
  if (complexComponents.length > 0) {
    recommendations.push({
      type: 'refactoring',
      priority: 'high',
      message: `${complexComponents.length} components have high complexity. Consider refactoring for maintainability.`
    });
  }

  // Performance recommendations
  const componentsWithoutMemo = components.filter(c => 
    c.size > 5000 && !c.metrics.usesCoherentPatterns
  );
  if (componentsWithoutMemo.length > 0) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      message: `${componentsWithoutMemo.length} large components could benefit from memoization.`
    });
  }

  // Best practices
  const totalIssues = components.reduce((sum, c) => sum + c.issues.length, 0);
  if (totalIssues > 0) {
    recommendations.push({
      type: 'best-practices',
      priority: 'medium',
      message: `${totalIssues} best practice violations found. Review component implementations.`
    });
  }

  return recommendations;
}
