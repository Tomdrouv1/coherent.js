import { describe, it, expect } from 'vitest';
import { hoc, compose, fp, render } from '../src/index.js';

describe('Functional Programming Tools', () => {
  describe('HOCs', () => {
    it('withProps adds props to component', () => {
      const Button = ({ text, className }) => ({
        button: { className, text }
      });

      const PrimaryButton = hoc.withProps({ className: 'btn-primary' })(Button);
      const html = render(PrimaryButton({ text: 'Click me' }));
      
      expect(html).toContain('class="btn-primary"');
      expect(html).toContain('Click me');
    });

    it('withCondition renders based on condition', () => {
      const Secret = () => ({ div: { text: 'Secret' } });
      const ConditionalSecret = hoc.withCondition(props => props.isLoggedIn)(Secret);

      expect(render(ConditionalSecret({ isLoggedIn: true }))).toContain('Secret');
      expect(render(ConditionalSecret({ isLoggedIn: false }))).toBe('');
    });
  });

  describe('Composition', () => {
    it('pipe applies transformations in order', () => {
      const Base = () => ({ div: { text: 'Base' } });
      
      const wrapInSpan = (Comp) => (props) => ({ span: { children: [Comp(props)] } });
      const addClass = (className) => (Comp) => (props) => {
        const result = Comp(props);
        const tag = Object.keys(result)[0];
        result[tag].className = className;
        return result;
      };

      const Enhanced = compose.pipe(
        wrapInSpan,
        addClass('wrapped')
      )(Base);

      const html = render(Enhanced());
      expect(html).toBe('<span class="wrapped"><div>Base</div></span>');
    });
  });

  describe('FP Utilities', () => {
    it('map transforms array into components', () => {
      const items = ['a', 'b', 'c'];
      const Item = (text) => ({ li: { text } });
      
      const list = {
        ul: {
          children: fp.map(Item)(items)
        }
      };

      const html = render(list);
      expect(html).toContain('<li>a</li>');
      expect(html).toContain('<li>b</li>');
      expect(html).toContain('<li>c</li>');
    });
  });
});
