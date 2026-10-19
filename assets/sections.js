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
      document.querySelectorAll('[data-season-photo]').forEach((image,i) => { image.classList.toggle('is-active',i === index); image.setAttribute('aria-hidden',String(i !== index)); });
      document.querySelectorAll('[data-season-product]').forEach((link,i) => {
        const product = bySku.get(season.skus[i]); link.href = product.url;
        const image = link.querySelector('img'); image.src = product.images[0]; image.alt = product.fullName;
        link.querySelector('h4').textContent = product.name; link.querySelector('p').textContent = product.purpose; link.querySelector('span').textContent = product.audience;
      });
      scene.removeAttribute('aria-busy'); enter(document.querySelector('.season-narrative'),12); enter(document.querySelector('.season-products'),6);
    }));
  }

  const picker = document.querySelector('#picker-form');
  if (picker) {
    let step = 0;
    const steps = [...picker.querySelectorAll('[data-step]')];
    const result = picker.querySelector('.picker-result');
    const next = picker.querySelector('[data-picker-next]');
    const back = picker.querySelector('[data-picker-back]');
    const names = {cat:'Кошка',dog:'Собака',other:'Другой питомец'};
    const ages = {young:'До 1 года',adult:'От 1 до 7 лет',senior:'Старше 7 лет'};
    const needs = {coat:'Кожа и шерсть',immune:'Иммунитет и витамины',steril:'Стерилизация',growth:'Рост и развитие',mother:'Беременность и лактация',hairball:'Выведение шерсти',digest:'Пищеварение',joints:'Суставы и связки',bones:'Кости и зубы',habit:'Поедание фекалий',weight:'Контроль веса'};
    const byAnimal = {cat:['coat','immune','steril','growth','mother','hairball','digest'],dog:['coat','immune','joints','bones','growth','mother','digest','habit','weight'],other:['coat']};
    function configureAnimal() {
      const animal = picker.elements.animal.value;
      picker.querySelector('[data-age-label]').hidden = animal === 'other';
      const portrait = picker.querySelector('#picker-portrait'); portrait.src = `/unitabs-design-preview/media/brand/editorial/picker-${animal}.webp`; portrait.alt = names[animal];
      picker.querySelector('#picker-pet-name').textContent = names[animal];
      const options = byAnimal[animal].map((key,index) => {
        const label = document.createElement('label'); const input = document.createElement('input'); const text = document.createElement('span');
        input.type = 'radio'; input.name = 'need'; input.value = key; input.checked = index === 0;
        text.textContent = animal === 'other' ? 'Кожа, шерсть и оперение' : needs[key]; label.append(input,text); return label;
      });
      picker.querySelector('.need-choices').replaceChildren(...options);
    }
    function showStep(focus = true) {
      steps.forEach((fieldset,index) => { fieldset.hidden = index !== step; });
      result.hidden = step !== 3; back.hidden = step === 0;
      picker.querySelector('.pet-passport').hidden = step === 0;
      picker.querySelector('.picker-workspace').classList.toggle('has-pet',step > 0);
      picker.querySelectorAll('.picker-steps li').forEach((item,index) => { item.classList.toggle('is-done',index < step); if (index === step) item.setAttribute('aria-current','step'); else item.removeAttribute('aria-current'); });
      next.textContent = step === 2 ? 'Показать результат' : step === 3 ? 'Начать заново' : 'Далее';
      const heading = step < 3 ? steps[step].querySelector('legend') : result.querySelector('h3');
      if (heading && focus) {
        heading.tabIndex = -1; heading.focus({preventScroll:true});
        if (heading.getBoundingClientRect().top < 110 || heading.getBoundingClientRect().bottom > innerHeight - 80) heading.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
      }
      enter(picker.querySelector('.picker-fields'));
    }
    function finish() {
      const animal = picker.elements.animal.value; const need = picker.elements.need.value;
      const special = picker.elements.special.checked;
      const matches = products.filter(product => product.animals.includes(animal) && product.needKeys.includes(need));
      const title = document.createElement('h3'); const copy = document.createElement('p'); const link = document.createElement('a'); link.className = 'button';
      const summary = document.createElement('div'); summary.className = 'picker-result-summary';
      [names[animal],animal !== 'other' ? ages[picker.elements.age.value] : null, special ? null : needs[need]].filter(Boolean).forEach(value => { const tag = document.createElement('span'); tag.textContent = value; summary.append(tag); });
      result.replaceChildren(title,summary,copy);
      if (special) {
        title.textContent = 'Начнём с разговора.'; copy.textContent = 'При заболеваниях, приёме других препаратов или очень юном возрасте выбор комплекса стоит обсудить с ветеринарным специалистом.';
        link.href = '#care'; link.textContent = 'Связаться со службой заботы';
      } else if (!matches.length) {
        title.textContent = 'Давайте уточним выбор.'; copy.textContent = 'По этому сочетанию в каталоге пока нет продуктов. Можно изменить потребность или обратиться в службу заботы.';
        link.href = '#care'; link.textContent = 'Задать вопрос';
      } else {
        title.textContent = 'Есть с чего начать.';
        copy.textContent = `В этом разделе ${matches.length === 1 ? 'есть один продукт' : `найдено продуктов: ${matches.length}`}. Сравните назначение и форму выпуска. Возрастные ограничения проверьте в инструкции — возраст не участвует в фильтрации.`;
        const preview = document.createElement('div'); preview.className = 'picker-result-preview'; const image = document.createElement('img'); const description = document.createElement('div'); const name = document.createElement('strong'); const purpose = document.createElement('p');
        image.src = matches[0].images[0]; image.alt = matches[0].fullName; image.width = 80; image.height = 110; name.textContent = matches[0].name; purpose.textContent = matches[0].purpose;
        description.append(name,purpose); preview.append(image,description); result.append(preview);
        link.href = '#products'; link.textContent = matches.length === 1 ? 'Посмотреть продукт в каталоге' : 'Посмотреть продукты';
        link.addEventListener('click',() => { document.dispatchEvent(new CustomEvent('catalog:animal',{detail:animal})); queueMicrotask(() => document.dispatchEvent(new CustomEvent('catalog:need',{detail:need}))); });
      }
      result.append(link);
    }
    function advance() {
      if (step === 0 && !picker.elements.animal.value) { picker.querySelector('[name=animal]').reportValidity(); return; }
      if (step === 0) configureAnimal();
      if (step === 3) { picker.reset(); step = 0; result.replaceChildren(); }
      else if (step === 1 && picker.elements.special.checked) { finish(); step = 3; }
      else { step++; if (step === 3) finish(); }
      showStep();
    }
    next.addEventListener('click',advance);
    back.addEventListener('click',() => { step = step === 3 && picker.elements.special.checked ? 1 : Math.max(0,step-1); showStep(); });
    picker.querySelector('[data-change-pet]').addEventListener('click',() => { step = 0; showStep(); });
    picker.addEventListener('submit',event => { event.preventDefault(); advance(); });
    document.addEventListener('picker:start',event => {
      const input = picker.querySelector(`[name=animal][value="${event.detail}"]`); if (!input) return;
      picker.reset(); input.checked = true; result.replaceChildren(); configureAnimal(); step = 1; showStep();
    });
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
