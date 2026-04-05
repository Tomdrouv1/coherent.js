/**
 * Counter Component - Demonstrates Phase 2 Hydration
 *
 * This component showcases:
 * - Event delegation (clicks handled via data-coherent-click attributes)
 * - State serialization (count persisted in data-state attribute)
 * - The clean hydrate() API
 */

console.log('[Counter Demo] Loading component...');

// Counter Component function (used by hydration system)
function CounterComponent(props) {
  const state = props.getState ? props.getState() : props;
  const count = state.count || 0;
  const setState = props.setState;

  return {
    fragment: {
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
                    const cur = (props.getState ? props.getState().count : 0) || 0;
                    setState({ count: cur - 1 });
                    updateDisplay(cur - 1);
                  }
                }
              },
              {
                button: {
                  id: 'increment-btn',
                  className: 'button primary',
                  text: '+',
                  onclick: () => {
                    const cur = (props.getState ? props.getState().count : 0) || 0;
                    setState({ count: cur + 1 });
                    updateDisplay(cur + 1);
                  }
                }
              },
              {
                button: {
                  id: 'reset-btn',
                  className: 'button',
                  text: 'Reset',
                  onclick: () => {
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
              { small: { text: 'Only this Island is interactive. Check DevTools console for hydration logs.' } }
            ]
          }
        }
      ]
    }
  };
}

// Helper to update the counter display
function updateDisplay(count) {
  const valueEl = document.getElementById('counter-value');
  if (valueEl) {
    valueEl.textContent = String(count);
    // Trigger pulse animation
    valueEl.classList.remove('pulse');
    void valueEl.offsetWidth; // force reflow
    valueEl.classList.add('pulse');
  }
}

// Make component globally available for auto-hydration
window.CounterComponent = CounterComponent;

// Wire up the counter buttons directly via addEventListener
function initCounterDemo() {
  const container = document.getElementById('counter-demo');
  if (!container) {
    console.log('[Counter Demo] Container not found, skipping');
    return;
  }

  let count = 0;

  const incrementBtn = document.getElementById('increment-btn');
  const decrementBtn = document.getElementById('decrement-btn');
  const resetBtn = document.getElementById('reset-btn');

  if (incrementBtn) {
    incrementBtn.addEventListener('click', () => {
      count++;
      updateDisplay(count);
      console.log('[Counter] Increment:', count);
    });
  }

  if (decrementBtn) {
    decrementBtn.addEventListener('click', () => {
      count--;
      updateDisplay(count);
      console.log('[Counter] Decrement:', count);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      count = 0;
      updateDisplay(count);
      console.log('[Counter] Reset');
    });
  }

  // Also attempt Phase 2 hydration for state serialization
  if (window.CoherentHydration) {
    try {
      const control = window.CoherentHydration.hydrate(CounterComponent, container);
      if (control) {
        window.counterControl = control;
        console.log('[Counter Demo] Phase 2 hydration active');
      }
    } catch (err) {
      console.warn('[Counter Demo] Phase 2 hydration failed:', err.message);
    }
  }

  console.log('[Counter Demo] Counter initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCounterDemo);
} else {
  initCounterDemo();
}

console.log('[Counter Demo] Component loaded');
