/* Aera Selfcare — shared store engine. Needs catalog.js (window.AERA) loaded first. */
(() => {
  "use strict";
  const RAW = window.AERA;
  const WA = RAW.meta.whatsapp;           // 50766463674
  const ROOT = document.documentElement.dataset.root || "";   // "" for store pages, "../" for /panel/

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* ---------- product knowledge (brand, origin, aisle) ---------- */
  // Brand by slug prefix — identified from product names and packaging photos. Unknown brands stay blank.
  const BRAND = [
    ["honey-", "&honey"], ["melty-most-repair-shampoo", "&honey"], ["shampoo-reparador-humedo-sanrio", "&honey"],
    ["tratamiento-capilar-humedo-profundo", "&honey"],
    ["anillo-", "anillO"], ["aceite-corporal-de-whisky", "anillO"], ["perfume-para-el-pelo", "anillO"],
    ["shampoo-para-pelo-tenido-gardenia", "anillO"], ["tratamiento-para-proteger-pelo-tenido", "anillO"],
    ["aceite-capilar-reparador", "Grow Us"], ["damaged-therapy", "Grow Us"], ["exfoliante-para-el-cuero", "Grow Us"],
    ["protector-termico-growus", "Grow Us"], ["shampoo-con-ph", "Grow Us"], ["shampoo-de-terapia-de-sal", "Grow Us"],
    ["tratamiento-en-crema", "Grow Us"], ["tratamiento-sin-enjuague", "Grow Us"],
    ["mascara-de-reparacion-tsubaki", "Tsubaki"], ["mascarilla-capilar-de-reparacion-premium", "Tsubaki"], ["shampooo-most-repair", "Tsubaki"],
    ["aceite-suavizante", "Fino"], ["mascarilla-japonesa", "Fino"], ["premium-touch-shampoo", "Fino"],
    ["dove-japan", "Dove Japan"], ["exfoliante-corporal-edicion-japon", "Dove Japan"],
    ["anua-", "ANUA"], ["aplb-", "APLB"], ["protector-solar-de-glutation", "APLB"], ["aromatica-", "Aromatica"],
    ["potenciador-de-la-raiz", "Aromatica"], ["dr-melaxin", "Dr. Melaxin"], ["gisou-", "Gisou"],
    ["loreal-", "L'Oréal"], ["luxury-shower-oil", "Moton"], ["aceite-de-amla", "Dabur"],
  ];
  const ORIGIN = {
    "&honey": "Japón", "Tsubaki": "Japón", "Fino": "Japón", "Dove Japan": "Japón",
    "anillO": "Corea", "Grow Us": "Corea", "ANUA": "Corea", "APLB": "Corea", "Aromatica": "Corea", "Dr. Melaxin": "Corea", "Moton": "Corea",
    "Gisou": "Países Bajos", "L'Oréal": "Francia", "Dabur": "India",
  };
  const ORIGIN_SLUG = { "locion-corporal-hidratante-de-leche": "Corea", "protector-solar-en-polvo": "Japón" };

  const AISLES = [
    { id: "brillo", name: "Frizz & brillo", talk: "¿Frizz? Empieza aquí" },
    { id: "reparacion", name: "Reparación", talk: "Para pelo maltratado" },
    { id: "tenido", name: "Pelo teñido", talk: "Cuida tu color" },
    { id: "raiz", name: "Cuero cabelludo", talk: "Raíz fuerte, pelo largo" },
    { id: "cuerpo", name: "Cuerpo", talk: "Piel de seda" },
    { id: "sol", name: "Sol", talk: "SPF todos los días" },
    { id: "rostro", name: "Rostro & bienestar", talk: "Tu glow, completo" },
    { id: "herramientas", name: "Herramientas", talk: "Tu rutina, más fácil" },
  ];
  const aisleOf = p => {
    const s = p.slug, n = (p.name + " " + (p.category || "")).toLowerCase();
    if (p.collection === "cuerpo") return "cuerpo";
    if (p.collection === "sol") return "sol";
    if (p.collection === "rostro") return "rostro";
    if (p.collection === "herramientas") return "herramientas";
    if (p.collection === "cuero-cabelludo") return "raiz";
    if (/teñid|tenid/.test(n) || /tenido/.test(s)) return "tenido";
    if (/repar|damaged|mascar|tratamiento|most repair|shampoo/.test(n)) return "reparacion";
    return "brillo";
  };

  /* ---------- catalog with owner-panel overrides ---------- */
  const OVR_KEY = "aera-inventory";
  function catalog() {
    const ovr = store.get(OVR_KEY, {});
    return RAW.products.map(p => {
      const o = ovr[p.slug] || {};
      const brand = (BRAND.find(([k]) => p.slug.startsWith(k)) || [])[1] || "";
      const stock = o.stock ?? p.stock ?? 0;
      return {
        ...p, brand, origin: ORIGIN[brand] || ORIGIN_SLUG[Object.keys(ORIGIN_SLUG).find(k => p.slug.startsWith(k))] || "",
        aisle: aisleOf(p), price: o.price ?? p.price, stock, hidden: !!o.hidden,
        available: stock > 0, img: ROOT + p.localImage,
      };
    });
  }
  const bySlug = slug => catalog().find(p => p.slug === slug);
  const setOverride = (slug, patch) => { const o = store.get(OVR_KEY, {}); o[slug] = { ...(o[slug] || {}), ...patch }; store.set(OVR_KEY, o); };

  /* ---------- money / text ---------- */
  const money = n => "$" + (Math.round(n * 100) / 100).toFixed(2);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- bag ---------- */
  const BAG_KEY = "aera-bag";
  const bag = {
    raw() { return store.get(BAG_KEY, {}); },
    lines() {
      const b = bag.raw(), cat = catalog();
      return Object.entries(b).map(([slug, qty]) => ({ p: cat.find(x => x.slug === slug), qty })).filter(l => l.p && l.qty > 0);
    },
    count() { return bag.lines().reduce((s, l) => s + l.qty, 0); },
    total() { return bag.lines().reduce((s, l) => s + l.qty * l.p.price, 0); },
    set(slug, qty) {
      const b = bag.raw(), p = bySlug(slug);
      const q = Math.max(0, Math.min(qty, p ? p.stock : 0));
      if (q) b[slug] = q; else delete b[slug];
      store.set(BAG_KEY, b); renderBagCount(true);
      return q;
    },
    add(slug, n = 1) { const cur = bag.raw()[slug] || 0; const q = bag.set(slug, cur + n); return { added: q > cur, qty: q }; },
    clear() { store.set(BAG_KEY, {}); renderBagCount(); },
  };

  /* ---------- quotes ---------- */
  const QUOTES_KEY = "aera-quotes";
  function nextRef(date = new Date()) {
    const seq = store.get("aera-seq", 41) + 1; store.set("aera-seq", seq);
    const y = String(date.getFullYear()).slice(2), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
    return `AERA-${y}${m}${d}-${String(seq).padStart(3, "0")}`;
  }
  const quotes = {
    all() { return store.get(QUOTES_KEY, []); },
    save(q) { const all = quotes.all().filter(x => x.ref !== q.ref); all.unshift(q); store.set(QUOTES_KEY, all); },
    update(ref, patch) { const all = quotes.all().map(q => q.ref === ref ? { ...q, ...patch } : q); store.set(QUOTES_KEY, all); },
  };
  // compact, URL-safe encoding so a cotización can be reopened from its link (owner or customer)
  function encodeQuote(q) {
    const c = { r: q.ref, t: q.createdAt, i: q.items.map(i => [i.slug, i.qty, i.price]), c: q.customer };
    const bytes = new TextEncoder().encode(JSON.stringify(c));
    let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeQuote(s) {
    try {
      const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
      const c = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
      const cat = catalog();
      return { ref: c.r, createdAt: c.t, customer: c.c || {}, status: "nueva",
        items: c.i.map(([slug, qty, price]) => { const p = cat.find(x => x.slug === slug); return { slug, qty, price, name: p ? p.name : slug, brand: p ? p.brand : "" }; }) };
    } catch { return null; }
  }
  const label = i => (i.brand && !i.name.toLowerCase().includes(i.brand.toLowerCase().replace("&", ""))) ? `${i.brand} · ${i.name}` : i.name;
  const quoteTotal = q => q.items.reduce((s, i) => s + i.qty * i.price, 0);
  const fmtDate = iso => new Date(iso).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });
  const fmtDateTime = iso => new Date(iso).toLocaleString("es-PA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  const DELIVERY = { envio: "Envío a domicilio", retiro: "Retiro en tienda (Vía Brasil)" };
  const PAYMENT = { yappy: "Yappy", transferencia: "Transferencia bancaria", efectivo: "Efectivo" };

  function receiptLink(q) {
    const u = new URL(ROOT + "confirmacion.html", location.href);
    u.hash = "q=" + encodeQuote(q);
    return u.href;
  }
  function whatsappMessage(q) {
    const c = q.customer || {};
    const lines = q.items.map((i, n) => `${n + 1}. ${label(i)}\n    ${i.qty} × ${money(i.price)} = ${money(i.qty * i.price)}`);
    const out = [
      `*Cotización ${q.ref}* 🎀`, `Fecha: ${fmtDate(q.createdAt)}`, "",
      "*Productos*", ...lines, "",
      `*Subtotal: ${money(quoteTotal(q))}*`, "Envío: por confirmar", "",
      "*Mis datos*", `Nombre: ${c.name}`, `WhatsApp: ${c.phone}`,
      `Entrega: ${DELIVERY[c.delivery] || "—"}${c.delivery === "envio" && c.zone ? " · " + c.zone : ""}`,
    ];
    if (c.delivery === "envio" && c.address) out.push(`Dirección: ${c.address}`);
    out.push(`Pago preferido: ${PAYMENT[c.payment] || "—"}`);
    if (c.note) out.push(`Nota: ${c.note}`);
    out.push("", `Ver cotización: ${receiptLink(q)}`);
    return out.join("\n");
  }
  const waURL = (text, phone = WA) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  /* ---------- icons ---------- */
  const ICONS = {
    bag: '<path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h11"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
    home: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    receipt: '<path d="M6 3h12v18l-2-1.4L14 21l-2-1.4L10 21l-2-1.4L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    box: '<path d="M4 8 12 4l8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.3c2.6.1 4.3 1.7 4.8 4.7"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    store: '<path d="M4 9h16l-1-4H5z"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  };
  const icon = (name, cls = "") => `<svg class="${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.9L2.3 21.8l4.8-1.3A9.8 9.8 0 1 0 12 2.2Zm0 17.8c-1.6 0-3-.4-4.3-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.3-.8.8-.8 2s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.2l-.5-.3Z"/></svg>';

  /* ---------- shared chrome ---------- */
  const PAGES = [["index.html", "Inicio"], ["tienda.html", "Tienda"], ["index.html#rituales", "Rituales"], ["index.html#como-pedir", "Cómo pedir"]];
  function renderChrome() {
    const here = location.pathname.split("/").pop() || "index.html";
    const header = document.getElementById("site-header");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `
        <div class="wrap bar">
          <div>
            <button class="icon-btn menu-btn" id="menuBtn" aria-label="Abrir menú" aria-expanded="false" aria-controls="mobileNav">${icon("menu")}</button>
            <nav class="primary" aria-label="Principal">
              ${PAGES.slice(1).map(([h, t]) => `<a href="${ROOT}${h}" ${here === h ? 'aria-current="page"' : ""}>${t}</a>`).join("")}
            </nav>
          </div>
          <a class="brand" href="${ROOT}index.html" aria-label="Aera Selfcare, inicio"><img src="${ROOT}assets/img/logo-plum.png" alt="Aera Selfcare" width="148" height="69"></a>
          <div class="actions">
            <a class="icon-btn" href="${ROOT}tienda.html#buscar" aria-label="Buscar productos">${icon("search")}</a>
            <a class="icon-btn" id="bagLink" href="${ROOT}pedido.html" aria-label="Tu bolsa">${icon("bag")}<span class="bag-count" id="bagCount" data-empty="true">0</span></a>
          </div>
        </div>
        <nav class="mobile-nav" id="mobileNav" aria-label="Menú">
          ${PAGES.map(([h, t]) => `<a href="${ROOT}${h}">${t}</a>`).join("")}
          <a href="${ROOT}pedido.html">Tu bolsa</a>
        </nav>`;
      const btn = header.querySelector("#menuBtn"), nav = header.querySelector("#mobileNav");
      btn.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", o); btn.innerHTML = icon(o ? "close" : "menu"); });
      nav.addEventListener("click", e => { if (e.target.closest("a")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.innerHTML = icon("menu"); } });
    }
    const footer = document.getElementById("site-footer");
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = `
        <div class="wrap foot-grid">
          <div class="foot-brand">
            <img src="${ROOT}assets/img/logo-light.png" alt="Aera Selfcare" width="160" height="75">
            <p class="hand">Be gentle with yourself</p>
            <p>K-Beauty & J-Beauty para tu cabello y tu piel. Envíos a todo el país.</p>
          </div>
          <div>
            <h2>Tienda</h2>
            <ul>${AISLES.map(a => `<li><a href="${ROOT}tienda.html#${a.id}">${a.name}</a></li>`).join("")}</ul>
          </div>
          <div>
            <h2>Contacto</h2>
            <ul>
              <li><a href="https://wa.me/${WA}" target="_blank" rel="noopener">WhatsApp 6646-3674</a></li>
              <li><a href="https://instagram.com/aeraselfcare" target="_blank" rel="noopener">Instagram @aeraselfcare</a></li>
              <li><a href="https://www.tiktok.com/@aeraselfcare" target="_blank" rel="noopener">TikTok @aeraselfcare</a></li>
              <li><a href="mailto:aeraselfcare@gmail.com">aeraselfcare@gmail.com</a></li>
              <li><a href="https://maps.app.goo.gl/Gw1FPWfTsfKWX7JG9" target="_blank" rel="noopener">Yiso Nails & Cosmetics Supply, Vía Brasil</a></li>
            </ul>
          </div>
        </div>
        <div class="wrap foot-legal"><span>© 2026 Aera Selfcare · Panamá</span><a href="${ROOT}panel/index.html">Panel de la tienda</a></div>`;
    }
    renderBagCount();
  }
  function renderBagCount(bump) {
    const el = document.getElementById("bagCount"); if (!el) return;
    const n = bag.count(); el.textContent = n; el.dataset.empty = n === 0;
    if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); setTimeout(() => el.classList.remove("bump"), 220); }
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg, action) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<a href="${action.href}">${esc(action.label)}</a>` : ""}`;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- signature: take it off the shelf ---------- */
  function flyToBag(img) {
    const target = document.getElementById("bagLink");
    if (!img || !target || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width) return;
    const ghost = img.cloneNode(); ghost.removeAttribute("id");
    Object.assign(ghost.style, { position: "fixed", left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px",
      objectFit: "contain", zIndex: 80, pointerEvents: "none", mixBlendMode: "multiply", margin: 0 });
    document.body.appendChild(ghost);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const lift = ghost.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: "translate(0,-18px) scale(1.04)", opacity: 1, offset: .22 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: .2 },
    ], { duration: 640, easing: "cubic-bezier(0.65, 0, 0.35, 1)" });
    img.animate([{ opacity: 1 }, { opacity: .35, offset: .2 }, { opacity: 1 }], { duration: 640, easing: "ease-out" });
    lift.onfinish = () => ghost.remove();
  }

  /* ---------- delegated add-to-bag ---------- */
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-add]"); if (!btn) return;
    e.preventDefault();
    const slug = btn.dataset.add, p = bySlug(slug);
    if (!p || !p.available) return;
    const n = +(btn.dataset.qty || 1);
    const { added, qty } = bag.add(slug, n);
    if (!added) { toast(`Solo hay ${p.stock} disponibles de este producto`); return; }
    const img = btn.closest("[data-facing]")?.querySelector("img") || document.querySelector(`[data-img="${slug}"]`);
    flyToBag(img);
    toast(qty > n ? `Ahora tienes ${qty} en tu bolsa` : "Agregado a tu bolsa", { href: ROOT + "pedido.html", label: "Ver bolsa" });
  });

  window.Aera = { RAW, WA, ROOT, AISLES, catalog, bySlug, setOverride, money, esc, bag, quotes, nextRef, encodeQuote, decodeQuote,
    quoteTotal, label, fmtDate, fmtDateTime, DELIVERY, PAYMENT, whatsappMessage, waURL, receiptLink, icon, WA_ICON, renderChrome, renderBagCount, toast, store };
  document.addEventListener("DOMContentLoaded", renderChrome);
})();
