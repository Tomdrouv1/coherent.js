#!/usr/bin/env node
/**
 * Generate a unified coverage report from all packages
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

console.log('🔍 Generating unified coverage report...');

// Ensure coverage directory exists
if (!existsSync('coverage')) {
  mkdirSync('coverage', { recursive: true });
}

const packagesDir = 'packages';
const packageDirs = readdirSync(packagesDir).filter(dir => {
  const dirPath = join(packagesDir, dir);
  return statSync(dirPath).isDirectory();
});

const totalFunctions = 0;
const coveredFunctions = 0;
const totalBranches = 0;
const coveredBranches = 0;
const totalLines = 0;
const coveredLines = 0;

const packageCoverage = [];
let combinedLcov = '';

// Collect coverage from each package
for (const packageDir of packageDirs) {
  const packagePath = join(packagesDir, packageDir);
  const coveragePath = join(packagePath, 'coverage');
  const lcovPath = join(coveragePath, 'lcov.info');
  
  if (existsSync(lcovPath)) {
    console.log(`📊 Found coverage for ${packageDir}`);
    
    // Read LCOV data
    const lcovContent = readFileSync(lcovPath, 'utf-8');
    combinedLcov += `${lcovContent}\n`;
    
    // Parse coverage summary (basic parsing)
    const lines = lcovContent.split('\n');
    const packageStats = {
      name: packageDir,
      statements: { covered: 0, total: 0, pct: 0 },
      functions: { covered: 0, total: 0, pct: 0 },
      branches: { covered: 0, total: 0, pct: 0 },
      lines: { covered: 0, total: 0, pct: 0 }
    };
    
    for (const line of lines) {
      if (line.startsWith('LF:')) {
        packageStats.lines.total += parseInt(line.split(':')[1]);
        totalLines += parseInt(line.split(':')[1]);
      } else if (line.startsWith('LH:')) {
        packageStats.lines.covered += parseInt(line.split(':')[1]);
        coveredLines += parseInt(line.split(':')[1]);
      } else if (line.startsWith('BRF:')) {
        packageStats.branches.total += parseInt(line.split(':')[1]);
        totalBranches += parseInt(line.split(':')[1]);
      } else if (line.startsWith('BRH:')) {
        packageStats.branches.covered += parseInt(line.split(':')[1]);
        coveredBranches += parseInt(line.split(':')[1]);
      } else if (line.startsWith('FNF:')) {
        packageStats.functions.total += parseInt(line.split(':')[1]);
        totalFunctions += parseInt(line.split(':')[1]);
      } else if (line.startsWith('FNH:')) {
        packageStats.functions.covered += parseInt(line.split(':')[1]);
        coveredFunctions += parseInt(line.split(':')[1]);
      }
    }
    
    // Calculate percentages
    packageStats.lines.pct = packageStats.lines.total > 0 ? 
      Math.round((packageStats.lines.covered / packageStats.lines.total) * 100) : 0;
    packageStats.branches.pct = packageStats.branches.total > 0 ? 
      Math.round((packageStats.branches.covered / packageStats.branches.total) * 100) : 0;
    packageStats.functions.pct = packageStats.functions.total > 0 ? 
      Math.round((packageStats.functions.covered / packageStats.functions.total) * 100) : 0;
    
    packageCoverage.push(packageStats);
  } else {
    console.log(`⚠️  No coverage found for ${packageDir}`);
  }
}

// Calculate overall percentages
const overallLinesPct = totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;
const overallBranchesPct = totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0;
const overallFunctionsPct = totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0;

// Write combined LCOV file
writeFileSync('coverage/lcov.info', combinedLcov);

// Generate coverage summary JSON
const coverageSummary = {
  total: {
    lines: { covered: coveredLines, total: totalLines, pct: overallLinesPct },
    functions: { covered: coveredFunctions, total: totalFunctions, pct: overallFunctionsPct },
    branches: { covered: coveredBranches, total: totalBranches, pct: overallBranchesPct },
    statements: { covered: coveredLines, total: totalLines, pct: overallLinesPct }
  },
  packages: packageCoverage
};

writeFileSync('coverage-summary.json', JSON.stringify(coverageSummary, null, 2));

// Generate human-readable report
let report = `# Test Coverage Report

Generated: ${new Date().toISOString()}

## Overall Coverage
- **Lines**: ${overallLinesPct}% (${coveredLines}/${totalLines})
- **Functions**: ${overallFunctionsPct}% (${coveredFunctions}/${totalFunctions})
- **Branches**: ${overallBranchesPct}% (${coveredBranches}/${totalBranches})

## Package Coverage

| Package | Lines | Functions | Branches |
|---------|-------|-----------|----------|
`;

for (const pkg of packageCoverage) {
  report += `| ${pkg.name} | ${pkg.lines.pct}% (${pkg.lines.covered}/${pkg.lines.total}) | ${pkg.functions.pct}% (${pkg.functions.covered}/${pkg.functions.total}) | ${pkg.branches.pct}% (${pkg.branches.covered}/${pkg.branches.total}) |\n`;
}

writeFileSync('coverage/coverage-report.md', report);

// Generate badge data
const badgeColor = overallLinesPct >= 80 ? 'brightgreen' : 
                   overallLinesPct >= 60 ? 'yellow' : 'red';

const badgeData = {
  schemaVersion: 1,
  label: 'coverage',
  message: `${overallLinesPct}%`,
  color: badgeColor
};

writeFileSync('coverage/badge.json', JSON.stringify(badgeData, null, 2));

console.log(`✅ Coverage report generated successfully!`);
console.log(`📊 Overall coverage: ${overallLinesPct}% lines, ${overallFunctionsPct}% functions, ${overallBranchesPct}% branches`);
console.log(`📁 Reports saved to coverage/ directory`);