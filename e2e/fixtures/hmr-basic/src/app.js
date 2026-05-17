// Fixture app used by Wave 4b Playwright tests. Intentionally tiny —
// just enough to verify the dev server serves modules and the HMR
// client bootstrap loads. Uses createElement/textContent (no
// innerHTML) so it's XSS-safe by construction.

const root = document.getElementById('app');

let count = 0;

function render() {
  // Clear previous render
  while (root.firstChild) root.removeChild(root.firstChild);

  const button = document.createElement('button');
  button.id = 'inc';
  button.type = 'button';
  button.textContent = `count is ${count}`;
  button.addEventListener('click', () => {
    count += 1;
    render();
  });

  const version = document.createElement('p');
  version.id = 'version';
  version.textContent = 'v1';

  root.appendChild(button);
  root.appendChild(version);
}

render();
