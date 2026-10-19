'use strict';
(() => {
  const products=JSON.parse(document.querySelector('#catalog-data').textContent);
  document.querySelectorAll('[data-dose-calc]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const product=products.find(p=>p.sku===form.dataset.doseCalc);
    form.querySelector('.dose-output').textContent=window.UnitabsPicker.dose(product,Number(form.elements.weight.value))?.text||'Проверьте вес питомца.';
  }));
  const tabs=[...document.querySelectorAll('[data-product-tab]')];
  function activate(tab,focus=false){
    tabs.forEach(item=>{const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;document.querySelector('#panel-'+item.dataset.productTab).hidden=!selected;});
    if(focus)tab.focus();
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activate(tab));
    tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();activate(tabs[next],true);});
  });
  if(tabs.length)activate(tabs[0]);
  document.querySelectorAll('[data-scroll-related]').forEach(button=>button.addEventListener('click',()=>{const track=document.querySelector('.related-carousel');track.scrollBy({left:track.clientWidth*Number(button.dataset.scrollRelated),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}));

  document.querySelectorAll('[data-article-collection]').forEach(collection=>{
    const form=collection.querySelector('.article-filters');const cards=[...collection.querySelectorAll('[data-article-card]')];
    function update(){
      const animal=form.elements.animal.value;const need=form.elements.need.value;
      const matching=cards.filter(card=>(!animal||card.dataset.animals.split(' ').includes(animal))&&(!need||card.dataset.needs.split(' ').includes(need)));
      const visible=matching.slice(0,Number(collection.dataset.articleLimit)||cards.length);
      cards.forEach(card=>{card.hidden=!visible.includes(card);card.classList.toggle('is-lead',card===visible[0]);});
      collection.querySelector('.article-filter-count').textContent=`Показано: ${visible.length} из ${matching.length}`;collection.querySelector('.article-filter-empty').hidden=matching.length!==0;
    }
    form.addEventListener('change',update);update();
  });

  const care=document.querySelector('#care-letter');
  if(care){
    care.elements.contactType.addEventListener('change',()=>{const phone=care.elements.contactType.value==='tel';care.elements.contact.type=phone?'tel':'email';care.elements.contact.autocomplete=phone?'tel':'email';care.querySelector('#letter-contact-label').textContent=phone?'Телефон':'Email';});
    care.addEventListener('submit',event=>{
      event.preventDefault();if(!care.reportValidity())return;
      const values=new FormData(care);const body=[`Имя: ${values.get('name')}`,`Контакт: ${values.get('contact')}`,`Продукт: ${values.get('product')||'не выбран'}`,`Питомец: ${values.get('pet')||'не выбран'}`,'',values.get('question'),'','Согласие на передачу указанных данных для ответа на вопрос дано.'].join('\n');
      const email=document.createElement('a');email.href=`mailto:ekoprom@ekoprom.org?subject=${encodeURIComponent('Вопрос о продукции Unitabs')}&body=${encodeURIComponent(body)}`;email.click();
      care.querySelector('[role=status]').textContent='Письмо подготовлено. Отправьте его из открывшегося почтового приложения. Если оно не открылось, напишите на ekoprom@ekoprom.org или позвоните 8 800 222-19-65.';
    });
  }
  const cookie=document.querySelector('#cookie-banner');const dialog=document.querySelector('#cookie-settings');
  if(cookie&&dialog){
    try{cookie.hidden=localStorage.getItem('unitabs-cookie-choice')==='essential';}catch{cookie.hidden=false;}
    function save(){try{localStorage.setItem('unitabs-cookie-choice','essential');}catch{}cookie.hidden=true;if(dialog.open)dialog.close();}
    document.querySelectorAll('[data-cookie-save]').forEach(button=>button.addEventListener('click',save));
    document.querySelectorAll('[data-cookie-settings]').forEach(button=>button.addEventListener('click',()=>dialog.showModal()));
  }
})();
