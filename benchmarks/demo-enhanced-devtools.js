/**
 * Enhanced Developer Experience Demo for Coherent.js
 *
 * Showcases the new developer tools that make working with
 * functional JavaScript components delightful and productive
 *
 * Features demonstrated:
 * - Component Tree Visualizer
 * - Performance Insights Dashboard
 * - Enhanced Error Context
 */

import { logComponentTree } from '../packages/devtools/src/component-visualizer.js';
import { createPerformanceDashboard, showPerformanceDashboard } from '../packages/devtools/src/performance-dashboard.js';
import { handleEnhancedError } from '../packages/devtools/src/enhanced-errors.js';
import { render } from '../packages/core/src/index.js';

// Sample functional components for demonstration
const UserCard = ({ user, onEdit, onDelete }) => ({
  div: {
    className: 'user-card',
    'data-user-id': user.id,
    children: [
      { img: {
        src: user.avatar,
        alt: user.name,
        className: 'avatar',
        onError: () => console.log('Image failed to load')
      }},
      { h3: { text: user.name }},
      { p: { text: user.email }},
      { div: {
        className: 'actions',
        children: [
          { button: {
            text: 'Edit',
            onclick: onEdit,
            className: 'btn-edit'
          }},
          { button: {
            text: 'Delete',
            onclick: onDelete,
            className: 'btn-delete'
          }}
        ]
      }}
    ]
  }
});

const BlogPost = ({ post, onLike, onComment }) => ({
  article: {
    className: 'blog-post',
    children: [
      { header: {
        children: [
          { h2: { text: post.title }},
          { div: {
            className: 'meta',
            children: [
              { span: { text: `By ${post.author}` }},
              { time: { datetime: post.date, text: new Date(post.date).toLocaleDateString() }}
            ]
          }}
        ]
      }},
      { div: {
        className: 'content',
        html: post.content
      }},
      { footer: {
        children: [
          { button: {
            text: `👍 ${post.likes}`,
            onclick: onLike,
            className: 'like-btn'
          }},
          { button: {
            text: '💬 Comment',
            onclick: onComment,
            className: 'comment-btn'
          }}
        ]
      }}
    ]
  }
});

const Dashboard = ({ users, posts, stats }) => ({
  html: {
    children: [
      { head: {
        children: [
          { title: { text: 'Coherent.js Developer Experience Demo' }},
          { meta: { charset: 'utf-8' }},
          { style: {
            text: `
              body { font-family: Arial, sans-serif; margin: 20px; }
              .user-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
              .avatar { width: 50px; height: 50px; border-radius: 50%; }
              .blog-post { border: 1px solid #ddd; padding: 20px; margin: 15px 0; border-radius: 8px; }
              .actions { margin-top: 10px; }
              .btn-edit, .btn-delete { margin-right: 10px; padding: 5px 10px; }
              .like-btn, .comment-btn { margin-right: 10px; padding: 8px 15px; }
            `
          }}
        ]
      }},
      { body: {
        children: [
          { header: {
            children: [
              { h1: { text: '🚀 Coherent.js Enhanced Developer Experience' }},
              { nav: {
                children: [
                  { a: { href: '#dashboard', text: 'Dashboard' }},
                  { a: { href: '#users', text: 'Users' }},
                  { a: { href: '#posts', text: 'Posts' }}
                ]
              }}
            ]
          }},
          { main: {
            children: [
              { section: {
                className: 'stats',
                children: [
                  { h2: { text: '📊 Statistics' }},
                  { div: {
                    className: 'stats-grid',
                    children: [
                      { div: {
                        className: 'stat-card',
                        children: [
                          { h3: { text: String(stats.totalUsers) }},
                          { p: { text: 'Total Users' }}
                        ]
                      }},
                      { div: {
                        className: 'stat-card',
                        children: [
                          { h3: { text: String(stats.totalPosts) }},
                          { p: { text: 'Total Posts' }}
                        ]
                      }},
                      { div: {
                        className: 'stat-card',
                        children: [
                          { h3: { text: String(stats.totalViews) }},
                          { p: { text: 'Total Views' }}
                        ]
                      }}
                    ]
                  }}
                ]
              }},
              { section: {
                className: 'users',
                children: [
                  { h2: { text: '👥 Featured Users' }},
                  { div: {
                    className: 'users-grid',
                    children: users.slice(0, 3).map(user => UserCard({
                      user,
                      onEdit: () => console.log(`Editing user ${user.id}`),
                      onDelete: () => console.log(`Deleting user ${user.id}`)
                    }))
                  }}
                ]
              }},
              { section: {
                className: 'posts',
                children: [
                  { h2: { text: '📝 Recent Posts' }},
                  { div: {
                    className: 'posts-grid',
                    children: posts.slice(0, 2).map(post => BlogPost({
                      post,
                      onLike: () => console.log(`Liking post ${post.id}`),
                      onComment: () => console.log(`Commenting on post ${post.id}`)
                    }))
                  }}
                ]
              }}
            ]
          }},
          { footer: {
            children: [
              { p: { text: `Built with Coherent.js - ${new Date().toISOString()}` }}
            ]
          }}
        ]
      }}
    ]
  }
});

