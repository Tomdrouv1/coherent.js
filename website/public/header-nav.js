function initNavAnimation() {
  const nav = document.querySelector('.top-nav');
  const links = nav.querySelectorAll('a');
  const activeLink = nav.querySelector('a.active');
  
  if (!activeLink) return;
  
  const storedPosition = sessionStorage.getItem('nav-border-position');
  let previousPosition = storedPosition ? JSON.parse(storedPosition) : null;
  
  function getActivePosition() {
    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    
    return {
      left: linkRect.left - navRect.left,
      width: linkRect.width
    };
  }
  
  const style = document.createElement('style');
  style.textContent = `
    .top-nav::after {
      left: var(--border-left, 0px) !important;
      width: var(--border-width, 0px) !important;
      transition: none !important;
      opacity: 1 !important;
    }
    .top-nav.animate::after {
      transition: all 0.3s ease !important;
    }
  `;
  document.head.appendChild(style);
  
  const currentPosition = getActivePosition();
  
  const shouldAnimate = previousPosition && 
    (Math.abs(previousPosition.left - currentPosition.left) > 1 || 
     Math.abs(previousPosition.width - currentPosition.width) > 1);
  
  if (shouldAnimate) {
    nav.classList.remove('animate');
    nav.style.setProperty('--border-left', previousPosition.left + 'px');
    nav.style.setProperty('--border-width', previousPosition.width + 'px');
    nav.classList.add('has-active');
    
    nav.offsetHeight;
    
    nav.classList.add('animate');
    nav.style.setProperty('--border-left', currentPosition.left + 'px');
    nav.style.setProperty('--border-width', currentPosition.width + 'px');
  } else {
    nav.style.setProperty('--border-left', currentPosition.left + 'px');
    nav.style.setProperty('--border-width', currentPosition.width + 'px');
    nav.classList.add('has-active');
  }
  
  sessionStorage.setItem('nav-border-position', JSON.stringify(currentPosition));
  
  links.forEach(link => {
    link.addEventListener('click', () => {
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      
      const targetPosition = {
        left: linkRect.left - navRect.left,
        width: linkRect.width
      };
      
      sessionStorage.setItem('nav-border-position', JSON.stringify(targetPosition));
    });
  });
  
  window.addEventListener('resize', () => {
    const newPosition = getActivePosition();
    nav.classList.remove('animate');
    nav.style.setProperty('--border-left', newPosition.left + 'px');
    nav.style.setProperty('--border-width', newPosition.width + 'px');
    sessionStorage.setItem('nav-border-position', JSON.stringify(newPosition));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavAnimation);
} else {
  initNavAnimation();
}