// scripts/dev-server.js
import express from 'express';
import { watch } from 'chokidar';
import { build } from 'esbuild';

const app = express();

// Rebuild on changes
const watcher = watch('src/**/*.js');
watcher.on('change', async () => {
    console.log('🔄 Rebuilding...');
    await build({
        entryPoints: ['src/server/coherent.js'],
        format: 'esm',
        outfile: 'dist/coherent.js',
        platform: 'node',
        target: 'node16',
        bundle: true,
    });
    console.log('✅ Rebuilt');
});

// Serve examples
app.use(express.static('examples'));

app.listen(3000, () => {
    console.log('🚀 Development server running at http://localhost:3000');
    console.log('👀 Watching for changes...');
});
