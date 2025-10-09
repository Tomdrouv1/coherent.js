// Header search functionality for Coherent.js documentation
// Searches through documentation content and displays results

// Documentation and API reference data
const documentationData = [
  { 
    title: 'Getting Started', 
    url: 'docs/getting-started',
    content: 'Quick start guide to get up and running with Coherent.js in minutes',
    type: 'docs'
  },
  {
    title: 'Installation',
    url: 'docs/getting-started/installation',
    content: 'Install Coherent.js via npm, yarn, or pnpm. Setup instructions for all environments',
    type: 'docs'
  },
  {
    title: 'Basic Components',
    url: 'docs/components/basic-components',
    content: 'Learn the object syntax and component fundamentals. Create your first components',
    type: 'docs'
  },
  {
    title: 'State Management', 
    url: 'docs/components/state-management',
    content: 'Reactive components with the withState HOC. Managing component state effectively',
    type: 'docs'
  },
  {
    title: 'Client-side Hydration',
    url: 'docs/client-side-hydration-guide', 
    content: 'Make your components interactive on the client. Hydration patterns and best practices',
    type: 'docs'
  },
  {
    title: 'Advanced Components',
    url: 'docs/components/advanced-components',
    content: 'HOCs, composition patterns, and complex architectures. Advanced component techniques',
    type: 'docs'
  },
  {
    title: 'Performance Optimizations',
    url: 'docs/performance-optimizations',
    content: 'Optimization strategies and caching techniques. Make your apps lightning fast',
    type: 'docs'
  },
  {
    title: 'Framework Integrations',
    url: 'docs/framework-integrations',
    content: 'Express, Fastify, Next.js, Koa, and more. Integrate with your favorite frameworks',
    type: 'docs'
  },
  {
    title: 'Database Integration', 
    url: 'docs/database-integration',
    content: 'Work with databases and query builders. Seamless database integration patterns',
    type: 'docs'
  },
  {
    title: 'Security Guide',
    url: 'docs/security-guide', 
    content: 'Security best practices and guidelines. Keep your applications secure',
    type: 'docs'
  },
  {
    title: 'Deployment Guide',
    url: 'docs/deployment-guide',
    content: 'Production deployment with Docker, Kubernetes, and more. Deploy with confidence',
    type: 'docs'
  },
  {
    title: 'Migration Guide',
    url: 'docs/migration-guide', 
    content: 'Coming from React, Vue, or another framework? Migration guide and comparison',
    type: 'docs'
  },
  // API Reference entries - @coherentjs/core
  {
    title: 'renderToString()',
    url: 'docs/api-reference#rendertostring',
    content: 'Main server-side rendering function. Converts component objects to HTML strings',
    type: 'api'
  },
  {
    title: 'renderHTML()',
    url: 'docs/api-reference#renderhtml',
    content: 'Alias for renderToString. Renders component objects to HTML',
    type: 'api'
  },
  {
    title: 'renderHTMLSync()',
    url: 'docs/api-reference#renderhtmlsync',
    content: 'Synchronous HTML rendering without promises or async operations',
    type: 'api'
  },
  {
    title: 'renderScopedComponent()',
    url: 'docs/api-reference#renderscopedcomponent',
    content: 'Render components with CSS scoping and encapsulation',
    type: 'api'
  },
  {
    title: 'withState()',
    url: 'docs/api-reference#withstate',
    content: 'Higher-order component for adding reactive state management',
    type: 'api'
  },
  {
    title: 'memo()',
    url: 'docs/api-reference#memo',
    content: 'Component memoization for performance optimization',
    type: 'api'
  },
  {
    title: 'validateComponent()',
    url: 'docs/api-reference#validatecomponent',
    content: 'Validate component objects structure and properties',
    type: 'api'
  },
  {
    title: 'isCoherentObject()',
    url: 'docs/api-reference#iscoherentobject',
    content: 'Check if an object is a valid Coherent.js component',
    type: 'api'
  },
  {
    title: 'escapeHtml()',
    url: 'docs/api-reference#escapehtml',
    content: 'HTML escaping utility for preventing XSS attacks',
    type: 'api'
  },
  {
    title: 'deepClone()',
    url: 'docs/api-reference#deepclone',
    content: 'Deep cloning utility for component objects',
    type: 'api'
  },
  
  // API Reference - @coherentjs/client
  {
    title: 'hydrate()',
    url: 'docs/api-reference#hydrate',
    content: 'Main hydration function for making SSR components interactive',
    type: 'api'
  },
  {
    title: 'hydrateAll()',
    url: 'docs/api-reference#hydrateall',
    content: 'Hydrate multiple elements with components simultaneously',
    type: 'api'
  },
  {
    title: 'autoHydrate()',
    url: 'docs/api-reference#autohydrate',
    content: 'Automatic hydration using component registry',
    type: 'api'
  },
  {
    title: 'makeHydratable()',
    url: 'docs/api-reference#makehydratable',
    content: 'Create hydratable components for client-side interactivity',
    type: 'api'
  },
  {
    title: 'registerEventHandler()',
    url: 'docs/api-reference#registereventhandler',
    content: 'Register client-side event handlers for components',
    type: 'api'
  },
  
  // API Reference - @coherentjs/api
  {
    title: 'createObjectRouter()',
    url: 'docs/api-reference#createobjectrouter',
    content: 'Create object-based API router with validation',
    type: 'api'
  },
  {
    title: 'validateAgainstSchema()',
    url: 'docs/api-reference#validateagainstschema',
    content: 'Schema-based validation for API requests',
    type: 'api'
  },
  {
    title: 'withValidation()',
    url: 'docs/api-reference#withvalidation',
    content: 'Validation middleware for API endpoints',
    type: 'api'
  },
  {
    title: 'withErrorHandling()',
    url: 'docs/api-reference#witherrorhandling',
    content: 'Error handling middleware for robust APIs',
    type: 'api'
  },
  {
    title: 'withAuth()',
    url: 'docs/api-reference#withauth',
    content: 'Authentication middleware for protected endpoints',
    type: 'api'
  },
  {
    title: 'hashPassword()',
    url: 'docs/api-reference#hashpassword',
    content: 'Secure password hashing utility',
    type: 'api'
  },
  {
    title: 'generateToken()',
    url: 'docs/api-reference#generatetoken',
    content: 'JWT token generation for authentication',
    type: 'api'
  },
  
  // API Reference - @coherentjs/database
  {
    title: 'setupDatabase()',
    url: 'docs/api-reference#setupdatabase',
    content: 'Quick database setup and configuration',
    type: 'api'
  },
  {
    title: 'createQuery()',
    url: 'docs/api-reference#createquery',
    content: 'Query builder factory for database operations',
    type: 'api'
  },
  {
    title: 'createModel()',
    url: 'docs/api-reference#createmodel',
    content: 'Model factory for database entities',
    type: 'api'
  },
  {
    title: 'withDatabase()',
    url: 'docs/api-reference#withdatabase',
    content: 'Database middleware for request handling',
    type: 'api'
  },
  {
    title: 'withTransaction()',
    url: 'docs/api-reference#withtransaction',
    content: 'Transaction middleware for atomic operations',
    type: 'api'
  },
  {
    title: 'PostgreSQLAdapter()',
    url: 'docs/api-reference#postgresqladapter',
    content: 'PostgreSQL database adapter with connection pooling',
    type: 'api'
  },
  {
    title: 'MySQLAdapter()',
    url: 'docs/api-reference#mysqladapter',
    content: 'MySQL database adapter with optimization',
    type: 'api'
  },
  {
    title: 'MongoDBAdapter()',
    url: 'docs/api-reference#mongodbadapter',
    content: 'MongoDB adapter for NoSQL database operations',
    type: 'api'
  },
  
  // API Reference - Framework Integrations
  {
    title: 'expressEngine()',
    url: 'docs/api-reference#expressengine',
    content: 'Express.js view engine for Coherent.js components',
    type: 'api'
  },
  {
    title: 'coherentFastify()',
    url: 'docs/api-reference#coherentfastify',
    content: 'Fastify plugin for Coherent.js integration',
    type: 'api'
  },
  {
    title: 'coherentKoaMiddleware()',
    url: 'docs/api-reference#coherentkoamiddleware',
    content: 'Koa.js middleware for component rendering',
    type: 'api'
  },
  {
    title: 'createCoherentNextHandler()',
    url: 'docs/api-reference#createcoherentnexthandler',
    content: 'Next.js pages router handler for Coherent.js',
    type: 'api'
  },
  {
    title: 'createCoherentServerComponent()',
    url: 'docs/api-reference#createcoherentservercomponent',
    content: 'Next.js server component factory',
    type: 'api'
  },
  
  // API Reference - Runtime & Performance
  {
    title: 'createCoherentApp()',
    url: 'docs/api-reference#createcoherentapp',
    content: 'Universal app factory for multi-environment deployment',
    type: 'api'
  },
  {
    title: 'detectRuntime()',
    url: 'docs/api-reference#detectruntime',
    content: 'Runtime detection utility for environment optimization',
    type: 'api'
  },
  {
    title: 'PerformanceProfiler',
    url: 'docs/api-reference#performanceprofiler',
    content: 'Performance monitoring and profiling utilities',
    type: 'api'
  },
  {
    title: 'createVitePlugin()',
    url: 'docs/api-reference#createviteplugin',
    content: 'Vite plugin for build-time optimization',
    type: 'api'
  },
  {
    title: 'createWebpackPlugin()',
    url: 'docs/api-reference#createwebpackplugin',
    content: 'Webpack plugin for component bundling',
    type: 'api'
  },
  
  // API Reference - Web Components & CLI
  {
    title: 'defineComponent()',
    url: 'docs/api-reference#definecomponent',
    content: 'Define custom web components using Coherent.js',
    type: 'api'
  },
  {
    title: 'createCLI()',
    url: 'docs/api-reference#createcli',
    content: 'CLI factory for project scaffolding and development',
    type: 'api'
  }
];