// Demo data
const demoData = {
  users: [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', avatar: 'https://picsum.photos/seed/alice/100/100.jpg' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', avatar: 'https://picsum.photos/seed/bob/100/100.jpg' },
    { id: 3, name: 'Carol Davis', email: 'carol@example.com', avatar: 'https://picsum.photos/seed/carol/100/100.jpg' }
  ],
  posts: [
    {
      id: 1,
      title: 'Getting Started with Coherent.js',
      author: 'Alice Johnson',
      date: '2024-01-15',
      content: '<p>Coherent.js makes building full-stack applications with pure JavaScript objects a breeze...</p>',
      likes: 42
    },
    {
      id: 2,
      title: 'Performance Optimization Techniques',
      author: 'Bob Smith',
      date: '2024-01-12',
      content: '<p>Learn how to optimize your Coherent.js applications for maximum performance...</p>',
      likes: 38
    }
  ],
  stats: {
    totalUsers: 1234,
    totalPosts: 567,
    totalViews: 89012
  }
};

// Performance dashboard setup
const performanceDashboard = createPerformanceDashboard({
  updateInterval: 2000,
  colorOutput: true,
  enableAlerts: true,
  enableRecommendations: true
});

// Demo functions
function demonstrateComponentVisualization() {
  console.log('\n🌳 COMPONENT TREE VISUALIZATION DEMO');
  console.log('=====================================');

  console.log('\n📋 Visualizing UserCard component:');
  const userCardResult = logComponentTree(
    UserCard({
      user: demoData.users[0],
      onEdit: () => {},
      onDelete: () => {}
    }),
    'UserCard',
    { colorOutput: true, showProps: true, showMetadata: true }
  );

  console.log('\n📋 Visualizing Dashboard component:');
  const dashboardResult = logComponentTree(
    Dashboard({ users: demoData.users, posts: demoData.posts, stats: demoData.stats }),
    'Dashboard',
    { colorOutput: true, showProps: false, compactMode: true }
  );

  return { userCardResult, dashboardResult };
}

function demonstratePerformanceDashboard() {
  console.log('\n📊 PERFORMANCE DASHBOARD DEMO');
  console.log('===============================');

  // Simulate some performance data
  performanceDashboard.startMonitoring();

  // Simulate API requests
  setTimeout(() => {
    performanceDashboard.recordAPIRequest(12, 'static', true);
    performanceDashboard.recordAPIRequest(25, 'dynamic', false);
    performanceDashboard.recordAPIRequest(8, 'static', true);
  }, 100);

  // Simulate component renders
  setTimeout(() => {
    performanceDashboard.recordComponentRender(3, 'static', true, 1024);
    performanceDashboard.recordComponentRender(15, 'dynamic', false, 2048);
    performanceDashboard.recordComponentRender(2, 'static', true, 512);
  }, 200);

  // Simulate full-stack requests
  setTimeout(() => {
    performanceDashboard.recordFullStackRequest(45, null, ['data-fetch']);
    performanceDashboard.recordFullStackRequest(38, null, []);
    performanceDashboard.recordFullStackRequest(52, new Error('Simulated error'), ['component-render']);
  }, 300);

  // Show dashboard after data is recorded
  setTimeout(() => {
    showPerformanceDashboard(performanceDashboard);
  }, 500);

  return performanceDashboard;
}

