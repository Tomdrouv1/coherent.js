import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '../src/rendering/html-renderer.js';

describe('Key Prop Support', () => {
    let consoleWarnSpy;

    beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    describe('key extraction', () => {
        it('does not render key as HTML attribute', () => {
            const component = {
                div: {
                    key: 'unique-id',
                    className: 'item',
                    text: 'Hello'
                }
            };
            const html = render(component);
            expect(html).toBe('<div class="item">Hello</div>');
            expect(html).not.toContain('key=');
            expect(html).not.toContain('unique-id');
        });

        it('handles components without keys normally', () => {
            const component = {
                div: {
                    className: 'test',
                    text: 'No key'
                }
            };
            const html = render(component);
            expect(html).toBe('<div class="test">No key</div>');
        });

        it('handles keyed children in arrays', () => {
            const component = {
                ul: {
                    children: [
                        { li: { key: 'a', text: 'Item A' } },
                        { li: { key: 'b', text: 'Item B' } },
                        { li: { key: 'c', text: 'Item C' } }
                    ]
                }
            };
            const html = render(component);
            expect(html).toContain('<li>Item A</li>');
            expect(html).toContain('<li>Item B</li>');
            expect(html).not.toContain('key=');
        });

        it('handles numeric keys', () => {
            const component = {
                div: {
                    key: 123,
                    text: 'Numeric key'
                }
            };
            const html = render(component);
            expect(html).toBe('<div>Numeric key</div>');
            expect(html).not.toContain('key=');
            expect(html).not.toContain('123');
        });

        it('handles mixed keyed and unkeyed children', () => {
            const component = {
                ul: {
                    children: [
                        { li: { key: 'first', text: 'First' } },
                        { li: { text: 'No key' } },
                        { li: { key: 'last', text: 'Last' } }
                    ]
                }
            };
            const html = render(component);
            expect(html).toContain('<li>First</li>');
            expect(html).toContain('<li>No key</li>');
            expect(html).toContain('<li>Last</li>');
            expect(html).not.toContain('key=');
        });
    });

    describe('missing key warnings', () => {
        it('warns when array of 2+ objects lacks keys', () => {
            const component = [
                { div: { text: 'one' } },
                { div: { text: 'two' } }
            ];
            render(component);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('missing "key" props')
            );
        });

        it('does not warn for single-item arrays', () => {
            const component = [{ div: { text: 'only one' } }];
            render(component);
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('does not warn when all items have keys', () => {
            const component = [
                { div: { key: 'a', text: 'one' } },
                { div: { key: 'b', text: 'two' } }
            ];
            render(component);
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('does not warn for arrays of primitives', () => {
            const component = ['hello', 'world', 123];
            render(component);
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('includes path in warning message', () => {
            // Warning fires for top-level arrays, which are at 'root' path
            const component = [
                { span: { text: 'a' } },
                { span: { text: 'b' } }
            ];
            render(component);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('root')
            );
        });

        it('reports count of missing keys in warning', () => {
            const component = [
                { div: { key: 'a', text: 'has key' } },
                { div: { text: 'no key 1' } },
                { div: { text: 'no key 2' } }
            ];
            render(component);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('2 items missing')
            );
        });

        it('does not warn for children arrays (only top-level component arrays)', () => {
            // Children arrays are expected to have keys for reconciliation
            // but the warning is for top-level arrays (component lists)
            // Children arrays are handled by the reconciler, not the renderer warning
            const component = {
                div: {
                    children: [
                        {
                            ul: {
                                children: [
                                    { li: { text: 'item 1' } },
                                    { li: { text: 'item 2' } }
                                ]
                            }
                        }
                    ]
                }
            };
            render(component);
            // No warning because children arrays are processed differently
            // The warning is specifically for component array rendering patterns
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });
});
