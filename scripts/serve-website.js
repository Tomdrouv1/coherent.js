#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { env } from 'node:process';

// Lazy imports for optional dev-only deps (ws, chokidar)
let WebSocketServer = null;
let chokidar = null;
const req = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const DIST_DIR = path.join(repoRoot, 'website', 'dist');
const SRC_DIR = path.join(repoRoot, 'src');
const EXAMPLES_DIR = path.join(repoRoot, 'examples');
const WEBSITE_SRC_DIR = path.join(repoRoot, 'website', 'src');

const PORT = Number(env.PORT || 8081);
const HOST = env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=UTF-8'
};

function safeJoin(base, target) {
  const sanitized = path.normalize(target).replace(/^\/+/, '');
  const p = path.join(base, sanitized);
  if (!p.startsWith(base)) return base; // prevent path traversal
  return p;
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function transformImports(code, repoRoot) {
  // Transform relative imports to absolute file URLs
  let transformedCode = code;

  // Common import patterns to transform
  const importTransforms = [
    // From packages (most common in examples)
    {
      from: /from ['"]\.\.\/packages\/([^'"]+)['"]/g,
      to: (match, packagePath) => `from 'file://${path.join(repoRoot, 'packages', packagePath)}'`
    },
    // From src directory
    {
      from: /from ['"]\.\.\/src\/([^'"]+)['"]/g,
      to: (match, srcPath) => `from 'file://${path.join(repoRoot, 'src', srcPath)}'`
    },
    // Direct core imports
    {
      from: /from ['"]@coherent.js\/core['"]/g,
      to: () => `from 'file://${path.join(repoRoot, 'packages/core/src/index.js')}'`
    },
    // Direct imports from current directory
    {
      from: /from ['"]\.\/([^'"]+)['"]/g,
      to: (match, localPath) => `from 'file://${path.join(repoRoot, 'examples', localPath)}'`
    }
  ];

  // Apply all transformations
  for (const transform of importTransforms) {
    transformedCode = transformedCode.replace(transform.from, transform.to);
  }

  // Also handle dynamic imports
  const dynamicImportTransforms = [
    {
      from: /import\(['"]\.\.\/packages\/([^'"]+)['"]\)/g,
      to: (match, packagePath) => `import('file://${path.join(repoRoot, 'packages', packagePath)}')`
    },
    {
      from: /import\(['"]\.\.\/src\/([^'"]+)['"]\)/g,
      to: (match, srcPath) => `import('file://${path.join(repoRoot, 'src', srcPath)}')`
    }
  ];

  for (const transform of dynamicImportTransforms) {
    transformedCode = transformedCode.replace(transform.from, transform.to);
  }

  return transformedCode;
}

function injectHMR(html) {
  try {
    // Only inject once
    if (html.includes('__coherent_hmr_initialized')) return html;
    let tags = '\n<script type="module" src="/__coherent/hmr.js"></script>\n';

    // Also inject CodeMirror editor for playground pages
    if (html.includes('playground-container') || html.includes('editor-container')) {
      tags += '<script src="/codemirror-editor.js"></script>\n<script src="/playground.js"></script>\n';
    }

    if (html.includes('</body>')) return html.replace('</body>', `${tags}</body>`);
    return html + tags;
  } catch {
    return html;
  }
}

async function handlePlaygroundRun(req, res) {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405; res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    let data = {};
    try { data = JSON.parse(body || '{}'); } catch {}
    const runtime = String(data.runtime || 'node');
    const userCode = String(data.code || '');

    // Minimal validation and limits
    const MAX_CODE = 50_000; // 50KB
    if (userCode.length > MAX_CODE) {
      res.statusCode = 400; res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Code too large' }));
      return;
    }

    const tmpDir = path.join(repoRoot, '.playground-tmp');
    await fs.mkdir(tmpDir, { recursive: true });

    // Transform relative imports in user code to absolute file URLs
    const defaultExample = `// Example: Hello World with Coherent.js
const { render } = await import('file://${path.join(repoRoot, 'packages/core/src/index.js')}');
const html = render({ div: { text: 'Hello, Coherent.js! 👋' } });
console.log(html);`;

    const processedUserCode = transformImports(userCode.trim() || defaultExample, repoRoot);

    // Extract imports from the code and move them to top level
    // Convert exports to const declarations for execution context
    const lines = processedUserCode.split('\n');
    const importLines = [];
    const executableLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ')) {
        importLines.push(line);
      } else if (trimmed.startsWith('export const ') || trimmed.startsWith('export function ') || trimmed.startsWith('export class ')) {
        // Convert export to regular declaration for execution
        executableLines.push(line.replace(/^export /, ''));
      } else if (trimmed.startsWith('export default ')) {
        // Convert export default to regular const declaration
        executableLines.push(line.replace('export default ', 'const __default = '));
      } else if (trimmed.startsWith('export ')) {
        // Handle other export patterns - convert to regular statements
        executableLines.push(line.replace(/^export /, ''));
      } else {
        executableLines.push(line);
      }
    }

    // Check if code has explicit console.log or if we need to auto-render
    const hasConsoleLog = executableLines.some(line => line.includes('console.log'));
    const hasDefaultExport = executableLines.some(line => line.includes('const __default ='));

    let wrapperCode = executableLines.join('\n');

    // If no console.log and has default export, auto-render the default export with scoping
    if (!hasConsoleLog && hasDefaultExport) {
      wrapperCode += `\n\n// Auto-render default export with CSS scoping
const { renderScopedComponent } = await import('file://${path.join(repoRoot, 'packages/core/src/index.js')}');
if (__default && typeof __default === 'object') {
  const html = renderScopedComponent(__default);
  console.log(html);
  console.log('\\n<!-- CSS scoped to prevent playground conflicts -->');
}`;
    }

    const fullCode = `// Auto-generated by Playground
${importLines.join('\n')}

(async () => {
${wrapperCode}
})();`;
    const fileName = `play-${  Date.now()  }-${  Math.random().toString(36).slice(2)  }.mjs`;
    const filePath = path.join(tmpDir, fileName);
    await fs.writeFile(filePath, fullCode, 'utf8');

    let cmd = 'node';
    let args = [filePath];
    if (runtime === 'deno') {
      cmd = 'deno';
      args = ['run', '--quiet', '--allow-read', filePath];
    } else if (runtime === 'bun') {
      cmd = 'bun';
      args = [filePath];
    }

    const child = spawn(cmd, args, { cwd: repoRoot });
    let stdout = '';
    let stderr = '';
    const MAX_OUTPUT = 200_000; // 200KB cap
    child.stdout.on('data', (d) => { if ((stdout.length + d.length) < MAX_OUTPUT) stdout += d.toString(); });
    child.stderr.on('data', (d) => { if ((stderr.length + d.length) < MAX_OUTPUT) stderr += d.toString(); });

    const timeoutMs = Number(env.PLAYGROUND_TIMEOUT_MS || 5000);
    const killer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
    }, timeoutMs);

    child.on('exit', async (code) => {
      clearTimeout(killer);
      // Debug: Log the generated file content if there's an error
      if (code !== 0) {
        try {
          const debugContent = await fs.readFile(filePath, 'utf8');
          console.error('Generated file content:');
          console.error(debugContent);
        } catch (e) {
          console.error('Could not read generated file for debugging');
        }
      }
      // best effort cleanup
      try { await fs.unlink(filePath); } catch {}
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
      res.end(JSON.stringify({ code, stdout, stderr, runtime }));
    });
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    res.end(JSON.stringify({ error: 'Playground execution failed', details: String(e && e.message || e) }));
  }
}

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '') urlPath = '/';

    // Playground execution API
    if (urlPath === '/__playground/run') {
      console.log('🎯 Playground request received:', req.method);
      await handlePlaygroundRun(req, res);
      return;
    }

    // Serve example files for playground (only for .js files, not the /examples page)
    if (urlPath.startsWith('/examples/') && urlPath.endsWith('.js')) {
      const exampleFile = urlPath.replace('/examples/', '');
      // Security check - prevent path traversal
      if (exampleFile.includes('..') || exampleFile.includes('/') || exampleFile.includes('\\')) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
        res.end('Invalid filename');
        return;
      }

      const examplePath = path.join(EXAMPLES_DIR, exampleFile);
      try {
        const content = await fs.readFile(examplePath, 'utf-8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
        res.end(content);
        return;
      } catch (error) {
        if (error.code === 'ENOENT') {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
          res.end('Example file not found');
        } else {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
          res.end('Error reading example file');
        }
        return;
      }
    }

    // API endpoint for example files (alternative route)
    if (urlPath.startsWith('/api/example/')) {
      const exampleFile = urlPath.replace('/api/example/', '');
      // Security check - prevent path traversal
      if (exampleFile.includes('..') || exampleFile.includes('/') || exampleFile.includes('\\')) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid filename' }));
        return;
      }

      const examplePath = path.join(EXAMPLES_DIR, exampleFile);
      try {
        const content = await fs.readFile(examplePath, 'utf-8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
        res.end(content);
        return;
      } catch (error) {
        if (error.code === 'ENOENT') {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Example file not found' }));
        } else {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Error reading example file' }));
        }
        return;
      }
    }

    // Serve HMR client from source during dev
    if (urlPath === '/__coherent/hmr.js') {
      const hmrPath = path.join(repoRoot, 'packages', 'client', 'src', 'hmr.js');
      try {
        const buf = await fs.readFile(hmrPath);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        res.end(buf);
        return;
      } catch {
        // Fallback: serve empty HMR script to prevent 404 errors
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        res.end(`// HMR client fallback
console.log('HMR client loaded (fallback mode)');
// This prevents 404 errors when HMR files are missing
`);
        return;
      }
    }

    let filePath = safeJoin(DIST_DIR, urlPath);
    let statIsDir = false;

    try {
      const s = await fs.stat(filePath);
      statIsDir = s.isDirectory();
    } catch {}

    if (statIsDir) {
      // Append trailing slash and serve index.html
      if (!urlPath.endsWith('/')) {
        res.statusCode = 301;
        res.setHeader('Location', `${urlPath  }/`);
        res.end();
        return;
      }
      filePath = path.join(filePath, 'index.html');
    } else {
      // If path has no extension and no direct file, try directory index
      if (!path.extname(filePath)) {
        const asDir = `${filePath  }/`;
        if (await exists(asDir)) {
          res.statusCode = 301;
          res.setHeader('Location', `${urlPath  }/`);
          res.end();
          return;
        }
        const indexHtml = path.join(filePath, 'index.html');
        if (await exists(indexHtml)) filePath = indexHtml;
      }
    }

    if (!(await exists(filePath))) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const content = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    if (type.startsWith('text/html')) {
      res.end(injectHMR(content.toString('utf8')));
    } else {
      res.end(content);
    }
  } catch (_err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    res.end('Internal Server Error');
  }
});

