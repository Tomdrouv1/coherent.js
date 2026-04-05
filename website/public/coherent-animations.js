/**
 * Coherent.js — Global scroll-reveal animation system.
 * Loaded once in the Layout, works on any page.
 *
 * Usage:
 *   - Add class="reveal" to any section to fade it in on scroll
 *   - Child elements with known card classes get staggered entrance
 */
(function () {
  var cardSelectors = [
    '.features-grid li',
    '.testing-card',
    '.metric-card',
    '.tip-card',
    '.demo-card',
    '.starter-feature-card',
    '.starter-doc-card',
    '.docs-card',
    '.links li',
    '.stat-item',
  ].join(',');

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');

        // Stagger child cards
        var cards = entry.target.querySelectorAll(cardSelectors);
        cards.forEach(function (card, i) {
          card.style.transitionDelay = i * 0.08 + 's';
          card.classList.add('card-revealed');
        });
      });
    },
    { threshold: 0.1 }
  );

  // Observe all .reveal elements (works on initial load and dynamically added)
  function observe() {
    document.querySelectorAll('.reveal:not(.revealed)').forEach(function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observe);
  } else {
    observe();
  }
})();
