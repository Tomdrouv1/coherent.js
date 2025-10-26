/**
 * Simple Counter Component
 * Works with both SSR and client-side hydration
 */

import { withState } from '../../../packages/core/src/index.js';

export const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    'data-coherent-component': 'counter',
    className: 'counter',
    children: [
      { h2: { text: 'Interactive Counter' } },
      { 
        p: { 
          text: `Count: ${state.count}`,
          className: 'count-display'
        } 
      },
      {
        div: {
          className: 'button-group',
          children: [
            {
              button: {
                text: '−',
                className: 'btn',
                onclick: (event, state, setState) => {
                  setState({ count: state.count - 1 });
                }
              }
            },
            {
              button: {
                text: 'Reset',
                className: 'btn btn-secondary',
                onclick: (event, state, setState) => {
                  setState({ count: 0 });
                }
              }
            },
            {
              button: {
                text: '+',
                className: 'btn',
                onclick: (event, state, setState) => {
                  setState({ count: state.count + 1 });
                }
              }
            }
          ]
        }
      }
    ]
  }
}));
