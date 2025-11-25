#!/usr/bin/env node

/**
 * Comprehensive Package Audit for Coherent.js
 *
 * Analyzes all packages for:
 * - Duplicate functionality detection
 * - Bundle size optimization
 * - Tree shaking configuration
 * - Documentation completeness
 * - Export analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Package audit results structure
 */
const auditResults = {
  packages: {},
  duplicates: [],
  optimizationIssues: [],
  documentationGaps: [],
  summary: {}
};

/**
 * Analyze a single package
 */
function analyzePackage(packageName, packagePath) {
  const packageDir = path.join(rootDir, 'packages', packageName);
  const srcDir = path.join(packageDir, 'src');
  const packageJsonPath = path.join(packageDir, 'package.json');

  console.log(`\n🔍 Analyzing package: ${packageName}`);
  console.log('=====================================');

  const analysis = {
    name: packageName,
    path: packagePath,
    size: 0,
    fileCount: 0,
    exports: [],
    dependencies: [],
    optimization: {
      hasSideEffects: false,
      hasConditionalExports: false,
      hasProperExports: false
    },
    documentation: {
      hasReadme: false,
      hasTypes: false,
      hasExamples: false
    },
    duplicates: [],
    issues: []
  };

  // Check if package exists
  if (!fs.existsSync(packageDir)) {
    analysis.issues.push('Package directory does not exist');
    return analysis;
  }

  // Read package.json
  let packageJson = {};
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    analysis.dependencies = Object.keys(packageJson.dependencies || {});
    analysis.optimization.hasSideEffects = packageJson.sideEffects === false;
    analysis.optimization.hasConditionalExports = !!(packageJson.exports && Object.keys(packageJson.exports).length > 1);
    analysis.optimization.hasProperExports = !!(packageJson.exports);
  } catch (error) {
    analysis.issues.push('Cannot read package.json');
  }

  // Analyze source files
  if (fs.existsSync(srcDir)) {
    const sourceAnalysis = analyzeSourceFiles(srcDir);
    analysis.size = sourceAnalysis.totalSize;
    analysis.fileCount = sourceAnalysis.fileCount;
    analysis.exports = sourceAnalysis.exports;
    analysis.duplicates = sourceAnalysis.potentialDuplicates;
  }

  // Check documentation
  analysis.documentation.hasReadme = fs.existsSync(path.join(packageDir, 'README.md'));
  analysis.documentation.hasTypes = fs.existsSync(path.join(packageDir, 'types')) ||
                                 fs.existsSync(path.join(packageDir, 'index.d.ts'));
  analysis.documentation.hasExamples = fs.existsSync(path.join(packageDir, 'examples'));

  // Print analysis
  console.log(`📦 Size: ${(analysis.size / 1024).toFixed(1)}KB (${analysis.fileCount} files)`);
  console.log(`📤 Exports: ${analysis.exports.length} functions/classes`);
  console.log(`🔧 Optimization:`);
  console.log(`   SideEffects: ${analysis.optimization.hasSideEffects ? '✅' : '❌'}`);
  console.log(`   Conditional Exports: ${analysis.optimization.hasConditionalExports ? '✅' : '❌'}`);
  console.log(`   Proper Exports: ${analysis.optimization.hasProperExports ? '✅' : '❌'}`);
  console.log(`📚 Documentation:`);
  console.log(`   README: ${analysis.documentation.hasReadme ? '✅' : '❌'}`);
  console.log(`   Types: ${analysis.documentation.hasTypes ? '✅' : '❌'}`);
  console.log(`   Examples: ${analysis.documentation.hasExamples ? '✅' : '❌'}`);

  if (analysis.issues.length > 0) {
    console.log(`⚠️ Issues: ${analysis.issues.join(', ')}`);
  }

  return analysis;
}

/**
 * Analyze source files in a directory
 */
