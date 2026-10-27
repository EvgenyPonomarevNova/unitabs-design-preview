/* Unitabs: one real action, transparent WebGL output, then hold its last frame.
 * Packed MP4: premultiplied RGB on the left; grayscale alpha on the right.
 * No dependencies. Load normally or inline, then call UnitabsDogMotion.mount().
 */
(function () {
  'use strict';
  const mounted = new WeakMap();

  function mount(target, options = {}) {
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) throw new Error('Dog motion: container not found.');
    if (mounted.has(root)) return mounted.get(root);
    const poster = root.querySelector('img.hero-dog');
    const source = options.videoSrc || root.dataset.dogVideo;
    if (!poster || !source) throw new Error('Dog motion needs img.hero-dog and videoSrc.');
    if (options.posterSrc) {
      poster.removeAttribute('srcset');
      poster.src = options.posterSrc;
    }
    root.classList.add('dog-motion');

    const canvas = document.createElement('canvas');
    canvas.className = 'dog-motion__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const video = document.createElement('video');
    video.className = 'dog-motion__source';
    video.muted = video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'none';
    video.loop = false;
    video.crossOrigin = options.crossOrigin || 'anonymous';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('tabindex', '-1');
    video.setAttribute('disablepictureinpicture', '');
    // Never expose the double-width source, even before the stylesheet loads.
    video.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
    root.append(canvas, video);

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const removers = [];
    const delay = Math.max(0, Number(options.startDelay ?? 600) || 0);
    let visible = false, manualPause = false, pageHidden = false;
    let destroyed = false, failed = false, requested = false, completed = false;
    let autoPending = options.autoplay !== false, resetPending = false, starting = false;
    let hasFrame = false, state = 'waiting', generation = 0, timer = 0, raf = 0, vfc = null;
    let observer = null, resizeObserver = null, preloadTimer = 0;
    let gl = null, program = null, buffer = null, texture = null, texel = null;
    let lastUploadedTime = -1;

    function emit(name, detail) {
      root.dispatchEvent(new CustomEvent('dogmotion:' + name, { detail }));
    }
    function setState(value) {
      if (state === value && root.dataset.dogMotionState === value) return;
      state = value;
      root.dataset.dogMotionState = value;
      emit('statechange', { state: value });
    }
    function listen(node, type, fn, settings) {
      node.addEventListener(type, fn, settings);
      removers.push(() => node.removeEventListener(type, fn, settings));
    }
    const permitted = () => !destroyed && !failed && !preference.matches && !connection?.saveData;
    const runnable = () => permitted() && visible && !manualPause && !pageHidden && !document.hidden;
    // Fetch once after the initial page load, independently of playback visibility.
    function warmVideo() {
      if (!permitted() || pageHidden || document.hidden || video.getAttribute('src')) return;
      video.preload = 'auto';
      video.src = source;
      video.load();
    }
    function queuePreload() {
      if (document.readyState !== 'complete' || preloadTimer || video.getAttribute('src') || !permitted() || document.hidden) return;
      preloadTimer = setTimeout(() => { preloadTimer = 0; warmVideo(); }, 1500);
    }
    function updateVisibility(nextVisible) {
      const entering = nextVisible && !visible;
      visible = nextVisible;
      // Restart the cached clip only on a new visit, never loop while it stays in view.
      if (entering && hasFrame && !manualPause) {
        completed = false; requested = false; resetPending = true; autoPending = true;
      }
      sync();
    }
    function clearTimer() { clearTimeout(timer); timer = 0; }
    function stopFrames() {
      if (raf) cancelAnimationFrame(raf);
      if (vfc !== null) video.cancelVideoFrameCallback(vfc);
      raf = 0; vfc = null;
    }
    function suspend() {
      generation++;
      starting = false;
      clearTimer(); stopFrames(); video.pause();
      // Retain the decoded source and frame; a new viewport visit resets playback separately.
    }
    function release() {
      if (!gl || gl.isContextLost()) return;
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      texture = buffer = program = null;
    }
    function fallback(error) {
      if (failed || destroyed) return;
      failed = true;
      requested = false;
      suspend();
      root.classList.remove('dog-motion--has-frame');
      video.removeAttribute('src');
      video.load();
      release();
      setState('fallback');
      emit('error', { message: String(error?.message || error) });
    }

    function resize() {
      if (!gl || !program || gl.isContextLost()) return;
      const box = root.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2, 640 / Math.max(1, box.width, box.height));
      const width = Math.max(1, Math.round(box.width * scale));
      const height = Math.max(1, Math.round(box.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width; canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      // Repaint the retained texture even when playback has ended or is paused.
      if (hasFrame) paint();
    }

    function prepareRenderer() {
      if (program) return;
      gl = canvas.getContext('webgl', {
        alpha: true, premultipliedAlpha: true, antialias: false,
        depth: false, stencil: false, preserveDrawingBuffer: true,
        powerPreference: 'low-power'
      });
      if (!gl) throw new Error('WebGL unavailable.');
      const sources = [
        [gl.VERTEX_SHADER, 'attribute vec2 aUV; varying vec2 vUV; void main(){vUV=aUV;gl_Position=vec4(aUV.x*2.0-1.0,1.0-aUV.y*2.0,0.0,1.0);}'],
        [gl.FRAGMENT_SHADER, `
          #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
          #else
          precision mediump float;
          #endif
          varying vec2 vUV;
          uniform sampler2D uVideo;
          uniform vec2 uHalfTexel;
          void main(){
            float y=clamp(vUV.y,uHalfTexel.y,1.0-uHalfTexel.y);
            vec3 rgb=texture2D(uVideo,vec2(clamp(vUV.x*0.5,uHalfTexel.x,0.5-uHalfTexel.x),y)).rgb;
            float alpha=texture2D(uVideo,vec2(clamp(0.5+vUV.x*0.5,0.5+uHalfTexel.x,1.0-uHalfTexel.x),y)).r;
            gl_FragColor=vec4(min(rgb,vec3(alpha)),alpha);
          }`]
      ];
      const shaders = [];
      program = gl.createProgram();
      try {
        for (const [type, sourceCode] of sources) {
          const shader = gl.createShader(type);
          shaders.push(shader);
          gl.shaderSource(shader, sourceCode); gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
          gl.attachShader(program, shader);
        }
        gl.bindAttribLocation(program, 0, 'aUV');
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      } finally { shaders.forEach(shader => gl.deleteShader(shader)); }
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.uniform1i(gl.getUniformLocation(program, 'uVideo'), 0);
      texel = gl.getUniformLocation(program, 'uHalfTexel');
      gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      gl.clearColor(0, 0, 0, 0);
      resize();
    }

    function paint() {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function drawFrame(force = true) {
      if (destroyed || failed || !program || gl.isContextLost() || video.readyState < 2 || video.seeking) return false;
      if (!video.videoWidth || video.videoWidth !== video.videoHeight * 2) throw new Error('Expected a packed 2:1 video with square color and alpha halves.');
      if (force || video.currentTime !== lastUploadedTime) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniform2f(texel, 0.5 / video.videoWidth, 0.5 / video.videoHeight);
        lastUploadedTime = video.currentTime;
        paint();
      }
      if (!hasFrame) {
        if (gl.getError() !== gl.NO_ERROR) throw new Error('Could not render the first dog frame.');
        hasFrame = true;
        emit('ready', { width: video.videoWidth / 2, height: video.videoHeight });
      }
      root.classList.add('dog-motion--has-frame');
      return true;
    }
    function frame() {
      raf = 0; vfc = null;
      if (!runnable() || !requested || completed || video.paused) return;
      try { drawFrame(false); } catch (error) { fallback(error); return; }
      startFrames();
    }
    function startFrames() {
      if (raf || vfc !== null || !runnable() || !requested || completed || video.paused) return;
      if (video.requestVideoFrameCallback) vfc = video.requestVideoFrameCallback(frame);
      else raf = requestAnimationFrame(frame);
    }

    async function startOrResume() {
      if (!runnable() || !requested || completed || starting) return;
      starting = true;
      const ticket = ++generation;
      try {
        prepareRenderer();
        warmVideo();
        if (resetPending) {
          if (video.readyState >= 1) video.currentTime = 0;
          resetPending = false;
        }
        setState(hasFrame ? 'playing' : 'loading');
        await video.play();
        if (ticket !== generation || !runnable() || !requested) return;
        setState('playing');
        startFrames();
      } catch (error) {
        if (ticket === generation && runnable()) fallback(error);
      } finally {
        if (ticket === generation) starting = false;
      }
    }

    function play() {
      if (!permitted() || completed) return false;
      clearTimer();
      autoPending = false; manualPause = false; requested = true;
      sync();
      return true;
    }
    function replay() {
      if (!permitted()) return false;
      suspend();
      autoPending = false; manualPause = false; requested = true;
      completed = false; resetPending = true;
      sync();
      return true;
    }
    function sync() {
      if (destroyed || failed) return;
      queuePreload();
      if (!permitted()) {
        suspend();
        root.classList.remove('dog-motion--has-frame');
        setState(preference.matches ? 'reduced-motion' : 'save-data');
        return;
      }
      if (hasFrame) root.classList.add('dog-motion--has-frame');
      if (!runnable()) {
        suspend();
        setState(completed ? 'held' : manualPause ? 'paused' : 'suspended');
        return;
      }
      if (completed) { setState('held'); return; }
      if (requested) { startOrResume(); return; }
      setState('waiting');
      if (autoPending && !timer) {
        timer = setTimeout(() => { timer = 0; if (runnable()) play(); }, hasFrame ? 150 : delay);
      }
    }

    listen(video, 'playing', () => {
      if (runnable() && requested) { setState('playing'); startFrames(); }
      else video.pause();
    });
    listen(video, 'waiting', () => {
      stopFrames();
      if (runnable() && requested) setState('loading');
    });
    listen(video, 'ended', () => {
      completed = true; requested = false; autoPending = false;
      generation++; starting = false;
      clearTimer(); stopFrames();
      try { drawFrame(); } catch (error) { fallback(error); return; }
      setState('held');
      emit('ended', { currentTime: video.currentTime, duration: video.duration });
    });
    listen(video, 'error', () => {
      if (video.getAttribute('src')) fallback(new Error('Cannot load or decode the dog action video.'));
    });
    listen(canvas, 'webglcontextlost', event => {
      event.preventDefault();
      fallback(new Error('WebGL context lost.'));
    });
    listen(window, 'load', queuePreload);
    listen(document, 'visibilitychange', sync);
    listen(window, 'pagehide', () => { pageHidden = true; sync(); });
    listen(window, 'pageshow', () => { pageHidden = false; sync(); });
    if (preference.addEventListener) listen(preference, 'change', sync);
    else {
      preference.addListener(sync);
      removers.push(() => preference.removeListener(sync));
    }
    if (connection?.addEventListener) listen(connection, 'change', sync);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const entry = entries[0];
        updateVisibility(entry.isIntersecting && entry.intersectionRatio > 0 && (visible || entry.intersectionRatio >= 0.35));
      }, { threshold: [0, 0.35] });
      observer.observe(root);
    } else {
      const checkVisible = () => {
        const box = root.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0));
        updateVisibility(box.right > 0 && box.left < window.innerWidth && overlap > 0 && (visible || overlap >= box.height * 0.35));
      };
      listen(window, 'scroll', checkVisible, { passive: true });
      listen(window, 'resize', checkVisible, { passive: true });
      checkVisible();
    }
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);
    } else listen(window, 'resize', resize, { passive: true });

    const api = Object.freeze({
      play, replay,
      pause() { if (!destroyed) { manualPause = true; sync(); } },
      resume() { if (!destroyed) { manualPause = false; sync(); } },
      drawFrame() {
        try { return drawFrame(); } catch (error) { fallback(error); return false; }
      },
      destroy() {
        if (destroyed) return;
        suspend();
        destroyed = true;
        clearTimeout(preloadTimer);
        removers.forEach(remove => remove());
        observer?.disconnect(); resizeObserver?.disconnect();
        video.removeAttribute('src'); video.load();
        release(); canvas.remove(); video.remove();
        root.classList.remove('dog-motion', 'dog-motion--has-frame');
        delete root.dataset.dogMotionState;
        state = 'destroyed';
        mounted.delete(root);
      },
      get state() { return state; },
      get video() { return video; },
      get canvas() { return canvas; },
      get gl() { return gl; }
    });
    mounted.set(root, api);
    sync();
    return api;
  }

  window.UnitabsDogMotion = Object.freeze({ mount });
})();
