#!/usr/bin/env node

/**
 * Comprehensive Documentation Audit for Coherent.js
 *
 * Analyzes all packages and docs directory for:
 * - README existence and completeness
 * - Required sections (installation, usage, exports, examples)
 * - Documentation gaps in docs directory
 * - Outdated metrics and claims
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Documentation audit results
 */
const auditResults = {
  packages: {},
  docs: {},
  summary: {
    totalPackages: 0,
    packagesWithReadme: 0,
    packagesComplete: 0,
    packagesNeedingUpdates: 0,
    missingSections: [],
    outdatedMetrics: []
  }
};

/**
 * Analyze a single package's README
 */
function analyzePackageReadme(packageName, readmePath) {
  const analysis = {
    exists: false,
    sections: {
      installation: false,
      usage: false,
      exports: false,
      examples: false,
      performance: false,
      treeShaking: false
    },
    issues: [],
    outdatedMetrics: []
  };

  if (!fs.existsSync(readmePath)) {
    analysis.issues.push('README.md does not exist');
    return analysis;
  }

  analysis.exists = true;
  const content = fs.readFileSync(readmePath, 'utf8');

  // Check for required sections
  analysis.sections.installation = content.includes('pnpm add') || content.includes('npm install');
  analysis.sections.usage = content.includes('import') && content.includes('from');
  analysis.sections.exports = content.includes('exports') || content.includes('API');
  analysis.sections.examples = content.includes('example') || content.includes('Example');
  analysis.sections.performance = content.includes('performance') || content.includes('bundle');
  analysis.sections.treeShaking = content.includes('tree shaking') || content.includes('sideEffects');

  // Check for outdated metrics
  if (content.includes('90.9%') && content.includes('tree shaking')) {
    analysis.outdatedMetrics.push('Tree shaking: 90.9% should be 79.5%');
  }

  if (content.includes('130KB') && content.includes('DevTools')) {
    analysis.outdatedMetrics.push('DevTools bundle size should reflect selective imports');
  }

  // Identify missing sections
  Object.entries(analysis.sections).forEach(([section, exists]) => {
    if (!exists && ['installation', 'usage', 'exports'].includes(section)) {
      analysis.issues.push(`Missing ${section} section`);
    }
  });

  return analysis;
}

/**
 * Analyze docs directory structure
 */
function analyzeDocsDirectory() {
  const docsDir = path.join(rootDir, 'docs');
  const analysis = {
    exists: fs.existsSync(docsDir),
    sections: {},
    issues: []
  };

  if (!analysis.exists) {
    analysis.issues.push('docs directory does not exist');
    return analysis;
  }

  // Expected docs structure
  const expectedSections = [
    'getting-started',
    'core',
    'components',
    'client',
    'server',
    'database',
    'api',
    'deployment',
    'examples',
    'migration'
  ];

  expectedSections.forEach(section => {
    const sectionPath = path.join(docsDir, section);
    analysis.sections[section] = {
      exists: fs.existsSync(sectionPath),
      hasIndex: fs.existsSync(path.join(sectionPath, 'index.md')),
      fileCount: fs.existsSync(sectionPath) ? fs.readdirSync(sectionPath).length : 0
    };

    if (!analysis.sections[section].exists) {
      analysis.issues.push(`Missing docs section: ${section}`);
    }
  });

  // Check for new sections we should have
  const recommendedSections = [
    'optimization',
    'tree-shaking',
    'performance',
    'architecture'
  ];

  recommendedSections.forEach(section => {
    const sectionPath = path.join(docsDir, section);
    if (!fs.existsSync(sectionPath)) {
      analysis.issues.push(`Recommended missing section: ${section}`);
    }
  });

  return analysis;
}

/**
 * Analyze all packages
 */