let searchTimeout;
let isSearchVisible = false;

// Initialize header search when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('header-search');
  const searchResults = document.getElementById('header-search-results');
  
  if (!searchInput || !searchResults) return;
  
  // Hide search results when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.search-container')) {
      hideSearchResults();
    }
  });
  
  // Prevent search from closing on input focus/blur
  if (searchInput) {
    searchInput.addEventListener('focus', function() {
      // Re-show results if there's content and they were hidden
      const currentValue = searchInput.value.trim();
      if (currentValue.length >= 2) {
        performSearch(currentValue);
      }
    });
  }
  
  // Handle escape key to close search
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && isSearchVisible) {
      hideSearchResults();
      searchInput.blur();
    }
  });
});

// Main search function called from input oninput
function handleHeaderSearch(query) {
  const searchResults = document.getElementById('header-search-results');
  if (!searchResults) return;
  
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Debounce search
  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 150);
}

function performSearch(query) {
  const searchResults = document.getElementById('header-search-results');
  if (!searchResults) return;
  
  // Clear results if query is too short
  if (!query || query.trim().length < 2) {
    hideSearchResults();
    return;
  }
  
  const trimmedQuery = query.trim().toLowerCase();
  
  // Search through documentation data
  const allResults = documentationData.filter(doc => {
    return doc.title.toLowerCase().includes(trimmedQuery) ||
           doc.content.toLowerCase().includes(trimmedQuery);
  });
  
  // Organize results by type
  const docsResults = allResults.filter(doc => doc.type === 'docs').slice(0, 6);
  const apiResults = allResults.filter(doc => doc.type === 'api').slice(0, 6);
  
  if (docsResults.length === 0 && apiResults.length === 0) {
    showNoResults(trimmedQuery);
    return;
  }
  
  displaySearchResults(docsResults, apiResults, trimmedQuery);
}

