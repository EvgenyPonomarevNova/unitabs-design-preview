/* Load with defer AFTER dog-motion.js. Remove the old hero-pet.js include. */
(() => {
  // The template opts in only for the default animal with CMS motion enabled.
  const root = document.querySelector('.hero-character[data-dog-video]');
  if (!root || !window.UnitabsDogMotion) return;
  if (window.UnitabsHeroDog && window.UnitabsHeroDog.state !== 'destroyed') return;
  window.UnitabsDogAction?.destroy?.();
  root.querySelectorAll('.hero-expression,.dog-action__canvas,.dog-action__source').forEach(node => {
    node.pause?.();
    node.remove();
  });
  root.classList.remove('dog-action--playing','is-playing');
  root.removeAttribute('data-pet-motion');
  const dog = UnitabsDogMotion.mount(root, {
    videoSrc: root.dataset.dogVideo,
    posterSrc: root.querySelector('img.hero-dog').getAttribute('src'),
    autoplay: true,
    startDelay: 900
  });
  // Keep the original 81 frames / 16 fps; speed changes belong here only.
  dog.video.defaultPlaybackRate = 1;
  dog.video.playbackRate = 1;
  window.UnitabsHeroDog = dog;
})();
