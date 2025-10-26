// Theme initialization - load immediately from localStorage
try {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
} catch(e) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// Initialize theme toggle icon when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    themeToggle.innerHTML = currentTheme === 'dark' ? '🌙' : '☀️';
  }
});