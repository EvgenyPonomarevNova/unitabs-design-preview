'use strict';
(() => {
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'cubic-bezier(.23,1,.32,1)';
  // Content stays visible without JS. Animate only on first arrival, never hide a section.
  const selector = '.section h2, .need-tile, .journal-cover, .journal-topic-story, .pet-choices > label, .store-tile, .faq-list, .about-approved-body, .about-approved-art, .about-approved-facts li, .care-letter, .product-card';
  const observer = new IntersectionObserver(entries => {
    const entering = entries.filter(entry => entry.isIntersecting);
    entering.forEach((entry, index) => {
      observer.unobserve(entry.target);
      if (reduced.matches) return;
      const art = entry.target.classList.contains('about-approved-art');
      const animation = entry.target.animate([
        { opacity: 0, transform: art ? 'translateX(-24px)' : 'translateY(20px)' },
        { opacity: 1, transform: 'translate(0, 0)' }
      ], { duration: 560, delay: Math.min(index, 3) * 60, easing: ease });
      active.set(entry.target, animation);
      animation.onfinish = animation.oncancel = () => active.delete(entry.target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll(selector).forEach(element => {
    if (element.parentElement.closest(selector)) return;
    const box = element.getBoundingClientRect();
    if (box.top >= innerHeight - 20) observer.observe(element);
  });
  const finish = () => active.forEach(animation => animation.cancel());
  reduced.addEventListener('change', event => { if (event.matches) finish(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  addEventListener('pagehide', finish);
})();
