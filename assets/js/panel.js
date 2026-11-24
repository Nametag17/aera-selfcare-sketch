/* Aera Selfcare — owner panel. Needs catalog.js + aera.js. Data lives in localStorage (demo). */
(() => {
  "use strict";
  const A = window.Aera;
  const { esc, money, icon } = A;
  const $ = (s, el = document) => el.querySelector(s);
  const work = () => $("#work");

  const STATUS = {
    nueva: "Nueva", confirmada: "Confirmada", pagada: "Pagada", entregada: "Entregada", cancelada: "Cancelada",
  };
  const FLOW = ["nueva", "confirmada", "pagada", "entregada"];
  const chip = s => `<span class="status ${s}">${STATUS[s]}</span>`;
  const DAY = 864e5;

  /* ---------------- demo data (synthetic, clearly labelled) ---------------- */
  const DEMO_KEY = "aera-demo-v1";
  function seedDemo() {
    if (A.store.get(DEMO_KEY)) return;
    const names = ["Valeria Gómez", "Ana Lucía Pérez", "Daniela Ríos", "Kristel Arosemena", "Yarisel Batista", "Sofía Castillo",
      "Nicole Herrera", "Mariela Quintero", "Camila De León", "Gabriela Vásquez", "Valeria Gómez", "Daniela Ríos"];
    const plan = [[.08, "nueva"], [.35, "nueva"], [.9, "nueva"], [1.3, "confirmada"], [2.1, "confirmada"], [2.6, "pagada"], [3.4, "pagada"],
      [4.2, "entregada"], [5.1, "entregada"], [6.4, "entregada"], [8.2, "cancelada"], [10.5, "entregada"]];
    const zones = ["Panamá", "Panamá Oeste", "Chiriquí", "Panamá", "Colón", "Panamá"];
    const pays = ["yappy", "yappy", "transferencia", "efectivo"];
    const cat = A.catalog().filter(p => p.available);
    const now = Date.now();
    const demo = plan.map(([daysAgo, status], k) => {
      const n = 1 + (k * 7 % 3);
      const items = Array.from({ length: n }, (_, j) => cat[(k * 11 + j * 17) % cat.length])
        .filter((p, j, arr) => arr.findIndex(x => x.slug === p.slug) === j)
        .map((p, j) => ({ slug: p.slug, name: p.name, brand: p.brand, qty: 1 + ((k + j) % 4 === 0 ? 1 : 0), price: p.price }));
      const d = new Date(now - daysAgo * DAY);
      const ref = `AERA-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(29 + k).padStart(3, "0")}`;
      const retiro = k % 5 === 3;
      return {
        ref, createdAt: d.toISOString(), status, demo: true, source: "web",
        customer: { name: names[k], phone: `6000-01${String(10 + k).padStart(2, "0")}`, delivery: retiro ? "retiro" : "envio",
          zone: retiro ? "" : zones[k % zones.length], address: retiro ? "" : "Referencia de demostración", payment: pays[k % pays.length],
          note: k === 1 ? "Tengo el cabello teñido, ¿me recomiendas algo más?" : "" },
        items, stockApplied: ["pagada", "entregada"].includes(status),
      };
    });
    const real = A.quotes.all().filter(q => !q.demo);
    A.store.set("aera-quotes", [...real, ...demo].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    A.store.set(DEMO_KEY, true);
  }
  function resetDemo() {
    ["aera-quotes", "aera-inventory", DEMO_KEY, "aera-seq"].forEach(k => { try { localStorage.removeItem(k); } catch {} });
    seedDemo(); route(); A.toast("Datos de demostración restablecidos");
  }

  /* ---------------- helpers ---------------- */
  const quotes = () => A.quotes.all().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fullPhone = p => "507" + String(p || "").replace(/\D/g, "").replace(/^507/, "");
  const firstName = n => (n || "").split(" ")[0];
  function replyText(q) {
    const c = q.customer || {}, total = money(A.quoteTotal(q));
    const lines = {
      nueva: `Hola ${firstName(c.name)} 🎀 ¡Gracias por tu pedido! Recibimos tu cotización ${q.ref} por ${total}. Todo está disponible. ${c.delivery === "envio" ? `El envío a ${c.zone || "tu zona"} cuesta $__.` : "Puedes retirarlo en Vía Brasil."} ¿Confirmamos?`,
      confirmada: `Hola ${firstName(c.name)} 🎀 Tu pedido ${q.ref} está confirmado. Total ${total}${c.delivery === "envio" ? " + envío" : ""}. Puedes pagar por ${A.PAYMENT[c.payment] || "Yappy"}. ¡Gracias!`,
      pagada: `Hola ${firstName(c.name)} 🎀 Recibimos tu pago del pedido ${q.ref}. ${c.delivery === "envio" ? "Te avisamos cuando salga el envío." : "Ya puedes pasar a retirarlo."}`,
      entregada: `Hola ${firstName(c.name)} 🎀 ¿Qué tal tus productos del pedido ${q.ref}? Cualquier duda sobre cómo usarlos, aquí estamos. Be gentle with yourself 💗`,
      cancelada: `Hola ${firstName(c.name)}, sobre tu cotización ${q.ref}: `,
    };
    return lines[q.status] || lines.nueva;
  }
  const waReply = q => A.waURL(replyText(q), fullPhone(q.customer?.phone));
  const itemsSummary = q => q.items.map(i => `${i.qty}× ${i.name}`).join(", ");
  const newCount = () => quotes().filter(q => q.status === "nueva").length;

  function stub(q, withActions = false) {
    const c = q.customer || {};
    return `<li><a class="stub" href="#cotizacion/${encodeURIComponent(q.ref)}">
        <span><span class="who">${esc(c.name || "Sin nombre")}</span> <span class="ref">· ${esc(q.ref)} · ${A.fmtDateTime(q.createdAt)}</span></span>
        <span class="amt">${money(A.quoteTotal(q))}</span>
        <span class="what">${esc(itemsSummary(q))}</span>
        <span class="side">${chip(q.status)}</span>
      </a>${withActions ? `<div class="stub-actions">
        <a class="btn btn-wa btn-sm" href="${waReply(q)}" target="_blank" rel="noopener">${A.WA_ICON} Responder</a>
        ${q.status === "nueva" ? `<button class="btn btn-primary btn-sm" type="button" data-advance="${esc(q.ref)}">Confirmar</button>` : ""}
        ${q.status === "confirmada" ? `<button class="btn btn-primary btn-sm" type="button" data-advance="${esc(q.ref)}">Marcar pagada</button>` : ""}
        ${q.status === "pagada" ? `<button class="btn btn-primary btn-sm" type="button" data-advance="${esc(q.ref)}">Marcar entregada</button>` : ""}
      </div>` : ""}</li>`;
  }

  function setStatus(ref, status) {
    const q = quotes().find(x => x.ref === ref); if (!q) return;
    const patch = { status };
    if (["pagada", "entregada"].includes(status) && !q.stockApplied) {
      q.items.forEach(i => { const p = A.bySlug(i.slug); if (p) A.setOverride(i.slug, { stock: Math.max(0, p.stock - i.qty) }); });
      patch.stockApplied = true;
      A.toast(`${STATUS[status]} · se descontó del inventario`);
    } else if (status === "cancelada" && q.stockApplied) {
      q.items.forEach(i => { const p = A.bySlug(i.slug); if (p) A.setOverride(i.slug, { stock: p.stock + i.qty }); });
      patch.stockApplied = false;
      A.toast("Cancelada · el stock volvió al inventario");
    } else A.toast(`Cotización ${STATUS[status].toLowerCase()}`);
    A.quotes.update(ref, patch);
  }
  const nextStatus = s => FLOW[FLOW.indexOf(s) + 1];

  /* ---------------- views ---------------- */
  function viewHoy() {
    const qs = quotes(), now = Date.now();
    const week = qs.filter(q => now - new Date(q.createdAt) < 7 * DAY && q.status !== "cancelada");
    const confirmed = week.filter(q => q.status !== "nueva");
    const pending = qs.filter(q => q.status === "nueva");
    const inProgress = qs.filter(q => q.status === "confirmada" || q.status === "pagada");
    const low = A.catalog().filter(p => p.stock <= 2).sort((a, b) => a.stock - b.stock);
    const today = new Date().toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long" });
    return `
      <div class="view-head"><div>
        <h1>Hola, Aera</h1>
        <p class="summary-line">Hoy es ${today}. Esta semana: <b>${week.length}</b> cotizaciones por <b>${money(week.reduce((s, q) => s + A.quoteTotal(q), 0))}</b> · <b>${confirmed.length}</b> confirmadas.</p>
      </div></div>
      <div class="hoy-grid">
        <div class="stack">
          <section class="panel-section">
            <div class="sec-head"><h2>Por confirmar <span class="badge">${pending.length}</span></h2><a href="#cotizaciones/nueva">Ver todas</a></div>
            ${pending.length ? `<ul class="stubs">${pending.map(q => stub(q, true)).join("")}</ul>` : `<div class="empty-state"><span class="hand">¡Todo al día!</span>Las cotizaciones nuevas de la tienda aparecen aquí.</div>`}
          </section>
          <section class="panel-section">
            <div class="sec-head"><h2>En proceso <span class="badge">${inProgress.length}</span></h2><a href="#cotizaciones/confirmada">Ver todas</a></div>
            ${inProgress.length ? `<ul class="stubs">${inProgress.map(q => stub(q, true)).join("")}</ul>` : `<div class="empty-state">Nada en proceso por ahora.</div>`}
          </section>
        </div>
        <section class="panel-section">
          <div class="sec-head"><h2>Poco stock <span class="badge">${low.length}</span></h2><a href="#inventario/poco">Inventario</a></div>
          <ul class="mini-list">${low.map(p => `
            <li><img src="${p.img}" alt=""><div><div class="nm">${esc(p.name)}</div><div class="sub">${esc(p.brand || A.AISLES.find(a => a.id === p.aisle).name)}</div></div>
              <div class="stepper sm" role="group" aria-label="Stock de ${esc(p.name)}">
                <button type="button" data-stock="${p.slug}" data-d="-1" ${p.stock <= 0 ? "disabled" : ""} aria-label="Restar uno">${icon("minus")}</button>
                <output class="stock-num ${p.stock === 0 ? "out" : "low"}">${p.stock}</output>
                <button type="button" data-stock="${p.slug}" data-d="1" aria-label="Sumar uno">${icon("plus")}</button>
              </div></li>`).join("")}</ul>
        </section>
      </div>`;
  }

  function viewCotizaciones(filter = "todas") {
    const qs = quotes();
    const counts = Object.fromEntries(Object.keys(STATUS).map(s => [s, qs.filter(q => q.status === s).length]));
    const list = filter === "todas" ? qs : qs.filter(q => q.status === filter);
    return `
      <div class="view-head"><div><h1>Cotizaciones</h1><p>Cada pedido que envían desde la tienda llega aquí con su número de referencia.</p></div></div>
      <div class="filters">
        <div class="seg" role="group" aria-label="Filtrar por estado">
          <button type="button" data-qf="todas" aria-pressed="${filter === "todas"}">Todas <span class="num">${qs.length}</span></button>
          ${Object.keys(STATUS).map(s => `<button type="button" data-qf="${s}" aria-pressed="${filter === s}">${STATUS[s]} <span class="num">${counts[s]}</span></button>`).join("")}
        </div>
        <label class="visually-hidden" for="qsearch">Buscar cotización</label>
        <input class="input" id="qsearch" type="search" placeholder="Buscar por nombre o referencia">
      </div>
      <section class="panel-section"><ul class="stubs" id="qlist">${list.map(q => stub(q)).join("") || `<li class="empty-state">No hay cotizaciones ${filter === "todas" ? "" : "con estado " + STATUS[filter].toLowerCase()}.</li>`}</ul></section>`;
  }

  function viewCotizacion(ref) {
    const q = quotes().find(x => x.ref === ref);
    if (!q) return `<a class="back-link" href="#cotizaciones">${icon("back")} Cotizaciones</a><div class="empty-state"><span class="hand">No encontramos esa cotización</span></div>`;
    const c = q.customer || {}, idx = FLOW.indexOf(q.status), next = nextStatus(q.status);
    const nextLabel = { confirmada: "Confirmar cotización", pagada: "Marcar como pagada", entregada: "Marcar como entregada" }[next];
    return `
      <a class="back-link" href="#cotizaciones">${icon("back")} Cotizaciones</a>
      <div class="view-head"><div><h1>${esc(c.name || "Cotización")}</h1><p class="num">${esc(q.ref)} · ${A.fmtDateTime(q.createdAt)}</p></div>${chip(q.status)}</div>
      <div class="detail">
        <div class="receipt">
          ${q.status !== "nueva" && q.status !== "cancelada" ? `<div class="stamp" aria-hidden="true"><span>${STATUS[q.status]}<small>Aera</small></span></div>` : ""}
          <div class="receipt-head"><img src="${A.ROOT}assets/img/logo-plum.png" alt="Aera Selfcare" width="94" height="44"><div class="kind">Cotización</div><div class="meta num">${esc(q.ref)}</div></div>
          <ul class="receipt-lines">${q.items.map(i => `<li class="receipt-line"><span class="nm">${esc(A.label(i))}</span><span class="amt">${money(i.qty * i.price)}</span><span class="sub">${i.qty} × ${money(i.price)}</span></li>`).join("")}</ul>
          <div class="receipt-sum"><div class="muted"><span>Envío</span><span>por confirmar</span></div><div class="total"><span>Total productos</span><span>${money(A.quoteTotal(q))}</span></div></div>
          <dl>
            <dt>WhatsApp</dt><dd>${esc(c.phone || "—")}</dd>
            <dt>Entrega</dt><dd>${esc(A.DELIVERY[c.delivery] || "—")}${c.zone ? " · " + esc(c.zone) : ""}</dd>
            ${c.address ? `<dt>Dirección</dt><dd>${esc(c.address)}</dd>` : ""}
            <dt>Pago</dt><dd>${esc(A.PAYMENT[c.payment] || "—")}</dd>
          </dl>
        </div>
        <div class="action-col">
          <section class="panel-section">
            ${q.status === "cancelada" ? `<p style="margin:0 0 12px">Esta cotización fue cancelada.</p>` : `
            <ol class="flow" aria-label="Estado del pedido">${FLOW.map((s, i) => `<li class="${i <= idx ? "done" : ""}">${STATUS[s]}</li>`).join("")}</ol>`}
            ${c.note ? `<div class="note-box"><b>Nota de ${esc(firstName(c.name))}:</b> ${esc(c.note)}</div>` : ""}
            <div class="action-row" style="margin-top:14px">
              <a class="btn btn-wa" href="${waReply(q)}" target="_blank" rel="noopener">${A.WA_ICON} Responder por WhatsApp</a>
              ${next && q.status !== "cancelada" ? `<button class="btn btn-primary" type="button" data-advance="${esc(q.ref)}">${nextLabel}</button>` : ""}
            </div>
            <p style="font-size:13px;color:var(--plum-soft);margin:12px 0 0">El mensaje de respuesta se arma solo según el estado; puedes editarlo en WhatsApp antes de enviarlo. Al marcar como pagada, los productos se descuentan del inventario.</p>
            ${["nueva", "confirmada"].includes(q.status) ? `<div class="danger-zone"><button class="btn btn-danger-line btn-sm" type="button" data-cancel="${esc(q.ref)}">Cancelar cotización</button></div>` : ""}
          </section>
          <a class="link" href="${A.receiptLink(q)}" target="_blank" rel="noopener">Ver la cotización como la ve ${esc(firstName(c.name) || "la clienta")} ${icon("arrow")}</a>
        </div>
      </div>`;
  }

  function viewInventario(filter = "todo") {
    const cat = A.catalog();
    const sets = { todo: cat, poco: cat.filter(p => p.stock > 0 && p.stock <= 2), agotado: cat.filter(p => p.stock === 0), ocultos: cat.filter(p => p.hidden) };
    const list = sets[filter] || cat;
    const names = { todo: "Todo", poco: "Poco stock", agotado: "Agotado", ocultos: "Ocultos" };
    return `
      <div class="view-head"><div><h1>Inventario</h1><p>Los cambios de precio, stock y visibilidad se ven al instante en la tienda.</p></div>
        <button class="btn btn-line btn-sm" type="button" id="newProduct">${icon("plus")} Nuevo producto</button></div>
      <div class="filters">
        <div class="seg" role="group" aria-label="Filtrar inventario">${Object.keys(sets).map(k => `<button type="button" data-if="${k}" aria-pressed="${filter === k}">${names[k]} <span class="num">${sets[k].length}</span></button>`).join("")}</div>
        <label class="visually-hidden" for="isearch">Buscar producto</label>
        <input class="input" id="isearch" type="search" placeholder="Buscar producto o marca">
      </div>
      <div class="table-wrap"><table class="data inventory">
        <thead><tr><th>Producto</th><th>Pasillo</th><th class="r">Precio</th><th>Stock</th><th>Visible</th></tr></thead>
        <tbody id="invBody">${list.map(p => `
          <tr class="${p.hidden ? "is-hidden" : ""}" data-name="${esc((p.name + " " + p.brand).toLowerCase())}">
            <td class="c-prod"><div class="prod"><img src="${p.img}" alt=""><div><b>${esc(p.name)}</b><small>${esc(p.brand || "Sin marca")}${p.origin ? " · " + esc(p.origin) : ""}</small></div></div></td>
            <td class="c-aisle">${esc(A.AISLES.find(a => a.id === p.aisle).name)}</td>
            <td class="c-price r"><label class="visually-hidden" for="pr-${p.slug}">Precio de ${esc(p.name)}</label><input class="price-input" id="pr-${p.slug}" type="number" min="0" step="0.01" inputmode="decimal" value="${p.price.toFixed(2)}" data-price="${p.slug}"></td>
            <td class="c-stock"><div class="stepper sm" role="group" aria-label="Stock de ${esc(p.name)}">
              <button type="button" data-stock="${p.slug}" data-d="-1" ${p.stock <= 0 ? "disabled" : ""} aria-label="Restar uno">${icon("minus")}</button>
              <output class="stock-num ${p.stock === 0 ? "out" : p.stock <= 2 ? "low" : ""}">${p.stock}</output>
              <button type="button" data-stock="${p.slug}" data-d="1" aria-label="Sumar uno">${icon("plus")}</button></div></td>
            <td class="c-vis"><button class="switch" type="button" role="switch" aria-checked="${!p.hidden}" data-vis="${p.slug}" aria-label="Mostrar ${esc(p.name)} en la tienda"></button></td>
          </tr>`).join("")}</tbody></table></div>`;
  }

  function viewClientes() {
    const map = new Map();
    quotes().forEach(q => {
      const c = q.customer || {}, key = String(c.phone || c.name);
      const e = map.get(key) || { name: c.name, phone: c.phone, n: 0, total: 0, last: q.createdAt, zone: c.zone, quotes: [] };
      e.n++; if (q.status !== "cancelada") e.total += A.quoteTotal(q); if (q.createdAt > e.last) e.last = q.createdAt; e.quotes.push(q.ref);
      map.set(key, e);
    });
    const list = [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
    return `
      <div class="view-head"><div><h1>Clientes</h1><p>Se arma solo con los datos de cada cotización. ${list.length} clientas hasta ahora.</p></div></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Clienta</th><th class="r">Cotizaciones</th><th class="r">Total</th><th>Última</th><th></th></tr></thead>
        <tbody>${list.map(e => `
          <tr class="client-row">
            <td><b>${esc(e.name)}</b><small>${esc(e.phone)}${e.zone ? " · " + esc(e.zone) : ""}</small></td>
            <td class="r">${e.n}</td><td class="r">${money(e.total)}</td><td>${A.fmtDate(e.last)}</td>
            <td class="r"><a class="btn btn-wa btn-sm" href="${A.waURL(`Hola ${firstName(e.name)} 🎀 `, fullPhone(e.phone))}" target="_blank" rel="noopener" aria-label="Escribir a ${esc(e.name)} por WhatsApp">${A.WA_ICON}</a></td>
          </tr>`).join("")}</tbody></table></div>`;
  }

  // deterministic synthetic visits (labelled demo)
  function visits(days = 14) {
    const out = [], now = new Date(); now.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY), dow = d.getDay();
      const v = Math.round(22 + 9 * Math.sin((d.getDate() * 1.7)) + (dow === 0 || dow === 6 ? 14 : 0) + (i < 4 ? 6 : 0));
      out.push({ d, v: Math.max(6, v) });
    }
    return out;
  }
  function barChart(data) {
    const W = 620, H = 220, pl = 30, pb = 26, pt = 10, max = Math.ceil(Math.max(...data.map(x => x.v)) / 10) * 10;
    const bw = (W - pl) / data.length, y = v => pt + (H - pt - pb) * (1 - v / max);
    const ticks = [0, max / 2, max];
    return `<div class="chart" id="visitsChart">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitas por día en los últimos ${data.length} días">
        <g class="grid">${ticks.map(t => `<line x1="${pl}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/>`).join("")}</g>
        <g class="axis">${ticks.map(t => `<text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
          ${data.map((x, i) => i % 2 === 0 ? `<text x="${pl + bw * i + bw / 2}" y="${H - 8}" text-anchor="middle">${x.d.getDate()}/${x.d.getMonth() + 1}</text>` : "").join("")}</g>
        ${data.map((x, i) => {
          const bx = pl + bw * i + bw * 0.18, w = bw * 0.64, by = y(x.v), h = y(0) - by;
          return `<g data-i="${i}"><rect class="hit" x="${pl + bw * i}" y="${pt}" width="${bw}" height="${H - pt - pb}"/>
            <path class="bar" d="M${bx},${y(0)} V${by + 4} Q${bx},${by} ${bx + 4},${by} H${bx + w - 4} Q${bx + w},${by} ${bx + w},${by + 4} V${y(0)} Z"/></g>`;
        }).join("")}
      </svg><div class="chart-tip" role="status"></div></div>
      <details class="as-table"><summary>Ver como tabla</summary><table class="data"><thead><tr><th>Día</th><th class="r">Visitas</th></tr></thead>
        <tbody>${data.map(x => `<tr><td>${A.fmtDate(x.d.toISOString())}</td><td class="r">${x.v}</td></tr>`).join("")}</tbody></table></details>`;
  }
  function viewEstadisticas() {
    const v = visits(14), last7 = v.slice(-7).reduce((s, x) => s + x.v, 0);
    const qs = quotes(), now = Date.now();
    const q7 = qs.filter(q => now - new Date(q.createdAt) < 7 * DAY);
    const conf7 = q7.filter(q => !["nueva", "cancelada"].includes(q.status));
    const bags7 = Math.round(last7 * 0.21);
    const funnel = [["Visitas a la tienda", last7], ["Bolsas creadas", bags7], ["Cotizaciones enviadas", q7.length], ["Confirmadas o pagadas", conf7.length]];
    const units = {};
    qs.filter(q => q.status !== "cancelada").forEach(q => q.items.forEach(i => { units[i.slug] = units[i.slug] || { name: i.name, n: 0 }; units[i.slug].n += i.qty; }));
    const top = Object.values(units).sort((a, b) => b.n - a.n).slice(0, 6), topMax = Math.max(1, ...top.map(t => t.n));
    return `
      <div class="view-head"><div><h1>Estadísticas</h1><p>Cómo le va a la tienda. Las visitas y bolsas son <b>datos de demostración</b>; las cotizaciones salen de los pedidos reales del panel.</p></div>
        <button class="btn btn-quiet btn-sm" type="button" id="resetDemo">Restablecer datos de demostración</button></div>
      <div class="charts">
        <section class="panel-section chart-card"><h2>Visitas por día</h2><p class="sub">Últimos 14 días · ${last7} en los últimos 7</p>${barChart(v)}</section>
        <section class="panel-section chart-card"><h2>De visita a pedido</h2><p class="sub">Últimos 7 días</p>
          <ul class="hbars">${funnel.map(([l, n]) => `<li><span>${l}</span><span class="val">${n}</span><span class="track"><span class="fill" style="width:${Math.max(2, n / funnel[0][1] * 100)}%"></span></span></li>`).join("")}</ul>
        </section>
      </div>
      <section class="panel-section chart-card" style="margin-top:18px"><h2>Lo más pedido</h2><p class="sub">Unidades en cotizaciones no canceladas</p>
        <ul class="hbars">${top.map(t => `<li><span>${esc(t.name)}</span><span class="val">${t.n}</span><span class="track"><span class="fill" style="width:${t.n / topMax * 100}%"></span></span></li>`).join("")}</ul>
      </section>`;
  }

  /* ---------------- router ---------------- */
  const NAV = [["hoy", "Hoy", "home"], ["cotizaciones", "Cotizaciones", "receipt"], ["inventario", "Inventario", "box"], ["clientes", "Clientes", "users"], ["estadisticas", "Estadísticas", "chart"]];
  function renderNav(active) {
    const n = newCount();
    const item = ([id, label, ic]) => `<a class="nav-item" href="#${id}" ${active === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${id === "cotizaciones" && n ? `<span class="badge">${n}</span>` : ""}</a>`;
    $("#railNav").innerHTML = NAV.map(item).join("");
    $("#tabbar").innerHTML = NAV.map(([id, label, ic]) => `<a href="#${id}" ${active === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${id === "cotizaciones" && n ? `<span class="badge">${n}</span>` : ""}</a>`).join("");
  }
  function route() {
    const [view, arg] = decodeURIComponent(location.hash.slice(1) || "hoy").split("/");
    const views = { hoy: viewHoy, cotizaciones: () => viewCotizaciones(arg || "todas"), cotizacion: () => viewCotizacion(arg),
      inventario: () => viewInventario(arg || "todo"), clientes: viewClientes, estadisticas: viewEstadisticas };
    work().innerHTML = `<span class="demo-pill">Vista de demostración · datos de ejemplo</span>` + (views[view] || viewHoy)();
    renderNav(view === "cotizacion" ? "cotizaciones" : (views[view] ? view : "hoy"));
    document.title = view === "cotizacion" ? `Cotización ${arg} — Panel Aera Selfcare` : `${(NAV.find(n => n[0] === view) || ["", "Hoy"])[1]} — Panel Aera Selfcare`;
    bindChart();
  }

  function bindChart() {
    const c = $("#visitsChart"); if (!c) return;
    const tip = c.querySelector(".chart-tip"), data = visits(14);
    c.querySelectorAll("g[data-i]").forEach(g => {
      g.addEventListener("pointerenter", () => {
        const i = +g.dataset.i, r = g.querySelector(".bar").getBoundingClientRect(), cr = c.getBoundingClientRect();
        c.querySelectorAll("g.on").forEach(x => x.classList.remove("on")); g.classList.add("on");
        tip.textContent = `${A.fmtDate(data[i].d.toISOString())} · ${data[i].v} visitas`;
        tip.style.left = (r.left - cr.left + r.width / 2) + "px"; tip.style.top = (r.top - cr.top) + "px"; tip.classList.add("show");
      });
    });
    c.addEventListener("pointerleave", () => { tip.classList.remove("show"); c.querySelectorAll("g.on").forEach(x => x.classList.remove("on")); });
  }

  /* ---------------- interactions ---------------- */
  document.addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.advance) { const q = quotes().find(x => x.ref === t.dataset.advance); setStatus(q.ref, nextStatus(q.status)); route(); }
    if (t.dataset.cancel) { setStatus(t.dataset.cancel, "cancelada"); route(); }
    if (t.dataset.qf) location.hash = t.dataset.qf === "todas" ? "cotizaciones" : "cotizaciones/" + t.dataset.qf;
    if (t.dataset.if) location.hash = t.dataset.if === "todo" ? "inventario" : "inventario/" + t.dataset.if;
    if (t.dataset.stock) {
      const p = A.bySlug(t.dataset.stock); const s = Math.max(0, p.stock + +t.dataset.d);
      A.setOverride(p.slug, { stock: s });
      const out = t.parentElement.querySelector("output"); out.textContent = s;
      out.className = "stock-num " + (s === 0 ? "out" : s <= 2 ? "low" : "");
      t.parentElement.querySelector('[data-d="-1"]').disabled = s <= 0;
    }
    if (t.dataset.vis) {
      const on = t.getAttribute("aria-checked") !== "true";
      t.setAttribute("aria-checked", on); A.setOverride(t.dataset.vis, { hidden: !on });
      t.closest("tr")?.classList.toggle("is-hidden", !on);
      A.toast(on ? "Visible en la tienda" : "Oculto de la tienda");
    }
    if (t.id === "resetDemo") resetDemo();
    if (t.id === "newProduct") A.toast("Agregar productos llega en la versión final");
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.price) {
      const v = Math.round(parseFloat(t.value) * 100) / 100;
      if (!(v > 0)) { t.value = A.bySlug(t.dataset.price).price.toFixed(2); A.toast("El precio debe ser mayor que $0"); return; }
      A.setOverride(t.dataset.price, { price: v }); t.value = v.toFixed(2); A.toast(`Precio actualizado a ${money(v)}`);
    }
  });
  document.addEventListener("input", e => {
    const t = e.target, q = (t.value || "").toLowerCase().trim();
    if (t.id === "isearch") document.querySelectorAll("#invBody tr").forEach(r => { r.hidden = q && !r.dataset.name.includes(q); });
    if (t.id === "qsearch") document.querySelectorAll("#qlist li").forEach(li => { li.hidden = q && !li.textContent.toLowerCase().includes(q); });
  });
  window.addEventListener("hashchange", () => { route(); work().focus({ preventScroll: true }); window.scrollTo(0, 0); });
  window.addEventListener("storage", route);   // a quote sent from the store in another tab shows up live

  document.addEventListener("DOMContentLoaded", () => { seedDemo(); route(); });
})();
