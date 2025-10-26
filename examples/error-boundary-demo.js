/**
 * Coherent.js Error Boundary Demo
 * 
 * Demonstrates error handling with error boundaries
 */

import { renderToString } from '../packages/core/src/index.js';
import {
  createErrorBoundary,
  createErrorFallback,
  withErrorBoundary,
  createAsyncErrorBoundary,
  createGlobalErrorHandler
} from '../packages/core/src/components/error-boundary.js';

console.log('\n=== Coherent.js Error Boundary Demo ===\n');

// Example 1: Basic Error Boundary
console.log('--- Example 1: Basic Error Boundary ---\n');

const BuggyComponent = () => {
  throw new Error('Oops! Something went wrong');
};

const basicBoundary = createErrorBoundary({
  fallback: { 
    div: { 
      className: 'error',
      text: 'An error occurred. Please try again.' 
    } 
  },
  onError: (error, errorInfo) => {
    console.log('Error caught:', error.message);
    console.log('Error info:', errorInfo);
  }
});

const SafeBuggyComponent = basicBoundary(BuggyComponent);

try {
  const result = SafeBuggyComponent();
  console.log('Rendered fallback:', renderToString(result));
} catch (error) {
  console.log('Error was not caught!');
}

// Example 2: Custom Error Fallback
console.log('\n--- Example 2: Custom Error Fallback ---\n');

const customFallback = createErrorFallback({
  title: 'Oops! Something went wrong',
  showError: true,
  showStack: false,
  showReset: true,
  className: 'custom-error'
});

const customBoundary = createErrorBoundary({
  fallback: customFallback,
  onError: (error) => console.log('Custom boundary caught:', error.message)
});

const AnotherBuggyComponent = () => {
  throw new Error('Custom error message');
};

const SafeCustomComponent = customBoundary(AnotherBuggyComponent);
const customResult = SafeCustomComponent();
console.log('Custom fallback rendered');

// Example 3: Error Boundary with Reset
console.log('\n--- Example 3: Error Boundary with Reset ---\n');

let shouldFail = true;

const SometimesBuggyComponent = () => {
  if (shouldFail) {
    throw new Error('Component failed!');
  }
  return { div: { text: 'Component rendered successfully!' } };
};

const resetBoundary = createErrorBoundary({
  fallback: (error, errorInfo, context) => ({
    div: {
      children: [
        { p: { text: `Error: ${error.message}` } },
        { 
          button: { 
            text: 'Reset and Try Again',
            onclick: () => {
              console.log('Resetting error boundary...');
              shouldFail = false;
              context.reset();
            }
          } 
        }
      ]
    }
  }),
  onReset: () => console.log('Error boundary reset!')
});

const SafeSometimesBuggyComponent = resetBoundary(SometimesBuggyComponent);

console.log('First render (will fail):');
const result1 = SafeSometimesBuggyComponent();
console.log(renderToString(result1));

console.log('\nAfter reset (should succeed):');
shouldFail = false;
const result2 = SafeSometimesBuggyComponent();
console.log(renderToString(result2));

// Example 4: Error Boundary with Reset Keys
console.log('\n--- Example 4: Error Boundary with Reset Keys ---\n');

const UserComponent = ({ userId }) => {
  if (userId === 'bad-user') {
    throw new Error('Invalid user!');
  }
  return { div: { text: `User: ${userId}` } };
};

const userBoundary = createErrorBoundary({
  fallback: { div: { text: 'Failed to load user' } },
  resetKeys: ['userId'],
  resetOnPropsChange: true,
  onReset: () => console.log('User changed, resetting error boundary')
});

const SafeUserComponent = userBoundary(UserComponent);

console.log('Rendering with bad user:');
const badUserResult = SafeUserComponent({ userId: 'bad-user' });
console.log(renderToString(badUserResult));

console.log('\nRendering with good user (auto-reset):');
const goodUserResult = SafeUserComponent({ userId: 'good-user' });
console.log(renderToString(goodUserResult));

// Example 5: Max Errors
console.log('\n--- Example 5: Max Errors ---\n');

let attemptCount = 0;

const AlwaysBuggyComponent = () => {
  attemptCount++;
  throw new Error(`Attempt ${attemptCount} failed`);
};

const maxErrorsBoundary = createErrorBoundary({
  fallback: (error, errorInfo, context) => {
    if (context.permanent) {
      return { 
        div: { 
          className: 'permanent-error',
          text: 'Too many errors. Component disabled.' 
        } 
      };
    }
    return { 
      div: { 
        text: `Error ${context.errorCount}/3: ${error.message}` 
      } 
    };
  },
  maxErrors: 3,
  onError: (error) => console.log('Error caught:', error.message)
});

const SafeAlwaysBuggyComponent = maxErrorsBoundary(AlwaysBuggyComponent);

console.log('Attempt 1:');
console.log(renderToString(SafeAlwaysBuggyComponent()));

