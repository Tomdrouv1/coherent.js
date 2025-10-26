/**
 * Coherent.js DevTools Demo
 * 
 * Demonstrates inspector, profiler, and logger capabilities
 */

import {
  createInspector,
  inspect,
  validateComponent,
  createProfiler,
  measure,
  createLogger,
  LogLevel
} from '../packages/devtools/src/index.js';

console.log('\n=== Coherent.js DevTools Demo ===\n');

// Example 1: Component Inspector
console.log('--- Example 1: Component Inspector ---\n');

const testComponent = {
  div: {
    className: 'container',
    id: 'main',
    children: [
      { h1: { text: 'Hello World' } },
      { 
        p: { 
          className: 'description',
          text: 'This is a test component' 
        } 
      },
      {
        ul: {
          children: [
            { li: { text: 'Item 1' } },
            { li: { text: 'Item 2' } },
            { li: { text: 'Item 3' } }
          ]
        }
      }
    ]
  }
};

const inspector = createInspector({ verbose: true });
const inspection = inspector.inspect(testComponent, { name: 'TestComponent' });

console.log('Inspection Results:');
console.log(`- ID: ${inspection.id}`);
console.log(`- Valid: ${inspection.analysis.valid}`);
console.log(`- Root Elements: ${inspection.analysis.rootElements.join(', ')}`);
console.log(`- Element Count: ${inspection.stats.elementCount}`);
console.log(`- Tree Depth: ${inspection.stats.depth}`);
console.log(`- Text Nodes: ${inspection.stats.textNodes}`);
console.log(`- Has Styles: ${inspection.stats.hasStyles}`);
console.log(`- Has Classes: ${inspection.stats.hasClasses}`);

if (inspection.analysis.issues.length > 0) {
  console.log('\nIssues:');
  inspection.analysis.issues.forEach(issue => console.log(`  - ${issue}`));
}

if (inspection.analysis.warnings.length > 0) {
  console.log('\nWarnings:');
  inspection.analysis.warnings.forEach(warning => console.log(`  - ${warning}`));
}

// Example 2: Component Validation
console.log('\n--- Example 2: Component Validation ---\n');

const validComponent = {
  div: {
    children: [
      { h1: { text: 'Valid' } }
    ]
  }
};

const invalidComponent = {
  div: {
    children: 'Should be array' // Invalid!
  }
};

console.log('Validating valid component:');
const validation1 = validateComponent(validComponent);
console.log(`- Valid: ${validation1.valid}`);
console.log(`- Issues: ${validation1.issues.length}`);

console.log('\nValidating invalid component:');
const validation2 = validateComponent(invalidComponent);
console.log(`- Valid: ${validation2.valid}`);
console.log(`- Issues: ${validation2.issues.join(', ')}`);

// Example 3: Performance Profiler
console.log('\n--- Example 3: Performance Profiler ---\n');

const profiler = createProfiler({
  slowThreshold: 10,
  trackMemory: true
});

const sessionId = profiler.startSession('demo-session');
console.log(`Started profiling session: ${sessionId}`);

// Simulate some renders
for (let i = 0; i < 5; i++) {
  const measureId = profiler.startRender(`Component${i}`);
  
  // Simulate work
  const start = Date.now();
  while (Date.now() - start < Math.random() * 20) {
    // Busy wait
  }
  
  profiler.endRender(measureId);
}

const sessionAnalysis = profiler.endSession(sessionId);

console.log('\nSession Analysis:');
console.log(`- Duration: ${sessionAnalysis.duration}ms`);
console.log(`- Measurements: ${sessionAnalysis.measurements}`);
console.log(`- Average: ${sessionAnalysis.analysis.average.toFixed(2)}ms`);
console.log(`- Median: ${sessionAnalysis.analysis.median.toFixed(2)}ms`);
console.log(`- Min: ${sessionAnalysis.analysis.min.toFixed(2)}ms`);
console.log(`- Max: ${sessionAnalysis.analysis.max.toFixed(2)}ms`);
console.log(`- P95: ${sessionAnalysis.analysis.p95.toFixed(2)}ms`);
console.log(`- Slow Renders: ${sessionAnalysis.analysis.slowRenders}`);
console.log(`- Slow %: ${sessionAnalysis.analysis.slowPercentage.toFixed(1)}%`);

console.log('\nBy Component:');
Object.entries(sessionAnalysis.byComponent).forEach(([name, stats]) => {
  console.log(`  ${name}: ${stats.count} renders, avg ${stats.average.toFixed(2)}ms`);
});

// Example 4: Measure Function
console.log('\n--- Example 4: Measure Function ---\n');

const slowFunction = async () => {
  return new Promise(resolve => {
    setTimeout(() => resolve('Done'), 50);
  });
};

console.log('Measuring async function...');
await measure('SlowFunction', slowFunction, profiler);

const summary = profiler.getSummary();
console.log(`\nTotal measurements: ${summary.totalMeasurements}`);
console.log(`Slow renders: ${summary.slowRenders}`);

