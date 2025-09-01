/**
 * Streaming HTML Renderer
 * Provides memory-efficient streaming capabilities for large component trees
 * Ideal for server-side rendering of large pages or data-heavy components
 */

import {
    validateComponent,
    isCoherentObject,
    hasChildren,
    normalizeChildren
} from '../core/object-utils.js';

import {
    escapeHtml,
    isVoidElement,
} from '../core/html-utils.js';

import { performanceMonitor } from '../performance/monitor.js';

// Import BaseRenderer for inheritance
import { BaseRenderer } from './base-renderer.js';

/**
 * Streaming renderer class - extends BaseRenderer for shared functionality
 */
export class StreamingRenderer extends BaseRenderer {
    constructor(options = {}) {
        // Call parent constructor with streaming-specific defaults
        super({
            maxDepth: 1000,
            enableMetrics: false,
            ...options
        });
        
        // Streaming-specific properties
        this.buffer = '';
        this.elementCount = 0;
        
        // Override metrics with streaming-specific fields
        this.metrics = {
            ...this.metrics,
            chunksGenerated: 0,
            totalBytes: 0
        };
    }

    /**
     * Main streaming render method
     */
    async* render(component, options = {}) {
        const config = { ...this.config, ...options };
        this.metrics.startTime = performance.now();

        try {
            // Validate input if requested
            if (config.validateInput !== false) {
                validateComponent(component);
            }

            // Start streaming the component
            yield* this.streamComponent(component, config, 0);

            // Flush any remaining buffer
            if (this.buffer.length > 0) {
                yield this.createChunk(this.buffer, { final: true });
                this.buffer = '';
            }

        } catch (_error) {
            // Stream _error information
            yield this.createErrorChunk(_error);
        } finally {
            this.metrics.endTime = performance.now();
        }
    }

    /**
     * Stream a single component
     */
    async* streamComponent(component, config, depth) {
        if (depth > config.maxDepth) {
            throw new Error(`Maximum nesting depth exceeded: ${config.maxDepth}`);
        }

        // Handle different component types
        if (typeof component === 'string') {
            yield* this.streamText(escapeHtml(component));
            return;
        }

        if (typeof component === 'function') {
            const evaluated = component();
            yield* this.streamComponent(evaluated, config, depth);
            return;
        }

        if (Array.isArray(component)) {
            for (const child of component) {
                yield* this.streamComponent(child, config, depth);

                // Yield control periodically for large arrays
                if (this.elementCount++ % config.yieldThreshold === 0) {
                    await this.yieldControl();
                }
            }
            return;
        }

        if (!isCoherentObject(component)) {
            return; // Skip invalid objects
        }

        // Process object-based component
        for (const [tagName, props] of Object.entries(component)) {
            yield* this.streamElement(tagName, props, config, depth + 1);
        }
    }

    /**
     * Stream a single HTML element
     */
    async* streamElement(tagName, props, config, depth) {
        const isVoid = isVoidElement(tagName);

        // Opening tag
        let openTag = `<${tagName}`;

        // Add attributes
        const attributes = this.utils.extractAttributes(props);
        if (attributes) {
            openTag += ` ${attributes}`;
        }

        openTag += isVoid ? '/>' : '>';

        yield* this.streamText(openTag);

        // Content for non-void elements
        if (!isVoid) {
            // Handle text content
            if (props.text !== undefined) {
                const text = typeof props.text === 'function' ? props.text() : props.text;
                yield* this.streamText(escapeHtml(String(text)));
            }

            // Handle children
            if (hasChildren(props)) {
                const children = normalizeChildren(props.children);
                for (const child of children) {
                    yield* this.streamComponent(child, config, depth);

                    // Periodic yielding
                    if (this.elementCount++ % config.yieldThreshold === 0) {
                        await this.yieldControl();
                    }
                }
            }

            // Closing tag
            yield* this.streamText(`</${tagName}>`);
        }

        this.metrics.elementsProcessed++;
    }

    /**
     * Stream text content with buffering
     */
    async* streamText(text) {
        this.buffer += text;

        // Flush buffer when it reaches chunk size
        if (this.buffer.length >= this.config.chunkSize) {
            const chunk = this.buffer.substring(0, this.config.chunkSize);
            this.buffer = this.buffer.substring(this.config.chunkSize);

            yield this.createChunk(chunk);
        }
    }

