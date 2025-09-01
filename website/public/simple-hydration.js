/**
 * Simple direct hydration for performance page buttons
 * This approach bypasses complex timing issues and directly attaches handlers
 */

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

// Wait a bit more for deferred scripts
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