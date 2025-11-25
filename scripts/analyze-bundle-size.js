#!/usr/bin/env node

/**
 * Bundle Size Analysis Tool for Coherent.js
 *
 * Analyzes package sizes and identifies tree-shaking opportunities
 * Helps optimize the framework for production builds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Calculate file sizes in a directory
 */
function calculateDirectorySize(dirPath, extensions = ['.js']) {
  let totalSize = 0;
  let fileCount = 0;
  const files = [];

  function walkDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Skip node_modules and dist directories
        if (item !== 'node_modules' && item !== 'dist') {
          walkDirectory(itemPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        const size = stat.size;
        totalSize += size;
        fileCount++;

        const relativePath = path.relative(rootDir, itemPath);
        files.push({
          path: relativePath,
          size,
          sizeKB: (size / 1024).toFixed(2)
        });
      }
    }
  }

  walkDirectory(dirPath);

  return { totalSize, fileCount, files };
}

/**
 * Analyze package structure and identify potential optimizations
 */
function analyzePackageStructure() {
  console.log('🔍 Coherent.js Bundle Size Analysis');
  console.log('=====================================\n');

  const packagesDir = path.join(rootDir, 'packages');
  const packages = fs.readdirSync(packagesDir);

  let totalFrameworkSize = 0;
  const packageAnalysis = [];

  for (const pkg of packages) {
    const pkgPath = path.join(packagesDir, pkg);
    const stat = fs.statSync(pkgPath);

    if (stat.isDirectory()) {
      const srcPath = path.join(pkgPath, 'src');

      if (fs.existsSync(srcPath)) {
        const { totalSize, fileCount, files } = calculateDirectorySize(srcPath);
        const sizeKB = (totalSize / 1024).toFixed(2);

        packageAnalysis.push({
          name: pkg,
          size: totalSize,
          sizeKB,
          fileCount,
          files: files.sort((a, b) => b.size - a.size).slice(0, 5) // Top 5 largest files
        });

        totalFrameworkSize += totalSize;
      }
    }
  }

  // Sort packages by size
  packageAnalysis.sort((a, b) => b.size - a.size);

  // Display results
  console.log('📊 Package Size Breakdown:');
  console.log('==========================');

  for (const pkg of packageAnalysis) {
    const percentage = ((pkg.size / totalFrameworkSize) * 100).toFixed(1);
    console.log(`\n📦 ${pkg.name}: ${pkg.sizeKB}KB (${percentage}%) - ${pkg.fileCount} files`);

    if (pkg.files.length > 0) {
      console.log('   Largest files:');
      pkg.files.forEach(file => {
        console.log(`     • ${file.path}: ${file.sizeKB}KB`);
      });
    }
  }

  console.log(`\n🎯 Total Framework Size: ${(totalFrameworkSize / 1024).toFixed(2)}KB`);

  // Identify optimization opportunities
  console.log('\n🔧 Tree Shaking Opportunities:');
  console.log('=================================');

  const largePackages = packageAnalysis.filter(pkg => pkg.size > 100 * 1024); // > 100KB
  if (largePackages.length > 0) {
    console.log('📈 Large packages that could benefit from modular exports:');
    largePackages.forEach(pkg => {
      console.log(`   • ${pkg.name}: ${pkg.sizeKB}KB - consider splitting into sub-modules`);
    });
  }

  // Check for potential duplicates
  console.log('\n🔍 Potential Code Duplication:');
  console.log('==============================');

  const stateRelatedPackages = packageAnalysis.filter(pkg =>
    pkg.name.includes('state') || pkg.name.includes('form')
  );

  if (stateRelatedPackages.length > 1) {
    console.log('📊 State-related packages (check for overlap):');
    stateRelatedPackages.forEach(pkg => {
      console.log(`   • ${pkg.name}: ${pkg.sizeKB}KB`);
    });
  }

  // Tree shaking recommendations
  console.log('\n💡 Optimization Recommendations:');
  console.log('=================================');

  console.log('✅ Already Implemented:');
  console.log('   • DevTools modular exports (visualizer, performance, errors, hybrid)');
  console.log('   • Removed default exports that bundle everything together');
  console.log('   • Added "sideEffects": false to package.json');

  console.log('\n🎯 Next Steps:');
  console.log('   • Make enhanced state patterns tree-shakable');
  console.log('   • Split large packages into sub-modules');
  console.log('   • Implement conditional exports for optional features');

  return {
    totalSize: totalFrameworkSize,
    packageAnalysis,
    recommendations: generateRecommendations(packageAnalysis)
  };
}

/**
 * Generate specific recommendations based on analysis
 */
function generateRecommendations(packageAnalysis) {
  const recommendations = [];

  // Check for packages that should be modularized
  const largePackages = packageAnalysis.filter(pkg => pkg.size > 50 * 1024);
  largePackages.forEach(pkg => {
    recommendations.push({
      package: pkg.name,
      type: 'modularize',
      description: `Split ${pkg.name} into sub-modules for better tree shaking`,
      impact: 'high'
    });
  });

  // Check for devtools specifically
  const devtoolsPkg = packageAnalysis.find(pkg => pkg.name === 'devtools');
  if (devtoolsPkg && devtoolsPkg.size > 100 * 1024) {
    recommendations.push({
      package: 'devtools',
      type: 'tree-shake',
      description: 'DevTools should be optional in production builds',
      impact: 'high'
    });
  }

  // Check for state patterns
  const statePkgs = packageAnalysis.filter(pkg =>
    pkg.name.includes('state') || pkg.name.includes('form')
  );
  if (statePkgs.length > 2) {
    recommendations.push({
      package: 'state',
      type: 'consolidate',
      description: 'Consider consolidating state-related packages',
      impact: 'medium'
    });
  }

  return recommendations;
}

/**
 * Simulate tree shaking impact
 */
function simulateTreeShaking() {
  console.log('\n🌳 Tree Shaking Impact Simulation:');
  console.log('===================================');

  // Simulate different import scenarios
  const scenarios = [
    {
      name: 'Full DevTools Import (Before)',
      imports: ['@coherent.js/devtools'],
      estimatedSize: 4904 // bytes from our analysis
    },
    {
      name: 'Selective DevTools Import (After)',
      imports: ['@coherent.js/devtools/visualizer'],
      estimatedSize: 448 // Only component-visualizer.js
    },
    {
      name: 'Core + State Only',
      imports: ['@coherent.js/core', '@coherent.js/state'],
      estimatedSize: 1200 // Estimated
    },
    {
      name: 'Core Only (Minimal)',
      imports: ['@coherent.js/core'],
      estimatedSize: 800 // Estimated
    }
  ];

  scenarios.forEach(scenario => {
    const sizeKB = (scenario.estimatedSize / 1024).toFixed(2);
    console.log(`📦 ${scenario.name}: ${sizeKB}KB`);
    console.log(`   Imports: ${scenario.imports.join(', ')}`);
  });

  const fullSize = scenarios[0].estimatedSize;
  const selectiveSize = scenarios[1].estimatedSize;
  const reduction = ((fullSize - selectiveSize) / fullSize * 100).toFixed(1);

  console.log(`\n🎯 Tree Shaking Savings: ${reduction}% reduction in DevTools bundle size`);
}

// Run the analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  const analysis = analyzePackageStructure();
  simulateTreeShaking();

  console.log('\n✅ Bundle Size Analysis Complete!');
  console.log('📝 Save this analysis to track optimization progress');
}

export { analyzePackageStructure, simulateTreeShaking };
export default analyzePackageStructure;
