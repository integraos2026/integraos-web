// IntegraOS: phone menu, the "Estás aquí" route bar and the quote form. No dependencies.
(() => {
  // ---- phone menu ----
  const menuBtn = document.querySelector('.top__menu');
  const menu = document.getElementById('menu');
  if (menuBtn && menu) {
    const set = open => {
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Cerrar el menú' : 'Abrir el menú');
    };
    menuBtn.addEventListener('click', () => set(!menu.classList.contains('is-open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { set(false); menuBtn.focus(); } });
  }

  // ---- "Estás aquí": the route bar under the header marks the section in view and fills the line up to it ----
  const route = document.querySelector('.routebar ol');
  if (route && 'IntersectionObserver' in window) {
    const links = [...route.querySelectorAll('a')];
    const now = document.querySelector('.routebar__now');
    const narrow = matchMedia('(max-width: 860px)');
    const syncNarrow = () => links.forEach(a => narrow.matches ? a.setAttribute('tabindex', '-1') : a.removeAttribute('tabindex'));
    syncNarrow(); narrow.addEventListener('change', syncNarrow);
    const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const mark = i => {
      links.forEach((a, k) => { a.removeAttribute('aria-current'); a.classList.toggle('is-passed', k < i); });
      links[i].setAttribute('aria-current', 'location');
      if (now) now.textContent = links[i].textContent.trim();
      route.style.setProperty('--route-progress', `${(i / (links.length - 1)) * 100}%`);
    };
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (!visible.length) return;
      const i = sections.indexOf(visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0].target);
      if (i >= 0) mark(i);
    }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, .25, .5] });
    sections.forEach(sec => io.observe(sec));
    mark(0);
  }

  // ---- quote links: "Pedir presupuesto para esto" pre-selects the service or the plan in the form ----
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-servicio], [data-modalidad]');
    if (!a) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el && v && [...el.options].some(o => o.text === v)) el.value = v; };
    set('f-service', a.dataset.servicio);
    set('f-plan', a.dataset.modalidad);
  });

  // ---- the train rides again each time the hero map comes back on screen after having left it ----
  const trains = [...document.querySelectorAll('.m-train')];
  const heroMap = document.getElementById('inicio');
  if (trains.length && heroMap && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let left = false;
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) { left = true; return; }
      if (left && e.intersectionRatio >= 0.5) {
        left = false;
        trains.forEach(t => { t.style.animation = 'none'; void t.getBoundingClientRect(); t.style.animation = ''; });
      }
    }, { threshold: [0, 0.5] }).observe(heroMap);
  }

  // ---- phone action bar: shown after the hero's actions scroll away, hidden while the form is on screen ----
  const bar = document.querySelector('.actionbar');
  if (bar && 'IntersectionObserver' in window) {
    bar.hidden = false;
    const hero = document.getElementById('inicio'), quote = document.getElementById('presupuesto');
    let pastHero = false, atForm = false;
    const update = () => {
      const show = pastHero && !atForm;
      bar.classList.toggle('is-shown', show);
      bar.inert = !show;
    };
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; update(); }).observe(hero);
    new IntersectionObserver(([e]) => { atForm = e.isIntersecting; update(); }, { threshold: .15 }).observe(quote);
    update();
  }

  // ---- quote form: errors under their fields, a real send only with an endpoint ----
  const form = document.querySelector('form.form');
  if (form) {
    const status = form.querySelector('.form__status');
    const rules = {
      'f-name': el => el.value.trim().length > 0,
      'f-email': el => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()),
      'f-msg': el => el.value.trim().length > 0,
    };
    const check = () => {
      let first = null, count = 0;
      for (const [id, ok] of Object.entries(rules)) {
        const el = document.getElementById(id), err = document.getElementById(`${id}-err`);
        const valid = ok(el);
        el.setAttribute('aria-invalid', String(!valid));
        if (err) err.hidden = valid;
        if (!valid) { count++; first = first || el; }
      }
      return { first, count };
    };
    form.addEventListener('submit', async e => {
      const { first, count } = check();
      if (count) {
        e.preventDefault();
        status.textContent = count === 1 ? 'Revisa el campo marcado.' : `Revisa los ${count} campos marcados.`;
        first.focus();
        return;
      }
      const endpoint = form.dataset.endpoint;
      if (!endpoint) { status.textContent = 'Abriendo tu programa de correo con la petición…'; return; } // mailto stand-in
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; status.textContent = 'Enviando…';
      try {
        const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        status.textContent = 'Hemos recibido tu petición de presupuesto. Te responderemos por email.';
      } catch {
        status.textContent = 'No se ha podido enviar. Inténtalo de nuevo en unos minutos; lo que has escrito sigue aquí.';
      } finally { btn.disabled = false; }
    });
    form.addEventListener('input', e => {
      const id = e.target.id;
      if (rules[id] && e.target.getAttribute('aria-invalid') === 'true' && rules[id](e.target)) {
        e.target.setAttribute('aria-invalid', 'false');
        const err = document.getElementById(`${id}-err`); if (err) err.hidden = true;
      }
    });
  }
})();
