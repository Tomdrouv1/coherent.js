// CSS Scoping Demo - Shows how Coherent.js prevents style conflicts
import { renderScopedComponent } from '../packages/core/src/index.js';

// Component with its own scoped styles
export const ScopedDemo = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'CSS Scoping Demo' } },
            {
              style: {
                text: `
                /* These styles will be automatically scoped */
                body {
                  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                  font-family: 'Comic Sans MS', cursive;
                  margin: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 20px;
                  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                  text-align: center;
                  max-width: 500px;
                }
                
                h1 {
                  color: #ff6b6b;
                  font-size: 2.5em;
                  margin-bottom: 20px;
                  text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
                }
                
                .highlight {
                  background: #ffeb3b;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-weight: bold;
                }
                
                .btn {
                  background: #4ecdc4;
                  color: white;
                  padding: 15px 30px;
                  border: none;
                  border-radius: 25px;
                  font-size: 16px;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  margin: 10px;
                }
                
                .btn:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }
                `
              }
            }
          ]
        }
      },
      {
        body: {
          children: [
            {
              div: {
                className: 'container',
                children: [
                  { h1: { text: '🎨 CSS Scoping Demo' } },
                  { 
                    p: { 
                      children: [
                        'This component has ',
                        { span: { className: 'highlight', text: 'scoped styles' } },
                        ' that won\'t affect the playground!'
                      ]
                    }
                  },
                  {
                    p: {
                      text: 'Notice how the wild styles (Comic Sans, gradients, etc.) are contained within this component and don\'t leak into the playground interface.'
                    }
                  },
                  {
                    div: {
                      children: [
                        { button: { className: 'btn', text: '🌟 Scoped Button' } },
                        { button: { className: 'btn', text: '🎯 Another Button' } }
                      ]
                    }
                  },
                  {
                    p: {
                      style: 'margin-top: 30px; font-size: 14px; color: #666;',
                      text: '💡 Try this in the playground - the styles won\'t affect the editor or UI!'
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
};

// When run directly, demonstrate both scoped and unscoped rendering
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== SCOPED RENDERING (Recommended) ===');
  console.log(renderScopedComponent(ScopedDemo));
  
  console.log('\n=== COMPARISON: Regular rendering would cause style conflicts ===');
  console.log('(This would affect the entire page if used in a playground)');
}

export default ScopedDemo;