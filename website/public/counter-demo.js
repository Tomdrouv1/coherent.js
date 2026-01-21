/**
 * Counter Component - Demonstrates Phase 2 Hydration
 *
 * This component showcases:
 * - Event delegation (clicks handled via data-coherent-click attributes)
 * - State serialization (count persisted in data-state attribute)
 * - The clean hydrate() API
 */

console.log('[Counter Demo] Loading component...');

// Counter Component function
function CounterComponent(props) {
  const count = props.count || 0;
  const setState = props.setState;

  return {
    div: {
      className: 'demo-container hydrated',
      children: [
        {
          div: {
            className: 'counter-display',
            children: [
              { span: { className: 'counter-label', text: 'Count: ' } },
              { span: { id: 'counter-value', className: 'counter-value', text: String(count) } }
            ]
          }
        },
        {
          div: {
            className: 'counter-buttons',
            children: [
              {
                button: {
                  id: 'decrement-btn',
                  className: 'button',
                  text: '−',
                  onclick: () => {
                    console.log('[Counter] Decrement clicked');
                    setState(prev => ({ count: prev.count - 1 }));
                    updateDisplay(count - 1);
                  }
                }
              },
              {
                button: {
                  id: 'increment-btn',
                  className: 'button primary',
                  text: '+',
                  onclick: () => {
                    console.log('[Counter] Increment clicked');
                    setState(prev => ({ count: prev.count + 1 }));
                    updateDisplay(count + 1);
                  }
                }
              },
              {
                button: {
                  id: 'reset-btn',
                  className: 'button',
                  text: 'Reset',
                  onclick: () => {
                    console.log('[Counter] Reset clicked');
                    setState({ count: 0 });
                    updateDisplay(0);
                  }
                }
              }
            ]
          }
        },
        {
          div: {
            className: 'demo-info',
            children: [
              { small: { text: 'Check DevTools console for hydration logs. State persists in data-state attribute.' } }
            ]
          }
        }
      ]
    }
  };
}

// Helper to update the display (since we're not doing full DOM reconciliation in demo)
function updateDisplay(count) {
  const valueEl = document.getElementById('counter-value');
  if (valueEl) {
    valueEl.textContent = String(count);
  }
}

// Make component globally available for auto-hydration
window.CounterComponent = CounterComponent;

// Manual hydration setup (alternative to auto-hydrate)
function initCounterDemo() {
  const container = document.getElementById('counter-demo');
  if (!container) {
    console.log('[Counter Demo] Container not found, skipping');
    return;
  }

  // Check if CoherentHydration is available
  if (!window.CoherentHydration) {
    console.warn('[Counter Demo] CoherentHydration not loaded, using manual event setup');
    setupManualEvents(container);
    return;
  }

  // Use Phase 2 hydration
  console.log('[Counter Demo] Using Phase 2 hydration...');

  const control = window.CoherentHydration.hydrate(CounterComponent, container, {
    initialState: { count: 0 }
  });

  if (control) {
    console.log('[Counter Demo] Hydration successful!');
    console.log('[Counter Demo] Control object:', control);

    // Store control for debugging
    window.counterControl = control;
  }
}

// Fallback manual event setup (if hydration script not loaded)
function setupManualEvents(container) {
  console.log('[Counter Demo] Setting up manual events...');

  let count = 0;

  const incrementBtn = document.getElementById('increment-btn');
  const decrementBtn = document.getElementById('decrement-btn');
  const resetBtn = document.getElementById('reset-btn');

  if (incrementBtn) {
    incrementBtn.addEventListener('click', () => {
      count++;
      updateDisplay(count);
      console.log('[Counter] Manual increment:', count);
    });
  }

  if (decrementBtn) {
    decrementBtn.addEventListener('click', () => {
      count--;
      updateDisplay(count);
      console.log('[Counter] Manual decrement:', count);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      count = 0;
      updateDisplay(count);
      console.log('[Counter] Manual reset:', count);
    });
  }

  console.log('[Counter Demo] Manual events set up');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCounterDemo);
} else {
  // Small delay to ensure hydration script loads first
  setTimeout(initCounterDemo, 50);
}

console.log('[Counter Demo] Component loaded');
