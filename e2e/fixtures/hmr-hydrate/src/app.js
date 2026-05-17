// Wave 4d hydrate fixture. Two modes gated on ?mode=:
//   - mismatch: component output deliberately disagrees with the
//     SSR-shaped HTML so the framework's mismatch detector fires.
//   - event:    component has a click handler that bumps state and
//     re-renders, exercising the patchDOM + handler-survival path.
// Both modes expose results on window.__coherent_e2e for Playwright.

import { hydrate } from '/node_modules/@coherent.js/client/dist/index.js';

const container = document.getElementById('app');
const params = new URLSearchParams(location.search);
const mode = params.get('mode');

window.__coherent_e2e = {
  mode,
  mismatches: [],
  state: null,
  clickCount: 0,
};

if (mode === 'mismatch') {
  // Component output says version "v2"; SSR HTML says "v1". Same
  // structural shape, divergent text → mismatch detector should fire.
  //
  // The DOM structure inside container (div#app) is:
  //   <div>
  //     <button id="inc" type="button">count is 0</button>
  //     <p id="version">v1</p>
  //   </div>
  //
  // The component must mirror this exact nesting so the detector
  // drills into children rather than stopping at a children_count
  // mismatch at the top level. The only intentional divergence is
  // the p element's text: "v2" vs DOM's "v1".
  const Component = () => ({
    div: {
      children: [
        {
          div: {
            children: [
              { button: { id: 'inc', type: 'button', text: 'count is 0' } },
              { p: { id: 'version', text: 'v2' } },
            ],
          },
        },
      ],
    },
  });

  hydrate(Component, container, {
    onMismatch: (mismatches) => {
      window.__coherent_e2e.mismatches.push(...mismatches);
    },
  });
} else if (mode === 'event') {
  // Counter with a click handler. Each click bumps state, which
  // triggers patchDOM (changing the button's text), which then
  // re-registers handlers. The test clicks twice and asserts both
  // clicks reach the handler.
  //
  // The component mirrors the full DOM nesting (div#app > div > button + p)
  // so patchDOM can recurse correctly to update the button text.
  const Component = ({ count = 0 }) => ({
    div: {
      children: [
        {
          div: {
            children: [
              {
                button: {
                  id: 'inc',
                  type: 'button',
                  text: `count is ${count}`,
                  onClick: () => {
                    window.__coherent_e2e.clickCount += 1;
                    const { setState, getState } = window.__coherent_e2e.controls;
                    setState({ count: getState().count + 1 });
                    window.__coherent_e2e.state = getState();
                  },
                },
              },
              { p: { id: 'version', text: 'v1' } },
            ],
          },
        },
      ],
    },
  });

  const controls = hydrate(Component, container, {
    initialState: { count: 0 },
  });
  window.__coherent_e2e.controls = controls;
  window.__coherent_e2e.state = controls.getState();
} else {
  window.__coherent_e2e.error = `unknown mode: ${mode}`;
}