function analyzeSourceFiles(srcDir) {
  const analysis = {
    totalSize: 0,
    fileCount: 0,
    exports: [],
    potentialDuplicates: []
  };

  function walkDirectory(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          walkDirectory(itemPath);
        } else if (item.endsWith('.js') || item.endsWith('.ts')) {
          analysis.totalSize += stat.size;
          analysis.fileCount++;

          // Analyze file content
          try {
            const content = fs.readFileSync(itemPath, 'utf8');
            const fileAnalysis = analyzeFileContent(content, itemPath);
            analysis.exports.push(...fileAnalysis.exports);
            analysis.potentialDuplicates.push(...fileAnalysis.potentialDuplicates);
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  walkDirectory(srcDir);
  return analysis;
}

/**
 * Analyze file content for exports and potential duplicates
 */
function analyzeFileContent(content, filePath) {
  const analysis = {
    exports: [],
    potentialDuplicates: []
  };

  // Find exports
  const exportRegex = /export\s+(?:class|function|const|let|var)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    analysis.exports.push({
      name: match[1],
      file: path.basename(filePath),
      path: filePath
    });
  }

  // Find potential duplicate patterns
  const duplicatePatterns = [
    { pattern: /class\s+(\w*State)/g, type: 'State Class' },
    { pattern: /function\s+(create\w*)/g, type: 'Create Function' },
    { pattern: /class\s+(\w*Component)/g, type: 'Component Class' },
    { pattern: /function\s+(\w*Layout)/g, type: 'Layout Function' }
  ];

  duplicatePatterns.forEach(({ pattern, type }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      analysis.potentialDuplicates.push({
        name: match[1],
        type,
        file: path.basename(filePath),
        path: filePath
      });
    }
  });

  return analysis;
}

/**
 * Detect duplicates across packages
 */
function detectDuplicates(packageAnalyses) {
  console.log('\n🔍 Duplicate Detection Analysis');
  console.log('=================================');

  const duplicates = [];
  const allExports = [];

  // Collect all exports
  Object.values(packageAnalyses).forEach(analysis => {
    analysis.exports.forEach(exportItem => {
      allExports.push({
        ...exportItem,
        package: analysis.name
      });
    });
  });

  // Find duplicates by name
  const exportGroups = {};
  allExports.forEach(exportItem => {
    if (!exportGroups[exportItem.name]) {
      exportGroups[exportItem.name] = [];
    }
    exportGroups[exportItem.name].push(exportItem);
  });

  // Identify duplicates
  Object.entries(exportGroups).forEach(([name, exports]) => {
    if (exports.length > 1) {
      // Check if they're in different packages
      const packages = [...new Set(exports.map(e => e.package))];
      if (packages.length > 1) {
        duplicates.push({
          name,
          count: exports.length,
          packages,
          exports
        });

        console.log(`🔄 Duplicate found: "${name}" in ${packages.join(', ')}`);
        exports.forEach(exp => {
          console.log(`   • ${exp.package}: ${exp.file}`);
        });
      }
    }
  });

  // Check for specific pattern duplicates
  const patternDuplicates = {};
  Object.values(packageAnalyses).forEach(analysis => {
    analysis.duplicates.forEach(duplicate => {
      const key = `${duplicate.type}:${duplicate.name}`;
      if (!patternDuplicates[key]) {
        patternDuplicates[key] = [];
      }
      patternDuplicates[key].push({
        ...duplicate,
        package: analysis.name
      });
    });
  });

  Object.entries(patternDuplicates).forEach(([key, items]) => {
    if (items.length > 1) {
      const packages = [...new Set(items.map(i => i.package))];
      if (packages.length > 1) {
        duplicates.push({
          name: key,
          count: items.length,
          packages,
          type: 'Pattern Duplicate',
          exports: items
        });

        console.log(`🔄 Pattern duplicate: "${key}" in ${packages.join(', ')}`);
      }
    }
  });

  return duplicates;
}

/**
 * Analyze optimization opportunities
 */