// Example 5: Development Logger
console.log('\n--- Example 5: Development Logger ---\n');

const logger = createLogger({
  level: LogLevel.DEBUG,
  prefix: '[Demo]',
  timestamp: true,
  colors: true
});

logger.debug('Debug message', { detail: 'This is debug info' });
logger.info('Info message', { status: 'ok' });
logger.warn('Warning message', { code: 'WARN_001' });
logger.error('Error message', { error: 'Something failed' });

// Example 6: Log Grouping
console.log('\n--- Example 6: Log Grouping ---\n');

logger.group('Rendering Phase');
logger.info('Starting render');
logger.debug('Processing components');
logger.info('Render complete');
logger.groupEnd();

logger.group('API Calls');
logger.info('Fetching data');
logger.debug('Request sent', { url: '/api/data' });
logger.info('Data received');
logger.groupEnd();

// Example 7: Log Filtering
console.log('\n--- Example 7: Log Filtering ---\n');

const filteredLogger = createLogger({
  level: LogLevel.WARN // Only warnings and errors
});

filteredLogger.debug('This will not be logged');
filteredLogger.info('This will not be logged');
filteredLogger.warn('This WILL be logged');
filteredLogger.error('This WILL be logged');

// Example 8: Custom Log Handler
console.log('\n--- Example 8: Custom Log Handler ---\n');

const handlerLogger = createLogger();
const errorLogs = [];

handlerLogger.addHandler((logEntry) => {
  if (logEntry.level >= LogLevel.ERROR) {
    errorLogs.push(logEntry);
  }
});

handlerLogger.info('Normal log');
handlerLogger.error('Error 1');
handlerLogger.error('Error 2');

console.log(`Captured ${errorLogs.length} error logs`);

// Example 9: Log Statistics
console.log('\n--- Example 9: Log Statistics ---\n');

const stats = logger.getStats();
console.log('Logger Statistics:');
console.log(`- Total Logs: ${stats.total}`);
console.log('- By Level:');
Object.entries(stats.byLevel).forEach(([level, count]) => {
  if (count > 0) {
    console.log(`    ${level}: ${count}`);
  }
});

// Example 10: Inspector Report
console.log('\n--- Example 10: Inspector Report ---\n');

// Inspect multiple components
inspector.inspect({ div: { text: 'Component 1' } });
inspector.inspect({ div: { text: 'Component 2' } });
inspector.inspect({ div: { children: [] } }); // Empty children

const report = inspector.generateReport();
console.log('Inspector Report:');
console.log(`- Total Inspections: ${report.totalInspections}`);
console.log(`- Components Tracked: ${report.componentsTracked}`);
console.log(`- History Size: ${report.historySize}`);
console.log(`- Total Elements: ${report.summary.totalElements}`);
console.log(`- Average Depth: ${report.summary.averageDepth.toFixed(2)}`);
console.log(`- With Issues: ${report.summary.componentsWithIssues}`);
console.log(`- With Warnings: ${report.summary.componentsWithWarnings}`);

// Example 11: Component Comparison
console.log('\n--- Example 11: Component Comparison ---\n');

const componentA = {
  div: {
    children: [
      { h1: { text: 'Title' } },
      { p: { text: 'Content' } }
    ]
  }
};

const componentB = {
  div: {
    children: [
      { h1: { text: 'Title' } },
      { p: { text: 'Content' } },
      { footer: { text: 'Footer' } }
    ]
  }
};

const comparison = inspector.compare(componentA, componentB);
console.log('Component Comparison:');
console.log(`- Element Count Diff: ${comparison.statsComparison.elementCount.diff}`);
console.log(`- Depth Diff: ${comparison.statsComparison.depth.diff}`);
console.log(`- Structure Match: ${comparison.structureMatch}`);

// Example 12: Search Components
console.log('\n--- Example 12: Search Components ---\n');

const searchResults = inspector.search({
  minElements: 2,
  hasWarnings: false
});

console.log(`Found ${searchResults.length} components matching criteria`);

// Example 13: Export Logs
console.log('\n--- Example 13: Export Logs ---\n');

const jsonExport = logger.export('json');
console.log(`Exported ${jsonExport.length} characters as JSON`);

const textExport = logger.export('text');
console.log(`Exported ${textExport.split('\n').length} lines as text`);

console.log('\n=== Demo Complete ===\n');
console.log('DevTools Features:');
console.log('✅ Component Inspector - Analyze component structure');
console.log('✅ Component Validation - Check for issues');
console.log('✅ Performance Profiler - Measure render times');
console.log('✅ Session Analysis - Track profiling sessions');
console.log('✅ Development Logger - Structured logging');
console.log('✅ Log Grouping - Organize logs');
console.log('✅ Log Filtering - Control verbosity');
console.log('✅ Custom Handlers - Extend functionality');
console.log('✅ Statistics & Reports - Analyze data');
console.log('✅ Export Capabilities - Save logs');
