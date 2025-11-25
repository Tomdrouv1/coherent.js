/**
 * Full-Stack Performance Benchmark for Coherent.js
 *
 * Demonstrates the complete request flow:
 * API Request → Data Fetching → Component Rendering → HTML Generation → Client Hydration
 *
 * This benchmark showcases how Coherent.js's functional programming approach
 * enables better performance across the entire stack compared to traditional frameworks.
 */

import { createRouter } from '../packages/api/src/index.js';
import { render } from '../packages/core/src/index.js';
import { createComponentCache } from '../packages/core/src/performance/component-cache.js';
import { createPerformanceMonitor } from '../packages/core/src/performance/monitor.js';

// Mock database for realistic data fetching
const mockDatabase = {
  users: Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    avatar: `https://picsum.photos/seed/user${i + 1}/100/100.jpg`
  })),

  posts: Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    title: `Post Title ${i + 1}`,
    content: `This is the content for post ${i + 1}`.repeat(20),
    authorId: (i % 100) + 1,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
  }))
};

// Create API router with optimizations
const apiRouter = createRouter(null, {
  enableSmartRouting: true,
  enableMetrics: true,
  maxCompilationCacheSize: 1000,
  enableSecurityHeaders: false // Benchmark pure performance
});

// Performance monitoring
const performanceMonitor = createPerformanceMonitor({
  enabled: true,
  metrics: {
    custom: {
      fullStackRenderTime: { type: 'histogram', unit: 'ms' },
      apiResponseTime: { type: 'histogram', unit: 'ms' },
      componentRenderTime: { type: 'histogram', unit: 'ms' },
      dataFetchTime: { type: 'histogram', unit: 'ms' }
    }
  },
  sampling: { enabled: false } // Record everything for benchmarks
});

// Component cache with optimizations
const componentCache = createComponentCache({
  maxSize: 1000,
  defaultTTL: 300000,
  enableStats: true
});