function analyzeOptimization(packageAnalyses) {
  console.log('\n🔧 Optimization Analysis');
  console.log('========================');

  const optimizationIssues = [];
  const totalSize = Object.values(packageAnalyses).reduce((sum, pkg) => sum + pkg.size, 0);

  // Sort packages by size
  const sortedPackages = Object.entries(packageAnalyses)
    .sort(([,a], [,b]) => b.size - a.size);

  console.log('📊 Packages by size:');
  sortedPackages.forEach(([name, analysis]) => {
    const sizeKB = (analysis.size / 1024).toFixed(1);
    const percentage = ((analysis.size / totalSize) * 100).toFixed(1);
    console.log(`   ${name}: ${sizeKB}KB (${percentage}%)`);

    // Check optimization issues
    if (!analysis.optimization.hasSideEffects) {
      optimizationIssues.push({
        package: name,
        issue: 'Missing sideEffects: false in package.json',
        severity: 'high'
      });
    }

    if (!analysis.optimization.hasProperExports) {
      optimizationIssues.push({
        package: name,
        issue: 'Missing proper exports configuration',
        severity: 'medium'
      });
    }

    if (analysis.size > 100 * 1024 && !analysis.optimization.hasConditionalExports) {
      optimizationIssues.push({
        package: name,
        issue: 'Large package missing conditional exports for tree shaking',
        severity: 'high'
      });
    }
  });

  console.log(`\n🎯 Total Framework Size: ${(totalSize / 1024).toFixed(1)}KB`);

  if (optimizationIssues.length > 0) {
    console.log('\n⚠️ Optimization Issues:');
    optimizationIssues.forEach(issue => {
      const icon = issue.severity === 'high' ? '🔴' : '🟡';
      console.log(`   ${icon} ${issue.package}: ${issue.issue}`);
    });
  }

  return optimizationIssues;
}

/**
 * Analyze documentation gaps
 */
function analyzeDocumentation(packageAnalyses) {
  console.log('\n📚 Documentation Analysis');
  console.log('==========================');

  const documentationGaps = [];

  Object.entries(packageAnalyses).forEach(([name, analysis]) => {
    const missingDocs = [];

    if (!analysis.documentation.hasReadme) {
      missingDocs.push('README');
    }
    if (!analysis.documentation.hasTypes) {
      missingDocs.push('Types');
    }
    if (!analysis.documentation.hasExamples) {
      missingDocs.push('Examples');
    }

    if (missingDocs.length > 0) {
      documentationGaps.push({
        package: name,
        missing: missingDocs
      });

      console.log(`📝 ${name}: Missing ${missingDocs.join(', ')}`);
    }
  });

  return documentationGaps;
}

/**
 * Generate comprehensive audit report
 */
function generateAuditReport() {
  console.log('🔍 Coherent.js Package Audit');
  console.log('============================\n');

  // Get all packages
  const packagesDir = path.join(rootDir, 'packages');
  const packages = fs.readdirSync(packagesDir).filter(item => {
    const itemPath = path.join(packagesDir, item);
    return fs.statSync(itemPath).isDirectory();
  });

  // Analyze each package
  const packageAnalyses = {};
  packages.forEach(packageName => {
    packageAnalyses[packageName] = analyzePackage(packageName, `packages/${packageName}`);
  });

  // Detect duplicates
  const duplicates = detectDuplicates(packageAnalyses);

  // Analyze optimization
  const optimizationIssues = analyzeOptimization(packageAnalyses);

  // Analyze documentation
  const documentationGaps = analyzeDocumentation(packageAnalyses);

  // Generate summary
  const summary = {
    totalPackages: packages.length,
    totalSize: Object.values(packageAnalyses).reduce((sum, pkg) => sum + pkg.size, 0),
    duplicateCount: duplicates.length,
    optimizationIssues: optimizationIssues.length,
    documentationGaps: documentationGaps.length
  };

  console.log('\n📋 Audit Summary');
  console.log('================');
  console.log(`📦 Total Packages: ${summary.totalPackages}`);
  console.log(`📊 Total Size: ${(summary.totalSize / 1024).toFixed(1)}KB`);
  console.log(`🔄 Duplicates Found: ${summary.duplicateCount}`);
  console.log(`⚠️ Optimization Issues: ${summary.optimizationIssues}`);
  console.log(`📝 Documentation Gaps: ${summary.documentationGaps}`);

  // Save audit report
  const reportData = {
    timestamp: Date.now(),
    summary,
    packages: packageAnalyses,
    duplicates,
    optimizationIssues,
    documentationGaps
  };

  try {
    fs.writeFileSync(
      path.join(__dirname, '../package-audit-report.json'),
      JSON.stringify(reportData, null, 2)
    );
    console.log('\n📄 Audit report saved to package-audit-report.json');
  } catch (error) {
    console.log('\n⚠️ Could not save audit report:', error.message);
  }

  return reportData;
}

// Run audit if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const report = generateAuditReport();
  process.exit(report.duplicates.length > 0 || report.optimizationIssues.length > 0 ? 1 : 0);
}

export { generateAuditReport };
export default generateAuditReport;
