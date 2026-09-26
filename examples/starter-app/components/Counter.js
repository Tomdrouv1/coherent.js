/**
 * Simple Counter Component
 * Works with both SSR and client-side hydration
 *
 * A plain function of its state. The server renders `Counter({ count })`;
 * in the browser `hydrate(Counter, element, { initialState })` from
 * @coherent.js/client binds the onClick handlers, and `event.setState()`
 * re-renders the component and patches the DOM.
 */

const step = (change) => (event) => {
  event.setState({ count: change(event.state.count) });
};

export function Counter({ count = 0 } = {}) {
  return {
    div: {
      'data-coherent-component': 'counter',
      className: 'counter',
      children: [
        { h2: { text: 'Interactive Counter' } },
        {
          p: {
            text: `Count: ${count}`,
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
                  onClick: step((value) => value - 1)
                }
              },
              {
                button: {
                  text: 'Reset',
                  className: 'btn btn-secondary',
                  onClick: step(() => 0)
                }
              },
              {
                button: {
                  text: '+',
                  className: 'btn',
                  onClick: step((value) => value + 1)
                }
              }
            ]
          }
        }
      ]
    }
  };
}
