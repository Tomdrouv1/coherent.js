import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '../src/rendering/html-renderer.js';
import { validateNesting, FORBIDDEN_CHILDREN, HTMLNestingError } from '../src/core/html-nesting-rules.js';

describe('HTML Nesting Validation', () => {
    let consoleWarnSpy;

    beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    describe('validateNesting function', () => {
        it('returns true for valid nesting', () => {
            expect(validateNesting('div', 'p')).toBe(true);
            expect(validateNesting('div', 'div')).toBe(true);
            expect(validateNesting('ul', 'li')).toBe(true);
        });

        it('returns false for invalid nesting: p > div', () => {
            expect(validateNesting('p', 'div')).toBe(false);
        });

        it('returns false for invalid nesting: a > a', () => {
            expect(validateNesting('a', 'a')).toBe(false);
        });

        it('returns false for invalid nesting: button > a', () => {
            expect(validateNesting('button', 'a')).toBe(false);
        });

        it('emits console warning with path info', () => {
            validateNesting('p', 'div', 'root.p.children[0]');
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid HTML nesting')
            );
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('root.p.children[0]')
            );
        });

        it('throws when throwOnError is true', () => {
            expect(() => {
                validateNesting('p', 'div', 'test', { throwOnError: true });
            }).toThrow(HTMLNestingError);
        });

        it('does not warn when warn is false', () => {
            validateNesting('p', 'div', 'test', { warn: false });
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });

    describe('FORBIDDEN_CHILDREN map', () => {
        it('includes common p restrictions', () => {
            expect(FORBIDDEN_CHILDREN.p.has('div')).toBe(true);
            expect(FORBIDDEN_CHILDREN.p.has('p')).toBe(true);
            expect(FORBIDDEN_CHILDREN.p.has('ul')).toBe(true);
            expect(FORBIDDEN_CHILDREN.p.has('table')).toBe(true);
        });

        it('includes interactive element restrictions', () => {
            expect(FORBIDDEN_CHILDREN.a.has('a')).toBe(true);
            expect(FORBIDDEN_CHILDREN.button.has('button')).toBe(true);
            expect(FORBIDDEN_CHILDREN.button.has('a')).toBe(true);
        });

        it('includes table structure restrictions', () => {
            expect(FORBIDDEN_CHILDREN.tr.has('tr')).toBe(true);
            expect(FORBIDDEN_CHILDREN.td.has('td')).toBe(true);
        });

        // Regression: <tr> was forbidden inside <thead>, and <table> inside
        // <td>/<th>, so every table render warned about valid markup.
        it('allows tr inside the table row groups', () => {
            expect(FORBIDDEN_CHILDREN.thead.has('tr')).toBe(false);
            expect(FORBIDDEN_CHILDREN.tbody.has('tr')).toBe(false);
            expect(FORBIDDEN_CHILDREN.tfoot.has('tr')).toBe(false);
        });

        it('allows nested tables inside cells', () => {
            expect(FORBIDDEN_CHILDREN.td.has('table')).toBe(false);
            expect(FORBIDDEN_CHILDREN.th.has('table')).toBe(false);
        });
    });

    describe('render integration', () => {
        it('renders a full table without warning', () => {
            const html = render({
                table: {
                    children: [
                        { thead: { children: [{ tr: { children: [{ th: { text: 'H' } }] } }] } },
                        { tbody: { children: [{ tr: { children: [{ td: { text: 'C' } }] } }] } },
                        { tfoot: { children: [{ tr: { children: [{ td: { text: 'F' } }] } }] } }
                    ]
                }
            });

            expect(html).toContain('<thead><tr><th>H</th></tr></thead>');
            expect(html).toContain('<tbody><tr><td>C</td></tr></tbody>');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('renders a nested table inside a cell without warning', () => {
            const html = render({
                td: { children: [{ table: { children: [{ tr: { children: [{ td: { text: 'n' } }] } }] } }] }
            });

            expect(html).toContain('<table><tr><td>n</td></tr></table>');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('warns when rendering p > div', () => {
            const component = {
                p: {
                    children: [{ div: { text: 'invalid' } }]
                }
            };
            const html = render(component);
            // Should still render (warning only)
            expect(html).toContain('<div>invalid</div>');
            // Should have warned
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('<div> cannot be a child of <p>')
            );
        });

        it('warns when rendering nested links', () => {
            const component = {
                a: {
                    href: '/outer',
                    children: [{ a: { href: '/inner', text: 'nested' } }]
                }
            };
            render(component);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('<a> cannot be a child of <a>')
            );
        });

        it('does not warn for valid nesting', () => {
            const component = {
                div: {
                    children: [
                        { p: { text: 'valid' } },
                        { ul: { children: [{ li: { text: 'item' } }] } }
                    ]
                }
            };
            render(component);
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });
});
