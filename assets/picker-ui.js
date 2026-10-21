'use strict';
(() => {
  const form = document.querySelector('#picker-form'); if (!form) return;
  const engine = window.UnitabsPicker;
  const contacts=JSON.parse(document.querySelector('#contact-data').textContent);
  const products = JSON.parse(document.querySelector('#catalog-data').textContent);
  const rules = JSON.parse(document.querySelector('#picker-rule-data').textContent);
  const drops = JSON.parse(document.querySelector('#dose-data').textContent).drops;
  const fields = [...form.querySelectorAll('[data-step]')]; const result = form.querySelector('.picker-result');
  const next = form.querySelector('[data-picker-next]'); const back = form.querySelector('[data-picker-back]');
  const names = {cat:'Кошка',dog:'Собака',other:'Другое животное'};
  let step = 0;
  function node(tag,cls,text) {const item = document.createElement(tag); if (cls) item.className = cls; if (text) item.textContent = text; return item;}
  function answers() {
    return {animal:form.elements.animal.value,age:form.elements.age.value,catStage:form.elements.catStage.value,puppyStage:form.elements.puppyStage.value,adultStage:form.elements.adultStage.value,dogSize:form.elements.dogSize.value,overweight:form.elements.overweight.checked,need:form.elements.need?.value || 'coat',weight:Number(form.elements.weight.value)/(form.elements.animal.value === 'other' ? 1000 : 1),special:[...form.querySelectorAll('[data-special]')].some(input=>input.checked),weightClear:form.elements.weightClear.checked};
  }
  function needs() {
    const state = answers(); const group = form.querySelector('.need-choices'); const selected = form.elements.need?.value;
    const available = engine.availableNeeds(state,rules);
    group.replaceChildren(...available.map((key,index) => {const label=node('label');const input=node('input');input.type='radio';input.name='need';input.value=key;input.checked=selected === key || !available.includes(selected) && index === 0;label.append(input,node('span','',engine.labels[key]));return label;}));
    form.querySelector('[data-weight-clear]').hidden = form.elements.need?.value !== 'weight';
  }
  function configure() {
    const state=answers();
    form.querySelector('[data-age-label]').hidden=state.animal === 'other';
    form.querySelector('[data-cat-young]').hidden=state.animal !== 'cat' || state.age !== 'young';
    form.querySelector('[data-dog-young]').hidden=state.animal !== 'dog' || state.age !== 'young';
    form.querySelector('[data-dog-adult]').hidden=state.animal !== 'dog' || state.age !== 'adult';
    form.querySelector('[data-dog-size]').hidden=state.animal !== 'dog';
    const weight=form.elements.weight;weight.min=state.animal==='cat'?'0.5':state.animal==='dog'?'1':'15';weight.max=state.animal==='cat'?'15':state.animal==='dog'?'100':'3500';weight.step='any';
    form.querySelector('#weight-label').textContent=state.animal==='other'?'Вес питомца, г':'Вес питомца, кг';
    const portrait=form.querySelector('#picker-portrait');
    const photo=form.querySelector('input[name="animal"]:checked').closest('.pet-choice').querySelector('.pet-photo');
    portrait.src=photo.src;
    if(photo.srcset){portrait.srcset=photo.srcset;portrait.sizes='(max-width: 800px) 90px, 340px';}
    else {portrait.removeAttribute('srcset');portrait.removeAttribute('sizes');}
    portrait.alt=names[state.animal];form.querySelector('#picker-pet-name').textContent=names[state.animal];
    needs();
  }
  function show() {
    window.UnitabsAnalytics?.track('picker_step',{step});
    form.elements.weight.required=step===1;
    form.elements.dogSize.required=step===1&&answers().animal==='dog';
    fields.forEach((field,index)=>field.hidden=index!==step);result.hidden=step!==3;back.hidden=step===0;
    form.querySelector('.pet-passport').hidden=step===0;form.querySelector('.picker-workspace').classList.toggle('has-pet',step>0);
    form.classList.toggle('has-results',step===3);
    form.querySelectorAll('.picker-steps li').forEach((li,index)=>{li.classList.toggle('is-done',index<step);if(index===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    next.textContent=step===3?'Начать заново':step===2 || step===1&&answers().animal==='other'?'Показать результат':'Далее';
    const heading=step===3?result.querySelector('h3'):fields[step].querySelector('legend');
    if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});if(heading.getBoundingClientRect().top<110)heading.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
  }
  function table(product) {
    const wrapper=node('div','dose-tables');
    for(const group of drops.filter(group=>group.sku===product.sku)){
      const details=node('details');details.append(node('summary','',`Дозировка по весу: ${group.heading}`));
      const table=node('table');const head=node('tr');head.append(node('th','','Вес'),node('th','','Капель в сутки'));table.append(head);
      group.rows.forEach(row=>{const tr=node('tr');tr.append(node('td','',row.weight),node('td','',row.dose));table.append(tr);});details.append(table);wrapper.append(details);
    }
    return wrapper;
  }
  function card(group,state) {
    const card=node('article','picker-product');const image=node('img');image.width=300;image.height=300;
    const scene=node('a','picker-product-scene');scene.tabIndex=-1;scene.setAttribute('aria-hidden','true');
    const format=node('span','picker-product-format');scene.append(image,format);
    const body=node('div','picker-product-body');const name=node('h4');const nameLink=node('a');name.append(nameLink);
    const meta=node('p','picker-product-meta');const purpose=node('p','picker-product-purpose');const restriction=node('p','field-hint');const dose=node('p','picker-dose');
    const select=node('select');select.setAttribute('aria-label','Форма и фасовка '+group.product.name);
    group.variants.forEach(p=>{const option=node('option','',`${p.form} · ${p.package}`);option.value=p.sku;select.append(option);});
    const variant=node('label','picker-product-variant','Форма и фасовка');variant.append(select);
    const actions=node('div','picker-product-actions');const more=node('a','text-link','О продукте');const pdf=node('a','text-link','Открыть инструкцию PDF');pdf.target='_blank';pdf.rel='noopener';const buy=node('a','button button-small','Где купить');actions.append(more,buy);
    const application=node('details','picker-application');application.append(node('summary','','Применение и ограничения'));
    const tables=node('div');
    function render(sku) {const p=products.find(p=>p.sku===sku);image.src=p.images[0];image.alt='';nameLink.textContent=p.name;nameLink.href=p.url;scene.href=p.url;format.textContent=p.form;card.style.setProperty('--product-color',p.color);meta.textContent=p.audience;purpose.textContent=p.purpose;restriction.textContent=[p.age&&p.age!=='—'?'Возраст: '+p.age:null,p.restrictions].filter(Boolean).join('. ');more.href=p.url;pdf.href=p.pdf;buy.href=p.url+'#buy';buy.dataset.buy=p.sku;const calculated=engine.dose(p,state.weight);dose.textContent=calculated?.text||'';dose.hidden=!calculated?.text;tables.replaceChildren(...(p.form==='Капли'?[table(p)]:[]));}
    select.value=group.product.sku;
    render(group.product.sku);select.addEventListener('change',()=>render(select.value));
    application.append(dose,restriction,tables,pdf);body.append(meta,name,purpose,variant,application,actions);card.append(scene,body);return card;
  }
  function finish() {
    const state=answers();const response=engine.select(state,products,rules);result.replaceChildren();window.UnitabsAnalytics?.track('picker_result',{consult:response.consult});
    result.append(node('h3','',response.consult?'Нужен особый подход':'Знакомьтесь, ваш Unitabs'));
    if(response.consult){result.append(node('p','',response.reason));const link=node('a','button','Служба заботы');link.href='#care';const phone=node('a','text-link',contacts.phone);phone.href=contacts.phoneHref;result.append(link,phone);}
    else {
      const summary=node('div','picker-result-summary');[names[state.animal],engine.labels[state.need],`${form.elements.weight.value} ${state.animal==='other'?'г':'кг'}`].forEach(text=>summary.append(node('span','',text)));result.append(summary);
      result.append(node('p','picker-alternatives','Это варианты на выбор. Не сочетайте несколько комплексов без согласования с ветеринарным специалистом.'));
      const cards=node('div','picker-products');response.items.forEach(group=>cards.append(card(group,state)));result.append(cards);
      const all=node('a','text-link','Посмотреть весь ассортимент');all.href='#products';all.addEventListener('click',()=>document.querySelector('#catalog-filters').reset());result.append(all);
    }
    result.append(node('p','disclaimer',contacts.pickerDisclaimer));
  }
  function advance() {
    if(step===0){if(!form.elements.animal.value){form.querySelector('[name=animal]').reportValidity();return;}configure();step=1;window.UnitabsAnalytics?.track('picker_start');}
    else if(step===1){
      if(answers().special){finish();step=3;}
      else {
        if(!form.elements.weight.reportValidity())return;
        if(answers().animal==='dog'&&!form.elements.dogSize.value){form.elements.dogSize.reportValidity();return;}
        if(answers().animal==='other'){finish();step=3;}else {needs();step=2;}
      }
    }
    else if(step===2){finish();step=3;}
    else {form.reset();step=0;result.replaceChildren();}
    show();
  }
  next.addEventListener('click',advance);back.addEventListener('click',()=>{step=step===3?answers().special||answers().animal==='other'?1:2:Math.max(0,step-1);show();});
  form.querySelector('[data-change-pet]').addEventListener('click',()=>{step=0;show();});
  form.addEventListener('change',event=>{if(event.target.name==='age')configure();if(event.target.name==='need')form.querySelector('[data-weight-clear]').hidden=event.target.value!=='weight';});
  form.addEventListener('submit',event=>{event.preventDefault();advance();});
  document.addEventListener('picker:start',event=>{const input=form.querySelector(`[name=animal][value="${event.detail}"]`);if(!input)return;form.reset();input.checked=true;configure();step=1;window.UnitabsAnalytics?.track('picker_start');show();});
  form.elements.weight.required=false;form.elements.dogSize.required=false;
})();