    /**
     * Create a chunk object with metadata
     */
    createChunk(content, metadata = {}) {
        const chunk = {
            chunk: content,
            size: Buffer.byteLength(content, this.config.encoding),
            index: this.metrics.totalChunks++,
            timestamp: performance.now(),
            ...metadata
        };

        this.metrics.totalBytes += chunk.size;

        if (this.config.enableMetrics) {
            chunk.metrics = { ...this.metrics };
        }

        return chunk;
    }

    /**
     * Create an _error chunk
     */
    createErrorChunk(_error) {
        return this.createChunk(`<!-- Streaming Error: ${_error.message} -->`, {
            _error: true,
            errorMessage: _error.message,
            errorStack: _error.stack
        });
    }

    /**
     * Yield control to the event loop
     */
    async yieldControl() {
        return new Promise(resolve => setImmediate(resolve));
    }

    /**
     * Get streaming metrics
     */
    getMetrics() {
        const duration = this.metrics.endTime ?
            this.metrics.endTime - this.metrics.startTime :
            performance.now() - this.metrics.startTime;

        return {
            ...this.metrics,
            duration,
            throughput: this.metrics.totalBytes / (duration / 1000), // bytes per second
            elementsPerSecond: this.metrics.elementsProcessed / (duration / 1000)
        };
    }

    /**
     * Reset metrics for new render
     */
    reset() {
        this.metrics = {
            totalChunks: 0,
            totalBytes: 0,
            elementsProcessed: 0,
            startTime: null,
            endTime: null
        };
        this.buffer = '';
        this.elementCount = 0;
    }
}

/**
 * Convenience function to create streaming renderer
 */
export function createStreamingRenderer(options = {}) {
    return new StreamingRenderer(options);
}

/**
 * Simple streaming render function
 */
export async function* renderToStream(component, options = {}) {
    const renderer = new StreamingRenderer(options);
    yield* renderer.render(component, options);
}

/**
 * Streaming utilities
 */
export const streamingUtils = {
    /**
     * Collect all chunks into a single string
     */
    async collectChunks(chunkGenerator) {
        let html = '';
        for await (const chunk of chunkGenerator) {
            html += chunk.chunk;
        }
        return html;
    },

    /**
     * Write chunks directly to a Node.js response
     */
    async streamToResponse(chunkGenerator, response) {
        let totalBytes = 0;

        for await (const chunk of chunkGenerator) {
            response.write(chunk.chunk);
            totalBytes += chunk.size;
        }

        response.end();
        return totalBytes;
    },

    /**
     * Stream with backpressure handling
     */
    async streamWithBackpressure(chunkGenerator, writeFunction, highWaterMark = 16384) {
        let bufferedBytes = 0;

        for await (const chunk of chunkGenerator) {
            bufferedBytes += chunk.size;

            const success = writeFunction(chunk.chunk);

            if (!success && bufferedBytes > highWaterMark) {
                // Wait for drain event or timeout
                await new Promise((resolve) => {
                    const timeout = setTimeout(resolve, 100);
                    writeFunction.once?.('drain', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                });
                bufferedBytes = 0;
            }
        }
    },

    /**
     * Transform chunks (e.g., compression, encoding)
     */
    async* transformChunks(chunkGenerator, transformer) {
        for await (const chunk of chunkGenerator) {
            const transformed = await transformer(chunk);
            if (transformed) {
                yield transformed;
            }
        }
    },

    /**
     * Merge small chunks for efficiency
     */
    async* mergeSmallChunks(chunkGenerator, minSize = 1024) {
        let buffer = '';

        for await (const chunk of chunkGenerator) {
            buffer += chunk.chunk;

            if (buffer.length >= minSize || chunk.final) {
                yield {
                    chunk: buffer,
                    size: Buffer.byteLength(buffer),
                    merged: true
                };
                buffer = '';
            }
        }

        if (buffer.length > 0) {
            yield {
                chunk: buffer,
                size: Buffer.byteLength(buffer),
                merged: true,
                final: true
            };
        }
    }
};

/**
 * Performance monitoring integration
 */
if (performanceMonitor) {
    const originalRender = StreamingRenderer.prototype.render;

    StreamingRenderer.prototype.render = async function* (...args) {
        const startTime = performance.now();
        let chunkCount = 0;

        try {
            for await (const chunk of originalRender.apply(this, args)) {
                chunkCount++;
                yield chunk;
            }
        } finally {
            const duration = performance.now() - startTime;
            performanceMonitor.recordRender('streaming', duration, {
                chunks: chunkCount,
                bytes: this.metrics.totalBytes
            });
        }
    };
}

export default StreamingRenderer;
