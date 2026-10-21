'use strict';
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const products = JSON.parse(document.querySelector('#catalog-data').textContent);
  const bySku = new Map(products.map(product => [product.sku, product]));
  document.querySelectorAll('[data-start-pet]').forEach(link => link.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('picker:start',{detail:link.dataset.startPet}));
  }));
  const sheet = document.querySelector('#filter-dialog');
  if (sheet) {
    const controls = document.querySelector('#advanced-filters');
    document.querySelector('[data-open-filters]').addEventListener('click', () => {
      document.querySelector('#filter-sheet-body').append(controls); sheet.showModal();
    });
    sheet.addEventListener('close', () => document.querySelector('#filters-home').after(controls));
    matchMedia('(min-width: 651px)').addEventListener('change', event => { if (event.matches && sheet.open) sheet.close(); });
  }
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  let motion;
  function startMotion() {
    if (motion) return;
    motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      if (!document.querySelector('.hero')) return;
      // The brand lettering is stable layout, never split or moved on scroll.
      const wave = document.querySelector('.chapter-wave');
      if(wave) gsap.fromTo(wave,{xPercent:-1},{xPercent:1,ease:'none',scrollTrigger:{trigger:'.seasonal-section',start:'top bottom',end:'bottom top',scrub:1}});
      if(document.querySelector('.care-steps li'))gsap.from('.care-steps li',{x:-18,stagger:.1,duration:.75,scrollTrigger:{trigger:'.care-steps',start:'top 90%',once:true}});
    });

  }
  startMotion();
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('pagehide', () => { motion?.revert(); motion = null; });
  addEventListener('pageshow', event => { if(event.persisted) startMotion(); });
})();