function demonstrateEnhancedErrors() {
  console.log('\n❌ ENHANCED ERROR HANDLING DEMO');
  console.log('=================================');

  // Demo 1: Undefined property error
  try {
    const badComponent = ({ user }) => ({
      div: {
        children: [
          { h3: { text: user.name }},
          { p: { text: user.profile.bio }} // This might be undefined
        ]
      }
    });

    render(badComponent({ user: { name: 'Test' } })); // Missing profile
  } catch (error) {
    console.log('\n🔍 Example 1: Undefined Property Error');
    handleEnhancedError(error, null, { operation: 'render' });
  }

  // Demo 2: Component structure error
  try {
    const invalidComponent = () => ({
      div: { text: 'Valid' },
      span: { text: 'Invalid - multiple root elements' }
    });

    render(invalidComponent());
  } catch (error) {
    console.log('\n🔍 Example 2: Component Structure Error');
    handleEnhancedError(error, invalidComponent(), { operation: 'render' });
  }

  // Demo 3: Performance-related error
  try {
    // Simulate a performance error
    const performanceError = new Error('Component render time exceeded threshold of 100ms');
    performanceError.name = 'PerformanceError';

    const complexComponent = () => ({
      div: {
        children: Array.from({ length: 1000 }, (_, i) => ({
          span: { text: `Item ${i}` }
        }))
      }
    });

    handleEnhancedError(performanceError, complexComponent(), { operation: 'render', threshold: 100 });
  } catch (error) {
    console.log('\n🔍 Example 3: Performance Error');
    handleEnhancedError(error, null, { operation: 'performance' });
  }
}

function demonstrateDeveloperWorkflow() {
  console.log('\n🚀 COMPLETE DEVELOPER WORKFLOW DEMO');
  console.log('=====================================');

  // Step 1: Visualize component structure
  console.log('\n📝 Step 1: Analyzing component structure...');
  const componentAnalysis = logComponentTree(
    Dashboard({ users: demoData.users, posts: demoData.posts, stats: demoData.stats }),
    'Dashboard'
  );

  // Step 2: Render and measure performance
  console.log('\n⚡ Step 2: Measuring render performance...');
  const renderStart = performance.now();
  const html = render(Dashboard({ users: demoData.users, posts: demoData.posts, stats: demoData.stats }));
  const renderTime = performance.now() - renderStart;

  performanceDashboard.recordComponentRender(renderTime, 'dynamic', false, html.length);
  console.log(`✅ Rendered in ${renderTime.toFixed(2)}ms (${html.length} bytes)`);

  // Step 3: Show performance insights
  console.log('\n📊 Step 3: Performance insights...');
  showPerformanceDashboard(performanceDashboard);

  // Step 4: Error handling demonstration
  console.log('\n🛠️  Step 4: Error handling capabilities...');
  demonstrateEnhancedErrors();

  return {
    componentAnalysis,
    renderTime,
    htmlSize: html.length,
    performanceMetrics: performanceDashboard.exportMetrics()
  };
}

// Main demo function
async function runEnhancedDevToolsDemo() {
  console.log('🎯 Coherent.js Enhanced Developer Experience Demo');
  console.log('==================================================');
  console.log('Showcasing beautiful debugging tools for functional JavaScript components');

  try {
    // Start performance monitoring
    performanceDashboard.startMonitoring();

    // Run individual demos
    const componentResults = demonstrateComponentVisualization();

    await new Promise(resolve => setTimeout(resolve, 1000));

    const performanceResults = demonstratePerformanceDashboard();

    await new Promise(resolve => setTimeout(resolve, 2000));

    demonstrateEnhancedErrors();

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Complete workflow demo
    const workflowResults = demonstrateDeveloperWorkflow();

    // Summary
    console.log('\n🎉 ENHANCED DEVELOPER EXPERIENCE SUMMARY');
    console.log('=========================================');
    console.log('✅ Component Tree Visualization: Beautiful component structure analysis');
    console.log('✅ Performance Dashboard: Real-time metrics and intelligent insights');
    console.log('✅ Enhanced Error Context: Actionable debugging with suggestions');
    console.log('✅ Integrated Workflow: Seamless development experience');

    console.log('\n🚀 Key Benefits Demonstrated:');
    console.log('   • Visual debugging for functional JavaScript objects');
    console.log('   • Performance optimization recommendations');
    console.log('   • Context-aware error messages with fix suggestions');
    console.log('   • Real-time monitoring and alerting');
    console.log('   • Developer-friendly output with colors and icons');

    console.log('\n💡 This makes Coherent.js delightful to work with!');

    // Stop monitoring
    performanceDashboard.stopMonitoring();

    return {
      componentResults,
      performanceResults,
      workflowResults,
      success: true
    };

  } catch (error) {
    console.error('❌ Demo failed:', error);
    return { success: false, error };
  }
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnhancedDevToolsDemo().then(results => {
    if (results.success) {
      console.log('\n✅ Enhanced Developer Experience Demo Complete!');
    } else {
      console.log('\n❌ Demo encountered issues');
      process.exit(1);
    }
  });
}

export { runEnhancedDevToolsDemo };
export default runEnhancedDevToolsDemo;
