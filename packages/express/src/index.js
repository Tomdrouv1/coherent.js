// src/express/index.js
import { renderHTML } from '../../core/src/index.js';

export function expressEngine() {
    return (filePath, options, callback) => {
        try {
            // options contains the Coherent object structure
            const html = renderHTML(options);
            callback(null, html);
        } catch (_error) {
            callback(_error);
        }
    };
}

// Helper for Express apps
export function setupCoherent(app) {
    app.engine('coherent', expressEngine());
    app.set('view engine', 'coherent');
}
