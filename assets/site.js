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
    try { if (new URL(url).protocol !== 'https:') return null; } catch { return null; }
    const link = document.createElement('a'); link.href = url; link.textContent = text; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
  }
  function openBuy(sku) {
    const product = bySku.get(sku); if (!product) return;
    if (quickDialog.open) quickDialog.close();
    document.querySelector('#buy-product-label').textContent = `${product.name}, ${product.package} — ${sku}`;
    const links = document.querySelector('#buy-links'); links.replaceChildren();
    for (const [store, url] of Object.entries(product.purchase)) { const link = externalLink(url, store); if (link) links.append(link); }
    const allStores = document.createElement('a'); allStores.href = '/unitabs-design-preview/#where-to-buy'; allStores.textContent = 'Другие магазины'; allStores.addEventListener('click', () => buyDialog.close()); links.append(allStores);
    buyDialog.showModal();
  }
  document.addEventListener('click', event => {
    const buy = event.target.closest('[data-buy]'); if (buy) { event.preventDefault(); openBuy(buy.dataset.buy); }
    const quick = event.target.closest('[data-quick]');
    if (quick) { const product = bySku.get(quick.dataset.quick); if (!product) return; document.querySelector('#quick-title').textContent = product.name; document.querySelector('#quick-meta').textContent = `${product.form}, ${product.package} — ${product.sku}`; document.querySelector('#quick-description').textContent = product.purpose; const image = document.querySelector('#quick-image'); image.src = product.images[0]; image.alt = product.fullName; document.querySelector('#quick-link').href = product.url; const buy = document.querySelector('#quick-buy'); buy.href = product.url + '#buy'; buy.dataset.buy = product.sku; quickDialog.showModal(); }
    if (event.target.closest('[data-close]')) event.target.closest('dialog').close();
  });
  for (const dialog of [buyDialog, quickDialog]) dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

  const filterForm = document.querySelector('#catalog-filters');
  if (filterForm) {
    const cards = [...document.querySelectorAll('#product-grid [data-card]')];
    const more = document.querySelector('#show-more');
    const count = document.querySelector('#catalog-count');
    let limit = 8;
    const params = new URLSearchParams(location.search);
    for (const name of ['animal', 'form', 'q', 'need']) {
      const value = params.get(name); if (value === null) continue;
      if (name === 'animal') { const option = [...filterForm.querySelectorAll('[name=animal]')].find(input => input.value === value); if (option) option.checked = true; }
      else if (name === 'form' || name === 'need') { if ([...filterForm.elements[name].options].some(option => option.value === value)) filterForm.elements[name].value = value; }
      else filterForm.elements.q.value = value;
    }
    function updateCatalog(sync = false) {
      const values = new FormData(filterForm); const animal = values.get('animal') || ''; const form = values.get('form') || ''; const need = values.get('need') || ''; const query = String(values.get('q') || '').trim().toLocaleLowerCase('ru');
      const matching = cards.filter(card => (!animal || card.dataset.animals.split(' ').includes(animal)) && (!need || card.dataset.needs.split(' ').includes(need)) && (!form || card.dataset.form === form) && (!query || card.dataset.search.includes(query)));
      const visible = new Set(matching.slice(0, limit)); cards.forEach(card => { card.hidden = !visible.has(card); });
      count.textContent = `Найдено: ${matching.length}`; document.querySelector('.filter-apply').textContent = `Показать: ${matching.length}`; const summary = document.querySelector('#filter-summary'); summary.textContent = [form, need ? filterForm.elements.need.selectedOptions[0].textContent : ''].filter(Boolean).join(' / '); summary.hidden = !summary.textContent; more.hidden = matching.length <= limit; document.querySelector('#catalog-empty').hidden = matching.length !== 0;
      if (sync) { const url = new URL(location.href); for (const name of ['animal','form','q','need']) { const value = String(values.get(name) || '').trim(); if (value) url.searchParams.set(name, value); else url.searchParams.delete(name); } history.replaceState(null, '', url); }
    }
    filterForm.addEventListener('submit', event => { event.preventDefault(); limit = 8; updateCatalog(true); });
    document.querySelector('#advanced-filters').addEventListener('input', () => { limit = 8; updateCatalog(true); });
    filterForm.addEventListener('input', () => { limit = 8; updateCatalog(true); });
    filterForm.addEventListener('reset', () => { queueMicrotask(() => { filterForm.querySelector('[name=animal][value=""]').checked = true; filterForm.elements.form.value = ''; filterForm.elements.need.value = ''; filterForm.elements.q.value = ''; limit = 8; updateCatalog(true); }); });
    more.addEventListener('click', () => { limit += 8; updateCatalog(); });
    document.querySelector('[data-reset-catalog]').addEventListener('click', () => filterForm.reset());
    document.addEventListener('catalog:animal', event => { filterForm.reset(); queueMicrotask(() => { filterForm.querySelector(`[name=animal][value="${event.detail}"]`).checked = true; updateCatalog(true); }); });
    document.querySelectorAll('[data-need-link]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); filterForm.reset(); queueMicrotask(() => { filterForm.elements.need.value = link.dataset.needLink; limit = 8; updateCatalog(true); document.querySelector('#products').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); }); }));
    document.addEventListener('catalog:need', event => { filterForm.elements.need.value = event.detail; limit=8; updateCatalog(true); });
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
