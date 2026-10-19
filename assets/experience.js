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
  const formats = [
    { sku:'U301', title:'Таблетки', copy:'Выберите комплекс по виду и возрасту питомца. Дозировку и длительность применения уточните в инструкции выбранного продукта.' },
    { sku:'U305', title:'Паста', copy:'Для каждого продукта — свой способ применения. Ознакомьтесь с составом, возрастными ограничениями и инструкцией на странице пасты.' },
    { sku:'U314', title:'Капли', copy:'Используйте капли по инструкции конкретного продукта. Количество зависит от вида и веса питомца — универсальной дозировки нет.' }
  ];
  document.querySelectorAll('[data-how]').forEach(button => button.addEventListener('click', () => {
    const format = formats[Number(button.dataset.how)]; const product = bySku.get(format.sku); if (!product) return;
    document.querySelectorAll('[data-how]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const image = document.querySelector('#how-image'); image.src = product.images[0]; image.alt = product.fullName;
    document.querySelector('#how-name').textContent = format.title;
    document.querySelector('#how-copy').textContent = format.copy;
    document.querySelector('#how-pdf').href = product.pdf;
    if (window.gsap && !reduced.matches) gsap.fromTo(image, {y:12}, {y:0,duration:.4,overwrite:true});
  }));
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  let motion;
  function startMotion() {
    if (motion) return;
    motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      if (!document.querySelector('.hero')) return;
      const word = document.querySelector('.hero-wordmark');
      if (!word.querySelector('span')) {
        const letters = [...word.textContent].map(letter => { const span = document.createElement('span'); span.textContent = letter; span.style.display = 'inline-block'; return span; });
        word.replaceChildren(...letters);
      }
      const intro = gsap.timeline({defaults:{ease:'expo.out',duration:1.25}});
      intro.from('.hero-wordmark span', {y:28,rotation:2,stagger:.055}, 0)
        .from('.hero-dog', {y:40,rotation:-3}, .13)
        .from('.hero-action', {y:14}, .3);
      gsap.to(word,{scale:1.045,y:-18,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
      const wave = document.querySelector('.chapter-wave');
      if(wave) gsap.fromTo(wave,{xPercent:-1},{xPercent:1,ease:'none',scrollTrigger:{trigger:'.seasonal-section',start:'top bottom',end:'bottom top',scrub:1}});
      gsap.from('.care-steps li',{x:-18,stagger:.1,duration:.75,scrollTrigger:{trigger:'.care-steps',start:'top 90%',once:true}});
    });

  }
  startMotion();
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('pagehide', () => { motion?.revert(); motion = null; });
  addEventListener('pageshow', event => { if(event.persisted) startMotion(); });
})();
