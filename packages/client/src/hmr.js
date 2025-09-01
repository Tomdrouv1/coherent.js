/*
 * Coherent.js HMR Client
 * Auto-connects to the dev server and applies updates.
 */

(function initHMR() {
  if (typeof window === 'undefined') return;
  if (window.__coherent_hmr_initialized) return;
  window.__coherent_hmr_initialized = true;

  const log = (...args) => console.log('[Coherent HMR]', ...args);
  const warn = (...args) => console.warn('[Coherent HMR]', ...args);
  const _error = (...args) => console.error('[Coherent HMR]', ...args);

  let hadDisconnect = false;

  function connect() {
    try {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${location.host}`;
      const ws = new WebSocket(wsUrl);

      ws.addEventListener('open', () => {
        log('connected');
        ws.send(JSON.stringify({ type: 'connected' }));
        // If the server was restarted, ensure the page HTML is refreshed automatically
        if (hadDisconnect) {
          log('reconnected, reloading page');
          setTimeout(() => location.reload(), 200);
          return;
        }
      });
      ws.addEventListener('close', () => {
        hadDisconnect = true;
        warn('disconnected, retrying in 1s...');
        setTimeout(connect, 1000);
      });
      ws.addEventListener('_error', (e) => {
        _error('socket _error', e);
        try { ws.close(); } catch {}
      });

      ws.addEventListener('message', async (evt) => {
        let data;
        try {
          data = JSON.parse(evt.data);
        } catch {
          return;
        }
        log('message', data.type, data.filePath || data.webPath || '');

        switch (data.type) {
          case 'connected':
            break;
          case 'hmr-full-reload':
          case 'reload':
            warn('server requested full reload');
            location.reload();
            return;
          case 'preview-update':
            // No-op here; dashboard uses this for live preview panes
            break;
          case 'hmr-component-update':
          case 'hmr-update':
            await handleUpdate(data);
            break;
          default:
            break;
        }
      });
    } catch {
      // Ignore errors in non-browser environments
    }
  }

  async function handleUpdate(msg) {
    const filePath = msg.webPath || msg.filePath || '';
    const ts = Date.now();

    // Try to re-import changed module to refresh side effects/registrations
    try {
      // Prefer absolute path from dev-server, otherwise attempt as-is
      const importPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
      await import(`${importPath}?t=${ts}`);
      log('updated', msg.updateType || 'module', filePath);
    } catch (err) {
      warn('module re-import failed, attempting soft hydrate', filePath, err);
    }

    // Attempt to re-hydrate if available
    try {
      const { autoHydrate } = await import('/packages/client/src/hydration.js');
      // If examples register a component registry on window, prefer targeted hydrate
      if (window.componentRegistry) {
        autoHydrate(window.componentRegistry);
      } else {
        autoHydrate();
      }
    } catch {
      warn('autoHydrate failed; falling back to full reload');
      location.reload();
    }
  }

  connect();
})();
