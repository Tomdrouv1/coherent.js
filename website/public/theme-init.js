// Theme initialization - load immediately from localStorage
try {
  var savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
} catch(e) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// Initialize theme toggle icon when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    var currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    themeToggle.innerHTML = currentTheme === 'dark' ? '🌙' : '☀️';
  }
});