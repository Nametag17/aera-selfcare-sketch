/* Aera Selfcare — storefront pages. Needs catalog.js + aera.js. */
(() => {
  "use strict";
  const A = window.Aera;
  const { esc, money, icon } = A;
  const $ = (s, el = document) => el.querySelector(s);
  const aisleName = id => (A.AISLES.find(a => a.id === id) || {}).name || "";
  const aisleTalk = id => (A.AISLES.find(a => a.id === id) || {}).talk || "";

  const priceHTML = n => { const [d, c] = n.toFixed(2).split("."); return `<small>$</small>${d}.${c}`; };

  function facing(p, opts = {}) {
    const low = p.available && p.stock <= 2;
    return `
      <li class="facing${p.available ? "" : " is-out"}" data-facing>
        <a class="stand" href="producto.html?p=${encodeURIComponent(p.slug)}" aria-label="${esc(p.name)}">
          ${opts.talker ? `<span class="talker${opts.peach ? " peach" : ""}">${esc(opts.talker)}</span>` : ""}
          <img src="${p.img}" alt="" loading="${opts.eager ? "eager" : "lazy"}" width="600" height="600">
        </a>
        <div class="lip" aria-hidden="true"></div>
        <div class="price-card">
          <div class="meta">
            ${p.origin ? `<span class="ticket">${esc(p.origin)}</span>` : ""}
            ${p.brand ? `<span class="brand">${esc(p.brand)}</span>` : ""}
            ${low ? `<span class="stock-tag">¡Últimas ${p.stock}!</span>` : ""}
            ${!p.available ? `<span class="stock-tag">Agotado</span>` : ""}
          </div>
          <a class="name" href="producto.html?p=${encodeURIComponent(p.slug)}">${esc(p.name)}</a>
          <span class="price" aria-label="Precio ${money(p.price)}">${priceHTML(p.price)}</span>
          ${p.available
            ? `<button class="add" type="button" data-add="${esc(p.slug)}" aria-label="Agregar ${esc(p.name)} a la bolsa">${icon("plus")}<span>Agregar</span></button>`
            : `<button class="add" type="button" disabled aria-label="Agotado">${icon("minus")}<span>Agotado</span></button>`}
        </div>
      </li>`;
  }
  function shelf({ title, id, link, items, talkers = {}, cls = "", eager = false, headingTag = "h2", gentle = false }) {
    return `
      <section class="shelf" ${id ? `id="${id}"` : ""} aria-labelledby="${id || title}-t">
        ${gentle ? `<span class="gentle" aria-hidden="true">Be gentle with yourself</span>` : ""}
        <div class="shelf-head">
          <${headingTag} class="lip-sign" id="${id || title}-t">${esc(title)}</${headingTag}>
          ${link ? `<a href="${link.href}">${esc(link.label)} ${icon("arrow")}</a>` : ""}
        </div>
        <ul class="shelf-row ${cls}">
          ${items.map((p, i) => facing(p, { ...(talkers[i] || {}), eager: eager && i < 4 })).join("")}
        </ul>
      </section>`;
  }
  const visible = () => A.catalog().filter(p => !p.hidden);

  /* ---------------- HOME ---------------- */
  function home() {
    const cat = visible();
    const featured = cat.filter(p => p.featured);
    $("#bestsellers").innerHTML = shelf({
      title: "Best-sellers", id: "best", gentle: true, link: { href: "tienda.html", label: "Ver toda la tienda" }, items: featured, eager: true,
      talkers: { 0: { talker: "¿Frizz? Empieza aquí" }, 5: { talker: "Huele a flores", peach: true } },
    });
    const hair = cat.filter(p => ["brillo", "reparacion", "tenido"].includes(p.aisle) && !p.featured && p.available).slice(0, 5);
    const body = cat.filter(p => ["cuerpo", "sol"].includes(p.aisle) && !p.featured).slice(0, 5);
    $("#haircare").innerHTML = shelf({ title: "Haircare", id: "hair", cls: "five", link: { href: "tienda.html#reparacion", label: "Pasillo de cabello" }, items: hair,
      talkers: { 1: { talker: "Para pelo maltratado", peach: true } } });
    $("#bodycare").innerHTML = shelf({ title: "Bodycare", id: "body", cls: "five", link: { href: "tienda.html#cuerpo", label: "Pasillo de cuerpo" }, items: body,
      talkers: { 0: { talker: "Piel de seda" } } });

    const counts = Object.fromEntries(A.AISLES.map(a => [a.id, cat.filter(p => p.aisle === a.id).length]));
    $("#aisleRail").innerHTML = A.AISLES.map(a => `
      <li><a class="aisle-sign" href="tienda.html#${a.id}"><b>${esc(a.name)}</b><span>${counts[a.id]} productos</span></a></li>`).join("");

    // sample cotización built from two real products
    const s1 = A.bySlug("honey-melty-moist-repair-hair-oil"), s2 = A.bySlug("luxury-shower-oil-flower-garden");
    if (s1 && s2) {
      const items = [[s1, 1], [s2, 2]];
      $("#sampleLines").innerHTML = items.map(([p, q]) => `
        <li class="receipt-line"><span class="nm">${esc(A.label(p))}</span><span class="amt">${money(p.price * q)}</span><span class="sub">${q} × ${money(p.price)}</span></li>`).join("");
      $("#sampleTotal").textContent = money(items.reduce((s, [p, q]) => s + p.price * q, 0));
    }
    document.querySelectorAll("[data-kit]").forEach(a => {
      a.href = A.waURL(`Hola Aera 🎀 Me interesa el ${a.dataset.kit}. ¿Qué productos incluye?`);
    });
  }

  /* ---------------- TIENDA ---------------- */
  function tienda() {
    const all = visible();
    const state = { aisle: "todo", q: "", sort: "featured" };
    const tabs = $("#aisleTabs");
    const counts = Object.fromEntries(A.AISLES.map(a => [a.id, all.filter(p => p.aisle === a.id).length]));
    tabs.innerHTML = [`<button class="tab" data-aisle="todo" aria-pressed="true">Todo <span class="num">${all.length}</span></button>`,
      ...A.AISLES.map(a => `<button class="tab" data-aisle="${a.id}" aria-pressed="false">${esc(a.name)} <span class="num">${counts[a.id]}</span></button>`)].join("");
    const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const sorters = {
      featured: (a, b) => (b.available - a.available) || (b.featured - a.featured),
      "price-asc": (a, b) => a.price - b.price, "price-desc": (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name, "es"),
    };
    function render() {
      const q = norm(state.q.trim());
      let list = all.filter(p => !q || norm(`${p.name} ${p.brand} ${p.description} ${aisleName(p.aisle)}`).includes(q)).sort(sorters[state.sort]);
      const aisles = state.aisle === "todo" ? A.AISLES : A.AISLES.filter(a => a.id === state.aisle);
      let shown = 0;
      const html = aisles.map(a => {
        const items = list.filter(p => p.aisle === a.id); shown += items.length;
        if (!items.length) return "";
        return `<div class="aisle-block" id="${a.id}">${shelf({ title: a.name, id: "s-" + a.id, cls: "five wrap-grid", items,
          talkers: { 0: { talker: aisleTalk(a.id) } } })}</div>`;
      }).join("");
      $("#aisleShelves").innerHTML = html || `<div class="empty-aisle"><span class="hand">Nada por aquí…</span>No encontramos “${esc(state.q)}”. Prueba con otra palabra o <a href="${A.waURL(`Hola Aera, ¿tienen ${state.q}?`)}" target="_blank" rel="noopener">pregúntanos por WhatsApp</a>.</div>`;
      $("#resultCount").textContent = `${shown} ${shown === 1 ? "producto" : "productos"}`;
      tabs.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-pressed", t.dataset.aisle === state.aisle));
    }
    tabs.addEventListener("click", e => {
      const t = e.target.closest(".tab"); if (!t) return;
      state.aisle = t.dataset.aisle; render();
      history.replaceState(null, "", state.aisle === "todo" ? "tienda.html" : "#" + state.aisle);
      window.scrollTo({ top: $("#aisleShelves").offsetTop - 130, behavior: "smooth" });
    });
    $("#search").addEventListener("input", e => { state.q = e.target.value; render(); });
    $("#sort").addEventListener("change", e => { state.sort = e.target.value; render(); });
    const h = location.hash.slice(1);
    if (A.AISLES.some(a => a.id === h)) state.aisle = h;
    render();
    if (h === "buscar") $("#search").focus();
  }

  /* ---------------- PRODUCTO ---------------- */
  function producto() {
    const slug = new URLSearchParams(location.search).get("p");
    const p = A.bySlug(slug);
    const root = $("#sheet");
    if (!p) { root.innerHTML = `<div class="empty-aisle"><span class="hand">No encontramos este producto</span><a class="btn btn-primary" href="tienda.html">Ir a la tienda</a></div>`; return; }
    document.title = `${p.name} — Aera Selfcare`;
    let qty = 1;
    const stockLine = !p.available ? `<span class="stock-line out">Agotado por ahora</span>`
      : p.stock <= 2 ? `<span class="stock-line low">Quedan ${p.stock} en el estante</span>` : `<span class="stock-line">Disponible · ${p.stock} en el estante</span>`;
    root.innerHTML = `
      <p class="crumbs"><a href="tienda.html">Tienda</a> / <a href="tienda.html#${p.aisle}">${esc(aisleName(p.aisle))}</a></p>
      <div class="sheet">
        <div class="shelf">
          <ul class="shelf-row" style="grid-template-columns:1fr;grid-auto-flow:row;grid-auto-columns:auto;overflow:visible">
            <li class="facing${p.available ? "" : " is-out"}" data-facing>
              <div class="stand"><span class="talker">${esc(aisleTalk(p.aisle))}</span><img src="${p.img}" alt="${esc(p.name)}" data-img="${esc(p.slug)}" width="600" height="600"></div>
              <div class="lip" aria-hidden="true"></div>
            </li>
          </ul>
        </div>
        <div class="sheet-info">
          <div class="meta">${p.origin ? `<span class="ticket">${esc(p.origin)}</span>` : ""}${p.brand ? `<span class="brand">${esc(p.brand)}</span>` : ""}</div>
          <h1 class="h-sign">${esc(p.name)}</h1>
          <div class="sheet-price"><span class="price">${money(p.price)}</span>${stockLine}</div>
          ${p.available ? `
          <div class="buy-row">
            <div class="stepper" role="group" aria-label="Cantidad">
              <button type="button" data-step="-1" aria-label="Quitar uno">−</button><output id="qty" aria-live="polite">1</output><button type="button" data-step="1" aria-label="Agregar uno">+</button>
            </div>
            <button class="btn btn-primary" type="button" id="addBtn" data-add="${esc(p.slug)}" data-qty="1">${icon("bag")} Agregar a la bolsa</button>
          </div>` : `<a class="btn btn-line" href="${A.waURL(`Hola Aera 🎀 ¿Cuándo vuelve ${p.name}?`)}" target="_blank" rel="noopener">${A.WA_ICON} Avísame cuando vuelva</a>`}
          <a class="ask" href="${A.waURL(`Hola Aera 🎀 Tengo una pregunta sobre ${p.name}`)}" target="_blank" rel="noopener">${A.WA_ICON} ¿Dudas? Asesoría por WhatsApp</a>
          <div class="desc"><h2>Sobre este producto</h2>${esc(p.description || "Descripción próximamente.")}</div>
        </div>
      </div>`;
    root.addEventListener("click", e => {
      const s = e.target.closest("[data-step]"); if (!s) return;
      qty = Math.max(1, Math.min(p.stock, qty + +s.dataset.step));
      $("#qty").textContent = qty; $("#addBtn").dataset.qty = qty;
      root.querySelector('[data-step="-1"]').disabled = qty <= 1; root.querySelector('[data-step="1"]').disabled = qty >= p.stock;
    });
    const minus = root.querySelector('[data-step="-1"]'); if (minus) minus.disabled = true;
    const same = visible().filter(x => x.aisle === p.aisle && x.slug !== p.slug).slice(0, 5);
    if (same.length) $("#same").innerHTML = shelf({ title: "En el mismo pasillo", id: "same-s", cls: "five", items: same, link: { href: `tienda.html#${p.aisle}`, label: "Ver pasillo" } });
  }

  /* ---------------- PEDIDO (bag → cotización) ---------------- */
  function pedido() {
    const form = $("#orderForm"), linesEl = $("#bagLines");
    const saved = A.store.get("aera-customer", {});
    ["name", "phone", "zone", "address", "note"].forEach(k => { if (saved[k] && form.elements[k]) form.elements[k].value = saved[k]; });
    if (saved.delivery) form.elements.delivery.value = saved.delivery;
    if (saved.payment) form.elements.payment.value = saved.payment;

    function renderBag() {
      const lines = A.bag.lines();
      $("#orderLayout").dataset.empty = lines.length === 0;
      if (!lines.length) {
        linesEl.innerHTML = `<li class="bag-empty"><span class="hand">Tu bolsa está vacía</span><p>Elige tus productos en el estante y vuelve aquí.</p><a class="btn btn-primary" href="tienda.html">Ir a la tienda</a></li>`;
      } else {
        linesEl.innerHTML = lines.map(({ p, qty }) => `
          <li class="receipt-line has-thumb">
            <img class="thumb" src="${p.img}" alt="">
            <span class="nm">${esc(A.label(p))}</span>
            <span class="amt">${money(p.price * qty)}</span>
            <span class="sub">${qty} × ${money(p.price)}${p.stock <= 2 ? ` · quedan ${p.stock}` : ""}</span>
            <div class="line-edit">
              <div class="stepper" role="group" aria-label="Cantidad de ${esc(p.name)}">
                <button type="button" data-dec="${p.slug}" aria-label="Quitar uno">−</button><output>${qty}</output><button type="button" data-inc="${p.slug}" ${qty >= p.stock ? "disabled" : ""} aria-label="Agregar uno">+</button>
              </div>
              <button type="button" class="remove" data-rm="${p.slug}">Quitar</button>
            </div>
          </li>`).join("");
      }
      const total = money(A.bag.total()), n = A.bag.count();
      $("#subtotal").textContent = total; $("#itemCount").textContent = `${n} ${n === 1 ? "producto" : "productos"}`;
      $("#mobileTotal").textContent = total;
      form.querySelector("[type=submit]").disabled = !lines.length;
      $("#mobileSend").disabled = !lines.length;
    }
    linesEl.addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t) return;
      const cur = A.bag.raw();
      if (t.dataset.inc) A.bag.set(t.dataset.inc, (cur[t.dataset.inc] || 0) + 1);
      if (t.dataset.dec) A.bag.set(t.dataset.dec, (cur[t.dataset.dec] || 0) - 1);
      if (t.dataset.rm) A.bag.set(t.dataset.rm, 0);
      renderBag();
    });
    const toggleAddress = () => { $("#addressFields").hidden = form.elements.delivery.value !== "envio"; };
    form.addEventListener("change", toggleAddress); toggleAddress();

    function validate() {
      let ok = true;
      const setInvalid = (name, bad) => { const f = form.querySelector(`[data-field="${name}"]`); f.dataset.invalid = bad; if (bad && ok) { form.elements[name].focus(); } if (bad) ok = false; };
      setInvalid("name", form.elements.name.value.trim().length < 2);
      const digits = form.elements.phone.value.replace(/\D/g, "").replace(/^507/, "");
      setInvalid("phone", !/^\d{7,8}$/.test(digits));
      if (form.elements.delivery.value === "envio") setInvalid("zone", !form.elements.zone.value);
      return ok;
    }
    function send(e) {
      e.preventDefault();
      if (!A.bag.lines().length || !validate()) return;
      const digits = form.elements.phone.value.replace(/\D/g, "").replace(/^507/, "");
      const customer = {
        name: form.elements.name.value.trim(), phone: digits.length === 8 ? digits.slice(0, 4) + "-" + digits.slice(4) : digits,
        delivery: form.elements.delivery.value, zone: form.elements.zone.value, address: form.elements.address.value.trim(),
        payment: form.elements.payment.value, note: form.elements.note.value.trim(),
      };
      A.store.set("aera-customer", customer);
      const q = {
        ref: A.nextRef(), createdAt: new Date().toISOString(), status: "nueva", source: "web", customer,
        items: A.bag.lines().map(({ p, qty }) => ({ slug: p.slug, name: p.name, brand: p.brand, qty, price: p.price })),
      };
      A.quotes.save(q);
      const msg = A.whatsappMessage(q);
      window.open(A.waURL(msg), "_blank", "noopener");
      A.bag.clear();
      location.href = "confirmacion.html#q=" + A.encodeQuote(q);
    }
    form.addEventListener("submit", send);
    $("#mobileSend").addEventListener("click", () => form.requestSubmit());
    renderBag();
  }

  /* ---------------- CONFIRMACIÓN ---------------- */
  function confirmacion() {
    const m = location.hash.match(/q=([\w-]+)/);
    const q = m ? A.decodeQuote(m[1]) : A.quotes.all()[0];
    if (!q) { $("#confirm").innerHTML = `<div class="empty-aisle"><span class="hand">No hay cotización para mostrar</span><a class="btn btn-primary" href="tienda.html">Ir a la tienda</a></div>`; return; }
    const c = q.customer || {};
    $("#receiptRef").textContent = q.ref;
    $("#receiptDate").textContent = A.fmtDateTime(q.createdAt);
    $("#receiptLines").innerHTML = q.items.map(i => `
      <li class="receipt-line"><span class="nm">${esc(A.label(i))}</span><span class="amt">${money(i.qty * i.price)}</span><span class="sub">${i.qty} × ${money(i.price)}</span></li>`).join("");
    $("#receiptTotal").textContent = money(A.quoteTotal(q));
    $("#receiptCustomer").innerHTML = `
      <dt>Nombre</dt><dd>${esc(c.name || "—")}</dd><dt>WhatsApp</dt><dd>${esc(c.phone || "—")}</dd>
      <dt>Entrega</dt><dd>${esc(A.DELIVERY[c.delivery] || "—")}${c.delivery === "envio" && c.zone ? " · " + esc(c.zone) : ""}</dd>
      ${c.address ? `<dt>Dirección</dt><dd>${esc(c.address)}</dd>` : ""}
      <dt>Pago</dt><dd>${esc(A.PAYMENT[c.payment] || "—")}</dd>${c.note ? `<dt>Nota</dt><dd>${esc(c.note)}</dd>` : ""}`;
    const first = (c.name || "").split(" ")[0];
    $("#confirmTitle").textContent = first ? `¡Listo, ${first}! Tu cotización va en camino.` : "¡Listo! Tu cotización va en camino.";
    $("#reopenWA").href = A.waURL(A.whatsappMessage(q));
    $("#printBtn").addEventListener("click", () => window.print());
  }

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    ({ home, tienda, producto, pedido, confirmacion }[page] || (() => {}))();
  });
})();
