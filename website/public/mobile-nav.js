/**
 * Mobile navigation functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  const menuButton = document.getElementById('menu-button');
  const overlay = document.getElementById('mobile-nav-overlay');
  
  if (menuButton) {
    menuButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.toggle('menu-open');
    });
  }
  
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.remove('menu-open');
    });
  }
  
  // Close mobile menu when clicking on navigation links
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-menu a');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', function() {
      document.body.classList.remove('menu-open');
    });
  });
  
  // Close mobile menu on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
      document.body.classList.remove('menu-open');
    }
  });
});