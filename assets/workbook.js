'use strict';
(() => {
  const contacts=JSON.parse(document.querySelector('#contact-data').textContent);
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
      const animal=form.elements.animal.value;
      const animalCards=cards.filter(card=>!animal||card.dataset.animals.split(' ').includes(animal));
      [...form.elements.need.options].forEach(option=>{option.disabled=!!option.value&&!animalCards.some(card=>card.dataset.needs.split(' ').includes(option.value));});
      if(form.elements.need.selectedOptions[0]?.disabled)form.elements.need.value='';
      const need=form.elements.need.value;
      const matching=cards.filter(card=>(!animal||card.dataset.animals.split(' ').includes(animal))&&(!need||card.dataset.needs.split(' ').includes(need)));
      const visible=matching.slice(0,Number(collection.dataset.articleLimit)||cards.length);
      cards.forEach(card=>{card.hidden=!visible.includes(card);card.classList.toggle('is-lead',card===visible[0]);});
      collection.querySelector('.article-filter-count').textContent=`Показано: ${visible.length} из ${matching.length}`;collection.querySelector('.article-filter-empty').hidden=matching.length!==0;
    }
    form.addEventListener('change',update);update();
  });

  const care=document.querySelector('#care-letter');
  if(care){
    care.querySelector('.care-reply').addEventListener('change',()=>{const phone=care.elements.contactType.value==='tel';care.elements.contact.type=phone?'tel':'email';care.elements.contact.autocomplete=phone?'tel':'email';care.elements.contact.placeholder=phone?'+7 900 000-00-00':'name@example.ru';care.querySelector('#letter-contact-label').textContent=phone?'Ваш телефон':'Ваш email';});
    care.addEventListener('submit',async event=>{
      event.preventDefault();if(!care.reportValidity())return;
      if(care.dataset.submitUrl){
        const button=care.querySelector('[type=submit]');const status=care.querySelector('[role=status]');
        if(button.disabled)return;
        button.disabled=true;status.textContent='Отправляем вопрос…';
        try{
          const response=await fetch(care.dataset.submitUrl,{method:'POST',body:new FormData(care),credentials:'same-origin',headers:{Accept:'application/json'}});
          const result=await response.json();
          if(!response.ok||!result.ok)throw new Error(result.message||'Не удалось отправить вопрос.');
          care.reset();care.querySelector('.care-reply').dispatchEvent(new Event('change'));
          status.textContent=result.message;window.UnitabsAnalytics?.track('care_success');
        }catch(error){status.textContent=error instanceof TypeError||error instanceof SyntaxError?'Не удалось получить подтверждение. Ваш текст остался в форме — попробуйте отправить ещё раз.':error.message||'Не удалось отправить вопрос. Попробуйте ещё раз.';}
        finally{button.disabled=false;}
        return;
      }
      const values=new FormData(care);const body=[`Имя: ${values.get('name')}`,`Контакт: ${values.get('contact')}`,`Продукт: ${values.get('product')||'не выбран'}`,`Питомец: ${values.get('pet')||'не выбран'}`,'',values.get('question'),'','Согласие на передачу указанных данных для ответа на вопрос дано.'].join('\n');
      const email=document.createElement('a');email.href=`mailto:${contacts.email}?subject=${encodeURIComponent('Вопрос о продукции Unitabs')}&body=${encodeURIComponent(body)}`;email.click();
      care.querySelector('[role=status]').textContent=`Письмо подготовлено. Отправьте его из открывшегося почтового приложения. Если оно не открылось, напишите на ${contacts.email} или позвоните ${contacts.phone}.`;
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
