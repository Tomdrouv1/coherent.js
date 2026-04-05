/**
 * Coherent.js — Header search with dynamic index.
 * Fetches search data from /api/search-index on first use.
 */
(function () {
  var searchIndex = null;
  var searchInput = document.getElementById('header-search');
  var resultsContainer = document.getElementById('header-search-results');
  if (!searchInput || !resultsContainer) return;

  searchInput.addEventListener('focus', function () {
    if (!searchIndex) loadIndex();
  });

  searchInput.addEventListener('input', function () {
    handleSearch(this.value);
  });

  document.addEventListener('click', function (e) {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.style.display = 'none';
    }
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      resultsContainer.style.display = 'none';
      searchInput.blur();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      var first = resultsContainer.querySelector('.search-result-item');
      if (first) first.focus();
    }
  });

  async function loadIndex() {
    try {
      var resp = await fetch('/api/search-index');
      if (resp.ok) searchIndex = await resp.json();
    } catch {
      searchIndex = [];
    }
  }

  function handleSearch(query) {
    if (!query || query.trim().length < 2) {
      resultsContainer.style.display = 'none';
      return;
    }
    if (!searchIndex) {
      loadIndex().then(function () { handleSearch(query); });
      return;
    }

    var q = query.trim().toLowerCase();
    var results = searchIndex.filter(function (item) {
      return item.title.toLowerCase().includes(q) ||
        (item.content && item.content.toLowerCase().includes(q));
    }).slice(0, 10);

    resultsContainer.textContent = '';

    if (results.length === 0) {
      var noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.textContent = 'No results for "' + query + '"';
      resultsContainer.appendChild(noResults);
      resultsContainer.style.display = 'block';
      return;
    }

    var pages = results.filter(function (r) { return r.type === 'page'; });
    var docs = results.filter(function (r) { return r.type === 'docs'; });

    function buildSection(title, items) {
      var section = document.createElement('div');
      section.className = 'search-section';
      var header = document.createElement('div');
      header.className = 'search-section-header';
      header.textContent = title;
      section.appendChild(header);

      items.forEach(function (r) {
        var link = document.createElement('a');
        link.href = r.url;
        link.className = 'search-result-item';

        var titleEl = document.createElement('div');
        titleEl.className = 'search-result-title';
        titleEl.textContent = r.title;
        link.appendChild(titleEl);

        if (r.content) {
          var contentEl = document.createElement('div');
          contentEl.className = 'search-result-content';
          contentEl.textContent = r.content.substring(0, 100);
          link.appendChild(contentEl);
        }

        link.addEventListener('click', function () {
          resultsContainer.style.display = 'none';
          searchInput.value = '';
        });

        section.appendChild(link);
      });

      return section;
    }

    if (pages.length) resultsContainer.appendChild(buildSection('Pages', pages));
    if (docs.length) resultsContainer.appendChild(buildSection('Documentation', docs));
    resultsContainer.style.display = 'block';
  }
})();

function handleHeaderSearch(value) {
  // Handled by the event listener above
}
