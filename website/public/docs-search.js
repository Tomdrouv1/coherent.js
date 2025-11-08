// docs-search.js - Documentation search functionality
(function() {
  'use strict';
  
  // Search index cache
  let searchIndex = null;
  let searchData = [];
  
  // Initialize search when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSearch);
  } else {
    initializeSearch();
  }
  
  function initializeSearch() {
    console.log('Initializing documentation search...');
    
    // Try to load search data from various sources
    loadSearchData();
    
    // Initialize search inputs
    const searchInputs = document.querySelectorAll('[data-search], #docs-search, #hero-docs-search');
    searchInputs.forEach(input => {
      if (input.dataset.search) {
        try {
          const data = JSON.parse(input.dataset.search);
          if (Array.isArray(data) && data.length > 0) {
            searchData = data;
            buildSearchIndex();
          }
        } catch (e) {
          console.warn('Failed to parse search data:', e);
        }
      }
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Set up search input listeners
    setupSearchInputs();
  }
  
  function loadSearchData() {
    // Try to load from window.searchData if available
    if (window.searchData && Array.isArray(window.searchData)) {
      searchData = window.searchData;
      buildSearchIndex();
      return;
    }
    
    // Try to load from external file
    fetch('./search-data.json')
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) {
          searchData = data;
          buildSearchIndex();
          console.log('Loaded search data from external file:', data.length, 'documents');
        }
      })
      .catch(error => {
        console.log('External search data not found, using embedded data');
        createFallbackSearchData();
      });
  }
  
  function createFallbackSearchData() {
    // Create basic search data from page links if no external data is available
    searchData = [];
    
    // Gather from sidebar links
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    sidebarLinks.forEach(link => {
      if (link.href && link.textContent) {
        const url = new URL(link.href);
        searchData.push({
          title: link.textContent.trim(),
          url: link.getAttribute('href') || url.pathname,
          content: '',
          section: 'Documentation'
        });
      }
    });
    
    // Gather from docs cards if on main docs page
    const docsCards = document.querySelectorAll('.docs-card');
    docsCards.forEach(card => {
      const title = card.querySelector('h3');
      const description = card.querySelector('p');
      const href = card.getAttribute('href');
      
      if (title && href) {
        searchData.push({
          title: title.textContent.trim(),
          url: href,
          content: description ? description.textContent.trim() : '',
          section: 'Documentation'
        });
      }
    });
    
    // Add some default entries for key documentation
    const defaultDocs = [
      {
        title: 'Getting Started',
        url: 'docs/getting-started',
        content: 'Quick start guide to get up and running with Coherent.js in 5 minutes',
        section: 'Getting Started'
      },
      {
        title: 'Basic Components',
        url: 'docs/components/basic-components',
        content: 'Learn the object syntax and fundamentals of building components',
        section: 'Components'
      },
      {
        title: 'State Management',
        url: 'docs/components/state-management',
        content: 'Reactive components with the withState higher-order component',
        section: 'Components'
      },
      {
        title: 'Hydration Guide',
        url: 'docs/client-side-hydration-guide',
        content: 'Make your components interactive on the client side',
        section: 'Client-Side'
      },
      {
        title: 'Framework Integrations',
        url: 'docs/framework-integrations',
        content: 'Express, Fastify, Next.js, Koa and other framework integrations',
        section: 'Integrations'
      },
      {
        title: 'API Reference',
        url: 'docs/api-reference',
        content: 'Complete function documentation and API signatures',
        section: 'Reference'
      },
      {
        title: 'Performance Optimizations',
        url: 'docs/performance-optimizations',
        content: 'Caching strategies and performance optimization techniques',
        section: 'Performance'
      },
      {
        title: 'Deployment Guide',
        url: 'docs/deployment-guide',
        content: 'Production deployment with Docker, Kubernetes, and cloud platforms',
        section: 'Deployment'
      }
    ];
    
    // Merge with existing data, avoiding duplicates
    defaultDocs.forEach(doc => {
      const exists = searchData.some(item => item.url === doc.url);
      if (!exists) {
        searchData.push(doc);
      }
    });
    
    buildSearchIndex();
    console.log('Created fallback search data:', searchData.length, 'documents');
  }
  
  function buildSearchIndex() {
    searchIndex = searchData.map((doc, index) => ({
      index,
      title: doc.title.toLowerCase(),
      content: (doc.content || '').toLowerCase(),
      section: (doc.section || '').toLowerCase(),
      keywords: generateKeywords(doc)
    }));
    console.log('Built search index with', searchIndex.length, 'entries');
  }
  
  function generateKeywords(doc) {
    const text = `${doc.title} ${doc.content} ${doc.section}`.toLowerCase();
    const words = text.match(/\b\w+\b/g) || [];
    return [...new Set(words)].join(' ');
  }
  
  function setupSearchInputs() {
    // Set up global search function
    window.searchDocs = function(query, resultsId = 'search-results') {
      performSearch(query, resultsId);
    };
    
    // Set up header search input
    const headerSearch = document.querySelector('.search');
    if (headerSearch) {
      headerSearch.addEventListener('input', (e) => {
        performSearch(e.target.value, 'header-search-results');
      });
      
      // Create results container for header search if it doesn't exist
      if (!document.getElementById('header-search-results')) {
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'header-search-results';
        resultsContainer.className = 'search-results search-results-header';
        resultsContainer.style.display = 'none';
        headerSearch.parentNode.appendChild(resultsContainer);
      }
    }
  }
  
  function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('#docs-search, #hero-docs-search, .search');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
    
    // Escape to close search results
    if (e.key === 'Escape') {
      hideAllSearchResults();
    }
  }
  
  function performSearch(query, resultsId) {
    const resultsContainer = document.getElementById(resultsId);
    if (!resultsContainer) {
      console.warn('Search results container not found:', resultsId);
      return;
    }
    
    if (!query || query.length < 2) {
      hideSearchResults(resultsContainer);
      return;
    }
    
    if (!searchIndex || searchIndex.length === 0) {
      showSearchMessage(resultsContainer, 'Search index not available');
      return;
    }
    
    const results = searchDocuments(query);
    displaySearchResults(results, resultsContainer, query);
  }
  
  function searchDocuments(query) {
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
    
    const results = [];
    
    searchIndex.forEach(indexEntry => {
      let score = 0;
      const doc = searchData[indexEntry.index];
      
      // Exact title match gets highest score
      if (indexEntry.title.includes(queryLower)) {
        score += 100;
        if (indexEntry.title === queryLower) {
          score += 50; // Exact match bonus
        }
      }
      
      // Content match
      if (indexEntry.content.includes(queryLower)) {
        score += 50;
      }
      
      // Section match
      if (indexEntry.section.includes(queryLower)) {
        score += 30;
      }
      
      // Individual word matches
      queryWords.forEach(word => {
        if (indexEntry.title.includes(word)) score += 20;
        if (indexEntry.content.includes(word)) score += 10;
        if (indexEntry.keywords.includes(word)) score += 5;
      });
      
      // Boost score for popular/important docs
      if (doc.section === 'Getting Started') score += 10;
      if (doc.title.toLowerCase().includes('component')) score += 5;
      if (doc.title.toLowerCase().includes('api')) score += 5;
      
      if (score > 0) {
        results.push({ doc, score });
      }
    });
    
    // Sort by score (descending) and limit to top 8 results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(result => result.doc);
  }
  
  function displaySearchResults(results, container, query) {
    if (results.length === 0) {
      showSearchMessage(container, `No results found for "${query}"`);
      return;
    }
    
    const resultItems = results.map(doc => {
      const title = highlightMatch(doc.title, query);
      const content = highlightMatch(doc.content || '', query);
      const url = doc.url.startsWith('/') ? doc.url : `/${doc.url}`;
      
      return `
        <div class="search-result-item">
          <a href="${escapeHtml(url)}" class="search-result-link">
            <div class="search-result-title">${title}</div>
            ${doc.section ? `<div class="search-result-section">${escapeHtml(doc.section)}</div>` : ''}
            ${content ? `<div class="search-result-content">${content}</div>` : ''}
          </a>
        </div>
      `;
    });
    
    container.innerHTML = `
      <div class="search-results-header">
        <span class="search-results-count">${results.length} result${results.length !== 1 ? 's' : ''}</span>
        <button class="search-results-close" onclick="hideSearchResults(this.closest('.search-results'))">×</button>
      </div>
      <div class="search-results-list">
        ${resultItems.join('')}
      </div>
    `;
    
    showSearchResults(container);
  }
  
  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text);
    
    const escaped = escapeHtml(text);
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    let highlighted = escaped;
    queryWords.forEach(word => {
      const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  }
  
  function showSearchResults(container) {
    container.style.display = 'block';
    container.classList.add('search-results-visible');
  }
  
  function hideSearchResults(container) {
    container.style.display = 'none';
    container.classList.remove('search-results-visible');
  }
  
  function hideAllSearchResults() {
    const allResults = document.querySelectorAll('.search-results');
    allResults.forEach(hideSearchResults);
  }
  
  function showSearchMessage(container, message) {
    container.innerHTML = `
      <div class="search-results-header">
        <span class="search-results-message">${escapeHtml(message)}</span>
        <button class="search-results-close" onclick="hideSearchResults(this.closest('.search-results'))">×</button>
      </div>
    `;
    showSearchResults(container);
  }
  
  // Global helper functions
  window.hideSearchResults = hideSearchResults;
  
  // Utility functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    const searchContainers = document.querySelectorAll('.docs-search-container, .docs-search-hero');
    let isInsideSearch = false;
    
    searchContainers.forEach(container => {
      if (container.contains(e.target)) {
        isInsideSearch = true;
      }
    });
    
    if (!isInsideSearch) {
      hideAllSearchResults();
    }
  });
  
})();