console.log('\nAttempt 2:');
console.log(renderToString(SafeAlwaysBuggyComponent()));

console.log('\nAttempt 3:');
console.log(renderToString(SafeAlwaysBuggyComponent()));

console.log('\nAttempt 4 (permanent fallback):');
console.log(renderToString(SafeAlwaysBuggyComponent()));

// Example 6: Auto-Reset Timeout
console.log('\n--- Example 6: Auto-Reset Timeout ---\n');

const timeoutBoundary = createErrorBoundary({
  fallback: { div: { text: 'Error! Will auto-reset in 2 seconds...' } },
  resetTimeout: 2000,
  onReset: () => console.log('Auto-reset triggered!'),
  onError: (error) => console.log('Error caught, timer started')
});

// Example 7: Wrapping Multiple Components
console.log('\n--- Example 7: Wrapping Multiple Components ---\n');

const Header = () => ({ header: { text: 'Header' } });
const Content = () => { throw new Error('Content failed'); };
const Footer = () => ({ footer: { text: 'Footer' } });

const safeComponents = withErrorBoundary(
  {
    fallback: (error) => ({ 
      div: { 
        className: 'component-error',
        text: `Component error: ${error.message}` 
      } 
    })
  },
  { Header, Content, Footer }
);

console.log('Safe Header:', renderToString(safeComponents.Header()));
console.log('Safe Content:', renderToString(safeComponents.Content()));
console.log('Safe Footer:', renderToString(safeComponents.Footer()));

// Example 8: Async Error Boundary
console.log('\n--- Example 8: Async Error Boundary ---\n');

const AsyncComponent = async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return { div: { text: 'Async content loaded!' } };
};

const FailingAsyncComponent = async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  throw new Error('Async load failed!');
};

const asyncBoundary = createAsyncErrorBoundary({
  fallback: { div: { text: 'Loading...' } },
  errorFallback: { div: { text: 'Failed to load async content' } },
  timeout: 5000,
  onError: (error) => console.log('Async error:', error.message)
});

const SafeAsyncComponent = asyncBoundary(AsyncComponent);
const SafeFailingAsyncComponent = asyncBoundary(FailingAsyncComponent);

console.log('Loading async component...');
SafeAsyncComponent().then(result => {
  console.log('Success:', renderToString(result));
});

console.log('Loading failing async component...');
SafeFailingAsyncComponent().then(result => {
  console.log('Fallback:', renderToString(result));
});

// Example 9: Global Error Handler
console.log('\n--- Example 9: Global Error Handler ---\n');

const globalHandler = createGlobalErrorHandler({
  maxErrors: 50,
  onError: (error, context) => {
    console.log(`Global handler caught: ${error.message}`);
    console.log(`Context:`, context);
  }
});

// Simulate some errors
globalHandler.captureError(new Error('Error 1'), { component: 'Header' });
globalHandler.captureError(new Error('Error 2'), { component: 'Content' });
globalHandler.captureError(new Error('Error 3'), { component: 'Footer' });

console.log('\nGlobal error stats:', globalHandler.getStats());
console.log('Captured errors:', globalHandler.getErrors().length);

// Example 10: Nested Error Boundaries
console.log('\n--- Example 10: Nested Error Boundaries ---\n');

const InnerBuggyComponent = () => {
  throw new Error('Inner component failed');
};

const OuterComponent = () => {
  const innerBoundary = createErrorBoundary({
    fallback: { div: { className: 'inner-error', text: 'Inner error caught' } }
  });
  
  const SafeInner = innerBoundary(InnerBuggyComponent);
  
  return {
    div: {
      className: 'outer',
      children: [
        { h2: { text: 'Outer Component' } },
        SafeInner()
      ]
    }
  };
};

const outerBoundary = createErrorBoundary({
  fallback: { div: { text: 'Outer error caught' } }
});

const SafeOuterComponent = outerBoundary(OuterComponent);

console.log('Nested boundaries result:');
console.log(renderToString(SafeOuterComponent()));

// Example 11: Error Boundary with Component Tree
console.log('\n--- Example 11: Error Boundary with Component Tree ---\n');

const Page = () => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Error Boundary Demo' } }
          ]
        }
      },
      {
        body: {
          children: [
            { h1: { text: 'My Application' } },
            (() => {
              throw new Error('Body content failed');
            })()
          ]
        }
      }
    ]
  }
});

const pageBoundary = createErrorBoundary({
  fallback: createErrorFallback({
    title: 'Page Error',
    showError: true,
    showReset: true
  })
});

const SafePage = pageBoundary(Page);

console.log('Page with error boundary:');
const pageResult = SafePage();
console.log(renderToString(pageResult).substring(0, 200) + '...');

console.log('\n=== Demo Complete ===\n');
console.log('Error boundaries provide robust error handling for your components!');
console.log('Use them to prevent entire application crashes from single component failures.');
