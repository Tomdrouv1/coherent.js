import { build } from 'esbuild';
import { writeFile } from 'fs/promises';
import path from 'path';

/**
 * Bundle analyzer for Coherent.js packages
 */
export async function analyzeBundles() {
  const packages = [
    'core', 'api', 'database', 'client', 
    'express', 'fastify', 'koa', 'nextjs'
  ];

  const results = {};

  for (const pkg of packages) {
    console.log(`📊 Analyzing ${pkg} bundle...`);
    
    try {
      const result = await build({
        entryPoints: [`packages/${pkg}/dist/index.js`],
        bundle: true,
        minify: true,
        write: false,
        metafile: true,
        format: 'esm',
        platform: pkg === 'client' ? 'browser' : 'node',
      });

      results[pkg] = {
        size: result.outputFiles[0].contents.length,
        sizeKB: Math.round(result.outputFiles[0].contents.length / 1024 * 100) / 100,
        metafile: result.metafile
      };

      console.log(`  📏 Size: ${results[pkg].sizeKB}KB`);
    } catch (error) {
      console.warn(`  ⚠️  Could not analyze ${pkg}: ${error.message}`);
      results[pkg] = { error: error.message };
    }
  }

  // Generate bundle report
  const report = {
    timestamp: new Date().toISOString(),
    packages: results,
    summary: {
      totalSize: Object.values(results)
        .filter(r => !r.error)
        .reduce((sum, r) => sum + r.size, 0),
      largestPackage: Object.entries(results)
        .filter(([_, r]) => !r.error)
        .sort(([_, a], [__, b]) => b.size - a.size)[0]?.[0],
      recommendations: generateRecommendations(results)
    }
  };

  await writeFile(
    'bundle-analysis.json', 
    JSON.stringify(report, null, 2)
  );

  console.log('\n📊 Bundle Analysis Summary:');
  console.log(`Total bundle size: ${Math.round(report.summary.totalSize / 1024 * 100) / 100}KB`);
  console.log(`Largest package: ${report.summary.largestPackage}`);
  
  if (report.summary.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.summary.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }

  return report;
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(results) {
  const recommendations = [];
  
  Object.entries(results).forEach(([pkg, data]) => {
    if (data.error) return;
    
    if (data.sizeKB > 100) {
      recommendations.push(`Consider reducing ${pkg} package size (${data.sizeKB}KB)`);
    }
    
    if (pkg === 'core' && data.sizeKB > 50) {
      recommendations.push(`Core package is large (${data.sizeKB}KB) - consider splitting features`);
    }
    
    if (pkg === 'client' && data.sizeKB > 30) {
      recommendations.push(`Client package is large (${data.sizeKB}KB) - optimize for browser`);
    }
  });
  
  return recommendations;
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeBundles().catch(console.error);
}