'use strict';
(() => {
  const products = JSON.parse(document.querySelector('#catalog-data').textContent);
  const bySku = new Map(products.map(product => [product.sku, product]));
  const menu = document.querySelector('#main-nav');
  const menuButton = document.querySelector('.menu-button');
  function closeMenu() { menu.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Открыть меню'); }
  menuButton.addEventListener('click', () => { const open = menu.classList.toggle('is-open'); menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню'); });
  menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); menuButton.focus(); } });

  const buyDialog = document.querySelector('#buy-dialog');
  const quickDialog = document.querySelector('#quick-dialog');
  function externalLink(url, text) {
    try { if (!['https:','http:'].includes(new URL(url).protocol)) return null; } catch { return null; }
    const link = document.createElement('a'); link.href = url; link.textContent = text; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
  }
  function openBuy(sku) {
    const product = bySku.get(sku); if (!product) return;
    if (quickDialog.open) quickDialog.close();
    document.querySelector('#buy-product-label').textContent = `${product.name}, ${product.package} — ${sku}`;
    const links = document.querySelector('#buy-links'); links.replaceChildren();
    for (const [store, url] of Object.entries(product.purchase)) { const link = externalLink(url, store); if (link) links.append(link); }
    const additional=document.createElement('details');additional.className='more-stores';const summary=document.createElement('summary');summary.textContent='Показать ещё магазины';additional.append(summary);const extra=document.createElement('div');extra.className='more-store-links';
    const stores=JSON.parse(document.querySelector('#store-data').textContent);for(const store of stores){if(Object.keys(product.purchase).includes(store.name))continue;const item=externalLink(store.url,store.name);if(item)extra.append(item);}additional.append(extra);links.append(additional);
    const allStores = document.createElement('a'); allStores.href = '/unitabs-design-preview/#where-to-buy'; allStores.textContent = 'Другие магазины'; allStores.addEventListener('click', () => buyDialog.close()); links.append(allStores);
    buyDialog.dataset.sku=sku;buyDialog.showModal();
  }
  document.addEventListener('click', event => {
    const buy = event.target.closest('[data-buy]'); if (buy) { event.preventDefault(); openBuy(buy.dataset.buy); }
    const quick = event.target.closest('[data-quick]');
    if (quick) { const product = bySku.get(quick.dataset.quick); if (!product) return; document.querySelector('#quick-title').textContent = product.name; document.querySelector('#quick-meta').textContent = `${product.audience} · ${product.age} · ${product.form}, ${product.package} — ${product.sku}`; document.querySelector('#quick-description').textContent = product.purpose; const image = document.querySelector('#quick-image'); image.src = product.images[0]; image.alt = product.fullName; document.querySelector('#quick-link').href = product.url; const buy = document.querySelector('#quick-buy'); buy.href = product.url + '#buy'; buy.dataset.buy = product.sku; quickDialog.showModal(); }
    if (event.target.closest('[data-close]')) event.target.closest('dialog').close();
  });
  for (const dialog of [buyDialog, quickDialog]) dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

  function selectProduct(card, product) {
    if (!product) return;
    card.dataset.sku=product.sku; card.style.setProperty('--product-color',product.color);
    card.querySelectorAll('[data-product-link]').forEach(link=>link.href=product.url);
    const image=card.querySelector('[data-product-image]');image.src=product.images[0];
    card.querySelector('[data-product-sku]').textContent=product.sku;
    card.querySelector('[data-product-package]').textContent=product.package;
    card.querySelector('[data-product-age]').textContent=product.audience+(['','—'].includes(product.age)?'':' · '+product.age);
    card.querySelector('[data-product-purpose]').textContent=product.purpose;
    const buy=card.querySelector('[data-buy]');buy.dataset.buy=product.sku;buy.href=product.url+'#buy';buy.setAttribute('aria-label','Где купить '+product.name+', '+product.package);
    const select=card.querySelector('[data-pack-select]');if(select)select.value=product.sku;
  }
  document.querySelectorAll('[data-pack-select]').forEach(select=>select.addEventListener('change',()=>selectProduct(select.closest('[data-card]'),bySku.get(select.value))));
  const filterForm = document.querySelector('#catalog-filters');
  if (filterForm) {
    const cards=[...document.querySelectorAll('#product-grid [data-card]')];
    const more=document.querySelector('#show-more');const count=document.querySelector('#catalog-count');
    const filterNames=['animal','form','q','need','age','stage','pack'];let limit=8;
    function value(name){return new FormData(filterForm).get(name)||'';}
    function matching(product,values){
      const query=String(values.get('q')||'').trim().toLocaleLowerCase('ru');
      return (!values.get('animal')||product.animals.includes(values.get('animal')))&&(!values.get('need')||product.needKeys.includes(values.get('need')))&&(!values.get('form')||product.form===values.get('form'))&&(!values.get('age')||product.age===values.get('age'))&&(!values.get('stage')||product.stages.includes(values.get('stage')))&&(!values.get('pack')||product.package===values.get('pack'))&&(!query||[product.name,product.sku,product.purpose,product.audience].join(' ').toLocaleLowerCase('ru').includes(query));
    }
    function updateCatalog(sync=false){
      const values=new FormData(filterForm);const matches=[];
      for(const card of cards){
        const variants=JSON.parse(card.dataset.variants).map(sku=>bySku.get(sku)).filter(Boolean);
        const available=variants.filter(product=>matching(product,values));
        const select=card.querySelector('[data-pack-select]');
        if(select)for(const option of select.options)option.disabled=!available.some(product=>product.sku===option.value);
        if(available.length){selectProduct(card,available.find(p=>p.sku===card.dataset.sku)||available[0]);matches.push(card);}
      }
      const visible=new Set(matches.slice(0,limit));cards.forEach(card=>{card.classList.remove('server-filtered');card.hidden=!visible.has(card);});
      count.textContent='Найдено комплексов: '+matches.length;
      document.querySelector('.filter-apply').textContent='Показать: '+matches.length;
      const labels=[];if(values.get('animal'))labels.push(filterForm.querySelector('[name=animal]:checked').nextElementSibling.textContent);
      if(values.get('need'))labels.push(filterForm.querySelector('[name=need]:checked').nextElementSibling.textContent);
      for(const name of ['form','age','stage','pack'])if(values.get(name))labels.push(filterForm.elements[name].selectedOptions[0].textContent);
      if(values.get('q'))labels.push('Поиск: '+values.get('q'));
      const summary=document.querySelector('#filter-summary');summary.textContent=labels.join(' / ');document.querySelector('.catalog-filter-status').hidden=!labels.length;
      more.hidden=matches.length<=limit;more.textContent='Показать ещё '+Math.min(8,Math.max(0,matches.length-limit));
      document.querySelector('.catalog-visible-count').textContent='Показано '+Math.min(limit,matches.length)+' из '+matches.length+' комплексов';
      document.querySelector('#catalog-empty').hidden=matches.length!==0;
      if(sync){const url=new URL(location.href);for(const name of filterNames){const val=String(values.get(name)||'').trim();if(val)url.searchParams.set(name,val);else url.searchParams.delete(name);}history.replaceState(null,'',url);}
    }
    const params=new URLSearchParams(location.search);
    function set(name,val){const control=filterForm.elements[name];if(['animal','need'].includes(name)){const radio=[...filterForm.querySelectorAll('[name="'+name+'"]')].find(input=>input.value===val);if(radio)radio.checked=true;}else if(control)control.value=val;}
    for(const name of filterNames)if(params.has(name))set(name,params.get(name));
    filterForm.addEventListener('submit',event=>{event.preventDefault();limit=8;updateCatalog(true);});
    const changed=()=>{limit=8;updateCatalog(true);};
    filterForm.addEventListener('input',changed);document.querySelector('#advanced-filters').addEventListener('input',changed);
    filterForm.addEventListener('reset',()=>queueMicrotask(()=>{for(const name of filterNames)set(name,'');limit=8;updateCatalog(true);}));
    more.addEventListener('click',()=>{limit+=8;updateCatalog();});
    document.querySelectorAll('[data-reset-catalog],[data-show-all-catalog]').forEach(button=>button.addEventListener('click',()=>filterForm.reset()));
    document.addEventListener('catalog:animal',event=>{filterForm.reset();queueMicrotask(()=>{set('animal',event.detail);updateCatalog(true);});});
    document.addEventListener('catalog:need',event=>{set('need',event.detail);changed();});
    document.querySelectorAll('[data-need-link],[data-format-link]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();filterForm.reset();queueMicrotask(()=>{set(link.dataset.needLink?'need':'form',link.dataset.needLink||link.dataset.formatLink);updateCatalog(true);document.querySelector('#products').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});});}));
    updateCatalog();
  }

  const care = document.querySelector('#care-form');
  if (care) {
    care.addEventListener('submit', event => { event.preventDefault(); if (!care.reportValidity()) return; care.querySelector('[role=status]').textContent = 'Форма заполнена. Это демонстрация: вопрос не отправлен, данные нигде не сохранены.'; });
    document.querySelector('#contact-type').addEventListener('change', event => { const tel = event.target.value === 'tel'; care.elements.contact.type = tel ? 'tel' : 'email'; care.elements.contact.autocomplete = tel ? 'tel' : 'email'; care.elements.contact.minLength = tel ? 7 : 0; care.elements.contact.maxLength = tel ? 25 : 160; document.querySelector('#contact-label>span').textContent = tel ? 'Телефон' : 'Email'; care.querySelector('[role=status]').textContent = ''; });
  }
  document.querySelectorAll('[data-gallery]').forEach(button => button.addEventListener('click', () => { document.querySelector('#product-main-image').src = button.dataset.gallery; document.querySelectorAll('[data-gallery]').forEach(option => option.setAttribute('aria-pressed', String(option === button))); }));
  const mobileBar = document.querySelector('.mobile-bar');
  const hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) { const observer = new IntersectionObserver(entries => mobileBar.classList.toggle('is-visible', !entries[0].isIntersecting), { threshold:0 }); observer.observe(hero); }
  else mobileBar.classList.add('is-visible');
})();
