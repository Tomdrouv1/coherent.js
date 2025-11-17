# 📊 Performance Page Integration Example

This document demonstrates how to integrate real performance tests with a Coherent.js performance testing page, including proper client-side hydration for interactive buttons.

## Overview

This example shows how to:
1. Create a Coherent.js component with `withState` for performance testing
2. Set up server-side rendering with data-action attributes  
3. Implement client-side hydration for interactive buttons
4. Connect to real performance testing functions
5. Handle timing and script loading issues

## File Structure

```
website/
├── src/pages/Performance.js          # Coherent.js component
├── public/performance.js             # Performance testing functions
├── public/simple-hydration.js        # Hydration script  
└── dist/performance/index.html       # Generated HTML
```

## 1. Server-Side Component (Performance.js)

The server-side component uses `withState` and delegates to client-side functions:

```javascript
// src/pages/Performance.js
import { withState } from '../../../src/coherent.js';

const PerformanceComponent = withState({
  performanceResults: null,
  isRunning: false,
  currentTest: '',
  progress: 0
}, {
  debug: true
});

const PerformanceView = (props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;

  // Define performance test functions that delegate to client-side implementation
  const runAllTests = async () => {
    // This function will be called on the client-side via data-action
    if (typeof window !== 'undefined' && window.runPerformanceTests) {
      return window.runPerformanceTests();
    }
    
    // Server-side fallback (should not normally run)
    setState({ isRunning: true, currentTest: 'Running performance tests...', progress: 0 });
  };

  const runRenderingTest = async () => {
    if (typeof window !== 'undefined' && window.runRenderingTest) {
      return window.runRenderingTest();
    }
    setState({ isRunning: true, currentTest: 'Running rendering test...', progress: 0 });
  };

  const runCacheTest = async () => {
    if (typeof window !== 'undefined' && window.runCacheTest) {
      return window.runCacheTest();
    }
    setState({ isRunning: true, currentTest: 'Running cache test...', progress: 0 });
  };

  const clearResults = () => {
    if (typeof window !== 'undefined' && window.clearResults) {
      return window.clearResults();
    }
    setState({ 
      performanceResults: null, 
      isRunning: false,
      currentTest: '',
      progress: 0
    });
  };

  return {
    div: {
      className: 'performance-page',
      'data-coherent-component': 'performance',
      children: [
        // Header
        {
          div: {
            className: 'performance-header',
            children: [
              { h1: { text: 'Performance Testing' } },
              { p: { 
                className: 'lead', 
                text: 'Interactive performance tests to benchmark Coherent.js rendering, caching, and optimization features.' 
              }}
            ]
          }
        },

        // Test Controls
        {
          div: {
            className: 'test-controls',
            children: [
              { h3: { text: 'Test Controls' } },
              {
                div: {
                  className: 'button-group',
                  children: [
                    {
                      button: {
                        id: 'run-all-tests',
                        className: 'button primary',
                        text: '🚀 Run All Performance Tests',
                        onclick: runAllTests // This becomes data-action attribute
                      }
                    },
                    {
                      button: {
                        id: 'run-render-test',
                        className: 'button secondary',
                        text: '📊 Rendering Test Only',
                        onclick: runRenderingTest
                      }
                    },
                    {
                      button: {
                        id: 'run-cache-test',
                        className: 'button secondary',
                        text: '💾 Cache Test Only', 
                        onclick: runCacheTest
                      }
                    },
                    {
                      button: {
                        id: 'clear-results',
                        className: 'button',
                        text: '🗑️ Clear Results',
                        onclick: clearResults
                      }
                    }
                  ]
                }
              }
            ]
          }
        },

        // Test Status and Results sections...
        {
          div: {
            id: 'test-status',
            className: 'test-status',
            style: 'margin: 20px 0; display: none;',
            children: [
              { div: { id: 'status-message', text: 'Ready to run tests...' } },
              {
                div: {
                  className: 'progress-bar',
                  style: 'margin: 10px 0; height: 6px;',
                  children: [{
                    div: {
                      id: 'progress-fill',
                      style: 'width: 0%; height: 100%; transition: width 0.3s ease;'
                    }
                  }]
                }
              }
            ]
          }
        },

        {
          div: {
            id: 'results-section',
            className: 'results-section',
            style: 'display: none;',
            children: [
              { h2: { text: '📈 Test Results' } },
              { div: { id: 'test-results', className: 'test-results' } }
            ]
          }
        }
      ]
    }
  };
};

export const Performance = PerformanceComponent(PerformanceView);
```

## 2. Client-Side Performance Functions

The actual performance tests run in the browser:

