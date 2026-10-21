'use strict';
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const data = document.querySelector('#catalog-data');
  if (!data) return;
  const products = JSON.parse(data.textContent);
  const bySku = new Map(products.map(product => [product.sku, product]));
  const animations = new WeakMap();
  function enter(element, distance = 8) {
    if (!element || reduced.matches) return;
    animations.get(element)?.cancel();
    animations.set(element, element.animate([{opacity:.55,transform:`translateY(${distance}px)`},{opacity:1,transform:'translateY(0)'}], {duration:250,easing:'cubic-bezier(.23,1,.32,1)'}));
  }
  async function readyImage(src) {
    if(!src)return;
    const image = new Image(); image.src = src;
    try { await image.decode(); } catch { /* Keep the supplied image URL and alt text available. */ }
  }

  let needRequest = 0;
  document.querySelectorAll('[data-need-tab]').forEach(button => button.addEventListener('click', async () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    const product = bySku.get(button.dataset.needSku); if (!product) return;
    const request = ++needRequest;
    document.querySelectorAll('[data-need-tab]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const detail = document.querySelector('#need-detail'); detail.setAttribute('aria-busy','true');
    await readyImage(product.images[0]); if (request !== needRequest) return;
    const image = document.querySelector('#need-product-image'); image.src = product.images[0]; image.alt = product.fullName;
    document.querySelector('#need-product-name').textContent = product.name;
    document.querySelector('#need-product-audience').textContent = `${product.audience} · ${product.package}`;
    document.querySelector('#need-product-purpose').textContent = product.purpose;
    document.querySelector('#need-product-link').href = product.url;
    const catalog = document.querySelector('#need-catalog-link');
    catalog.dataset.needLink = button.dataset.needTab; catalog.href = `/unitabs-design-preview/?need=${button.dataset.needTab}#products`; catalog.textContent = 'Все продукты по потребности';
    detail.removeAttribute('aria-busy'); enter(detail);
    if (matchMedia('(max-width:560px)').matches) detail.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
  }));

  const seasonData = document.querySelector('#season-data');
  if (seasonData) {
    const seasons = JSON.parse(seasonData.textContent);
    let seasonRequest = 0;
    document.querySelectorAll('[data-season]').forEach(button => button.addEventListener('click', async () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      const index = Number(button.dataset.season); const season = seasons[index]; if (!season) return;
      const request = ++seasonRequest;
      document.querySelectorAll('[data-season]').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
      const scene = document.querySelector('#season-scene'); scene.setAttribute('aria-busy','true');
      await Promise.all([readyImage(season.image), ...season.skus.map(sku => readyImage(bySku.get(sku).images[0]))]);
      if (request !== seasonRequest) return;
      scene.dataset.seasonKey = season.key;
      document.querySelector('#season-name').textContent = season.name;
      document.querySelector('#season-caption').textContent = season.caption;
      document.querySelector('#season-story').textContent = season.story;
      document.querySelectorAll('[data-season-photo]').forEach(image => { const active=Number(image.dataset.seasonPhoto)===index;image.classList.toggle('is-active',active);image.setAttribute('aria-hidden',String(!active)); });
      const template=document.querySelector('#season-product-template').content.firstElementChild;
      const links=season.skus.map((sku,i)=>{
        const product=bySku.get(sku);const link=template.cloneNode(true);link.dataset.seasonProduct=String(i);link.href=product.url;
        const image=link.querySelector('img');image.src=product.images[0];image.alt=product.fullName;
        link.querySelector('h4').textContent=product.name;link.querySelector('p').textContent=product.purpose;link.querySelector('span').textContent=product.audience;return link;
      });
      document.querySelector('.season-products').replaceChildren(...links);
      scene.removeAttribute('aria-busy'); enter(document.querySelector('.season-narrative'),12); enter(document.querySelector('.season-products'),6);
    }));
  }

  const marquee = document.querySelector('.store-marquee');
  if (marquee) {
    const toggle = document.querySelector('.marquee-toggle'); let paused = false; let visible = false;
    const update = () => marquee.classList.toggle('is-running',visible && !paused && !document.hidden && !reduced.matches);
    toggle.addEventListener('click',() => { paused = !paused; toggle.setAttribute('aria-pressed',String(paused)); toggle.textContent = paused ? 'Продолжить движение' : 'Приостановить ленту'; update(); });
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }); observer.observe(marquee);
    document.addEventListener('visibilitychange',update); reduced.addEventListener('change',update);
    marquee.addEventListener('pointerdown',event => { if (event.pointerType !== 'mouse') { paused = true; toggle.setAttribute('aria-pressed','true'); toggle.textContent = 'Продолжить движение'; update(); } });
    addEventListener('pagehide',() => { marquee.classList.remove('is-running'); });
    addEventListener('pageshow',update);
  }
})();
