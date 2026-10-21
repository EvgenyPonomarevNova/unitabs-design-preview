'use strict';
(() => {
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const carousel=document.querySelector('.season-carousel');
  const slides=[...document.querySelectorAll('[data-hero-season]')];
  const tabs=[...document.querySelectorAll('[data-hero-season-go]')];
  let index=Math.max(0,slides.findIndex(slide=>!slide.hidden));
  let animations=[];
  function settle(){
    animations.forEach(animation=>animation.cancel());animations=[];
    slides.forEach((slide,i)=>{slide.hidden=i!==index;slide.inert=i!==index;slide.setAttribute('aria-hidden',String(i!==index));});
  }
  function showSeason(next,animate=true){
    if(slides.length<2)return;
    next=(next+slides.length)%slides.length;if(next===index)return;
    settle();const previous=index;index=next;
    const outgoing=slides[previous];const incoming=slides[index];
    outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');
    incoming.hidden=false;incoming.inert=false;incoming.setAttribute('aria-hidden','false');
    tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===index)));
    const name=tabs[index]?.textContent.trim()||'';
    carousel.querySelector('.hero-season-position').textContent=`${name} · ${index+1} / ${slides.length}`;
    if(reduced.matches||!animate){settle();return;}
    // The whole scene crossfades; typography and packaging settle in quickly.
    const fade=outgoing.animate([{opacity:1},{opacity:0}],{duration:260,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'});
    animations.push(fade,incoming.animate([{opacity:0},{opacity:1}],{duration:260,easing:'cubic-bezier(.23,1,.32,1)'}));
    const photo=incoming.querySelector('.hero-season-scene-image');
    if(photo)animations.push(photo.animate([{transform:'scale(1.025)'},{transform:'scale(1)'}],{duration:650,easing:'cubic-bezier(.23,1,.32,1)'}));
    const copy=incoming.querySelector('.hero-season-scene-copy');
    animations.push(copy.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.23,1,.32,1)'}));
    incoming.querySelectorAll('.hero-season-scene-products a').forEach((item,i)=>animations.push(item.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,delay:i*35,easing:'cubic-bezier(.23,1,.32,1)',fill:'backwards'})));
    fade.finished.then(()=>{if(index===next)outgoing.hidden=true;}).catch(()=>{});
  }
  tabs.forEach(tab=>tab.addEventListener('click',event=>showSeason(Number(tab.dataset.heroSeasonGo),event.detail!==0)));
  document.querySelector('[data-season-prev]')?.addEventListener('click',event=>showSeason(index-1,event.detail!==0));
  document.querySelector('[data-season-next]')?.addEventListener('click',event=>showSeason(index+1,event.detail!==0));
  carousel?.querySelector('.season-carousel-controls')?.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();showSeason(event.key==='Home'?0:event.key==='End'?slides.length-1:index+(event.key==='ArrowRight'?1:-1),false);tabs[index].focus();
  });
  let touchStart=null;
  carousel?.querySelector('.season-carousel-stage')?.addEventListener('touchstart',event=>{if(event.touches.length===1)touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};},{passive:true});
  carousel?.querySelector('.season-carousel-stage')?.addEventListener('touchend',event=>{
    if(!touchStart)return;
    const x=event.changedTouches[0].clientX-touchStart.x,y=event.changedTouches[0].clientY-touchStart.y;touchStart=null;
    if(Math.abs(x)>65&&Math.abs(x)>Math.abs(y)*1.5){showSeason(index+(x<0?1:-1));window.UnitabsAnalytics?.track('season_change');}
  },{passive:true});
  reduced.addEventListener('change',settle);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)settle();});
  addEventListener('pagehide',settle);
  document.querySelectorAll('[data-faq-filter]').forEach(select=>select.addEventListener('change',()=>{
    const root=select.closest('[data-faq-collection]');
    root.querySelectorAll('[data-faq-category]').forEach(item=>{item.hidden=!!select.value&&item.dataset.faqCategory!==select.value;});
  }));
})();