```javascript
// public/performance.js
console.log('Loading performance testing functionality...');

// Performance testing state
const perfState = {
  renderCache: new Map(),
  cacheHits: 0,
  cacheMisses: 0,
  metrics: {
    renderTimes: [],
    cacheStats: [],
    memoryUsage: []
  },
  isRunning: false
};

// Performance test implementations
async function runPerformanceTests() {
  if (perfState.isRunning) return;
  
  perfState.isRunning = true;
  updateStatus('Starting performance tests...', 0);
  
  try {
    // Test 1: Rendering performance
    updateStatus('Running rendering performance tests...', 20);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const renderResults = await performRenderingTest();
    
    // Test 2: Cache performance  
    updateStatus('Running cache effectiveness tests...', 50);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const cacheResults = await performCacheTest();
    
    // Test 3: Memory usage
    updateStatus('Running memory usage analysis...', 80);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const memoryResults = await performMemoryTest();
    
    updateStatus('All performance tests completed successfully!', 100);
    
    // Display results
    const combinedResults = formatResults(renderResults, cacheResults, memoryResults);
    showResults(combinedResults);
    updateMetricCards(calculateMetrics());
    
  } catch (error) {
    console.error('Performance test error:', error);
    updateStatus('Test failed: ' + error.message, 0);
  } finally {
    perfState.isRunning = false;
    setTimeout(() => {
      document.getElementById('test-status').style.display = 'none';
    }, 3000);
  }
}

// Individual test functions
async function runRenderingTest() {
  updateStatus('Running rendering performance test...', 0);
  const results = await performRenderingTest();
  showResults(formatSingleResult('Rendering Performance', results));
  updateMetricCards(results);
}

async function runCacheTest() {
  updateStatus('Running cache effectiveness test...', 0);
  const results = await performCacheTest();
  showResults(formatSingleResult('Cache Performance', results));
  updateMetricCards(results);
}

function clearResults() {
  document.getElementById('results-section').style.display = 'none';
  document.getElementById('test-status').style.display = 'none';
  document.getElementById('progress-fill').style.width = '0%';
  
  // Reset metrics
  perfState.renderCache.clear();
  perfState.cacheHits = 0;
  perfState.cacheMisses = 0;
  
  // Reset metric cards
  const metrics = ['render-metrics', 'cache-metrics', 'memory-metrics'];
  metrics.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = 'No data yet - run tests to see results';
  });
}

// UI Update functions
function updateStatus(message, progress = 0) {
  const statusDiv = document.getElementById('test-status');
  const statusMessage = document.getElementById('status-message');
  const progressFill = document.getElementById('progress-fill');
  
  if (statusDiv) statusDiv.style.display = 'block';
  if (statusMessage) statusMessage.textContent = message;
  if (progressFill) progressFill.style.width = `${progress}%`;
}

function showResults(results) {
  const resultsSection = document.getElementById('results-section');
  const testResults = document.getElementById('test-results');
  
  if (resultsSection) resultsSection.style.display = 'block';
  if (testResults) testResults.innerHTML = results;
}

// Make functions globally available
window.runPerformanceTests = runPerformanceTests;
window.runRenderingTest = runRenderingTest;
window.runCacheTest = runCacheTest;
window.clearResults = clearResults;

console.log('✅ Performance testing functionality loaded!');
```

## 3. Client-Side Hydration Script

The hydration script connects the data-action attributes to the performance functions:

```javascript
// public/simple-hydration.js
console.log('🚀 Simple hydration starting...');

// Wait for both DOM and all scripts to be ready
function waitForReady() {
  return new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

function waitForScripts() {
  return new Promise(resolve => setTimeout(resolve, 200));
}

async function setupButtons() {
  try {
    await waitForReady();
    await waitForScripts();
    
    console.log('🔍 Checking for performance functions...');
    console.log('window.runPerformanceTests:', typeof window.runPerformanceTests);
    console.log('window.runRenderingTest:', typeof window.runRenderingTest);
    console.log('window.runCacheTest:', typeof window.runCacheTest);
    console.log('window.clearResults:', typeof window.clearResults);
    
    // Direct button mapping
    const buttons = {
      'run-all-tests': window.runPerformanceTests,
      'run-render-test': window.runRenderingTest,
      'run-cache-test': window.runCacheTest,
      'clear-results': window.clearResults
    };
    
    Object.entries(buttons).forEach(([buttonId, handler]) => {
      const button = document.getElementById(buttonId);
      if (button && handler) {
        console.log(`🎯 Setting up button: ${buttonId}`);
        
        // Remove any existing event listeners and data attributes
        button.removeAttribute('data-action');
        button.removeAttribute('data-event');
        button.removeAttribute('onclick');
        
        // Clone and replace to remove all existing listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add our handler
        newButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          console.log(`🎯 ${buttonId} clicked!`);
          try {
            handler();
          } catch (error) {
            console.error(`Error executing ${buttonId}:`, error);
          }
        });
        
        console.log(`✅ Button ${buttonId} connected successfully`);
      } else {
        console.warn(`⚠️ Button ${buttonId} or handler missing:`, {
          button: !!button,
          handler: typeof handler
        });
      }
    });
    
    console.log('🎉 Simple hydration complete!');
    
  } catch (error) {
    console.error('❌ Hydration error:', error);
  }
}

// Start the setup
setupButtons();
```