// Start server first; then attach WS and watcher
server.listen(PORT, HOST, () => {
  console.log(`Serving website from ${DIST_DIR}`);
  console.log(`→ http://${HOST}:${PORT}/`);

  // Dynamically require dev-only dependencies if available
  try {
    WebSocketServer = req('ws').WebSocketServer;
  } catch {}
  try {
    chokidar = req('chokidar');
  } catch {}

  if (!WebSocketServer || !chokidar) {
    console.log('HMR disabled (install dev deps to enable): pnpm add -D ws chokidar');
    return;
  }

  const wss = new WebSocketServer({ server });
  const clients = new Set();
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.send(JSON.stringify({ type: 'connected' }));
  });

  let building = false;
  let pending = false;
  function triggerBuild(reason, file) {
    if (building) {
      pending = true;
      return;
    }
    building = true;
    const args = ['run', 'website:build'];
    console.log(`♻️  Change detected (${reason}): ${file || ''}\n🔨 Rebuilding...`);
    const proc = spawn('pnpm', args, { stdio: 'inherit' });
    proc.on('exit', (code) => {
      building = false;
      if (code === 0) {
        // Notify clients a full reload is safest for now
        for (const ws of clients) {
          try { ws.send(JSON.stringify({ type: 'reload' })); } catch {}
        }
        console.log('✅ Rebuilt. Notified clients to reload.');
        if (pending) {
          pending = false;
          // debounce chain
          setTimeout(() => triggerBuild('pending'), 50);
        }
      } else {
        console.error('❌ Rebuild failed');
      }
    });
  }

  // Watch source and content; ignore dist to prevent loops
  const watcher = chokidar.watch([
    SRC_DIR,
    EXAMPLES_DIR,
    WEBSITE_SRC_DIR,
    path.join(repoRoot, 'docs')
  ], {
    ignored: [DIST_DIR, path.join(repoRoot, 'node_modules'), '**/.git/**'],
    ignoreInitial: true,
  });

  watcher.on('add', (f) => triggerBuild('add', f));
  watcher.on('change', (f) => triggerBuild('change', f));
  watcher.on('unlink', (f) => triggerBuild('unlink', f));
});
