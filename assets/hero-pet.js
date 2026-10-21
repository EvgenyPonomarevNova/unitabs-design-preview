'use strict';
(() => {
  const pet = document.querySelector('[data-pet-motion]');
  if (!pet) return;
  const video = pet.querySelector('video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let started = false;
  let finished = false;
  let attempt = 0;
  const hide = () => { attempt++; video.pause(); pet.classList.remove('is-playing'); };
  const finish = () => { finished = true; hide(); observer?.disconnect(); };
  const run = () => {
    if (finished || !visible || document.hidden || reduced.matches || navigator.connection?.saveData) return;
    if (!started) { started = true; video.src = pet.dataset.petMotion; }
    const currentAttempt = ++attempt;
    const promise = video.play();
    if (promise) promise.catch(() => {
      // Pause during loading is expected when the tab/hero leaves view.
      if (currentAttempt === attempt && visible && !document.hidden && !reduced.matches) finish();
    });
  };
  video.addEventListener('playing', () => {
    if (visible && !document.hidden && !reduced.matches) pet.classList.add('is-playing');
    else hide();
  });
  video.addEventListener('ended', finish, {once:true});
  video.addEventListener('error', finish, {once:true});
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .5;
    if (visible) run(); else hide();
  }, {threshold:.5}) : null;
  if (observer) observer.observe(pet); else { visible = true; run(); }
  reduced.addEventListener('change', () => { if (reduced.matches) finish(); else run(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); else run(); });
  addEventListener('pagehide', hide);
  addEventListener('pageshow', event => { if (event.persisted) run(); });
})();
