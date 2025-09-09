// Encapsulation Comparison Demo - Shows different style isolation approaches
import { renderToString, renderUnsafe, renderScopedComponent } from '../packages/core/src/index.js';

const StyledComponent = {
  div: {
    children: [
      {
        style: {
          text: `
            body { background: #ff6b6b; color: white; font-family: 'Comic Sans MS'; }
            .demo-box { 
              background: #4ecdc4; 
              padding: 20px; 
              border-radius: 10px; 
              margin: 10px;
              text-align: center;
            }
            h2 { color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
          `
        }
      },
      {
        div: {
          className: 'demo-box',
          children: [
            { h2: { text: '🎨 Styled Component Demo' } },
            { p: { text: 'This component has aggressive styles that could conflict!' } }
          ]
        }
      }
    ]
  }
};

console.log('=== 🔒 ENCAPSULATED (Default - Recommended) ===');
console.log('Styles are scoped and won\'t affect other components:\n');
console.log(renderToString(StyledComponent));

console.log('\n=== 🎯 EXPLICITLY SCOPED ===');
console.log('Same result as default, but explicit:\n');
console.log(renderScopedComponent(StyledComponent));

console.log('\n=== ⚠️  UNSAFE (No Encapsulation) ===');
console.log('WARNING: These styles will affect the entire page!\n');
console.log(renderUnsafe(StyledComponent));

console.log('\n=== 🧪 TESTING ENCAPSULATION BEHAVIOR ===');

// Test default behavior
console.log('\n1. Default renderToString (should be scoped):');
const defaultResult = renderToString({ div: { text: 'Default rendering' } });
console.log(defaultResult.includes('coh-') ? '✅ Scoped by default' : '❌ Not scoped');

// Test opt-out
console.log('\n2. Explicit opt-out from encapsulation:');
const unsafeResult = renderToString({ div: { text: 'Unsafe rendering' } }, { encapsulate: false });
console.log(!unsafeResult.includes('coh-') ? '✅ Encapsulation disabled' : '❌ Still scoped');

// Test unsafe function
console.log('\n3. Explicit unsafe rendering:');
const explicitUnsafe = renderUnsafe({ div: { text: 'Explicitly unsafe' } });
console.log(!explicitUnsafe.includes('coh-') ? '✅ No scoping' : '❌ Unexpectedly scoped');

export default StyledComponent;