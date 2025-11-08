// TOC Active State Management
(function() {
  'use strict';
  
  let currentActiveId = null;
  let manuallySelectedId = null;
  let manualSelectionTimeout = null;
  let isScrollingToTarget = false;
  let scrollTargetId = null;
  const tocLinks = new Map(); // Map of element ID to TOC link
  
  // Function to update active TOC item
  function updateTocActive(targetId, isManualClick = false) {
    console.log('updateTocActive called:', { targetId, isManualClick, manuallySelectedId, isScrollingToTarget });
    
    // If this is a manual click, set override and scrolling flag
    if (isManualClick) {
      console.log('Setting manual override for:', targetId);
      manuallySelectedId = targetId;
      isScrollingToTarget = true;
      scrollTargetId = targetId;
      
      // Clear any existing timeout
      if (manualSelectionTimeout) {
        clearTimeout(manualSelectionTimeout);
      }
      
      // Clear scrolling flag after scroll animation completes
      setTimeout(() => {
        console.log('Scroll animation should be complete');
        isScrollingToTarget = false;
      }, 1000); // Give time for smooth scroll to complete
    }
    
    // If we have a manual selection and this is not a manual click
    if (manuallySelectedId && !isManualClick) {
      // If we're scrolling to the target and we've reached it, keep the override but allow future scroll updates
      if (isScrollingToTarget && targetId === scrollTargetId) {
        console.log('Reached scroll target, keeping override but allowing future updates');
        isScrollingToTarget = false;
      }
      // If this is a different target and we're not scrolling to our manual target, clear override
      else if (!isScrollingToTarget && manuallySelectedId !== targetId) {
        console.log('User manually scrolled to different section, clearing override');
        manuallySelectedId = null;
        if (manualSelectionTimeout) {
          clearTimeout(manualSelectionTimeout);
          manualSelectionTimeout = null;
        }
      }
      // Otherwise ignore the update
      else if (manuallySelectedId !== targetId) {
        console.log('Ignoring scroll-based update due to manual override');
        return;
      }
    }
    
    // Remove previous active state
    if (currentActiveId) {
      const prevLink = tocLinks.get(currentActiveId);
      if (prevLink) {
        prevLink.classList.remove('toc-active');
      }
    }
    
    // Add active state to current item
    const currentLink = tocLinks.get(targetId);
    if (currentLink) {
      currentLink.classList.add('toc-active');
      currentActiveId = targetId;
    }
  }
  
  // Make function globally available for onclick handlers
  window.updateTocActive = updateTocActive;
  
  // Initialize when DOM is ready
  function initTocActiveStates() {
    // Find all TOC links and map them
    const tocContainer = document.querySelector('.toc-list');
    if (!tocContainer) return;
    
    const links = tocContainer.querySelectorAll('a[data-toc-target]');
    links.forEach(link => {
      const targetId = link.getAttribute('data-toc-target');
      if (targetId) {
        tocLinks.set(targetId, link);
      }
    });
    
    // Set up intersection observer for automatic highlighting
    const headings = Array.from(document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'))
      .filter(heading => tocLinks.has(heading.id));
    
    if (headings.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
      // Find the heading closest to the top of the viewport
      let closestHeading = null;
      let closestDistance = Infinity;
      
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.05) {
          const rect = entry.target.getBoundingClientRect();
          const distanceFromTop = Math.abs(rect.top);
          
          // Prefer headings that are closer to the top and have higher visibility
          const score = distanceFromTop - (entry.intersectionRatio * 50);
          
          if (score < closestDistance) {
            closestDistance = score;
            closestHeading = entry.target.id;
          }
        }
      });
      
      // The clearing logic is now handled in updateTocActive function
      
      if (closestHeading && closestHeading !== currentActiveId) {
        updateTocActive(closestHeading, false);
      }
    }, {
      root: null,
      rootMargin: '-5% 0px -70% 0px', // Less aggressive margins for better detection
      threshold: [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1] // Lower minimum threshold
    });
    
    // Observe all headings
    headings.forEach(heading => observer.observe(heading));
    
    // Handle initial state on page load (including anchor from URL)
    function handleInitialState() {
      const hash = window.location.hash.substring(1);
      if (hash && tocLinks.has(hash)) {
        updateTocActive(hash);
      } else if (headings.length > 0) {
        // Default to first heading if no anchor
        updateTocActive(headings[0].id);
      }
    }
    
    // Handle browser back/forward navigation
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.substring(1);
      if (hash && tocLinks.has(hash)) {
        updateTocActive(hash, true); // Treat hash changes as manual
      }
    });
    
    // Initialize after a short delay to ensure layout is complete
    setTimeout(handleInitialState, 100);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTocActiveStates);
  } else {
    initTocActiveStates();
  }
  
  // Re-initialize if page content changes (for SPA-like behavior)
  if (window.MutationObserver) {
    const contentObserver = new MutationObserver((mutations) => {
      let shouldReinit = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && 
            (mutation.target.classList?.contains('toc-list') || 
             mutation.target.querySelector?.('.toc-list'))) {
          shouldReinit = true;
        }
      });
      if (shouldReinit) {
        setTimeout(initTocActiveStates, 100);
      }
    });
    
    contentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();