function displaySearchResults(docsResults, apiResults, query) {
  const searchResults = document.getElementById('header-search-results');
  if (!searchResults) return;
  
  let sectionsHTML = '';
  
  // Add Documentation section
  if (docsResults.length > 0) {
    const docsHTML = docsResults.map(result => {
      const highlightedTitle = highlightText(result.title, query);
      const highlightedContent = highlightText(result.content, query);
      
      return `
        <a href="${result.url}" class="search-result-item">
          <div class="search-result-title">${highlightedTitle}</div>
          <div class="search-result-content">${highlightedContent}</div>
        </a>
      `;
    }).join('');
    
    sectionsHTML += `
      <div class="search-section">
        <div class="search-section-header">📚 Documentation</div>
        ${docsHTML}
      </div>
    `;
  }
  
  // Add API Reference section
  if (apiResults.length > 0) {
    const apiHTML = apiResults.map(result => {
      const highlightedTitle = highlightText(result.title, query);
      const highlightedContent = highlightText(result.content, query);
      
      return `
        <a href="${result.url}" class="search-result-item">
          <div class="search-result-title">${highlightedTitle}</div>
          <div class="search-result-content">${highlightedContent}</div>
        </a>
      `;
    }).join('');
    
    sectionsHTML += `
      <div class="search-section">
        <div class="search-section-header">⚙️ API Reference</div>
        ${apiHTML}
      </div>
    `;
  }
  
  searchResults.innerHTML = sectionsHTML;
  showSearchResults();
}

