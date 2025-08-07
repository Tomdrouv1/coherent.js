/**
 * Renderer Configuration Utilities
 * 
 * Provides helper functions for working with unified renderer configuration
 * across HTML, Streaming, and DOM renderers.
 */

import { DEFAULT_RENDERER_CONFIG } from './base-renderer.js';

/**
 * Create configuration optimized for HTML rendering
 */
export function createHtmlConfig(options = {}) {
    return {
        ...DEFAULT_RENDERER_CONFIG,
        // HTML-specific optimizations
        enableCache: true,
        enableMonitoring: true,
        minify: false,
        maxDepth: 100,
        ...options
    };
}

/**
 * Create configuration optimized for streaming rendering
 */
export function createStreamingConfig(options = {}) {
    return {
        ...DEFAULT_RENDERER_CONFIG,
        // Streaming-specific optimizations
        maxDepth: 1000,
        enableMetrics: true,
        chunkSize: 1024,
        bufferSize: 4096,
        yieldThreshold: 100,
        encoding: 'utf8',
        ...options
    };
}

/**
 * Create configuration optimized for DOM rendering
 */
export function createDomConfig(options = {}) {
    return {
        ...DEFAULT_RENDERER_CONFIG,
        // DOM-specific optimizations
        enableHydration: true,
        maxDepth: 100,
        namespace: null,
        ...options
    };
}

/**
 * Create development-friendly configuration with debugging enabled
 */
export function createDevConfig(options = {}) {
    return {
        ...DEFAULT_RENDERER_CONFIG,
        // Development optimizations
        enableDevWarnings: true,
        enableDebugLogging: true,
        enablePerformanceTracking: true,
        enableMonitoring: true,
        throwOnError: true,
        ...options
    };
}

/**
 * Create production-optimized configuration
 */
export function createProdConfig(options = {}) {
    return {
        ...DEFAULT_RENDERER_CONFIG,
        // Production optimizations
        enableDevWarnings: false,
        enableDebugLogging: false,
        enableCache: true,
        minify: true,
        enablePerformanceTracking: false,
        throwOnError: false,
        errorFallback: '<!-- Render Error -->',
        ...options
    };
}

/**
 * Validate configuration object
 */
export function validateConfig(config) {
    const errors = [];
    
    if (typeof config.maxDepth !== 'number' || config.maxDepth <= 0) {
        errors.push('maxDepth must be a positive number');
    }
    
    if (typeof config.chunkSize !== 'number' || config.chunkSize <= 0) {
        errors.push('chunkSize must be a positive number');
    }
    
    if (typeof config.yieldThreshold !== 'number' || config.yieldThreshold <= 0) {
        errors.push('yieldThreshold must be a positive number');
    }
    
    if (config.encoding && !['utf8', 'ascii', 'base64', 'hex'].includes(config.encoding)) {
        errors.push('encoding must be one of: utf8, ascii, base64, hex');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    
    return true;
}

/**
 * Merge multiple configuration objects with validation
 */
export function mergeConfigs(...configs) {
    const merged = configs.reduce((acc, config) => ({ ...acc, ...config }), {});
    validateConfig(merged);
    return merged;
}

/**
 * Get configuration preset by name
 */
export function getConfigPreset(preset, options = {}) {
    switch (preset) {
        case 'html':
            return createHtmlConfig(options);
        case 'streaming':
            return createStreamingConfig(options);
        case 'dom':
            return createDomConfig(options);
        case 'dev':
        case 'development':
            return createDevConfig(options);
        case 'prod':
        case 'production':
            return createProdConfig(options);
        default:
            throw new Error(`Unknown configuration preset: ${preset}`);
    }
}

/**
 * Configuration presets for easy access
 */
export const CONFIG_PRESETS = {
    html: createHtmlConfig(),
    streaming: createStreamingConfig(),
    dom: createDomConfig(),
    dev: createDevConfig(),
    prod: createProdConfig()
};
