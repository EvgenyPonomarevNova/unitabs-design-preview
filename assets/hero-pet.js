'use strict';
(() => {
  const pet = document.querySelector('[data-pet-motion]');
  if (!pet) return;
  const image = pet.querySelector('.hero-dog');
  const poster = image.getAttribute('src');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let played = false;
  let inView = false;
  let delay;
  let finish;
  let observer;

  const cancel = () => {
    clearTimeout(delay);
    clearTimeout(finish);
    image.removeEventListener('load', loaded);
    image.removeEventListener('error', failed);
  };
  const failed = () => {
    cancel();
    image.src = poster;
  };
  const loaded = () => {
    image.removeEventListener('load', loaded);
    // The WebP itself plays exactly once. A static final frame also releases
    // animation buffers and keeps the pose stable when returning to this tab.
    finish = setTimeout(() => {
      image.removeEventListener('error', failed);
      image.src = pet.dataset.petRest;
    }, 3800);
  };
  const start = () => {
    if (played || !inView || document.hidden || reduced.matches || navigator.connection?.saveData) return;
    played = true;
    observer?.disconnect();
    image.addEventListener('load', loaded, {once:true});
    image.addEventListener('error', failed, {once:true});
    image.src = pet.dataset.petMotion;
  };
  const schedule = () => {
    clearTimeout(delay);
    if (inView && !document.hidden && !played) delay = setTimeout(start, 700);
  };
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.55;
      schedule();
    }, {threshold:0.55});
    observer.observe(pet);
  } else {
    inView = true;
    schedule();
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) { cancel(); image.src = poster; }
    else schedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(delay);
      if (played) { cancel(); image.src = reduced.matches ? poster : pet.dataset.petRest; }
    } else schedule();
  });
  addEventListener('pagehide', () => { cancel(); observer?.disconnect(); });
  addEventListener('pageshow', event => {
    if (event.persisted && !played) { observer?.observe(pet); schedule(); }
  });
})();