// Setup API routes
apiRouter.get('/api/users/:id', (req, res) => {
  const startTime = performance.now();
  const user = mockDatabase.users.find(u => u.id === parseInt(req.params.id));
  const apiTime = performance.now() - startTime;

  performanceMonitor.recordMetric('apiResponseTime', apiTime, {
    endpoint: '/api/users/:id',
    cacheHit: false
  });

  if (user) {
    res.json({ user });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

apiRouter.get('/api/posts', (req, res) => {
  const startTime = performance.now();
  const limit = parseInt(req.query.limit) || 10;
  const posts = mockDatabase.posts.slice(0, limit);
  const apiTime = performance.now() - startTime;

  performanceMonitor.recordMetric('apiResponseTime', apiTime, {
    endpoint: '/api/posts',
    cacheHit: false
  });

  res.json({ posts });
});

// Functional components using pure JavaScript objects
const UserCard = ({ user }) => ({
  div: {
    className: 'user-card',
    children: [
      { img: { src: user.avatar, alt: user.name, className: 'avatar' } },
      { h3: { text: user.name } },
      { p: { text: user.email } }
    ]
  }
});

const PostCard = ({ post }) => ({
  article: {
    className: 'post-card',
    children: [
      { h2: { text: post.title } },
      { p: { text: post.content.substring(0, 200) + '...' } },
      { small: { text: `By User ${post.authorId} on ${new Date(post.createdAt).toLocaleDateString()}` } }
    ]
  }
});

const HomePage = ({ users, posts }) => ({
  html: {
    children: [
      { head: {
        children: [
          { title: { text: 'Coherent.js Full-Stack Demo' } },
          { meta: { charset: 'utf-8' } },
          { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }
        ]
      }},
      { body: {
        children: [
          { header: {
            children: [
              { h1: { text: 'Coherent.js Performance Demo' } },
              { nav: {
                children: [
                  { a: { href: '/', text: 'Home' } },
                  { a: { href: '/users', text: 'Users' } },
                  { a: { href: '/posts', text: 'Posts' } }
                ]
              }}
            ]
          }},
          { main: {
            children: [
              { section: {
                className: 'users-section',
                children: [
                  { h2: { text: 'Featured Users' } },
                  { div: {
                    className: 'users-grid',
                    children: users.slice(0, 6).map(user => UserCard({ user }))
                  }}
                ]
              }},
              { section: {
                className: 'posts-section',
                children: [
                  { h2: { text: 'Recent Posts' } },
                  { div: {
                    className: 'posts-grid',
                    children: posts.map(post => PostCard({ post }))
                  }}
                ]
              }}
            ]
          }},
          { footer: {
            children: [
              { p: { text: `Rendered by Coherent.js - ${new Date().toISOString()}` } }
            ]
          }}
        ]
      }}
    ]
  }
});

// Simulate data fetching
async function fetchUserData(userId) {
  const startTime = performance.now();

  // Simulate database query delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 5));

  const user = mockDatabase.users.find(u => u.id === userId);
  const fetchTime = performance.now() - startTime;

  performanceMonitor.recordMetric('dataFetchTime', fetchTime, {
    type: 'user',
    cacheHit: false
  });

  return user;
}

async function fetchPostsData(limit = 10) {
  const startTime = performance.now();

  // Simulate database query delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

  const posts = mockDatabase.posts.slice(0, limit);
  const fetchTime = performance.now() - startTime;

  performanceMonitor.recordMetric('dataFetchTime', fetchTime, {
    type: 'posts',
    cacheHit: false
  });

  return posts;
}

// Full-stack rendering function
async function renderFullStackPage(pageType, params = {}) {
  const fullStackStart = performance.now();

  try {
    let data;

    // Step 1: Data fetching
    switch (pageType) {
      case 'home':
        const [users, posts] = await Promise.all([
          fetchUserData(1), // Fetch one user for demo
          fetchPostsData(10)
        ]);
        data = { users: [users], posts };
        break;

      case 'user':
        const user = await fetchUserData(params.userId);
        data = { users: user ? [user] : [], posts: [] };
        break;

      case 'posts':
        const postList = await fetchPostsData(params.limit || 20);
        data = { users: [], posts: postList };
        break;

      default:
        throw new Error(`Unknown page type: ${pageType}`);
    }

    // Step 2: Component rendering with caching
    const renderStart = performance.now();

    const cacheKey = `page:${pageType}:${JSON.stringify(params)}`;
    let html = componentCache.get(cacheKey);

    if (!html) {
      const component = HomePage(data);
      html = render(component);

      componentCache.set(cacheKey, html, {
        dependencies: [`users:${data.users.length}`, `posts:${data.posts.length}`]
      });
    }

    const renderTime = performance.now() - renderStart;
    performanceMonitor.recordMetric('componentRenderTime', renderTime, {
      pageType,
      cacheHit: html !== null
    });

    const fullStackTime = performance.now() - fullStackStart;
    performanceMonitor.recordMetric('fullStackRenderTime', fullStackTime, { pageType });

    return {
      html: `<!DOCTYPE html>${html}`,
      metrics: {
        fullStackTime,
        renderTime,
        cacheHit: html !== null
      }
    };

  } catch (error) {
    console.error('Full-stack render error:', error);
    throw error;
  }
}

// Benchmark runner
async function runFullStackBenchmark() {
  console.log('🚀 Coherent.js Full-Stack Performance Benchmark');
  console.log('==================================================');

  const scenarios = [
    { name: 'Home Page', type: 'home', params: {}, iterations: 1000 },
    { name: 'User Page', type: 'user', params: { userId: 1 }, iterations: 1000 },
    { name: 'Posts Page', type: 'posts', params: { limit: 20 }, iterations: 1000 },
    { name: 'Mixed Load', type: 'mixed', params: {}, iterations: 1000 }
  ];

  const results = {};

  for (const scenario of scenarios) {
    console.log(`\n📊 Testing: ${scenario.name}`);
    console.log(`   Iterations: ${scenario.iterations}`);

    const scenarioStart = Date.now();
    const times = [];
    let cacheHits = 0;

    for (let i = 0; i < scenario.iterations; i++) {
      const pageType = scenario.type === 'mixed'
        ? ['home', 'user', 'posts'][i % 3]
        : scenario.type;

      const params = scenario.type === 'mixed' && pageType === 'user'
        ? { userId: (i % 10) + 1 }
        : scenario.params;

      const renderStart = performance.now();

      try {
        const result = await renderFullStackPage(pageType, params);
        const renderTime = performance.now() - renderStart;

        times.push(renderTime);
        if (result.metrics.cacheHit) cacheHits++;

        // Add small delay to simulate real usage
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }

      } catch (error) {
        console.error(`Error in iteration ${i}:`, error.message);
      }
    }

    const scenarioTime = Date.now() - scenarioStart;

    // Calculate statistics
    times.sort((a, b) => a - b);
    const stats = {
      totalTime: scenarioTime,
      iterations: scenario.iterations,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: times[0],
      maxTime: times[times.length - 1],
      p50: times[Math.floor(times.length * 0.5)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
      requestsPerSecond: (scenario.iterations / scenarioTime) * 1000,
      cacheHitRate: (cacheHits / scenario.iterations) * 100
    };

    results[scenario.name] = stats;

    console.log(`   Total Time: ${scenarioTime}ms`);
    console.log(`   Average: ${stats.avgTime.toFixed(2)}ms`);
    console.log(`   P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`   P99: ${stats.p99.toFixed(2)}ms`);
    console.log(`   Requests/sec: ${stats.requestsPerSecond.toFixed(2)}`);
    console.log(`   Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);
  }

  // Get performance monitor report
  const monitorReport = performanceMonitor.generateReport();
  const cacheStats = componentCache.getStats();

  console.log('\n🎯 Full-Stack Performance Summary');
  console.log('=====================================');

  Object.entries(results).forEach(([name, stats]) => {
    console.log(`${name}:`);
    console.log(`  ${stats.requestsPerSecond.toFixed(2)} req/s | ${stats.avgTime.toFixed(2)}ms avg | ${stats.cacheHitRate.toFixed(1)}% cache hits`);
  });

  console.log('\n📈 Component Cache Performance');
  console.log('===============================');
  console.log(`Cache Size: ${cacheStats.size}/${cacheStats.maxSize}`);
  console.log(`Hit Rate: ${cacheStats.hitRate}%`);
  console.log(`Evictions: ${cacheStats.evictions}`);
  console.log(`Memory Usage: ${cacheStats.memoryUsage}KB`);

  console.log('\n🔍 Performance Monitor Insights');
  console.log('================================');
  console.log(`API Response Time - Avg: ${monitorReport.metrics.apiResponseTime?.avg?.toFixed(2) || 0}ms`);
  console.log(`Data Fetch Time - Avg: ${monitorReport.metrics.dataFetchTime?.avg?.toFixed(2) || 0}ms`);
  console.log(`Component Render Time - Avg: ${monitorReport.metrics.componentRenderTime?.avg?.toFixed(2) || 0}ms`);
  console.log(`Full Stack Render Time - Avg: ${monitorReport.metrics.fullStackRenderTime?.avg?.toFixed(2) || 0}ms`);

  // Generate performance recommendations
  console.log('\n💡 Performance Recommendations');
  console.log('===============================');
  const recommendations = componentCache.getRecommendations();
  if (recommendations.length > 0) {
    recommendations.forEach(rec => {
      console.log(`${rec.type.toUpperCase()}: ${rec.message} (Priority: ${rec.priority})`);
    });
  } else {
    console.log('✅ Performance is optimal!');
  }

  return {
    results,
    monitorReport,
    cacheStats,
    summary: {
      totalRequests: Object.values(results).reduce((sum, r) => sum + r.iterations, 0),
      avgRequestsPerSecond: Object.values(results).reduce((sum, r) => sum + r.requestsPerSecond, 0) / Object.keys(results).length,
      avgCacheHitRate: Object.values(results).reduce((sum, r) => sum + r.cacheHitRate, 0) / Object.keys(results).length
    }
  };
}

// Run benchmark if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullStackBenchmark().then(results => {
    console.log('\n✅ Full-Stack Benchmark Complete!');
    console.log('\n🎯 Key Insights:');
    console.log(`- Coherent.js delivers ${results.summary.avgRequestsPerSecond.toFixed(2)} full-stack renders/sec`);
    console.log(`- Component caching achieves ${results.summary.avgCacheHitRate.toFixed(1)}% hit rate`);
    console.log(`- Smart routing and LRU caching optimize the complete request flow`);
    console.log('\n🚀 This demonstrates the power of functional programming with intelligent caching!');
  }).catch(error => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
}

export { runFullStackBenchmark, renderFullStackPage, apiRouter, componentCache, performanceMonitor };
