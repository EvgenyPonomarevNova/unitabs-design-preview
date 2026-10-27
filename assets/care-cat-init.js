/* The template opts in only for the supplied care cat, not custom CMS images. */
(() => {
  const root = document.querySelector('.care-cat-stage[data-cat-video]');
  if (!root || !window.UnitabsCatMotion) return;
  if (window.UnitabsCareCat && window.UnitabsCareCat.state !== 'destroyed') return;
  const cat = window.UnitabsCatMotion.mount(root, {
    videoSrc: root.dataset.catVideo,
    autoplay: true,
    startDelay: 900
  });
  cat.video.defaultPlaybackRate = 1;
  cat.video.playbackRate = 1;
  window.UnitabsCareCat = cat;
})();
