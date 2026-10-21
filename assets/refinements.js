'use strict';
(() => {
  const slides=[...document.querySelectorAll('[data-hero-season]')];
  const dots=[...document.querySelectorAll('[data-hero-season-go]')];let index=Math.max(0,slides.findIndex(slide=>!slide.hidden));
  function showSeason(next){
    if(!slides.length)return;
    index=(next+slides.length)%slides.length;
    slides.forEach((slide,i)=>slide.hidden=i!==index);
    dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===index)));
    document.querySelector('.hero-season-position').textContent=(index+1)+' / '+slides.length;
  }
  dots.forEach(dot=>dot.addEventListener('click',()=>showSeason(Number(dot.dataset.heroSeasonGo))));
  document.querySelector('[data-season-prev]')?.addEventListener('click',()=>showSeason(index-1));
  document.querySelector('[data-season-next]')?.addEventListener('click',()=>showSeason(index+1));
  document.querySelector('.hero-season-controls')?.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();showSeason(event.key==='Home'?0:event.key==='End'?slides.length-1:index+(event.key==='ArrowRight'?1:-1));dots[index].focus();
  });
  const pet=document.querySelector('.hero-pet');const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  if(pet&&!reduced.matches){
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)&&!document.hidden){pet.classList.add('is-greeting');observer.disconnect();}
    });observer.observe(pet);
    const stop=()=>{if(reduced.matches||document.hidden)pet.classList.remove('is-greeting');};
    reduced.addEventListener('change',stop);document.addEventListener('visibilitychange',stop);
  }
  document.querySelectorAll('[data-faq-filter]').forEach(select=>select.addEventListener('change',()=>{
    const root=select.closest('[data-faq-collection]');
    root.querySelectorAll('[data-faq-category]').forEach(item=>{item.hidden=!!select.value&&item.dataset.faqCategory!==select.value;});
  }));
})();