function analyzeAllPackages() {
  const packagesDir = path.join(rootDir, 'packages');
  const packages = fs.readdirSync(packagesDir).filter(item => {
    const itemPath = path.join(packagesDir, item);
    return fs.statSync(itemPath).isDirectory();
  });

  console.log('📚 Package Documentation Audit');
  console.log('=================================\n');

  packages.forEach(packageName => {
    const readmePath = path.join(packagesDir, packageName, 'README.md');
    const analysis = analyzePackageReadme(packageName, readmePath);

    auditResults.packages[packageName] = analysis;
    auditResults.summary.totalPackages++;

    if (analysis.exists) {
      auditResults.summary.packagesWithReadme++;

      const hasRequiredSections = analysis.sections.installation &&
                                  analysis.sections.usage &&
                                  analysis.sections.exports;
      if (hasRequiredSections) {
        auditResults.summary.packagesComplete++;
      } else {
        auditResults.summary.packagesNeedingUpdates++;
      }
    }

    // Print results
    const status = analysis.exists ? '✅' : '❌';
    const completeness = analysis.exists &&
                        analysis.sections.installation &&
                        analysis.sections.usage &&
                        analysis.sections.exports ? '📚' : '⚠️';

    console.log(`${status} ${completeness} ${packageName}`);

    if (analysis.issues.length > 0) {
      analysis.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }

    if (analysis.outdatedMetrics.length > 0) {
      analysis.outdatedMetrics.forEach(metric => {
        console.log(`   🔄 ${metric}`);
        auditResults.summary.outdatedMetrics.push(`${packageName}: ${metric}`);
      });
    }
  });
}

/**
 * Generate comprehensive audit report
 */
function generateAuditReport() {
  console.log('\n📊 Documentation Audit Summary');
  console.log('===============================\n');

  // Analyze packages
  analyzeAllPackages();

  // Analyze docs directory
  console.log('\n📁 Docs Directory Analysis');
  console.log('==========================\n');
  auditResults.docs = analyzeDocsDirectory();

  if (auditResults.docs.issues.length > 0) {
    auditResults.docs.issues.forEach(issue => {
      console.log(`• ${issue}`);
    });
  }

  // Print summary
  console.log('\n📋 Audit Summary');
  console.log('================');
  console.log(`📦 Total Packages: ${auditResults.summary.totalPackages}`);
  console.log(`📚 With README: ${auditResults.summary.packagesWithReadme}/${auditResults.summary.totalPackages}`);
  console.log(`✅ Complete: ${auditResults.summary.packagesComplete}/${auditResults.summary.totalPackages}`);
  console.log(`⚠️ Need Updates: ${auditResults.summary.packagesNeedingUpdates}`);
  console.log(`🔄 Outdated Metrics: ${auditResults.summary.outdatedMetrics.length}`);

  // Priority recommendations
  console.log('\n🎯 Priority Recommendations');
  console.log('===========================');

  if (auditResults.summary.packagesNeedingUpdates > 0) {
    console.log(`📝 Update ${auditResults.summary.packagesNeedingUpdates} package READMEs with missing sections`);
  }

  if (auditResults.summary.outdatedMetrics.length > 0) {
    console.log(`🔄 Fix ${auditResults.summary.outdatedMetrics.length} outdated metric claims`);
  }

  if (auditResults.docs.issues.length > 0) {
    console.log(`📁 Address ${auditResults.docs.issues.length} docs directory gaps`);
  }

  // Save audit report
  const reportData = {
    timestamp: Date.now(),
    summary: auditResults.summary,
    packages: auditResults.packages,
    docs: auditResults.docs
  };

  try {
    fs.writeFileSync(
      path.join(__dirname, '../documentation-audit-report.json'),
      JSON.stringify(reportData, null, 2)
    );
    console.log('\n📄 Audit report saved to documentation-audit-report.json');
  } catch (error) {
    console.log('\n⚠️ Could not save audit report:', error.message);
  }

  return reportData;
}

// Run audit if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const report = generateAuditReport();
  process.exit(report.summary.packagesNeedingUpdates > 0 || report.summary.outdatedMetrics.length > 0 ? 1 : 0);
}

export { generateAuditReport };
export default generateAuditReport;
