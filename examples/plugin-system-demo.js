/**
 * Coherent.js Plugin System Demo
 * 
 * Demonstrates how to use the plugin system to extend framework functionality.
 */

import { renderToString } from '../packages/core/src/index.js';
import {
  createPluginManager,
  createPlugin,
  PluginHooks,
  createPerformancePlugin,
  createDevLoggerPlugin,
  createCachePlugin
} from '../packages/core/src/plugins/index.js';

// Create plugin manager
const pluginManager = createPluginManager({
  debug: true,
  silentErrors: false
});

// Example 1: Using built-in plugins
console.log('\n=== Example 1: Built-in Plugins ===\n');

// Add performance monitoring
const perfPlugin = createPerformancePlugin({
  threshold: 10,
  logSlowRenders: true
});
pluginManager.use(perfPlugin);

// Add development logger
const loggerPlugin = createDevLoggerPlugin({
  logRenders: true,
  logStateChanges: true
});
pluginManager.use(loggerPlugin);

// Add caching
const cachePlugin = createCachePlugin({
  maxSize: 50,
  ttl: 30000
});
pluginManager.use(cachePlugin);

// Example 2: Creating a custom plugin
console.log('\n=== Example 2: Custom Plugin ===\n');

const customPlugin = createPlugin({
  name: 'custom-transformer',
  version: '1.0.0',
  
  hooks: {
    [PluginHooks.BEFORE_RENDER]: (component) => {
      console.log('[Custom Plugin] Transforming component...');
      
      // Add a custom class to all divs
      if (component.div) {
        component.div.className = (component.div.className || '') + ' custom-class';
      }
      
      return component;
    },
    
    [PluginHooks.AFTER_RENDER]: (result) => {
      console.log('[Custom Plugin] Render complete!');
      return result;
    }
  },
  
  setup(manager) {
    console.log('[Custom Plugin] Setup complete');
  },
  
  cleanup() {
    console.log('[Custom Plugin] Cleanup complete');
  }
});

pluginManager.use(customPlugin);

// Example 3: Plugin with dependencies
console.log('\n=== Example 3: Plugin Dependencies ===\n');

const dependentPlugin = createPlugin({
  name: 'dependent-plugin',
  version: '1.0.0',
  dependencies: ['custom-transformer'], // Requires custom-transformer
  
  hooks: {
    [PluginHooks.AFTER_RENDER]: (result) => {
      console.log('[Dependent Plugin] Processing after custom-transformer');
      return result;
    }
  }
});

pluginManager.use(dependentPlugin);

// Example 4: Using hooks
console.log('\n=== Example 4: Hook Execution ===\n');

// Test component
const testComponent = {
  div: {
    className: 'test',
    children: [
      { h1: { text: 'Plugin System Demo' } },
      { p: { text: 'This component is processed by multiple plugins' } }
    ]
  }
};

// Execute hooks
async function demonstrateHooks() {
  console.log('\n--- Before Render Hook ---');
  const transformed = await pluginManager.callHook(
    PluginHooks.BEFORE_RENDER,
    testComponent
  );
  
  console.log('\n--- Rendering Component ---');
  const html = renderToString(transformed);
  
  console.log('\n--- After Render Hook ---');
  await pluginManager.callHook(PluginHooks.AFTER_RENDER, html);
  
  console.log('\n--- Rendered HTML ---');
  console.log(html);
}

await demonstrateHooks();

// Example 5: Plugin statistics
console.log('\n=== Example 5: Plugin Statistics ===\n');

const stats = pluginManager.getStats();
console.log('Plugin Statistics:');
console.log(`- Total Plugins: ${stats.pluginCount}`);
console.log(`- Total Hooks: ${stats.hookCount}`);
console.log(`- Enabled: ${stats.enabled}`);

console.log('\nInstalled Plugins:');
stats.plugins.forEach(plugin => {
  console.log(`  • ${plugin.name} v${plugin.version}`);
  if (plugin.dependencies.length > 0) {
    console.log(`    Dependencies: ${plugin.dependencies.join(', ')}`);
  }
});

console.log('\nRegistered Hooks:');
stats.hooks.forEach(hook => {
  console.log(`  • ${hook.name}: ${hook.handlerCount} handler(s)`);
});

// Example 6: Performance metrics
console.log('\n=== Example 6: Performance Metrics ===\n');

if (perfPlugin.getMetrics) {
  const metrics = perfPlugin.getMetrics();
  console.log('Performance Metrics:');
  console.log(`- Total Renders: ${metrics.renders}`);
  console.log(`- Average Time: ${metrics.averageTime.toFixed(2)}ms`);
  console.log(`- Slow Renders: ${metrics.slowRenders}`);
}

// Example 7: Cache statistics
console.log('\n=== Example 7: Cache Statistics ===\n');

if (cachePlugin.getStats) {
  const cacheStats = cachePlugin.getStats();
  console.log('Cache Statistics:');
  console.log(`- Current Size: ${cacheStats.size}`);
  console.log(`- Max Size: ${cacheStats.maxSize}`);
  console.log(`- TTL: ${cacheStats.ttl}ms`);
}

// Example 8: Uninstalling plugins
console.log('\n=== Example 8: Plugin Lifecycle ===\n');

console.log('Uninstalling custom-transformer...');
try {
  pluginManager.unuse('custom-transformer');
} catch (error) {
  console.error('Cannot uninstall:', error.message);
  console.log('(This is expected because dependent-plugin requires it)');
}

console.log('\nUninstalling dependent-plugin first...');
pluginManager.unuse('dependent-plugin');

console.log('Now uninstalling custom-transformer...');
pluginManager.unuse('custom-transformer');

console.log('\nRemaining plugins:', pluginManager.getPlugins().map(p => p.name));

// Example 9: Disabling plugin system
console.log('\n=== Example 9: Enabling/Disabling ===\n');

console.log('Disabling plugin system...');
pluginManager.disable();
console.log('Plugin system enabled:', pluginManager.enabled);

console.log('\nRe-enabling plugin system...');
pluginManager.enable();
console.log('Plugin system enabled:', pluginManager.enabled);

// Example 10: Creating an advanced plugin
console.log('\n=== Example 10: Advanced Plugin ===\n');

const advancedPlugin = createPlugin({
  name: 'seo-enhancer',
  version: '1.0.0',
  
  hooks: {
    [PluginHooks.BEFORE_RENDER]: (component, context) => {
      // Add SEO meta tags
      if (component.html && component.html.children) {
        const head = component.html.children.find(child => child.head);
        
        if (head && head.head) {
          if (!head.head.children) {
            head.head.children = [];
          }
          
          // Add meta description
          head.head.children.push({
            meta: {
              name: 'description',
              content: 'Enhanced by SEO plugin'
            }
          });
          
          console.log('[SEO Plugin] Added meta tags');
        }
      }
      
      return component;
    }
  }
});

pluginManager.use(advancedPlugin);

// Test SEO enhancement
const pageComponent = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'My Page' } }
          ]
        }
      },
      {
        body: {
          children: [
            { h1: { text: 'Welcome' } }
          ]
        }
      }
    ]
  }
};

const enhancedComponent = await pluginManager.callHook(
  PluginHooks.BEFORE_RENDER,
  pageComponent
);

console.log('\nEnhanced HTML:');
console.log(renderToString(enhancedComponent));

console.log('\n=== Demo Complete ===\n');
console.log('The plugin system provides a powerful way to extend Coherent.js!');
console.log('Create your own plugins to add custom functionality.');