## 4. HTML Integration

The generated HTML includes both scripts:

```html
<!-- dist/performance/index.html -->
<html>
<head>
  <!-- ... head content ... -->
  <script src="./performance.js" defer></script>
  <script src="./simple-hydration.js"></script>
</head>
<body>
  <!-- ... page content ... -->
  
  <!-- Performance component with data-coherent-component attribute -->
  <div class="performance-page" data-coherent-component="performance">
    <!-- ... component content ... -->
    
    <!-- Buttons with both ID and data-action attributes -->
    <button id="run-all-tests" class="button primary" 
            data-action="__coherent_action_123_abc" data-event="click">
      🚀 Run All Performance Tests
    </button>
    <!-- ... other buttons ... -->
  </div>
</body>
</html>
```

## 5. Key Integration Patterns

### Pattern 1: Function Delegation

The Coherent.js component delegates to global functions:

```javascript
const runAllTests = async () => {
  if (typeof window !== 'undefined' && window.runPerformanceTests) {
    return window.runPerformanceTests();
  }
  // Server-side fallback
};
```

### Pattern 2: Button Cloning for Clean Hydration

Remove all existing listeners completely:

```javascript
// Clone and replace to remove all existing listeners
const newButton = button.cloneNode(true);
button.parentNode.replaceChild(newButton, button);

// Attach clean handler
newButton.addEventListener('click', handler);
```

### Pattern 3: Timing Management

Handle script loading timing:

```javascript
async function setupButtons() {
  await waitForReady();        // DOM ready
  await waitForScripts();      // Scripts loaded
  
  // Now safe to access window functions
  const handler = window.runPerformanceTests;
}
```

### Pattern 4: Graceful Degradation

Provide fallbacks when functions aren't available:

```javascript
if (button && handler) {
  // Set up interactive button
} else {
  console.warn(`Button ${buttonId} or handler missing`);
  // Could set up basic form submission as fallback
}
```

## 6. Common Issues and Solutions

### Issue: Buttons Don't Work

**Cause:** Timing issue - hydration runs before performance.js loads

**Solution:** Use proper timing with delays:
```javascript
function waitForScripts() {
  return new Promise(resolve => setTimeout(resolve, 200));
}
```

### Issue: Functions Not Available

**Cause:** Script loading order or errors in performance.js

**Solution:** Add debugging and error handling:
```javascript
console.log('Available functions:', Object.keys(window).filter(k => typeof window[k] === 'function'));
```

### Issue: Multiple Event Handlers

**Cause:** Both data-action and direct handlers attached

**Solution:** Remove conflicting attributes:
```javascript
button.removeAttribute('data-action');
button.removeAttribute('data-event');
```

### Issue: State Not Updating

**Cause:** Component state not connected to UI updates

**Solution:** Use proper state management or direct DOM manipulation:
```javascript
function updateMetricCards(results) {
  const renderMetrics = document.getElementById('render-metrics');
  if (renderMetrics) {
    renderMetrics.innerHTML = `Performance: ${results.improvement}%`;
  }
}
```

## 7. Testing the Integration

### Browser Console Debugging

When the page loads, you should see:
```
🚀 Simple hydration starting...
Loading performance testing functionality...
✅ Performance testing functionality loaded!
🔍 Checking for performance functions...
window.runPerformanceTests: function
🎯 Setting up button: run-all-tests
✅ Button run-all-tests connected successfully
🎉 Simple hydration complete!
```

When you click buttons:
```
🎯 run-all-tests clicked!
Starting comprehensive performance tests...
```

### Verifying Button Connections

```javascript
// Check in browser console
document.querySelectorAll('button[id]').forEach(btn => {
  console.log(`${btn.id}: ${btn.onclick ? 'has' : 'no'} onclick`);
});
```

### Performance Test Validation

The performance tests should show real metrics:
- Rendering improvement: ~85-95%
- Cache hit rate: ~99%  
- Memory usage: actual measurements
- Real timing data from browser

## Conclusion

This integration pattern demonstrates how to:

1. **Server-side**: Create Coherent.js components with proper delegation
2. **Client-side**: Provide real functionality with global functions
3. **Hydration**: Connect server-rendered components to client functionality
4. **Timing**: Handle script loading and DOM ready states properly
5. **Error handling**: Provide debugging and fallbacks

The key insight is that Coherent.js handles the server-side rendering and data-action generation, while custom hydration scripts handle the client-side reconnection to actual functionality. This pattern works well for complex interactive pages that need real browser-based functionality.