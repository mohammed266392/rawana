(() => {
  'use strict';
  const TOTAL = 61;
  const STATES = [0, 60];
  const PLAY_MS = 2300;
  const HIDE_MS = 220;
  const REVEAL_MS = 550;
  const WHEEL_THRESHOLD = 6; // Filtre les micro-jitters, sans verrouiller le geste.
  const clamp = value => Math.max(0, Math.min(1, value));
  const section = document.querySelector('#sequence');
  const stage = document.querySelector('.stage');
  const canvas = document.querySelector('#canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const counter = document.querySelector('#counter');
  const progress = document.querySelector('#progress');
  const hint = document.querySelector('#hint');
  const loadedLabel = document.querySelector('#loaded');
  const moments = [1, 2].map(id => document.querySelector(`#story-${id}`));
  const smoothstep = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  let storyActive = 0, storyAmount = 1;
  function paintStory(active, amount = 1) {
    storyActive = active;
    storyAmount = amount;
    moments.forEach((moment, i) => {
      const visibility = i === active ? amount : 0;
      moment.style.opacity = String(visibility);
      moment.style.visibility = visibility > 0 ? 'visible' : 'hidden';
      moment.style.setProperty('--reveal', String(visibility));
      moment.style.setProperty('--lift', `${(1 - visibility) * 16}px`);
      moment.setAttribute('aria-hidden', String(visibility === 0));
    });
  }
  const frames = new Array(TOTAL);
  let ready = false, loaded = 0, cursor = 1, painted = -1;
  let width = 0, height = 0, state = 0, busy = false;
  let destination = 0, position = 0, animationId = null;
  let wheelTime = -Infinity, wheelSum = 0;
  let touchY = null, touchSum = 0;

  async function loadFrame(index) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const img = new Image();
        img.decoding = 'async';
        const complete = new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Frame ${index + 1} indisponible`));
        });
        img.src = `frames/frame_${String(index + 1).padStart(3, '0')}.jpg`;
        await complete;
        await img.decode();
        frames[index] = img;
        loadedLabel.textContent = String(++loaded);
        return;
      } catch (error) {
        if (attempt === 1) throw error;
      }
    }
  }

  function draw(index) {
    if (!frames[index]) return;
    const img = frames[index];
    // Équivalent object-fit: cover : proportions conservées, recadrage centré.
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    painted = index;
    canvas.dataset.frame = String(index + 1);
    stage.classList.add('painted');
  }

  function paintFrame(index) {
    if (index !== painted) draw(index);
    counter.innerHTML = `${String(index + 1).padStart(3, '0')} <span class="separator">/</span> 061`;
    progress.style.transform = `scaleX(${index / (TOTAL - 1)})`;
  }

  function step(direction) {
    if (!ready || !direction) return;
    const next = direction > 0 ? 1 : 0;
    // Les répétitions ne redémarrent jamais le mouvement ni sa durée.
    if ((busy && next === destination) || (!busy && next === state)) return;
    if (animationId !== null) cancelAnimationFrame(animationId);
    destination = next;
    document.documentElement.classList.remove('sequence-complete');
    busy = true;
    section.dataset.phase = 'playing';
    hint.textContent = 'La matière se transforme…';
    let elapsed = 0, previousTime = performance.now();
    const from = position, to = STATES[next];
    const duration = Math.abs(to - from) / (TOTAL - 1) * PLAY_MS;
    const departingStory = storyActive, departingAmount = storyAmount;
    function animate(time) {
      if (!document.hidden) elapsed += Math.min(50, time - previousTime);
      previousTime = time;
      if (elapsed < duration) {
        paintStory(departingStory, departingAmount * (1 - smoothstep(elapsed / HIDE_MS)));
        position = from + (to - from) * clamp(elapsed / duration);
        paintFrame(Math.round(position));
      } else {
        position = to;
        paintFrame(to);
        paintStory(next, smoothstep((elapsed - duration) / REVEAL_MS));
      }
      if (elapsed < duration + REVEAL_MS) {
        animationId = requestAnimationFrame(animate);
      } else {
        animationId = null;
        state = next;
        busy = false;
        section.dataset.state = String(state + 1);
        section.dataset.phase = 'stable';
        document.documentElement.classList.toggle('sequence-complete', state === 1);
        hint.textContent = state === 1 ? 'Continuez pour découvrir la douceur du coton' : 'Faites défiler pour découvrir la matière';
      }
    }
    animationId = requestAnimationFrame(animate);
  }

  function onWheel(event) {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (nativeScroll(event.deltaY)) return;
    event.preventDefault();
    if (!ready) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    if (!delta) return;
    const now = performance.now();
    // Le silence efface seulement les micro-deltas : il n'est jamais requis.
    if (now - wheelTime > 160 || Math.sign(delta) !== Math.sign(wheelSum)) wheelSum = 0;
    wheelTime = now;
    wheelSum += delta;
    if (Math.abs(wheelSum) >= WHEEL_THRESHOLD) {
      step(Math.sign(wheelSum));
      wheelSum = 0;
    }
  }

  function onKey(event) {
    if (event.ctrlKey || event.altKey || event.metaKey || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName) || event.target.isContentEditable) return;
    const direction = ['ArrowDown', 'PageDown'].includes(event.key) || (event.key === ' ' && !event.shiftKey) ? 1
      : ['ArrowUp', 'PageUp'].includes(event.key) || (event.key === ' ' && event.shiftKey) ? -1 : 0;
    if (!direction) return;
    if (nativeScroll(direction) || event.target.closest('a')) return;
    event.preventDefault();
    if (!event.repeat) step(direction);
  }

  function nativeScroll(direction) {
    return window.scrollY > 0 || (ready && !busy && state === 1 && direction >= 0);
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    width = rect.width; height = rect.height;
    // Limite le coût GPU sur les écrans très denses, sans étirer le bitmap CSS.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const previous = painted;
    painted = -1;
    if (frames[Math.max(0, previous)]) draw(Math.max(0, previous));

  }

  async function init() {
    try {
      resize();
      await loadFrame(0);
      draw(0);
      // Quatre requêtes simultanées, ordre croissant, décodage avant interaction.
      await Promise.all(Array.from({ length: 4 }, async () => {
        while (cursor < TOTAL) await loadFrame(cursor++);
      }));
      ready = true;
      document.body.classList.remove('loading');
      hint.textContent = 'Faites défiler pour découvrir la matière';
      section.dataset.state = '1';
      section.dataset.phase = 'stable';
      paintStory(0);
      paintFrame(0);
      resize();
      document.documentElement.dataset.sequenceReady = 'true';
    } catch (error) {
      document.querySelector('#error').hidden = false;
      hint.textContent = 'Chargement incomplet';
      console.error(error);
    }
  }
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  stage.addEventListener('touchstart', event => {
    touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    touchSum = 0;
  }, { passive: true });
  stage.addEventListener('touchmove', event => {
    if (event.touches.length !== 1 || touchY === null) return;
    const y = event.touches[0].clientY;
    const delta = touchY - y;
    touchY = y;
    if (nativeScroll(delta)) return;
    event.preventDefault();
    if (delta && Math.sign(delta) !== Math.sign(touchSum)) touchSum = 0;
    touchSum += delta;
    if (Math.abs(touchSum) >= 12) {
      step(Math.sign(touchSum));
      touchSum = 0;
    }
  }, { passive: false });
  stage.addEventListener('touchend', () => { touchY = null; touchSum = 0; });
  stage.addEventListener('touchcancel', () => { touchY = null; touchSum = 0; });
  window.addEventListener('resize', resize, { passive: true });
  new ResizeObserver(resize).observe(stage);
  init();

  const card = document.querySelector('.veil-card');
  const cardObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      card.classList.add('entering');
      cardObserver.disconnect();
    }
  }, { threshold: 0.25 });
  cardObserver.observe(card);

  const video = document.querySelector('.veil-video');
  const videoToggle = document.querySelector('.video-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) { video.autoplay = false; video.pause(); }
  videoToggle.hidden = false;
  const updateVideoLabel = () => {
    videoToggle.textContent = video.paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause';
  };
  video.addEventListener('play', updateVideoLabel);
  video.addEventListener('pause', updateVideoLabel);
  videoToggle.addEventListener('click', () => {
    if (video.paused) video.play().catch(updateVideoLabel);
    else video.pause();
  });
  updateVideoLabel();
})();