function showNoResults(query) {
  const searchResults = document.getElementById('header-search-results');
  if (!searchResults) return;
  
  searchResults.innerHTML = `
    <div class="search-no-results">
      <div class="search-no-results-text">No results found for "${escapeHtml(query)}"</div>
      <div class="search-no-results-suggestion">Try a different search term or browse the <a href="docs">documentation index</a></div>
    </div>
  `;
  showSearchResults();
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return escapedText.replace(regex, '<mark>$1</mark>');
}

function showSearchResults() {
  const searchResults = document.getElementById('header-search-results');
  if (!searchResults) return;
  
  searchResults.style.display = 'block';
  isSearchVisible = true;
}

function hideSearchResults() {
  const searchResults = document.getElementById('header-search-results');
  if (!searchResults) return;
  
  searchResults.style.display = 'none';
  isSearchVisible = false;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle anchor scrolling for search results
function handleAnchorClick(event) {
  const link = event.target.closest('a');
  if (!link) return;
  
  const href = link.getAttribute('href');
  if (!href || !href.includes('#')) {
    // No anchor, just hide search results
    hideSearchResults();
    return;
  }
  
  // Extract anchor from URL
  const [url, anchor] = href.split('#');
  const currentPath = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
  const targetPath = url.startsWith('/') ? url.replace(/\/$/, '') : '/' + url.replace(/\/$/, '');
  
  if (currentPath === targetPath) {
    // Same page - let browser handle native anchor navigation
    hideSearchResults();
  } else {
    // Different page - store anchor for when new page loads
    hideSearchResults();
    sessionStorage.setItem('scrollToAnchor', anchor);
    // Let browser navigate naturally
  }
}

function scrollToAnchor(anchor) {
  if (!anchor) return;
  
  console.log('Scrolling to anchor:', anchor);
  
  // Function to attempt scrolling with retries
  function attemptScroll(attempt = 1) {
    // Primary selector - direct ID match (most common case)
    let targetElement = document.getElementById(anchor);
    
    if (!targetElement) {
      // Fallback selectors if direct ID doesn't work
      const selectors = [
        `[id="${anchor}"]`,
        `[name="${anchor}"]`,
        `h1[id="${anchor}"]`,
        `h2[id="${anchor}"]`,
        `h3[id="${anchor}"]`,
        `h4[id="${anchor}"]`,
        `h5[id="${anchor}"]`,
        `h6[id="${anchor}"]`
      ];
      
      for (const selector of selectors) {
        try {
          targetElement = document.querySelector(selector);
          if (targetElement) {
            console.log(`Found element with selector on attempt ${attempt}:`, selector);
            break;
          }
        } catch (e) {
          // Ignore invalid selector errors
          continue;
        }
      }
    } else {
      console.log(`Found element with direct ID on attempt ${attempt}`);
    }
    
    if (targetElement) {
      // Scroll to the element
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
      
      // Update URL without triggering navigation
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, `#${anchor}`);
      }
      
      // Add highlight effect
      targetElement.style.transition = 'background-color 0.3s ease';
      targetElement.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
      setTimeout(() => {
        if (targetElement.style) {
          targetElement.style.backgroundColor = '';
        }
      }, 2000);
      
      console.log('Successfully scrolled to anchor');
      return true; // Success
    } else {
      console.warn(`Could not find element for anchor on attempt ${attempt}:`, anchor);
      
      // Retry up to 3 times with increasing delays
      if (attempt < 3) {
        const delay = attempt * 200; // 200ms, 400ms
        setTimeout(() => attemptScroll(attempt + 1), delay);
      }
      return false;
    }
  }
  
  // Start the first attempt
  attemptScroll(1);
}

// Check for stored anchor on page load
function checkForStoredAnchor() {
  const storedAnchor = sessionStorage.getItem('scrollToAnchor');
  if (storedAnchor) {
    sessionStorage.removeItem('scrollToAnchor');
    // Wait a bit for page to fully load
    setTimeout(() => {
      scrollToAnchor(storedAnchor);
    }, 500);
  }
}

// Add click handler to search results
document.addEventListener('click', function(event) {
  if (event.target.closest('.header-search-results')) {
    handleAnchorClick(event);
  }
});

// Check for stored anchor when page loads
document.addEventListener('DOMContentLoaded', checkForStoredAnchor);
window.addEventListener('load', checkForStoredAnchor);

console.log('Header search functionality loaded');