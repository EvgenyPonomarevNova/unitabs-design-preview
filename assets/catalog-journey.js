'use strict';
(() => {
  const mosaic=document.querySelector('#need-mosaic');
  if(mosaic){
    const tabs=[...document.querySelectorAll('[data-need-animal]')];
    const tiles=[...mosaic.querySelectorAll('.need-tile')];
    tabs.forEach(tab=>tab.addEventListener('click',()=>{
      const animal=tab.dataset.needAnimal;
      tabs.forEach(item=>{const active=item===tab;item.classList.toggle('is-active',active);item.setAttribute('aria-pressed',String(active));});
      const visible=[];
      tiles.forEach(tile=>{
        const option=JSON.parse(tile.dataset.needOptions)[animal];
        tile.hidden=!option.count;
        if(tile.hidden)return;
        visible.push(tile);
        const url=new URL(tile.href);
        if(animal)url.searchParams.set('animal',animal);else url.searchParams.delete('animal');
        tile.href=url.href;
        tile.setAttribute('aria-label',`${tile.dataset.needTitle}, ${option.label}`);
        tile.querySelector('[data-need-count]').textContent=option.label;
        tile.querySelector('.need-tile-packs').replaceChildren(...option.images.map(src=>{
          const image=new Image(210,250);image.src=src;image.alt='';image.loading='lazy';image.decoding='async';return image;
        }));
      });
      visible.forEach((tile,index)=>tile.style.setProperty('--tile-span',index%4===0||index%4===3?7:5));
      document.querySelector('.need-mosaic-empty').hidden=visible.length!==0;
    }));
  }

  const form=document.querySelector('#category-filters');
  if(!form)return;
  const products=JSON.parse(document.querySelector('#catalog-data').textContent);
  const bySku=new Map(products.map(product=>[product.sku,product]));
  const cards=[...document.querySelectorAll('#category-product-grid [data-card]')];
  const count=document.querySelector('#category-result-count');
  const empty=document.querySelector('#category-empty');
  const need=document.querySelector('[data-category-need]').dataset.categoryNeed;
  function restore(){
    const params=new URLSearchParams(location.search);
    for(const name of ['animal','form']){
      const value=params.get(name)||'';
      const option=[...form.querySelectorAll(`input[name="${name}"]`)].find(input=>input.value===value);
      (option||form.querySelector(`input[name="${name}"][value=""]`)).checked=true;
    }
    filter(false);
  }
  function filter(updateUrl){
    const data=new FormData(form);const animal=data.get('animal');const format=data.get('form');let visible=0;
    for(const card of cards){
      const variants=JSON.parse(card.dataset.variants).map(sku=>bySku.get(sku)).filter(Boolean);
      const matching=variants.filter(item=>(!need||item.needKeys.includes(need))&&(!animal||item.animals.includes(animal))&&(!format||item.form===format));
      card.hidden=matching.length===0;
      if(matching.length){visible++;const select=card.querySelector('[data-pack-select]');if(select){for(const option of select.options)option.disabled=!matching.some(item=>item.sku===option.value);if(!matching.some(item=>item.sku===select.value)){select.value=matching[0].sku;select.dispatchEvent(new Event('change',{bubbles:true}));}}}
    }
    count.textContent=`${visible} ${visible===1?'комплекс':visible<5&&visible>1?'комплекса':'комплексов'}`;
    empty.hidden=visible!==0;
    if(!need){
      document.querySelectorAll('.catalog-sidebar [aria-label="По виду животного"] a').forEach(link=>{
        const active=new URL(link.href).searchParams.get('animal')===animal;
        if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
      });
      const all=document.querySelector('.catalog-sidebar-all');
      if(animal)all.removeAttribute('aria-current');else all.setAttribute('aria-current','page');
    }
    if(updateUrl){const url=new URL(location.href);for(const name of ['animal','form']){const value=data.get(name);if(value)url.searchParams.set(name,value);else url.searchParams.delete(name);}history.pushState(null,'',url);}
  }
  form.addEventListener('change',()=>filter(true));
  form.addEventListener('submit',event=>{event.preventDefault();filter(true);});
  window.addEventListener('popstate',restore);
  restore();
})();
