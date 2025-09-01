/**
 * CSS Management System for Coherent.js
 * Handles CSS file inclusion, inline styles, and optimization
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * CSS Manager Class
 * Handles CSS file loading, processing, and injection
 */
export class CSSManager {
    constructor(options = {}) {
        this.options = {
            basePath: process.cwd(),
            minify: false,
            cache: true,
            autoprefixer: false,
            ...options
        };
        
        this.cache = new Map();
        this.loadedFiles = new Set();
    }
    
    /**
     * Load CSS file content
     */
    async loadCSSFile(filePath) {
        const fullPath = path.resolve(this.options.basePath, filePath);
        const cacheKey = fullPath;
        
        // Return cached content if available
        if (this.options.cache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            let content = await fs.readFile(fullPath, 'utf8');
            
            // Basic minification if enabled
            if (this.options.minify) {
                content = this.minifyCSS(content);
            }
            
            // Cache the content
            if (this.options.cache) {
                this.cache.set(cacheKey, content);
            }
            
            this.loadedFiles.add(filePath);
            return content;
        } catch (error) {
            console.warn(`Failed to load CSS file: ${filePath}`, error.message);
            return '';
        }
    }
    
    /**
     * Load multiple CSS files
     */
    async loadCSSFiles(filePaths) {
        if (!Array.isArray(filePaths)) {
            filePaths = [filePaths];
        }
        
        const cssContents = await Promise.all(
            filePaths.map(filePath => this.loadCSSFile(filePath))
        );
        
        return cssContents.join('\n');
    }
    
    /**
     * Generate CSS link tags for external files
     */
    generateCSSLinks(filePaths, baseUrl = '/') {
        if (!Array.isArray(filePaths)) {
            filePaths = [filePaths];
        }
        
        return filePaths
            .map(filePath => {
                const href = filePath.startsWith('http') 
                    ? filePath 
                    : `${baseUrl}${filePath}`.replace(/\/+/g, '/');
                
                return `<link rel="stylesheet" href="${this.escapeHtml(href)}" />`;
            })
            .join('\n');
    }
    
    /**
     * Generate inline style tag with CSS content
     */
    generateInlineStyles(cssContent) {
        if (!cssContent) return '';
        
        return `<style type="text/css">\n${cssContent}\n</style>`;
    }
    
    /**
     * Basic CSS minification
     */
    minifyCSS(css) {
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/;\s*}/g, '}') // Remove last semicolon in blocks
            .replace(/{\s+/g, '{') // Remove space after opening brace
            .replace(/;\s+/g, ';') // Remove space after semicolons
            .trim();
    }
    
    /**
     * Escape HTML entities
     */
    escapeHtml(text) {
        const div = { textContent: text };
        return div.innerHTML || text;
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.loadedFiles.clear();
    }
    
    /**
     * Get loaded file list
     */
    getLoadedFiles() {
        return Array.from(this.loadedFiles);
    }
}

/**
 * Default CSS Manager instance
 */
export const defaultCSSManager = new CSSManager();

/**
 * CSS processing utilities
 */
export const cssUtils = {
    /**
     * Process CSS options from render options
     */
    processCSSOptions(options = {}) {
        const {
            css = {},
            cssFiles = [],
            inlineCSS = '',
            cssLinks = [],
            cssBasePath = process.cwd(),
            cssMinify = false
        } = options;
        
        return {
            files: Array.isArray(cssFiles) ? cssFiles : [cssFiles].filter(Boolean),
            inline: inlineCSS || css.inline || '',
            links: Array.isArray(cssLinks) ? cssLinks : [cssLinks].filter(Boolean),
            basePath: css.basePath || cssBasePath,
            minify: css.minify || cssMinify,
            loadInline: css.loadInline !== false // default true
        };
    },
    
    /**
     * Generate complete CSS HTML for head section
     */
    async generateCSSHtml(cssOptions, cssManager = defaultCSSManager) {
        const cssHtmlParts = [];
        
        // Process external CSS links
        if (cssOptions.links.length > 0) {
            cssHtmlParts.push(cssManager.generateCSSLinks(cssOptions.links));
        }
        
        // Process CSS files (inline or as links)
        if (cssOptions.files.length > 0) {
            if (cssOptions.loadInline) {
                // Load and inline CSS files
                const cssContent = await cssManager.loadCSSFiles(cssOptions.files);
                if (cssContent) {
                    cssHtmlParts.push(cssManager.generateInlineStyles(cssContent));
                }
            } else {
                // Generate link tags for CSS files
                cssHtmlParts.push(cssManager.generateCSSLinks(cssOptions.files));
            }
        }
        
        // Process inline CSS
        if (cssOptions.inline) {
            cssHtmlParts.push(cssManager.generateInlineStyles(cssOptions.inline));
        }
        
        return cssHtmlParts.join('\n');
    }
};

/**
 * Create a new CSS Manager instance
 */
export function createCSSManager(options = {}) {
    return new CSSManager(options);
}