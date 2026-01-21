import { describe, it, expect } from 'vitest';
import { render } from '../src/rendering/html-renderer.js';
import { validateComponentGraceful } from '../src/core/object-utils.js';

describe('Defensive Input Handling', () => {
    describe('null and undefined inputs', () => {
        it('render(null) returns empty string', () => {
            expect(render(null)).toBe('');
        });

        it('render(undefined) returns empty string', () => {
            expect(render(undefined)).toBe('');
        });

        it('handles null in nested children', () => {
            const component = {
                div: {
                    children: [null, { span: { text: 'hello' } }, undefined]
                }
            };
            const html = render(component);
            expect(html).toContain('<span>hello</span>');
            expect(html).not.toContain('null');
            expect(html).not.toContain('undefined');
        });
    });

    describe('empty inputs', () => {
        it('render([]) returns empty string', () => {
            expect(render([])).toBe('');
        });

        it('handles empty children array', () => {
            const component = { div: { children: [] } };
            expect(render(component)).toBe('<div></div>');
        });
    });

    describe('circular reference detection', () => {
        it('throws RenderingError with path on circular reference', () => {
            const circular = { div: {} };
            circular.div.children = [circular]; // Create circular reference

            expect(() => render(circular)).toThrow('Circular reference');
        });

        it('includes path information in circular reference error', () => {
            const circular = { div: {} };
            circular.div.children = [circular];

            try {
                render(circular);
                expect.fail('Should have thrown');
            } catch (e) {
                expect(e.name).toBe('RenderingError');
                expect(e.context?.path || e.renderPath).toBeDefined();
            }
        });

        it('does not false-positive on similar but distinct objects', () => {
            const component = {
                div: {
                    children: [
                        { span: { text: 'a' } },
                        { span: { text: 'b' } }
                    ]
                }
            };
            // Should not throw
            expect(render(component)).toContain('<span>a</span>');
        });

        it('detects deeply nested circular references', () => {
            const component = {
                div: {
                    children: [
                        {
                            section: {
                                children: []
                            }
                        }
                    ]
                }
            };
            // Create circular reference at a deeper level
            component.div.children[0].section.children.push(component);

            expect(() => render(component)).toThrow('Circular reference');
        });
    });

    describe('validateComponentGraceful', () => {
        it('returns valid:false for null', () => {
            const result = validateComponentGraceful(null);
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('null');
        });

        it('returns valid:false for undefined', () => {
            const result = validateComponentGraceful(undefined);
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('null');
        });

        it('returns valid:true for valid components', () => {
            expect(validateComponentGraceful({ div: { text: 'hi' } }).valid).toBe(true);
            expect(validateComponentGraceful('text').valid).toBe(true);
            expect(validateComponentGraceful(123).valid).toBe(true);
        });

        it('returns valid:true for boolean components', () => {
            expect(validateComponentGraceful(true).valid).toBe(true);
            expect(validateComponentGraceful(false).valid).toBe(true);
        });

        it('returns valid:true for function components', () => {
            const fn = () => ({ div: { text: 'hello' } });
            expect(validateComponentGraceful(fn).valid).toBe(true);
        });

        it('includes path for nested invalid components', () => {
            const result = validateComponentGraceful([{ div: {} }, null], 'root');
            expect(result.valid).toBe(false);
            expect(result.path).toContain('[1]');
        });

        it('returns valid:false for empty objects', () => {
            const result = validateComponentGraceful({});
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Empty');
        });

        it('validates arrays recursively', () => {
            const validArray = [
                { div: { text: 'a' } },
                { span: { text: 'b' } }
            ];
            expect(validateComponentGraceful(validArray).valid).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('handles deeply nested null values', () => {
            const component = {
                div: {
                    children: [
                        {
                            section: {
                                children: [null, { p: { text: 'found' } }]
                            }
                        }
                    ]
                }
            };
            const html = render(component);
            expect(html).toContain('<p>found</p>');
            expect(html).not.toContain('null');
        });

        it('handles mixed valid and null children', () => {
            const component = {
                ul: {
                    children: [
                        { li: { text: 'first' } },
                        null,
                        undefined,
                        { li: { text: 'last' } }
                    ]
                }
            };
            const html = render(component);
            expect(html).toBe('<ul><li>first</li><li>last</li></ul>');
        });

        it('handles empty string as valid content', () => {
            const component = { div: { text: '' } };
            expect(render(component)).toBe('<div></div>');
        });

        it('handles zero as valid numeric content', () => {
            const component = { span: { text: 0 } };
            expect(render(component)).toBe('<span>0</span>');
        });

        it('handles false as valid boolean content', () => {
            const component = { span: false };
            expect(render(component)).toBe('<span>false</span>');
        });
    });
});
