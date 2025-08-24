// src/express/index.js
import { renderToString } from '../rendering/html-renderer.js';

export function expressEngine() {
    return (filePath, options, callback) => {
        try {
            // options contains the Coherent object structure
            const html = '<!DOCTYPE html>\n' + renderToString(options);
            callback(null, html);
        } catch (error) {
            callback(error);
        }
    };
}

// Helper for Express apps
export function setupCoherent(app) {
    app.engine('coherent', expressEngine());
    app.set('view engine', 'coherent');
}
