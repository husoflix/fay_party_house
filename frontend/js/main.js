(() => {
  const API = '/api';
  const $ = (s) => document.querySelector(s);
  const money = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let products = [];
  let activeCat = '';

  /* ---------- Navbar & reveal ---------- */
  const nav = $('#mainNav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  $('#year').textContent = new Date().getFullYear();

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  const observeReveals = () => document.querySelectorAll('.reveal:not(.visible)').forEach((el) => io.observe(el));

  // Mobil menüyü link tıklanınca kapat
  document.querySelectorAll('#navMenu .nav-link, #navMenu .btn').forEach((a) =>
    a.addEventListener('click', () => {
      const c = bootstrap.Collapse.getInstance($('#navMenu'));
      if (c) c.hide();
    })
  );

  /* ---------- Render ---------- */
  function card(p) {
    return `
      <div class="col-sm-6 col-lg-4 col-xl-3 reveal">
        <article class="p-card" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)} detayları">
          <div class="p-img-wrap">
            <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
            ${p.category_name ? `<span class="p-tag">${esc(p.category_name)}</span>` : ''}
          </div>
          <div class="p-body">
            <h3>${esc(p.name)}</h3>
            <p class="p-desc">${esc(p.description)}</p>
            <div class="p-price">${money(p.price)} <small>₺</small></div>
          </div>
        </article>
      </div>`;
  }

  function renderMenu() {
    const list = activeCat ? products.filter((p) => p.category_slug === activeCat) : products;
    $('#menuGrid').innerHTML = list.map(card).join('');
    $('#menuEmpty').classList.toggle('d-none', list.length > 0);
    observeReveals();
  }

  function renderTabs(categories) {
    const used = new Set(products.map((p) => p.category_slug));
    const tabs = categories.filter((c) => used.has(c.slug));
    if (tabs.length > 0 && (!activeCat || !tabs.some((t) => t.slug === activeCat))) {
      activeCat = tabs[0].slug;
    }
    const wrap = $('#categoryTabs');
    wrap.innerHTML = tabs
      .map((c) => `<button type="button" class="cat-btn ${c.slug === activeCat ? 'active' : ''}" data-cat="${esc(c.slug)}">${esc(c.name)}</button>`)
      .join('');
    wrap.onclick = (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      activeCat = btn.dataset.cat;
      wrap.querySelectorAll('.cat-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderMenu();
    };
  }

  /* ---------- Modal ---------- */
  const modal = new bootstrap.Modal($('#productModal'));
  function openProduct(id) {
    const p = products.find((x) => x.id === Number(id));
    if (!p) return;
    $('#pmImg').src = p.image;
    $('#pmImg').alt = p.name;
    $('#pmTitle').textContent = p.name;
    $('#pmCat').textContent = p.category_name || '';
    $('#pmDesc').textContent = p.description || '';
    $('#pmPrice').textContent = `${money(p.price)} ₺`;
    modal.show();
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest('.p-card');
    if (c) openProduct(c.dataset.id);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList?.contains('p-card')) openProduct(e.target.dataset.id);
  });

  /* ---------- Load ---------- */
  async function init() {
    try {
      const [pRes, cRes] = await Promise.all([fetch(`${API}/products`), fetch(`${API}/categories`)]);
      products = await pRes.json();
      const categories = await cRes.json();

      renderTabs(categories);
      renderMenu();
      observeReveals();
    } catch (err) {
      $('#menuGrid').innerHTML = '<p class="text-center text-danger">Menü yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>';
    }
  }

  observeReveals();
  init();
})();
