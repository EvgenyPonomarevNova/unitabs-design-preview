'use strict';
(() => {
  const config=document.querySelector('meta[name="unitabs-metrika"]');
  if(!config||!/^\d{1,12}$/.test(config.content)||config.dataset.origin!==location.origin)return;
  const id=Number(config.content), key='unitabs-analytics-choice';
  const goals=new Set(['picker_start','picker_step','picker_result','catalog_filter','catalog_more','variant_change','product_details','buy_open','retailer_click','pdf_open','care_success','season_change','phone_click','email_click']);
  let active=false, loaded=false, panel;
  const pageUrl=()=>location.origin+location.pathname;
  function start(){
    if(active)return;
    active=true;
    window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments);};
    window.ym.l=window.ym.l||Date.now();
    if(!loaded){const script=document.createElement('script');script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js';document.head.append(script);loaded=true;}
    // Explicit goals only. No form capture, session replay, automatic external URLs or query strings.
    window.ym(id,'init',{defer:true,webvisor:false,clickmap:false,trackLinks:false,trackHash:false,accurateTrackBounce:true,disableYtm:true});
    window.ym(id,'hit',pageUrl(),{title:document.title,referer:''});
  }
  document.addEventListener('unitabs:analytics',event=>{
    const detail=event.detail;
    if(!active||!detail||!goals.has(detail.event))return;
    // analytics.js already allowlists parameters; never pass fields, contacts or question text.
    const params={};
    for(const name of ['page','sku','step','consult','filter','target'])if(detail.params?.[name]!==undefined)params[name]=detail.params[name];
    window.ym(id,'reachGoal','unitabs_'+detail.event,params);
  });
  function choose(value){
    try{localStorage.setItem(key,value);}catch(_){}
    if(value==='accepted')start();
    else if(active){window.ym(id,'destruct');active=false;}
    panel?.remove();panel=null;
  }
  function showChoice(){
    if(panel)return;
    panel=document.createElement('section');panel.className='unitabs-analytics-choice';panel.setAttribute('aria-label','Настройки аналитики');
    const text=document.createElement('p');text.textContent='Разрешить Яндекс Метрику? Она помогает понять, как пользуются сайтом. Можно продолжить без аналитики.';
    const policy=document.createElement('a');policy.href='/unitabs-design-preview/privacy-policy/';policy.textContent='Политика обработки данных';
    const accept=document.createElement('button');accept.type='button';accept.textContent='Разрешить';accept.addEventListener('click',()=>choose('accepted'));
    const reject=document.createElement('button');reject.type='button';reject.textContent='Без аналитики';reject.addEventListener('click',()=>choose('denied'));
    panel.append(text,policy,accept,reject);document.body.append(panel);
  }
  let choice='';try{choice=localStorage.getItem(key)||'';}catch(_){}
  if(choice==='accepted'||(choice!=='denied'&&config.dataset.consent==='immediate'))start();else if(choice!=='denied')showChoice();
  const existing=document.querySelector('[data-cookie-settings]');
  if(existing){existing.addEventListener('click',showChoice);}
  else {const settings=document.createElement('button');settings.type='button';settings.className='unitabs-analytics-settings';settings.textContent='Настройки аналитики';settings.addEventListener('click',showChoice);document.body.append(settings);}
})();
