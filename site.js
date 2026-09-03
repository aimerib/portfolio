/* Aimeri Baddouh Photography — site behaviour.
   No dependencies. Everything here is progressive enhancement:
   the pages read fine with JS disabled. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const isSmall = matchMedia('(max-width: 899px)');
  const isNarrow = matchMedia('(max-width: 719px)');

  /* ---------- Nav: scrolled state + full-screen menu ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => root.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = document.querySelector('.nav__menu');
  const menu = document.querySelector('.menu');
  if (menuBtn && menu) {
    const setMenu = (open) => {
      root.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      if (open) { menu.setAttribute('tabindex', '-1'); menu.focus({ preventScroll: true }); }
      else menuBtn.focus({ preventScroll: true });
    };
    menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false); });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => root.classList.remove('menu-open')));
    isSmall.addEventListener('change', (e) => { if (!e.matches) setMenu(false); });
  }

  /* ---------- Images: fade in when decoded ---------- */
  const markLoaded = (img) => img.classList.add('is-loaded');
  document.querySelectorAll('.ph img').forEach((img) => {
    if (img.complete && img.naturalWidth) markLoaded(img);
    else img.addEventListener('load', () => markLoaded(img), { once: true });
    img.addEventListener('error', () => markLoaded(img), { once: true });
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Theme: the page changes its light as chapters pass ---------- */
  const triggers = document.querySelectorAll('[data-theme-trigger]');
  if (triggers.length) {
    const base = root.dataset.theme || 'cream';
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) root.dataset.theme = en.target.dataset.themeTrigger;
      });
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    triggers.forEach((el) => io.observe(el));
    // Back above the first trigger → base theme.
    const first = triggers[0];
    const top = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.boundingClientRect.top > 0 && !en.isIntersecting) root.dataset.theme = base; });
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    top.observe(first);
  }

  /* ---------- Hero: crossfade on small screens, parallax on large ---------- */
  const hero = document.querySelector('.hero');
  if (hero) {
    const panels = [...hero.querySelectorAll('.hero__panel')];
    const dots = [...hero.querySelectorAll('.hero__dots span')];
    let idx = 0, timer = null;
    const show = (i) => {
      idx = (i + panels.length) % panels.length;
      panels.forEach((p, k) => p.classList.toggle('is-active', k === idx));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === idx));
    };
    const start = () => {
      stop();
      show(idx);
      if (!reduceMotion.matches && isSmall.matches) timer = setInterval(() => show(idx + 1), 5200);
    };
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    start();
    isSmall.addEventListener('change', start);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    // Gentle parallax on the hero images (desktop only, no reduced motion)
    if (!reduceMotion.matches) {
      const imgs = hero.querySelectorAll('.hero__img');
      let ticking = false;
      const update = () => {
        ticking = false;
        if (isSmall.matches) return;
        const y = Math.min(scrollY, innerHeight);
        imgs.forEach((im) => im.style.setProperty('--py', (y * 0.18).toFixed(1) + 'px'));
        hero.querySelector('.hero__content')?.style.setProperty('opacity', String(Math.max(0, 1 - y / (innerHeight * 0.6))));
      };
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      update();
    }
  }

  /* ---------- Collage parallax (home chapters) ---------- */
  const px = [...document.querySelectorAll('.collage__item[data-speed] > .px')];
  if (px.length && !reduceMotion.matches) {
    let ticking = false;
    const update = () => {
      ticking = false;
      if (isSmall.matches) { px.forEach((el) => el.style.removeProperty('--py')); return; }
      const vh = innerHeight;
      px.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;
        const speed = parseFloat(el.parentElement.dataset.speed) || 0;
        const centre = r.top + r.height / 2 - vh / 2;
        el.style.setProperty('--py', (-centre * speed).toFixed(1) + 'px');
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- Justified gallery rows ---------- */
  document.querySelectorAll('.justified').forEach((grid) => {
    const items = [...grid.children].filter((el) => el.classList.contains('ph'));
    const ratios = items.map((el) => (parseFloat(el.dataset.w) || 3) / (parseFloat(el.dataset.h) || 2));
    const pattern = (grid.dataset.rows || '0.5,0.36,0.44').split(',').map(Number);

    const layout = () => {
      if (isNarrow.matches) {
        grid.classList.remove('is-rows');
        grid.classList.add('is-cols');
        items.forEach((el) => { el.style.width = ''; el.style.height = ''; });
        return;
      }
      grid.classList.remove('is-cols');
      const width = grid.clientWidth;
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 8;
      const vh = innerHeight;
      const rows = [];
      let row = [], sum = 0, r = 0;
      items.forEach((el, i) => {
        row.push(i); sum += ratios[i];
        const target = Math.min(720, Math.max(240, vh * pattern[r % pattern.length]));
        if (sum * target + gap * (row.length - 1) >= width) { rows.push({ row, sum, target }); row = []; sum = 0; r++; }
      });
      if (row.length) rows.push({ row, sum, target: Math.min(720, Math.max(240, vh * pattern[r % pattern.length])), last: true });

      rows.forEach(({ row, sum, target, last }) => {
        const avail = width - gap * (row.length - 1);
        let h = avail / sum;
        if (last && h > target * 1.15) h = target * 1.15;
        let used = 0;
        row.forEach((i, k) => {
          const el = items[i];
          let w = Math.floor(ratios[i] * h);
          if (!last && k === row.length - 1) w = Math.floor(avail - used) - 1; // absorb rounding; 1px slack keeps flex-wrap honest
          used += w;
          el.style.width = w + 'px';
          el.style.height = Math.round(h) + 'px';
        });
      });
      grid.classList.add('is-rows');
    };
    layout();
    let raf = 0;
    addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); });
    if (document.fonts) document.fonts.ready.then(layout);
  });

  /* ---------- Lightbox ---------- */
  const galleries = document.querySelectorAll('[data-lightbox]');
  if (galleries.length && 'HTMLDialogElement' in window) {
    const dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.setAttribute('aria-label', 'Photo viewer');
    dlg.innerHTML = `
      <div class="lb__bar">
        <span class="lb__counter mono" aria-live="polite"></span>
        <button type="button" class="lb__close" data-close>Close
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>
        </button>
      </div>
      <div class="lb__stage" tabindex="-1">
        <figure class="lb__fig"><img class="lb__img" alt="" draggable="false"></figure>
      </div>
      <button type="button" class="lb__arrow lb__arrow--prev" data-prev aria-label="Previous photo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
      <button type="button" class="lb__arrow lb__arrow--next" data-next aria-label="Next photo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
      </button>
      <div class="lb__cap"><em class="lb__text"></em><span class="lb__hint">← → to browse · esc to close</span></div>`;
    document.body.appendChild(dlg);

    const img = dlg.querySelector('.lb__img');
    const stage = dlg.querySelector('.lb__stage');
    const counter = dlg.querySelector('.lb__counter');
    const text = dlg.querySelector('.lb__text');
    let list = [], idx = 0, pushed = false;

    const pad = (n) => String(n).padStart(2, '0');
    const preload = (i) => { const a = list[(i + list.length) % list.length]; if (a) { const im = new Image(); im.srcset = a.dataset.srcset || ''; im.sizes = '100vw'; im.src = a.href; } };

    const render = (i, animate = true) => {
      idx = (i + list.length) % list.length;
      const a = list[idx];
      const swap = () => {
        img.srcset = a.dataset.srcset || '';
        img.sizes = '100vw';
        img.src = a.href;
        img.alt = a.dataset.caption || '';
        text.textContent = a.dataset.caption || '';
        counter.textContent = `${pad(idx + 1)} / ${pad(list.length)}`;
        const done = () => img.classList.remove('is-swapping');
        if (img.decode) img.decode().then(done, done); else done();
      };
      if (animate && !reduceMotion.matches) { img.classList.add('is-swapping'); setTimeout(swap, 160); } else swap();
      preload(idx + 1); preload(idx - 1);
    };

    const open = (links, i) => {
      list = links; render(i, false);
      root.classList.add('lb-open');
      dlg.showModal();
      stage.focus({ preventScroll: true });
      try { history.pushState({ lb: true }, ''); pushed = true; } catch (_) {}
    };
    const close = () => { if (dlg.open) dlg.close(); };
    dlg.addEventListener('close', () => {
      root.classList.remove('lb-open');
      if (pushed) { pushed = false; history.back(); }
      list[idx]?.focus({ preventScroll: true });
    });
    addEventListener('popstate', () => { if (dlg.open) { pushed = false; close(); } });

    dlg.querySelector('[data-close]').addEventListener('click', close);
    dlg.querySelector('[data-prev]').addEventListener('click', () => render(idx - 1));
    dlg.querySelector('[data-next]').addEventListener('click', () => render(idx + 1));
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.classList.contains('lb__stage')) close(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); render(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); render(idx - 1); }
    });

    // Swipe
    let sx = 0, sy = 0, dragging = false;
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; dragging = true; });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      img.style.transform = `translateX(${dx * 0.6}px)`;
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      img.style.transform = '';
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) render(dx < 0 ? idx + 1 : idx - 1);
      else if (Math.abs(dy) > 90 && Math.abs(dy) > Math.abs(dx)) close();
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    galleries.forEach((g) => {
      const links = [...g.querySelectorAll('a.ph__link')];
      links.forEach((a, i) => a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        open(links, i);
      }));
    });
  }
})();
