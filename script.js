/* Progressive enhancement. The HTML, links and static field work independently. */
(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const compact = matchMedia('(max-width: 600px)');
  const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const sections = $$('[data-section]');
  const navLinks = $$('[data-nav]');
  const navbar = $('#navbar');
  const menu = $('#mobileMenu');
  const menuToggle = $('#menuToggle');
  const motionToggle = $('#motionToggle');
  const main = $('#main');
  const progress = $('.page-progress');
  const spine = $('#spineProgress');
  const canvas = $('#signalCanvas');
  const roles = $$('.role, .brand-block');
  const timelines = $$('.timeline, .previous-roles');
  let userPaused = false;
  try { userPaused = sessionStorage.getItem('bf-motion') === 'paused'; } catch {}
  let motionOff = reduced.matches || userPaused;
  let frame = 0;
  let scrollDirty = true;
  let layoutDirty = true;
  let fieldDirty = true;
  let pageHeight = 1;
  let width = innerWidth;
  let height = innerHeight;
  let sectionBounds = [];
  let roleBounds = [];
  let timelineBounds = [];
  let active = '';
  let clockTimer = 0;
  let openingTimer = 0;
  let menuFocusTimer = 0;
  let elapsed = 0;
  let previousTime = 0;
  let visibleEnd = true;
  let heroVisible = true;
  const pointer = { x: width * .75, y: height * .45, targetX: width * .75, targetY: height * .45, active: false };
  const qa = new URLSearchParams(location.search).has('qa');
  const metrics = { frames: 0, cost: 0, intervals: [], last: 0 };
  let ctx = null;
  try { ctx = canvas?.getContext('2d', { alpha: true }); } catch {}
  if (ctx) root.classList.add('canvas-ready');

  // One animation scheduler owns canvas, scroll updates and pointer interpolation.
  // No frame reads layout. Bounds are refreshed only for resize/font/content changes.
  const schedule = () => {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const invalidateLayout = () => {
    layoutDirty = scrollDirty = fieldDirty = true;
    schedule();
  };
  const refreshBounds = () => {
    width = innerWidth;
    height = innerHeight;
    sectionBounds = sections.map(el => ({ el, top: el.offsetTop, height: el.offsetHeight }));
    roleBounds = roles.map(el => ({ el, top: el.getBoundingClientRect().top + scrollY }));
    timelineBounds = timelines.map(el => ({ el, top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight }));
    pageHeight = Math.max(1, document.documentElement.scrollHeight - height);
    if (ctx) {
      const dpr = Math.min(devicePixelRatio || 1, compact.matches ? 1.35 : 1.6);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    layoutDirty = false;
  };

  function setMenu(open, restoreFocus = true) {
    body.classList.toggle('menu-open', open);
    menu.inert = !open;
    menu.setAttribute('aria-hidden', String(!open));
    main.inert = open;
    if (open) main.setAttribute('aria-hidden', 'true');
    else main.removeAttribute('aria-hidden');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    clearTimeout(menuFocusTimer);
    if (open) menuFocusTimer = setTimeout(() => {
      if (body.classList.contains('menu-open')) menu.querySelector('a').focus({ preventScroll: true });
    }, 80);
    else if (restoreFocus) menuToggle.focus({ preventScroll: true });
    previousTime = 0;
    fieldDirty = true;
    schedule();
  }
  menuToggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  document.addEventListener('keydown', event => {
    if (!body.classList.contains('menu-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenu(false);
    }
    if (event.key === 'Tab') {
      const stops = [...navbar.querySelectorAll('a, button:not([hidden])'), ...menu.querySelectorAll('a')]
        .filter(el => el.getClientRects().length);
      const current = stops.indexOf(document.activeElement);
      const next = (current + (event.shiftKey ? -1 : 1) + stops.length) % stops.length;
      event.preventDefault();
      stops[next].focus();
    }
  });
  compact.addEventListener('change', () => {
    if (!compact.matches && body.classList.contains('menu-open')) setMenu(false, false);
    invalidateLayout();
  });

  // Native anchors retain browser history, deep links and normal scrolling.
  $$('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    if (body.classList.contains('menu-open')) setMenu(false, false);
    target.querySelectorAll('[data-reveal-pending]').forEach(el => el.removeAttribute('data-reveal-pending'));
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }));

  function updateMotion() {
    motionOff = reduced.matches || userPaused;
    root.dataset.motion = motionOff ? 'off' : 'on';
    motionToggle.setAttribute('aria-pressed', String(motionOff));
    motionToggle.setAttribute('aria-label', reduced.matches ? 'Reduced motion is enabled in your system' : motionOff ? 'Resume ambient animation' : 'Pause ambient animation');
    motionToggle.disabled = reduced.matches;
    $('#motionLabel').textContent = reduced.matches ? 'Reduced motion' : motionOff ? 'Motion off' : 'Motion on';
    if (motionOff) {
      $$('[data-reveal-pending]').forEach(el => el.removeAttribute('data-reveal-pending'));
      root.classList.remove('intro-play');
    }
    previousTime = 0;
    fieldDirty = scrollDirty = true;
    schedule();
  }
  motionToggle.hidden = !ctx;
  motionToggle.addEventListener('click', () => {
    userPaused = !userPaused;
    try { sessionStorage.setItem('bf-motion', userPaused ? 'paused' : 'playing'); } catch {}
    updateMotion();
  });
  reduced.addEventListener('change', updateMotion);
  updateMotion();

  // Only mark off-screen elements after a functioning observer exists.
  // Failure before this point leaves all reading content visible.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.removeAttribute('data-reveal-pending');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0, rootMargin: '0px 0px -4% 0px' });
    $$('.reveal').forEach(el => {
      if (!motionOff && el.getBoundingClientRect().top > height) {
        el.setAttribute('data-reveal-pending', '');
        revealObserver.observe(el);
      }
    });
    // Headline masks animate once, independently of paragraph reading areas.
    $$('.cinematic-heading').forEach(el => {
      if (!motionOff && !el.closest('.expertise-intro') && el.getBoundingClientRect().top > height) {
        el.setAttribute('data-reveal-pending', '');
        revealObserver.observe(el);
      }
    });
    const visibility = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'home') heroVisible = entry.isIntersecting;
        else visibleEnd = entry.isIntersecting;
      });
      previousTime = 0;
      fieldDirty = true;
      schedule();
    }, { threshold: 0 });
    visibility.observe($('#home'));
    visibility.observe($('#connect'));
  }

  const clock = () => {
    clearTimeout(clockTimer);
    if (document.hidden) return;
    const now = new Date();
    $('#year').textContent = now.getFullYear();
    $('#hkTime').textContent = 'Hong Kong · HKT ' + new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(now);
    $('#hkDate').textContent = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Hong_Kong', day: '2-digit', month: 'short', year: 'numeric'
    }).format(now);
    clockTimer = setTimeout(clock, 60000 - now.getSeconds() * 1000);
  };
  clock();

  let copyTimer = 0;
  const copyButton = $('#copyEmail');
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    let copied = false;
    const email = 'ben.fong@bahpartners.com';
    try {
      await navigator.clipboard.writeText(email);
      copied = true;
    } catch {
      const fallback = document.createElement('textarea');
      fallback.value = email;
      fallback.className = 'sr-only';
      fallback.setAttribute('readonly', '');
      document.body.append(fallback);
      fallback.select();
      try { copied = document.execCommand('copy'); } catch {}
      fallback.remove();
      copyButton.focus({ preventScroll: true });
    }
    clearTimeout(copyTimer);
    copyButton.classList.toggle('is-copied', copied);
    copyButton.textContent = copied ? 'Email copied' : 'Try email link';
    $('#copyStatus').textContent = copied ? 'Email address copied to clipboard.' : 'Copy unavailable. Use the email link: ' + email;
    copyTimer = setTimeout(() => {
      copyButton.textContent = 'Copy email';
      copyButton.classList.remove('is-copied');
    }, 2400);
  });

  function updateScroll() {
    const y = scrollY;
    const marker = y + height * .42;
    let selected = sections[0];
    sectionBounds.forEach(item => { if (item.top <= marker) selected = item.el; });
    if (y >= pageHeight - 3) selected = sections.at(-1);
    if (active !== selected.id) {
      active = selected.id;
      root.dataset.section = active;
      navLinks.forEach(link => {
        if (link.dataset.nav === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    const fraction = clamp(y / pageHeight);
    progress.style.transform = 'scaleX(' + fraction + ')';
    spine.style.transform = 'scaleY(' + fraction + ')';
    navbar.classList.toggle('is-scrolled', y > 28);
    timelineBounds.forEach(item => {
      const fill = motionOff ? 1 : clamp((marker - item.top) / item.height);
      item.el.style.setProperty('--line-progress', fill);
    });
    roleBounds.forEach(item => item.el.classList.toggle('is-active', motionOff || item.top < marker));
    scrollDirty = false;
  }

  // A toroidal signal surface, sampled as fine threads and points. This is an
  // abstract field; it contains no invented market values or geographic claims.
  const TAU = Math.PI * 2;
  const presets = [
    { x: .78, y: .43, sx: 1, sy: 1, tilt: -.58, alpha: .92, lanes: 0 },
    { x: .25, y: .44, sx: 1.12, sy: .84, tilt: .15, alpha: .22, lanes: 0 },
    { x: .73, y: .46, sx: 1.35, sy: .45, tilt: -.08, alpha: .12, lanes: .85 },
    { x: .83, y: .48, sx: .63, sy: 1.45, tilt: .35, alpha: .10, lanes: 0 },
    { x: .73, y: .47, sx: .8, sy: .8, tilt: -.4, alpha: .65, lanes: 0 }
  ];
  function fieldState() {
    const marker = scrollY + height * .6;
    let state = { ...presets[0] };
    for (let i = 1; i < sectionBounds.length; i++) {
      const t = smooth(clamp((marker - sectionBounds[i].top + height * .22) / (height * .72)));
      if (!t) break;
      Object.keys(state).forEach(key => { state[key] = lerp(state[key], presets[i][key], t); });
    }
    if (compact.matches) {
      state.x = lerp(.76, state.x, .48);
      state.y = active === 'home' ? .34 : state.y;
      state.alpha *= .84;
    }
    return state;
  }
  function point(u, v, time, state, radius) {
    const weave = v + .55 * Math.sin(u * 2 + time * .12);
    const tube = radius * (.19 + .035 * Math.sin(u * 3 - time * .15));
    let x = (radius + tube * Math.cos(weave)) * Math.cos(u);
    let y = (radius + tube * Math.cos(weave)) * Math.sin(u) * .8;
    const z = tube * Math.sin(weave);
    const incline = .65 + Math.sin(time * .065) * .09;
    y = y * Math.cos(incline) - z * Math.sin(incline);
    const angle = state.tilt + Math.sin(time * .075) * .045;
    const rx = x * Math.cos(angle) - y * Math.sin(angle);
    const ry = x * Math.sin(angle) + y * Math.cos(angle);
    x = rx * state.sx;
    y = ry * state.sy;
    if (state.lanes) {
      x = lerp(x, (u / TAU - .5) * radius * 3.1, state.lanes);
      y = lerp(y, Math.sin(v) * radius * .55, state.lanes);
    }
    x += width * state.x;
    y += height * state.y;
    // Small local refraction, with no cursor decoration or moving reading text.
    let influence = 0;
    if (pointer.active && !motionOff && active === 'home') {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      influence = Math.pow(clamp(1 - distance / 125), 2);
      x += dx * influence * .22;
      y += dy * influence * .22;
    }
    const depth = (Math.sin(weave) + 1) / 2;
    return { x, y, depth, influence };
  }

  function drawField(time) {
    if (!ctx) return;
    const start = qa ? performance.now() : 0;
    const state = fieldState();
    const radius = compact.matches ? width * .49 : Math.min(width * .285, height * .46, 540);
    const bands = compact.matches ? 16 : 24;
    const samples = compact.matches ? 52 : 72;
    ctx.clearRect(0, 0, width, height);
    const halo = ctx.createRadialGradient(width * state.x, height * state.y, radius * .1, width * state.x, height * state.y, radius * 1.45);
    halo.addColorStop(0, 'rgba(183,154,115,0)');
    halo.addColorStop(.66, 'rgba(183,154,115,' + .035 * state.alpha + ')');
    halo.addColorStop(1, 'rgba(183,154,115,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);
    for (let band = 0; band < bands; band++) {
      const v = band / bands * TAU;
      const points = [];
      ctx.beginPath();
      for (let step = 0; step <= samples; step++) {
        const p = point(step / samples * TAU + time * .018, v, time, state, radius);
        if (step < samples) points.push(p);
        if (!step) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(183,154,115,' + (.055 + (Math.sin(v) + 1) * .033) * state.alpha + ')';
      ctx.lineWidth = .65;
      ctx.stroke();
      // Batch point colours and reuse the thread samples. Avoid thousands of
      // canvas state changes and repeated trigonometry every frame.
      for (let bucket = 0; bucket < 3; bucket++) {
        ctx.fillStyle = 'rgba(212,188,153,' + (.16 + bucket * .15) * state.alpha + ')';
        for (const p of points) {
          if (Math.min(2, Math.floor((p.depth + p.influence) * 3)) !== bucket) continue;
          const size = .7 + bucket * .3;
          ctx.fillRect(p.x, p.y, size, size);
        }
      }
      // Three quiet packets travel within the geometry; no pulsing UI text.
      if (band % Math.ceil(bands / 3) === 0) {
        const u = (time * .095 + band * .33) % TAU;
        const p = point(u, v, time, state, radius);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, TAU);
        ctx.fillStyle = 'rgba(232,211,180,' + state.alpha * .85 + ')';
        ctx.fill();
      }
    }
    // Sparse deterministic points around the surface make its edges dissolve.
    const dust = compact.matches ? 44 : 96;
    ctx.fillStyle = 'rgba(183,154,115,' + state.alpha * .15 + ')';
    for (let i = 0; i < dust; i++) {
      const angle = i * 2.39996 + time * .002;
      const r = radius * (1.18 + (i % 17) / 30);
      const x = width * state.x + Math.cos(angle) * r * state.sx;
      const y = height * state.y + Math.sin(angle) * r * .69 * state.sy;
      ctx.fillRect(x, y, .7, .7);
    }
    if (qa) {
      metrics.frames++;
      metrics.cost += performance.now() - start;
      if (metrics.last) metrics.intervals.push(performance.now() - metrics.last);
      metrics.last = performance.now();
      if (metrics.frames % 60 === 0) {
        const sorted = metrics.intervals.slice(-120).filter(n => n < 100).sort((a, b) => a - b);
        canvas.dataset.frames = String(metrics.frames);
        canvas.dataset.drawMs = (metrics.cost / metrics.frames).toFixed(2);
        canvas.dataset.frameMs = sorted.length ? sorted[Math.floor(sorted.length / 2)].toFixed(2) : '0';
      }
      if (metrics.intervals.length > 180) metrics.intervals.splice(0, 60);
    }
  }

  function tick(now) {
    frame = 0;
    if (document.hidden) return;
    if (layoutDirty) refreshBounds();
    if (scrollDirty) { updateScroll(); fieldDirty = true; }
    const flowing = !motionOff && !body.classList.contains('menu-open') && ((heroVisible && active === 'home') || (visibleEnd && active === 'connect'));
    const delta = previousTime ? Math.min(now - previousTime, 40) : 16.67;
    previousTime = flowing ? now : 0;
    if (flowing) elapsed += delta * .001;
    pointer.x = lerp(pointer.x, pointer.targetX, .12);
    pointer.y = lerp(pointer.y, pointer.targetY, .12);
    if (flowing || fieldDirty) {
      drawField(motionOff ? 0 : elapsed);
      fieldDirty = false;
    }
    if (qa) canvas.dataset.running = String(flowing && !!ctx);
    if (flowing && ctx) schedule();
  }
  addEventListener('scroll', () => { scrollDirty = true; schedule(); }, { passive: true });
  addEventListener('resize', invalidateLayout, { passive: true });
  addEventListener('pointermove', event => {
    if (!fine.matches || motionOff || active !== 'home') return;
    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
    pointer.active = true;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  // Touch briefly refracts the same field without interfering with page gestures.
  $('#home').addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || motionOff) return;
    pointer.x = pointer.targetX = event.clientX;
    pointer.y = pointer.targetY = event.clientY;
    pointer.active = true;
  }, { passive: true });
  addEventListener('pointerup', () => { if (!fine.matches) pointer.active = false; }, { passive: true });
  addEventListener('pointercancel', () => { pointer.active = false; }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    clearTimeout(clockTimer);
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      if (qa) canvas.dataset.running = 'false';
    } else {
      clock();
      invalidateLayout();
    }
  });
  addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    clearTimeout(clockTimer);
    clearTimeout(copyTimer);
    clearTimeout(openingTimer);
    clearTimeout(menuFocusTimer);
  });
  addEventListener('pageshow', () => { clock(); invalidateLayout(); });
  if ('ResizeObserver' in window) new ResizeObserver(invalidateLayout).observe(main);
  document.fonts?.ready.then(invalidateLayout);
  let seen = false;
  try {
    seen = sessionStorage.getItem('bf-intro') === 'seen';
    sessionStorage.setItem('bf-intro', 'seen');
  } catch {}
  if (!seen && !motionOff && !location.hash) {
    root.classList.add('intro-play');
    openingTimer = setTimeout(() => root.classList.remove('intro-play'), 1700);
  }
  root.classList.add('enhanced');
  invalidateLayout();
})();
