(() => {
  const API = '/api';
  const $ = (s) => document.querySelector(s);
  const money = (n) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(n);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let products = [];
  let categories = [];

  /* ---------- Yardımcılar ---------- */
  const toast = (msg) => {
    $('#toastMsg').textContent = msg;
    bootstrap.Toast.getOrCreateInstance($('#toast'), { delay: 2600 }).show();
  };

  async function api(path, opts = {}) {
    const res = await fetch(API + path, opts);
    if (res.status === 401) { location.href = '/admin/login'; throw new Error('Oturum süresi doldu.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'İşlem başarısız.');
    return data;
  }
  const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  /* ---------- Sekmeler ---------- */
  const titles = { products: 'Ürünler', categories: 'Kategoriler', settings: 'Ayarlar' };
  document.querySelectorAll('.side-link[data-tab]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.side-link[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-pane-x').forEach((p) => p.classList.toggle('d-none', p.id !== `tab-${tab}`));
      $('#pageTitle').textContent = titles[tab];
      $('#topAction').classList.toggle('d-none', tab !== 'products');
      $('#sidebar').classList.remove('open');
    })
  );
  $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#logoutBtn').addEventListener('click', async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST' });
    location.href = '/admin/login';
  });

  /* ---------- Ürün listesi ---------- */
  function renderStats() {
    const active = products.filter((p) => p.is_available).length;
    const items = [
      ['bi-grid-fill', products.length, 'Toplam ürün'],
      ['bi-check-circle-fill', active, 'Satışta'],
      ['bi-tags-fill', categories.length, 'Kategori'],
    ];
    $('#stats').innerHTML = items
      .map(([i, n, l]) => `<div class="col-md-4"><div class="stat"><div class="stat-icon"><i class="bi ${i}"></i></div><div><strong>${n}</strong><span>${l}</span></div></div></div>`)
      .join('');
  }

  function renderProducts() {
    const q = $('#searchBox').value.trim().toLocaleLowerCase('tr');
    const cat = $('#filterCat').value;
    const list = products.filter(
      (p) => (!q || p.name.toLocaleLowerCase('tr').includes(q)) && (!cat || String(p.category_id) === cat)
    );
    $('#noProducts').classList.toggle('d-none', list.length > 0);
    $('#productRows').innerHTML = list
      .map(
        (p) => `
      <tr>
        <td><img class="p-thumb" src="${esc(p.image)}" alt=""></td>
        <td><strong>${esc(p.name)}</strong>
            <div class="small text-muted text-truncate" style="max-width:260px">${esc(p.description)}</div></td>
        <td>${p.category_name ? `<span class="badge badge-soft">${esc(p.category_name)}</span>` : '<span class="text-muted">—</span>'}</td>
        <td class="fw-semibold">${money(p.price)} ₺</td>
        <td><div class="form-check form-switch m-0"><input class="form-check-input avail-toggle" type="checkbox" data-id="${p.id}" ${p.is_available ? 'checked' : ''} aria-label="Satışta"></div></td>
        <td class="text-end text-nowrap">
          <button class="icon-btn" data-edit="${p.id}" aria-label="Düzenle"><i class="bi bi-pencil-fill"></i></button>
          <button class="icon-btn danger" data-del="${p.id}" aria-label="Sil"><i class="bi bi-trash-fill"></i></button>
        </td>
      </tr>`
      )
      .join('');
  }

  $('#searchBox').addEventListener('input', renderProducts);
  $('#filterCat').addEventListener('change', renderProducts);

  $('#productRows').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) openModal(products.find((p) => p.id === Number(edit.dataset.edit)));
    if (del) {
      const p = products.find((x) => x.id === Number(del.dataset.del));
      if (!confirm(`"${p.name}" silinsin mi? Bu işlem geri alınamaz.`)) return;
      try { await api(`/products/${p.id}`, { method: 'DELETE' }); toast('Ürün silindi.'); await load(); }
      catch (ex) { toast(ex.message); }
    }
  });

  $('#productRows').addEventListener('change', async (e) => {
    const t = e.target.closest('.avail-toggle');
    if (!t) return;
    try {
      await api(`/products/${t.dataset.id}/availability`, json('PATCH', { is_available: t.checked }));
      toast(t.checked ? 'Ürün satışa açıldı.' : 'Ürün satıştan kaldırıldı.');
      const p = products.find((x) => x.id === Number(t.dataset.id));
      if (p) p.is_available = t.checked ? 1 : 0;
      renderStats();
    } catch (ex) { t.checked = !t.checked; toast(ex.message); }
  });

  /* ---------- Ürün modalı ---------- */
  const modal = new bootstrap.Modal($('#productModal'));
  const DEFAULT_IMG = '/images/placeholders/cake.svg';

  function fillCategorySelects() {
    const opts = categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    $('#pCat').innerHTML = `<option value="">Kategorisiz</option>${opts}`;
    const cur = $('#filterCat').value;
    $('#filterCat').innerHTML = `<option value="">Tüm kategoriler</option>${opts}`;
    $('#filterCat').value = cur;
  }

  function openModal(p) {
    $('#pError').classList.add('d-none');
    $('#pImage').value = '';
    $('#pmTitle').textContent = p ? 'Ürünü Düzenle' : 'Yeni Ürün';
    $('#pId').value = p ? p.id : '';
    $('#pName').value = p ? p.name : '';
    $('#pPrice').value = p ? p.price : '';
    $('#pCat').value = p && p.category_id ? p.category_id : '';
    $('#pDesc').value = p ? p.description : '';
    $('#pAvail').checked = p ? !!p.is_available : true;
    $('#pPreview').src = p ? p.image : DEFAULT_IMG;
    modal.show();
  }
  $('#addProductBtn').addEventListener('click', () => openModal(null));

  $('#pImage').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) $('#pPreview').src = URL.createObjectURL(f);
  });

  $('#productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#pError');
    err.classList.add('d-none');
    const id = $('#pId').value;
    const fd = new FormData();
    fd.append('name', $('#pName').value);
    fd.append('price', $('#pPrice').value);
    fd.append('category_id', $('#pCat').value);
    fd.append('description', $('#pDesc').value);
    fd.append('is_available', $('#pAvail').checked ? '1' : '0');
    if ($('#pImage').files[0]) fd.append('image', $('#pImage').files[0]);

    const btn = $('#pSave');
    btn.disabled = true;
    try {
      await api(id ? `/products/${id}` : '/products', { method: id ? 'PUT' : 'POST', body: fd });
      modal.hide();
      toast(id ? 'Ürün güncellendi.' : 'Ürün eklendi.');
      await load();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('d-none');
    } finally { btn.disabled = false; }
  });

  /* ---------- Kategoriler ---------- */
  function renderCategories() {
    $('#catList').innerHTML = categories.length
      ? categories
          .map(
            (c) => `
        <li class="list-group-item d-flex align-items-center gap-2 px-0">
          <i class="bi bi-tag-fill text-rose"></i>
          <span class="flex-grow-1"><strong>${esc(c.name)}</strong> <span class="badge badge-soft ms-1">${c.product_count} ürün</span></span>
          <button class="icon-btn" data-cedit="${c.id}" aria-label="Yeniden adlandır"><i class="bi bi-pencil-fill"></i></button>
          <button class="icon-btn danger" data-cdel="${c.id}" aria-label="Sil"><i class="bi bi-trash-fill"></i></button>
        </li>`
          )
          .join('')
      : '<li class="list-group-item text-muted px-0">Henüz kategori yok.</li>';
  }

  $('#catForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/categories', json('POST', { name: $('#catName').value }));
      $('#catName').value = '';
      toast('Kategori eklendi.');
      await load();
    } catch (ex) { toast(ex.message); }
  });

  $('#catList').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-cedit]');
    const del = e.target.closest('[data-cdel]');
    try {
      if (ed) {
        const c = categories.find((x) => x.id === Number(ed.dataset.cedit));
        const name = prompt('Yeni kategori adı:', c.name);
        if (name && name.trim() && name.trim() !== c.name) {
          await api(`/categories/${c.id}`, json('PUT', { name }));
          toast('Kategori güncellendi.');
          await load();
        }
      }
      if (del) {
        const c = categories.find((x) => x.id === Number(del.dataset.cdel));
        const extra = c.product_count ? ` Bu kategorideki ${c.product_count} ürün "kategorisiz" kalacak.` : '';
        if (!confirm(`"${c.name}" silinsin mi?${extra}`)) return;
        await api(`/categories/${c.id}`, { method: 'DELETE' });
        toast('Kategori silindi.');
        await load();
      }
    } catch (ex) { toast(ex.message); }
  });

  /* ---------- Şifre ---------- */
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/auth/password', json('POST', { current: $('#curPw').value, next: $('#newPw').value }));
      e.target.reset();
      toast('Şifre güncellendi.');
    } catch (ex) { toast(ex.message); }
  });

  /* ---------- Yükle ---------- */
  async function load() {
    [products, categories] = await Promise.all([api('/products?all=1'), api('/categories')]);
    fillCategorySelects();
    renderStats();
    renderProducts();
    renderCategories();
  }

  load().catch((ex) => toast(ex.message));
})();
