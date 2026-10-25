
"use strict";
/* ============ PikaStudy — standalone app (router, admin, Supabase, ZIP export) ============ */
/* Pristine snapshot of this page, captured before any rendering — used by the ZIP export. */
try { window.__PRISTINE__ = "<!DOCTYPE html>\n" + document.documentElement.outerHTML; } catch (e) { window.__PRISTINE__ = ""; }

const STORE_KEY = "pikastudy-store-v1", CONN_KEY = "pikastudy-supabase-conn", SESSION_KEY = "pikastudy-supabase-session";
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const clone = (x) => JSON.parse(JSON.stringify(x));
let store = ls.get(STORE_KEY, null) || { books: SEED_BOOKS.slice(), requests: SEED_REQUESTS.slice(), taxonomy: clone(DEFAULT_TAXONOMY) };
let conn = ls.get(CONN_KEY, null);
let session = ls.get(SESSION_KEY, null);
let theme = "light";
try { theme = localStorage.getItem("pikastudy-theme") || "light"; } catch (e) {}
document.documentElement.dataset.theme = theme;
const persist = () => ls.set(STORE_KEY, store);
const adminAuthed = () => conn ? !!session : (sessionStorage.getItem("pikastudy-admin") === "1");

/* ---------- helpers ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const fmtNum = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n || 0);
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "u" + Date.now() + Math.random().toString(36).slice(2, 8));

function toast(msg, kind) {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 320); }, 4200);
}

/* ---------- Supabase layer (active only when connected) ---------- */
const mapBookIn = (r) => ({ id: r.id, title: r.title, cls: r.cls, subject: r.subject, type: r.type, publication: r.publication, author: r.author || "", language: r.language || "English", pages: r.pages || 0, downloads: r.downloads || 0, rating: Number(r.rating) || 0, addedAt: r.added_at, chapters: Array.isArray(r.chapters) ? r.chapters : [], featured: !!r.featured, popular: !!r.popular, desc: r.description || "", cover: r.cover_url || null, file: r.file_url || null });
const mapBookOut = (b) => ({ id: b.id, title: b.title, cls: b.cls, subject: b.subject, type: b.type, publication: b.publication, author: b.author, language: b.language, pages: b.pages, downloads: b.downloads, rating: b.rating, description: b.desc, chapters: b.chapters || [], featured: !!b.featured, popular: !!b.popular, cover_url: b.cover, file_url: b.file, added_at: b.addedAt });
const mapReqIn = (r) => ({ id: r.id, name: r.name || "", cls: r.cls, subject: r.subject || "", title: r.title, note: r.note || "", status: r.status || "new", createdAt: r.created_at });
const mapReqOut = (r) => ({ id: r.id, name: r.name, cls: r.cls, subject: r.subject, title: r.title, note: r.note, status: r.status, created_at: r.createdAt });

function remote(path, method, body, useAuth) {
  if (!conn) return Promise.resolve();
  const token = (useAuth !== false) && session ? session.access_token : conn.key;
  return fetch(conn.url + "/rest/v1" + path, {
    method: method || "GET",
    headers: { apikey: conn.key, Authorization: "Bearer " + token, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => { if (!r.ok) throw new Error("Supabase " + r.status); return r.status === 204 ? null : r.json(); })
    .catch((err) => toast("Server sync failed (" + err.message + ")", "error"));
}

async function syncFromRemote(silent) {
  if (!conn) return;
  try {
    const headers = { apikey: conn.key, Authorization: "Bearer " + (session ? session.access_token : conn.key) };
    const [bR, rR, sR, pR] = await Promise.all([
      fetch(conn.url + "/rest/v1/books?order=added_at.desc", { headers }),
      fetch(conn.url + "/rest/v1/requests?order=created_at.desc", { headers }),
      fetch(conn.url + "/rest/v1/subjects?order=cls.asc,name.asc", { headers }),
      fetch(conn.url + "/rest/v1/publications?order=name.asc", { headers }),
    ]);
    if (!bR.ok) throw new Error("books " + bR.status);
    const books = (await bR.json()).map(mapBookIn);
    const requests = rR.ok ? (await rR.json()).map(mapReqIn) : store.requests;
    const subjects = { 10: [], 11: [], 12: [] };
    if (sR.ok) (await sR.json()).forEach((r) => { if (subjects[r.cls]) subjects[r.cls].push(r.name); });
    const pubs = pR.ok ? (await pR.json()).map((r) => r.name) : store.taxonomy.publications;
    store = { books: books, requests: requests, taxonomy: { subjects: subjects, publications: pubs } };
    persist(); render();
    if (!silent) toast("Synced " + books.length + " books from Supabase ✓", "success");
  } catch (e) {
    toast("Could not sync from Supabase (" + e.message + "). Check the URL, key and that the setup SQL has run.", "error");
  }
}

async function sbLogin(email, password) {
  try {
    const r = await fetch(conn.url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: conn.key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    });
    if (!r.ok) throw new Error(r.status === 400 || r.status === 401 ? "wrong email or password" : "Supabase " + r.status);
    session = await r.json();
    ls.set(SESSION_KEY, session);
    render();
    toast("Welcome back, admin! ⚡", "success");
    syncFromRemote(true);
  } catch (e) { toast("Sign-in failed — " + e.message, "error"); }
}

async function uploadToStorage(file, folder) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
  const r = await fetch(conn.url + "/storage/v1/object/pikastudy/" + path, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream", apikey: conn.key, Authorization: "Bearer " + (session ? session.access_token : conn.key) },
    body: file,
  });
  if (!r.ok) throw new Error("upload failed (" + r.status + ")");
  return conn.url + "/storage/v1/object/public/pikastudy/" + path;
}

/* ---------- data ops (local first, remote sync when connected) ---------- */
function saveBook(b) {
  const i = store.books.findIndex((x) => x.id === b.id);
  if (i >= 0) store.books[i] = b; else store.books.unshift(b);
  persist();
  if (conn) { if (i >= 0) remote("/books?id=eq." + b.id, "PATCH", mapBookOut(b)); else remote("/books", "POST", mapBookOut(b)); }
}
function deleteBook(id) { store.books = store.books.filter((b) => b.id !== id); persist(); if (conn) remote("/books?id=eq." + id, "DELETE"); }
function toggleFlag(id, field) {
  const b = store.books.find((x) => x.id === id); if (!b) return;
  b[field] = !b[field]; persist();
  if (conn) remote("/books?id=eq." + id, "PATCH", { [field === "featured" ? "featured" : "popular"]: b[field] });
}
function addDownload(id) {
  const b = store.books.find((x) => x.id === id); if (!b) return;
  b.downloads = (b.downloads || 0) + 1; persist();
  if (conn) remote("/books?id=eq." + id, "PATCH", { downloads: b.downloads });
}
function addRequest(r) {
  store.requests.unshift(r); persist();
  if (conn) remote("/requests", "POST", mapReqOut(r), false);
}
function resolveRequest(id) { const r = store.requests.find((x) => x.id === id); if (r) { r.status = r.status === "resolved" ? "new" : "resolved"; persist(); if (conn) remote("/requests?id=eq." + id, "PATCH", { status: r.status }); render(); } }
function deleteRequest(id) { store.requests = store.requests.filter((r) => r.id !== id); persist(); if (conn) remote("/requests?id=eq." + id, "DELETE"); render(); }
function addSubject(cls, name) {
  if (!name || store.taxonomy.subjects[cls].includes(name)) return;
  store.taxonomy.subjects[cls].push(name); persist();
  if (conn) remote("/subjects", "POST", { cls: cls, name: name });
  render();
}
function removeSubject(cls, name) {
  store.taxonomy.subjects[cls] = store.taxonomy.subjects[cls].filter((s) => s !== name); persist();
  if (conn) remote("/subjects?cls=eq." + cls + "&name=eq." + encodeURIComponent(name), "DELETE");
  render();
}
function addPublication(name) {
  if (!name || store.taxonomy.publications.includes(name)) return;
  store.taxonomy.publications.push(name); persist();
  if (conn) remote("/publications", "POST", { name: name });
  render();
}
function removePublication(name) {
  store.taxonomy.publications = store.taxonomy.publications.filter((p) => p !== name); persist();
  if (conn) remote("/publications?name=eq." + encodeURIComponent(name), "DELETE");
  render();
}
async function seedRemote() {
  if (!conn || !session) { toast("Connect and sign in first.", "error"); return; }
  try {
    const headers = { apikey: conn.key, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" };
    const r = await fetch(conn.url + "/rest/v1/books", { method: "POST", headers, body: JSON.stringify(SEED_BOOKS.map(mapBookOut)) });
    if (!r.ok) throw new Error("Supabase " + r.status);
    const subs = []; Object.entries(store.taxonomy.subjects).forEach(([c, arr]) => arr.forEach((n) => subs.push({ cls: Number(c), name: n })));
    await fetch(conn.url + "/rest/v1/subjects", { method: "POST", headers, body: JSON.stringify(subs) });
    await fetch(conn.url + "/rest/v1/publications", { method: "POST", headers, body: JSON.stringify(store.taxonomy.publications.map((n) => ({ name: n }))) });
    toast("Seeded " + SEED_BOOKS.length + " books to your database ✓", "success");
    syncFromRemote(true);
  } catch (e) { toast("Seeding failed (" + e.message + "). Make sure the setup SQL has run.", "error"); }
}

/* ---------- shared render pieces ---------- */
function coverInner(b) {
  if (b.cover) return '<img class="cover-img" src="' + esc(b.cover) + '" alt="Cover of ' + esc(b.title) + '">';
  const m = SUBJECT_META[b.subject] || { c1: "#24324A", c2: "#4a5d80" };
  return '<div class="cover-gen" style="background:linear-gradient(150deg,' + m.c1 + ',' + m.c2 + ')">' +
    '<span class="cover-bolt">' + ICON_BOLT + '</span>' +
    '<span class="cover-title">' + esc(b.title) + '</span>' +
    '<span class="cover-pub">' + esc(b.publication) + '</span></div>';
}
function bookCard(b) {
  const rt = RESOURCE_TYPES[b.type];
  return '<a class="book-card" href="#/book/' + esc(b.id) + '">' +
    '<div class="cover">' + coverInner(b) + '</div>' +
    '<div class="bc-body">' +
    '<div class="bc-chips"><span class="chip">Class ' + b.cls + '</span><span class="chip">' + (rt ? rt.short : esc(b.type)) + '</span></div>' +
    '<div class="bc-title">' + esc(b.title) + '</div>' +
    '<div class="bc-meta">' + esc(b.author || b.publication) + ' · ' + esc(b.language || "English") + '</div>' +
    '<div class="bc-foot"><span>★ ' + (b.rating || 0) + ' · ' + fmtNum(b.downloads) + ' ⬇</span><span class="bc-view">View →</span></div>' +
    '</div></a>';
}
const grid = (books) => books.length ? '<div class="grid-books">' + books.map(bookCard).join("") + '</div>' : emptyState("No books found", "Nothing matched — try different filters, or request the book and we will try to add it.");

function emptyState(title, desc, action) {
  return '<div class="empty"><h3>' + esc(title) + '</h3><p>' + esc(desc) + '</p>' + (action || '<button class="btn btn-accent" onclick="openRequest()">⚡ Request a book</button>') + '</div>';
}

function navHTML() {
  const links = [["#/", "Home"], ["#/library", "Library"], ["#/class/10", "Class 10"], ["#/class/11", "Class 11"], ["#/class/12", "Class 12"]];
  return '<nav class="nav"><div class="nav-inner">' +
    '<a class="brand" href="#/">' + LOGO_SVG + '<span class="brand-txt"><span class="brand-name">Pika<span class="brand-accent">Study</span></span><span class="brand-sub">LEARN SMART. SHINE BRIGHT.</span></span></a>' +
    '<div class="nav-links">' + links.map((l) => '<a class="nav-link" href="' + l[0] + '">' + l[1] + '</a>').join("") +
    '<details class="dd"><summary class="nav-link">Resources ▾</summary><div class="dd-menu">' +
    Object.entries(RESOURCE_TYPES).map((e) => '<a class="dd-item" href="#/resources/' + e[0] + '">' + e[1].emoji + " " + e[1].short + '</a>').join("") +
    '</div></details></div>' +
    '<div class="nav-cta">' +
    '<button class="icon-btn" onclick="toggleTheme()" title="Toggle light / dark theme" aria-label="Toggle dark mode">' + (theme === "dark" ? ICON_SUN : ICON_MOON) + '</button>' +
    '<button class="btn btn-accent btn-sm" onclick="openRequest()">⚡ Request a book</button>' +
    '</div></div></nav>';
}

function footerHTML() {
  const cols = [
    ["Explore", [["#/library", "Full library"], ["#/search", "Search"], ["#/admin", "Admin panel"]]],
    ["Classes", [["#/class/10", "Class 10"], ["#/class/11", "Class 11"], ["#/class/12", "Class 12"]]],
    ["Resources", Object.entries(RESOURCE_TYPES).slice(0, 6).map((e) => ["#/resources/" + e[0], e[1].short])],
  ];
  return '<footer class="footer"><div class="wrap">' +
    '<div class="foot-grid">' +
    '<div><div class="brand foot-brand">' + LOGO_SVG + '<span class="brand-name">Pika<span style="color:var(--yellow)">Study</span></span></div>' +
    '<p class="foot-tag">Learn Smart. Shine Bright. Free books, notes and resources for Classes 10, 11 &amp; 12.</p>' +
    '<button class="btn btn-accent btn-sm" onclick="doZip()">⬇ Download this website (ZIP)</button>' +
    '<div class="zip-note">ZIP contains index.html, css/, js/ and README — host anywhere.</div></div>' +
    cols.map((c) => '<div><h4>' + c[0] + '</h4>' + c[1].map((l) => '<a class="foot-link" href="' + l[0] + '">' + esc(l[1]) + '</a>').join("") + '</div>').join("") +
    '</div>' +
    '<div class="foot-bottom"><span>© 2026 PikaStudy — a project by Akash Maurya.</span><span>⚡ Mascot image supplied by the site owner</span></div>' +
    '</div></footer>';
}

/* ---------- pages ---------- */
function homeHTML() {
  const bs = store.books;
  const popular = bs.filter((b) => b.popular).sort((a, b) => b.downloads - a.downloads).slice(0, 8);
  const recent = bs.slice().sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)).slice(0, 4);
  const featured = bs.filter((b) => b.featured).slice(0, 4);
  const statCards = [["📚", bs.length, "Books & resources"], ["🎓", 3, "Classes covered"], ["🗂", Object.keys(RESOURCE_TYPES).length, "Resource types"]];
  const classCards = [
    [10, "#24324A,#4a5d80", "Maths · Science · SST · English · Hindi · IT", bs.filter((b) => b.cls === 10).length],
    [11, "#1f7f96,#67C8F3", "Physics · Chemistry · Maths · Biology · CS · PE", bs.filter((b) => b.cls === 11).length],
    [12, "#c2611f,#FFAA55", "Physics · Chemistry · Maths · Biology · CS · PE", bs.filter((b) => b.cls === 12).length],
  ];
  return '<section class="hero"><div class="hero-blob1"></div><div class="hero-blob2"></div><div class="hero-grid">' +
    '<div><span class="hero-badge">⚡ Free forever · No sign-up needed</span>' +
    '<h1>Your Study Journey<br>Starts <span style="color:var(--orange)">Here!</span></h1>' +
    '<p class="lead">Books, Notes and Resources to Make Learning Easier.</p>' +
    '<form class="searchbar" onsubmit="return heroSearch(event)">' + ICON_SEARCH +
    '<input id="hero-q" placeholder="Search for books, subjects, chapters…" aria-label="Search the library">' +
    '<button class="btn btn-accent" type="submit">Search</button></form>' +
    '<div class="hero-chips">' + ["Mathematics", "Physics", "Question Banks", "PYQs"].map((c) => '<button class="hchip" onclick="go(\'#/search?q=' + encodeURIComponent(c) + '\')">' + c + '</button>').join("") + '</div>' +
    '<div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap">' +
    '<a class="btn btn-primary" href="#/library">Browse the library</a>' +
    '<button class="btn btn-outline" onclick="doZip()">⬇ Download this site (ZIP)</button></div>' +
    '</div>' +
    '<div class="mascot-box">' + PIKA_SVG(280) +
    '<span class="mascot-badge mb1">📘 <b>' + bs.length + '</b> books &amp; resources</span>' +
    '<span class="mascot-badge mb2">⚡ Curated for boards <b>2026–27</b></span>' +
    '</div></div></section>' +
    '<div class="wrap"><div class="sec"><div class="stats">' +
    statCards.map((s) => '<div class="stat-card"><span class="stat-ico">' + s[0] + '</span><div><b>' + s[1] + '</b><span>' + s[2] + '</span></div></div>').join("") +
    '</div></div>' +
    '<section class="sec"><div class="sec-head"><div><h2 class="sec-title">Choose your class</h2><p class="sec-sub">Strictly class-wise — no mixing, exactly how you study.</p></div></div>' +
    '<div class="class-grid">' + classCards.map((c) =>
      '<a class="class-card" style="background:linear-gradient(135deg,' + c[1] + ')" href="#/class/' + c[0] + '">' +
      '<div class="class-num">' + c[0] + '</div><h3>Class ' + c[0] + ' library</h3><p>' + c[2] + '</p>' +
      '<span class="class-go">' + c[3] + ' resources →</span></a>').join("") + '</div></section>' +
    '<section class="sec"><div class="sec-head"><div><h2 class="sec-title">Resource types</h2><p class="sec-sub">Everything a Class 10–12 student needs, in one place.</p></div><a class="link-more" href="#/library">View full library →</a></div>' +
    '<div class="res-grid">' + Object.entries(RESOURCE_TYPES).map((e) =>
      '<a class="res-card" href="#/resources/' + e[0] + '"><span class="res-ico" style="background:' + e[1].color + '26">' + e[1].emoji + '</span>' +
      '<h3>' + e[1].label + '</h3><p>' + e[1].desc + '</p>' +
      '<span class="res-count">' + bs.filter((b) => b.type === e[0]).length + ' available →</span></a>').join("") + '</div></section>' +
    (featured.length ? '<section class="sec"><div class="sec-head"><h2 class="sec-title">Featured picks ⭐</h2></div>' + grid(featured) + '</section>' : "") +
    '<section class="sec"><div class="sec-head"><h2 class="sec-title">Popular books 🔥</h2><a class="link-more" href="#/library">View full library →</a></div>' + grid(popular) + '</section>' +
    '<section class="sec"><div class="sec-head"><h2 class="sec-title">Recently added 🆕</h2></div>' + grid(recent) + '</section>' +
    '<div class="cta"><div><h2>Can\u2019t find a book?</h2><p>Request it and the PikaStudy team will try to add it to the library.</p></div>' +
    '<button class="btn btn-accent btn-lg" onclick="openRequest()">⚡ Request a book</button></div>' +
    '</div>';
}

/* ---------- library with filters ---------- */
let LF = { cls: null, subject: "", type: "", pub: "", q: "", sort: "new" };
function libFiltered() {
  let list = store.books.slice();
  if (LF.cls) list = list.filter((b) => b.cls === LF.cls);
  if (LF.subject) list = list.filter((b) => b.subject === LF.subject);
  if (LF.type) list = list.filter((b) => b.type === LF.type);
  if (LF.pub) list = list.filter((b) => b.publication === LF.pub);
  const q = LF.q.trim().toLowerCase();
  if (q) list = list.filter((b) => matchBook(b, q));
  if (LF.sort === "downloads") list.sort((a, b) => b.downloads - a.downloads);
  else if (LF.sort === "rating") list.sort((a, b) => b.rating - a.rating);
  else if (LF.sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
  else list.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  return list;
}
function matchBook(b, q) {
  const hay = [b.title, b.subject, b.author, b.publication, "class " + b.cls, (RESOURCE_TYPES[b.type] || {}).label, (b.chapters || []).join(" "), b.desc].join(" ").toLowerCase();
  return hay.includes(q);
}
function libApply() {
  document.getElementById("lib-results").innerHTML = grid(libFiltered());
  document.getElementById("lib-count").textContent = libFiltered().length + " of " + store.books.length + " resources";
}
function libSet(k, v) {
  LF[k] = v;
  if (k === "cls") {
    document.querySelectorAll("#cls-chips .fchip").forEach((b) => {
      const bc = b.getAttribute("data-cls");
      b.classList.toggle("on", LF.cls === null ? bc === "all" : bc === String(LF.cls));
    });
  }
  libApply();
}
function libraryHTML(title, desc, iconHtml, fixedCls, fixedType) {
  LF = { cls: fixedCls || null, subject: "", type: fixedType || "", pub: "", q: "", sort: "new" };
  const subjects = Array.from(new Set(store.books.filter((b) => (!LF.cls || b.cls === LF.cls)).map((b) => b.subject))).sort();
  const pubs = Array.from(new Set(store.books.map((b) => b.publication))).sort();
  return '<div class="wrap"><div class="page-head"><h1>' + iconHtml + " " + esc(title) + '</h1><p>' + esc(desc) + '</p></div>' +
    '<div class="filter-bar">' +
    (!fixedCls ? '<div class="chip-row" id="cls-chips">' + [10, 11, 12].map((c) => '<button class="fchip' + (LF.cls === c ? " on" : "") + '" data-cls="' + c + '" onclick="libSet(\'cls\',' + (LF.cls === c ? "null" : c) + ');this.blur()">Class ' + c + '</button>').join("") +
      '<button class="fchip' + (LF.cls === null ? " on" : "") + '" data-cls="all" onclick="libSet(\'cls\',null);this.blur()">All classes</button></div>' : "") +
    '<input class="input" style="flex:1;min-width:150px" placeholder="Search title, author, chapter…" value="' + esc(LF.q) + '" oninput="libSet(\'q\',this.value)">' +
    '<select class="select" onchange="libSet(\'subject\',this.value)"><option value="">All subjects</option>' + subjects.map((s) => '<option>' + esc(s) + '</option>').join("") + '</select>' +
    (!fixedType ? '<select class="select" onchange="libSet(\'type\',this.value)"><option value="">All types</option>' + Object.entries(RESOURCE_TYPES).map((e) => '<option value="' + e[0] + '">' + e[1].label + '</option>').join("") + '</select>' : "") +
    '<select class="select" onchange="libSet(\'pub\',this.value)"><option value="">All publications</option>' + pubs.map((p) => '<option>' + esc(p) + '</option>').join("") + '</select>' +
    '<select class="select" onchange="libSet(\'sort\',this.value)"><option value="new">Newest first</option><option value="downloads">Most downloaded</option><option value="rating">Top rated</option><option value="title">A → Z</option></select>' +
    '</div>' +
    '<p class="lib-count" id="lib-count"></p><div id="lib-results"></div></div>';
}

function bookHTML(id) {
  const b = store.books.find((x) => x.id === id);
  if (!b) return '<div class="wrap">' + emptyState("Book not found", "This book may have been removed. Try the library instead.", '<a class="btn btn-primary" href="#/library">Back to library</a>') + '</div>';
  const rt = RESOURCE_TYPES[b.type] || { label: b.type, emoji: "📘" };
  const metas = [["Author", b.author || "—"], ["Publication", b.publication], ["Pages", b.pages || "—"], ["Language", b.language || "English"], ["Rating", "★ " + (b.rating || 0) + " / 5"], ["Downloads", fmtNum(b.downloads)], ["Added", fmtDate(b.addedAt)], ["Class", "Class " + b.cls]];
  return '<div class="wrap">' +
    '<div class="crumbs"><a href="#/">Home</a> / <a href="#/class/' + b.cls + '">Class ' + b.cls + '</a> / <a href="#/library">Library</a> / ' + esc(b.title) + '</div>' +
    '<div class="detail">' +
    '<div><div class="d-cover">' + coverInner(b) + '</div></div>' +
    '<div>' +
    '<div class="bc-chips"><span class="chip">Class ' + b.cls + '</span><span class="chip">' + rt.emoji + " " + rt.label + '</span><span class="chip">' + esc(b.subject) + '</span></div>' +
    '<h1>' + esc(b.title) + '</h1>' +
    '<p class="desc">' + esc(b.desc || "No description yet — but the book is right there on the shelf!") + '</p>' +
    '<div class="meta-list">' + metas.map((m) => '<div class="meta-item"><span>' + m[0] + '</span><b>' + esc(String(m[1])) + '</b></div>').join("") + '</div>' +
    (b.chapters && b.chapters.length ? '<h3 style="font-size:15px;margin:14px 0 0">Chapters</h3><div class="chapters">' + b.chapters.map((c) => '<span class="chap">📖 ' + esc(c) + '</span>').join("") + '</div>' : "") +
    '<div class="d-actions">' +
    '<button class="btn btn-primary btn-lg" onclick="previewBook(\'' + b.id + '\')">👁 Preview</button>' +
    '<button class="btn btn-accent btn-lg" onclick="downloadBook(\'' + b.id + '\')">⬇ Download PDF</button>' +
    '</div>' +
    (b.file ? "" : '<div class="file-note"><span>📎</span><span><b>No file attached yet.</b> The PikaStudy team hasn\u2019t uploaded a PDF for this book — preview and download start working the moment it is added from the admin panel. No fake buttons, no broken files.</span></div>') +
    '</div></div></div>';
}

function searchHTML(q) {
  const query = q.trim();
  const ql = query.toLowerCase();
  const results = query ? store.books.filter((b) => matchBook(b, ql)) : [];
  return '<div class="wrap"><div class="page-head"><h1>Search' + (query ? ' results for “' + esc(query) + '”' : "") + '</h1>' +
    '<p>' + (query ? results.length + ' matching resources across titles, subjects, authors, publications and chapters.' : 'Type in the search bar above (or from the home page) to find books.') + '</p></div>' +
    '<form class="searchbar" style="margin:16px 0 22px" onsubmit="return heroSearch(event)">' + ICON_SEARCH +
    '<input id="hero-q" value="' + esc(query) + '" placeholder="Search for books, subjects, chapters…"><button class="btn btn-accent" type="submit">Search</button></form>' +
    (query ? grid(results) : "") + '</div>';
}

/* ---------- admin ---------- */
let adminTab = "overview";
function setAdminTab(t) { adminTab = t; render(); }
function adminLoginHTML() {
  return '<div class="wrap"><div class="login-card">' +
    '<h1>⚡ Admin sign-in</h1>' +
    (conn
      ? '<p class="sec-sub" style="margin:4px 0 18px">Connected to Supabase — sign in with your admin account.</p>' +
        '<form onsubmit="return adminDoLogin(event)">' +
        '<label class="f">Email</label><input class="field" name="email" type="email" required style="margin-bottom:12px" placeholder="you@example.com">' +
        '<label class="f">Password</label><input class="field" name="password" type="password" required style="margin-bottom:18px" placeholder="Your password">' +
        '<button class="btn btn-accent" style="width:100%" type="submit">Sign in</button></form>' +
        '<p style="font-size:12px;color:var(--sub);margin:14px 0 0">Wrong project? <a href="#" onclick="adminTab=\'connect\';render();return false" style="color:var(--orange);font-weight:700">Change connection</a></p>'
      : '<p class="sec-sub" style="margin:4px 0 18px">Demo mode — data lives in this browser only. Password: <b>pika2026</b>.</p>' +
        '<form onsubmit="return adminDoLogin(event)">' +
        '<label class="f">Demo password</label><input class="field" name="password" type="password" required style="margin-bottom:18px" placeholder="pika2026">' +
        '<button class="btn btn-accent" style="width:100%" type="submit">Enter dashboard</button></form>' +
        '<p style="font-size:12px;color:var(--sub);margin:14px 0 0">Want real accounts &amp; a live database? Go to <a href="#" onclick="adminTab=\'connect\';render();return false" style="color:var(--orange);font-weight:700">Admin → Connect</a> to set up free Supabase.</p>') +
    '</div></div>';
}
function adminDoLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (conn) { sbLogin(String(fd.get("email") || "").trim(), String(fd.get("password") || "")); return false; }
  if (String(fd.get("password")) === "pika2026") {
    try { sessionStorage.setItem("pikastudy-admin", "1"); } catch (err) {}
    render(); toast("Welcome back, admin! (demo mode) ⚡", "success");
  } else toast("Wrong password — demo password is pika2026.", "error");
  return false;
}
function adminLogout() {
  session = null; ls.del(SESSION_KEY);
  try { sessionStorage.removeItem("pikastudy-admin"); } catch (e) {}
  render(); toast("Logged out.", "info");
}

let formState = {};
function openBookForm(id) {
  const b = id ? store.books.find((x) => x.id === id) : null;
  formState = {
    id: b ? b.id : null,
    cover: b ? b.cover : null,
    file: b ? b.file : null,
    chapters: b && b.chapters ? b.chapters.join("\n") : "",
  };
  const v = (k) => (b ? esc(b[k]) : "");
  openModal('<h2>' + (b ? "Edit book" : "Add new book") + '</h2><p class="sub">Saved ' + (conn ? "to your Supabase database" : "in this browser (demo mode)") + '.</p>' +
    '<form onsubmit="return submitBook(event)"><div class="form-grid">' +
    '<div class="full"><label class="f">Title *</label><input class="field" id="bf-title" required value="' + v("title") + '" placeholder="e.g. NCERT Mathematics — Class 10"></div>' +
    '<div><label class="f">Class</label><select class="field" id="bf-cls">' + [10, 11, 12].map((c) => '<option' + (b && b.cls === c ? " selected" : "") + '>' + c + '</option>').join("") + '</select></div>' +
    '<div><label class="f">Subject</label><input class="field" id="bf-subject" list="subject-list" value="' + v("subject") + '"><datalist id="subject-list">' + Object.values(store.taxonomy.subjects).flat().map((s) => '<option value="' + esc(s) + '">').join("") + '</datalist></div>' +
    '<div><label class="f">Resource type</label><select class="field" id="bf-type">' + Object.entries(RESOURCE_TYPES).map((e) => '<option value="' + e[0] + '"' + (b && b.type === e[0] ? " selected" : "") + '>' + e[1].label + '</option>').join("") + '</select></div>' +
    '<div><label class="f">Publication</label><input class="field" id="bf-pub" list="pub-list" value="' + v("publication") + '"><datalist id="pub-list">' + store.taxonomy.publications.map((p) => '<option value="' + esc(p) + '">').join("") + '</datalist></div>' +
    '<div><label class="f">Author</label><input class="field" id="bf-author" value="' + v("author") + '" placeholder="e.g. NCERT, Dr. H.C. Verma"></div>' +
    '<div><label class="f">Language</label><select class="field" id="bf-lang">' + ["English", "Hindi", "Bilingual"].map((l) => '<option' + (b && b.language === l ? " selected" : "") + '>' + l + '</option>').join("") + '</select></div>' +
    '<div><label class="f">Pages</label><input class="field" id="bf-pages" type="number" min="1" value="' + (b ? b.pages || "" : "") + '"></div>' +
    '<div class="full"><label class="f">Description</label><textarea class="field" id="bf-desc" rows="2">' + v("desc") + '</textarea></div>' +
    '<div class="full"><label class="f">Chapters (one per line — makes chapters searchable)</label><textarea class="field" id="bf-chapters" rows="3" placeholder="Real Numbers&#10;Polynomials">' + esc(formState.chapters) + '</textarea></div>' +
    '<div class="full"><label class="f">Cover image (optional)</label><input type="file" accept="image/*" onchange="handleUpload(this,\'cover\',\'covers\')">' +
    '<span class="upload-status" id="cover-status">' + (formState.cover ? (String(formState.cover).startsWith("http") ? "✓ uploaded to Supabase Storage" : "✓ attached (stored in-browser)") : "") + '</span></div>' +
    '<div class="full"><label class="f">PDF file (optional — enables real preview &amp; download)</label><input type="file" accept="application/pdf" onchange="handleUpload(this,\'file\',\'pdfs\')">' +
    '<span class="upload-status" id="file-status">' + (formState.file ? (String(formState.file).startsWith("http") ? "✓ PDF uploaded to Supabase Storage" : "✓ PDF attached (stored in-browser)") : "") + '</span></div>' +
    '<div class="full check-row"><label><input type="checkbox" id="bf-featured"' + (b && b.featured ? " checked" : "") + '>⭐ Featured</label>' +
    '<label><input type="checkbox" id="bf-popular"' + (b && b.popular ? " checked" : "") + '>🔥 Popular</label></div>' +
    '<div class="full" style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">' +
    '<button class="btn btn-ghost" type="button" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-accent" type="submit">' + (b ? "Save changes" : "Add book ⚡") + '</button></div>' +
    '</div></form>', true);
}
function handleUpload(input, field, folder) {
  const file = input.files && input.files[0];
  if (!file) return;
  const statusEl = document.getElementById(field === "cover" ? "cover-status" : "file-status");
  const setStat = (s) => { if (statusEl) statusEl.textContent = s; };
  if (conn && session) {
    setStat("⏳ Uploading to Supabase Storage…");
    uploadToStorage(file, folder)
      .then((url) => { formState[field] = url; setStat("✓ Uploaded to Supabase Storage"); toast("Upload complete ✓", "success"); })
      .catch((e) => setStat("✗ Upload failed — " + e.message));
  } else {
    if (file.size > 3 * 1024 * 1024) { setStat("✗ Larger than 3MB — demo storage can't hold it. Connect Supabase for real files."); return; }
    const r = new FileReader();
    r.onload = () => { formState[field] = r.result; setStat("✓ Attached (stored in-browser — connect Supabase for real uploads)"); };
    r.readAsDataURL(file);
  }
}
function submitBook(e) {
  e.preventDefault();
  const g = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
  const title = g("bf-title").trim();
  if (!title) { toast("Please add a title.", "error"); return false; }
  const existing = formState.id ? store.books.find((b) => b.id === formState.id) : null;
  const b = {
    id: formState.id || uid(),
    title: title,
    cls: Number(g("bf-cls")) || 10,
    subject: g("bf-subject").trim() || "General",
    type: g("bf-type"),
    publication: g("bf-pub").trim() || "PikaStudy Curated",
    author: g("bf-author").trim(),
    language: g("bf-lang") || "English",
    pages: Number(g("bf-pages")) || 0,
    desc: g("bf-desc").trim(),
    chapters: g("bf-chapters").split("\n").map((s) => s.trim()).filter(Boolean),
    featured: document.getElementById("bf-featured").checked,
    popular: document.getElementById("bf-popular").checked,
    cover: formState.cover || null,
    file: formState.file || null,
    downloads: existing ? existing.downloads : 0,
    rating: existing ? existing.rating : 0,
    addedAt: existing ? existing.addedAt : new Date().toISOString(),
  };
  saveBook(b);
  closeModal(); render();
  toast(existing ? "Book updated." : "Book added to the library! ⚡", "success");
  return false;
}

function connectHTML() {
  return conn
    ? '<div class="stat-cards"><div class="stat-s" style="grid-column:span 2"><span>Connected to</span><b style="font-size:15px;word-break:break-all">' + esc(conn.url) + '</b></div>' +
      '<div class="stat-s"><span>Mode</span><b style="font-size:15px">🔴 Live database</b></div>' +
      '<div class="stat-s"><span>Signed in</span><b style="font-size:15px">' + (session ? "yes" : "no") + '</b></div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 20px">' +
      '<button class="btn btn-primary" onclick="syncFromRemote()">↻ Re-sync from database</button>' +
      '<button class="btn btn-outline" onclick="seedRemote()">🌱 Seed 34 sample books</button>' +
      '<button class="btn btn-danger" onclick="disconnectSB()">Disconnect</button></div>' +
      '<details><summary style="cursor:pointer;font-weight:700;font-size:14px">Setup SQL (for a fresh Supabase project)</summary>' +
      '<textarea class="sql-box" id="sql-box" readonly>' + esc(SB_SQL) + '</textarea>' +
      '<button class="btn btn-outline btn-sm" onclick="copySQL()">Copy SQL</button></details>'
    : '<div class="tax-card" style="max-width:640px"><h3>Go live with a free Supabase backend</h3>' +
      '<div class="step"><span class="step-n">1</span><p><b>Create a project</b> at supabase.com (free tier is plenty).</p></div>' +
      '<div class="step"><span class="step-n">2</span><p><b>Run the setup SQL</b> below in the Supabase SQL Editor — it creates the tables, security rules and file storage.</p></div>' +
      '<div class="step"><span class="step-n">3</span><p><b>Add an admin user</b> in Authentication → Users (email + password).</p></div>' +
      '<div class="step"><span class="step-n">4</span><p><b>Paste the URL + anon key</b> below and connect — then sign in with your email.</p></div>' +
      '<textarea class="sql-box" id="sql-box" readonly style="margin:12px 0">' + esc(SB_SQL) + '</textarea>' +
      '<button class="btn btn-outline btn-sm" onclick="copySQL()">📋 Copy SQL</button>' +
      '<form onsubmit="return connectSB(event)" style="margin-top:20px">' +
      '<label class="f">Project URL</label><input class="field" id="sb-url" placeholder="https://xxxx.supabase.co" required style="margin-bottom:12px">' +
      '<label class="f">Anon (public) key</label><input class="field" id="sb-key" placeholder="eyJhbGciOi… (Project Settings → API)" required style="margin-bottom:14px">' +
      '<button class="btn btn-accent" type="submit">⚡ Connect</button></form>' +
      '<p style="font-size:12px;color:var(--sub);margin-top:12px">The anon key is public by design — the database is protected by row-level security rules. Never paste the service-role key anywhere in this page.</p></div>';
}
function adminHTML() {
  if (!adminAuthed() && adminTab === "connect") {
    return '<div class="wrap"><div class="admin-head"><h1><span class="admin-ico">⚡</span>Backend setup</h1>' +
      '<button class="btn btn-outline btn-sm" onclick="adminTab=\'overview\';render()">← Back to sign-in</button></div>' +
      '<div class="banner"><span>🔌</span><span>Connect your free Supabase database — then sign in with your admin account. No connection? The site works in demo mode (browser-only data).</span></div>' +
      connectHTML() + '</div>';
  }
  if (!adminAuthed()) return adminLoginHTML();
  const tabs = [["overview", "📊 Overview"], ["books", "📚 Books"], ["requests", "🔔 Requests"], ["taxonomy", "🏫 Classes & Subjects"], ["connect", "⚡ Backend / Connect"]];
  let body = "";
  if (adminTab === "overview") {
    const bs = store.books, rs = store.requests;
    const totalDl = bs.reduce((a, b) => a + (b.downloads || 0), 0);
    const newReq = rs.filter((r) => r.status === "new").length;
    body = '<div class="stat-cards">' +
      [[bs.length, "Total books"], [bs.filter((b) => b.cls === 10).length, "Class 10"], [bs.filter((b) => b.cls === 11).length, "Class 11"], [bs.filter((b) => b.cls === 12).length, "Class 12"], [newReq, "New requests"], [fmtNum(totalDl), "Total downloads"]]
        .map((s) => '<div class="stat-s"><span>' + s[1] + '</span><b>' + s[0] + '</b></div>').join("") + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">' +
      '<div class="tax-card"><h3>🔔 Latest requests</h3>' + (rs.length ? rs.slice(0, 3).map((r) =>
        '<div class="req-card"><div class="top"><h4>' + esc(r.title) + '</h4><span class="chip">' + (r.status === "new" ? "new" : "resolved") + '</span></div>' +
        '<p>' + esc(r.name || "Anonymous") + ' · Class ' + (r.cls || "—") + ' · ' + esc(r.subject || "") + '</p></div>').join("") : '<p class="sec-sub">No requests yet.</p>') +
      '<button class="btn btn-outline btn-sm" onclick="setAdminTab(\'requests\')">All requests →</button></div>' +
      '<div class="tax-card"><h3>⚡ Quick actions</h3>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<button class="btn btn-accent" onclick="openBookForm(null)">＋ Add a new book</button>' +
      '<button class="btn btn-outline" onclick="setAdminTab(\'taxonomy\')">Manage classes &amp; subjects</button>' +
      '<button class="btn btn-outline" onclick="setAdminTab(\'connect\')">Backend &amp; database</button>' +
      '<button class="btn btn-ghost" onclick="doZip()">⬇ Download website as ZIP</button></div></div></div>';
  } else if (adminTab === "books") {
    body = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px">' +
      '<p class="lib-count" style="margin:0">' + store.books.length + ' books in the library</p>' +
      '<button class="btn btn-accent" onclick="openBookForm(null)">＋ Add book</button></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Title</th><th>Class</th><th>Type</th><th>Downloads</th><th>⭐</th><th>🔥</th><th>File</th><th></th></tr></thead><tbody>' +
      store.books.map((b) => '<tr>' +
        '<td><a href="#/book/' + b.id + '" style="font-weight:700">' + esc(b.title) + '</a><div style="font-size:11px;color:var(--sub)">' + esc(b.subject) + ' · ' + esc(b.publication) + '</div></td>' +
        '<td>' + b.cls + '</td><td>' + (RESOURCE_TYPES[b.type] || {}).short + '</td><td>' + fmtNum(b.downloads) + '</td>' +
        '<td><button class="flag-btn' + (b.featured ? " on" : "") + '" onclick="toggleFlag(\'' + b.id + '\',\'featured\');render()" title="Toggle featured">★</button></td>' +
        '<td><button class="flag-btn' + (b.popular ? " on" : "") + '" onclick="toggleFlag(\'' + b.id + '\',\'popular\');render()" title="Toggle popular">🔥</button></td>' +
        '<td>' + (b.file ? "✓" : "—") + '</td>' +
        '<td style="white-space:nowrap"><button class="btn btn-outline btn-sm" onclick="openBookForm(\'' + b.id + '\')">Edit</button> ' +
        '<button class="btn btn-danger btn-sm" onclick="delBook(\'' + b.id + '\')">Delete</button></td></tr>').join("") +
      '</tbody></table></div>';
  } else if (adminTab === "requests") {
    body = store.requests.length ? store.requests.map((r) =>
      '<div class="req-card"><div class="top"><h4>' + esc(r.title) + '</h4><span class="chip">' + (r.status === "new" ? "🆕 new" : "✓ resolved") + '</span></div>' +
      '<p>' + esc(r.name || "Anonymous") + ' · Class ' + (r.cls || "—") + ' · ' + esc(r.subject || "") + ' · ' + fmtDate(r.createdAt) + (r.note ? ' — “' + esc(r.note) + '”' : "") + '</p>' +
      '<div style="display:flex;gap:8px">' +
      '<button class="btn btn-outline btn-sm" onclick="resolveRequest(\'' + r.id + '\')">' + (r.status === "new" ? "Mark resolved" : "Re-open") + '</button>' +
      '<button class="btn btn-danger btn-sm" onclick="deleteRequest(\'' + r.id + '\')">Delete</button></div></div>').join("") :
      emptyState("No requests", "When students request books, they appear here.");
  } else if (adminTab === "taxonomy") {
    body = '<div class="tax-grid">' + [10, 11, 12].map((c) =>
      '<div class="tax-card"><h3>Class ' + c + ' subjects</h3>' +
      '<div class="tax-chips">' + store.taxonomy.subjects[c].map((s) => '<span class="tax-chip">' + esc(s) + '<button class="tax-x" onclick="removeSubject(' + c + ',\'' + esc(s) + '\')" title="Remove">×</button></span>').join("") + '</div>' +
      '<form class="inline-form" onsubmit="return subjectSubmit(event,' + c + ')"><input class="input" placeholder="Add subject…" required><button class="btn btn-accent btn-sm" type="submit">Add</button></form></div>').join("") + '</div>' +
      '<div class="tax-card" style="margin-top:16px"><h3>Publications</h3>' +
      '<div class="tax-chips">' + store.taxonomy.publications.map((p) => '<span class="tax-chip">' + esc(p) + '<button class="tax-x" onclick="removePublication(\'' + esc(p) + '\')" title="Remove">×</button></span>').join("") + '</div>' +
      '<form class="inline-form" onsubmit="return pubSubmit(event)" style="max-width:420px"><input class="input" placeholder="Add publication…" required><button class="btn btn-accent btn-sm" type="submit">Add</button></form></div>';
  } else if (adminTab === "connect") {
    body = connectHTML();
  }
  return '<div class="wrap"><div class="admin-head"><h1><span class="admin-ico">⚡</span>Admin dashboard</h1>' +
    '<button class="btn btn-outline btn-sm" onclick="adminLogout()">Log out</button></div>' +
    '<div class="banner' + (conn ? " live" : "") + '"><span>' + (conn ? "🟢" : "⚠️") + '</span><span>' +
    (conn ? "<b>Live mode:</b> connected to your Supabase project — books, requests, uploads and sign-ins are backed by your real database."
          : "<b>Demo mode:</b> all changes are saved to this browser only (localStorage). Connect a real database before launch — see the Backend / Connect tab.") +
    '</span></div>' +
    '<div class="admin-tabs">' + tabs.map((t) => '<button class="atab' + (adminTab === t[0] ? " on" : "") + '" onclick="setAdminTab(\'' + t[0] + '\')">' + t[1] + '</button>').join("") + '</div>' +
    body + '</div>';
}
function subjectSubmit(e, cls) { e.preventDefault(); addSubject(cls, e.target.querySelector("input").value.trim()); return false; }
function pubSubmit(e) { e.preventDefault(); addPublication(e.target.querySelector("input").value.trim()); return false; }
function delBook(id) { if (confirm("Delete this book from the library?")) { deleteBook(id); render(); toast("Book deleted.", "success"); } }
function copySQL() {
  const box = document.getElementById("sql-box");
  if (!box) return;
  box.select();
  try { navigator.clipboard.writeText(box.value); toast("SQL copied — paste it into the Supabase SQL Editor.", "success"); }
  catch (e) { try { document.execCommand("copy"); toast("SQL copied.", "success"); } catch (e2) { toast("Select the text and copy manually.", "error"); } }
}
function connectSB(e) {
  e.preventDefault();
  const url = document.getElementById("sb-url").value.trim().replace(/\/+$/, "");
  const key = document.getElementById("sb-key").value.trim();
  if (!/^https:\/\/.+\.supabase\.co$/.test(url) && !/^https:\/\/.+$/.test(url)) { toast("That URL doesn't look right — use your Project URL from Supabase settings.", "error"); return false; }
  if (key.length < 20) { toast("That anon key looks too short — copy it from Project Settings → API.", "error"); return false; }
  conn = { url: url, key: key };
  ls.set(CONN_KEY, conn);
  render(); toast("Connected! Now run the setup SQL if you haven't, then sign in.", "success");
  return false;
}
function disconnectSB() {
  if (!confirm("Disconnect from Supabase? The site switches back to demo mode (browser-only data).")) return;
  conn = null; session = null; ls.del(CONN_KEY); ls.del(SESSION_KEY);
  render(); toast("Disconnected — back to demo mode.", "info");
}

/* ---------- modals, preview, download, requests ---------- */
function openModal(html, large) {
  document.getElementById("modal-root").innerHTML =
    '<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="modal' + (large ? " modal-lg" : "") + '">' +
    '<button class="modal-x" onclick="closeModal()" aria-label="Close">×</button>' + html + '</div></div>';
}
function closeModal() { document.getElementById("modal-root").innerHTML = ""; }

function dataUrlToBlobUrl(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || "application/octet-stream";
  const bin = atob(parts[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
}
function previewBook(id) {
  const b = store.books.find((x) => x.id === id); if (!b) return;
  if (!b.file) { openModal('<h2>Preview not available</h2><p class="sub">No PDF has been attached to this book yet — nothing to preview. It starts working the moment a file is uploaded from the admin panel.</p><button class="btn btn-accent" onclick="closeModal()">Got it</button>'); return; }
  const src = String(b.file).startsWith("data:") ? dataUrlToBlobUrl(b.file) : b.file;
  openModal('<h2>Preview — ' + esc(b.title) + '</h2><p class="sub">Use the Download button on the book page to save the file.</p>' +
    '<iframe class="preview-frame" src="' + esc(src) + '" title="Book preview"></iframe>' +
    '<div style="margin-top:12px;display:flex;gap:10px"><button class="btn btn-outline" onclick="downloadBook(\'' + b.id + '\')">⬇ Download</button>' +
    '<button class="btn btn-ghost" onclick="closeModal()">Close</button></div>', true);
}
function downloadBook(id) {
  const b = store.books.find((x) => x.id === id); if (!b) return;
  if (!b.file) { toast("No file attached yet — the PikaStudy team hasn't uploaded this book's PDF. Nothing to download (no fake buttons!).", "error"); return; }
  addDownload(id);
  const a = document.createElement("a");
  a.href = String(b.file).startsWith("data:") ? dataUrlToBlobUrl(b.file) : b.file;
  a.download = (b.title || "book").replace(/[^\w\u0900-\u097F -]+/g, "").slice(0, 80) + ".pdf";
  document.body.appendChild(a); a.click(); a.remove();
  toast("Download started ⚡", "success");
}
function openRequest() {
  openModal('<h2>⚡ Request a book</h2><p class="sub">Can\u2019t find something? Tell us and we\u2019ll try to add it to the library.</p>' +
    '<form onsubmit="return submitRequest(event)">' +
    '<div class="form-grid">' +
    '<div><label class="f">Your name (optional)</label><input class="field" id="rq-name" placeholder="e.g. Aarav"></div>' +
    '<div><label class="f">Class</label><select class="field" id="rq-cls"><option value="">—</option><option>10</option><option>11</option><option>12</option></select></div>' +
    '<div class="full"><label class="f">Subject (optional)</label><input class="field" id="rq-subject" placeholder="e.g. Physics"></div>' +
    '<div class="full"><label class="f">Book / resource you need *</label><input class="field" id="rq-title" required placeholder="e.g. MTG Fingertips Biology — Class 11"></div>' +
    '<div class="full"><label class="f">Note (optional)</label><textarea class="field" id="rq-note" rows="2" placeholder="Anything else?"></textarea></div>' +
    '<div class="full" style="display:flex;justify-content:flex-end;gap:10px">' +
    '<button class="btn btn-ghost" type="button" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-accent" type="submit">Send request ⚡</button></div></div></form>');
}
function submitRequest(e) {
  e.preventDefault();
  const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
  addRequest({
    id: uid(), name: g("rq-name"), cls: g("rq-cls") ? Number(g("rq-cls")) : null,
    subject: g("rq-subject"), title: g("rq-title"), note: g("rq-note"),
    status: "new", createdAt: new Date().toISOString(),
  });
  closeModal();
  toast("Request sent — thank you! ⚡" + (conn ? " (saved to the database)" : " (saved in this browser)"), "success");
  return false;
}
function heroSearch(e) {
  e.preventDefault();
  const el = document.getElementById("hero-q");
  if (el && el.value.trim()) location.hash = "#/search?q=" + encodeURIComponent(el.value.trim());
  return false;
}
function go(h) { location.hash = h; }
function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("pikastudy-theme", theme); } catch (e) {}
  render();
}

/* ---------- ZIP export (built right here in your browser) ---------- */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const data = enc.encode(f.text);
    const name = enc.encode(f.name);
    const crc = crc32(data);
    const lh = new Uint8Array(30 + name.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0x21, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, name.length, true);
    dv.setUint16(28, 0, true);
    lh.set(name, 30);
    parts.push(lh, data);
    const ch = new Uint8Array(46 + name.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true); cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    ch.set(name, 46);
    central.push(ch);
    offset += lh.length + data.length;
  }
  let cdSize = 0; central.forEach((c) => { cdSize += c.length; });
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  return new Blob(parts.concat(central, [eocd]), { type: "application/zip" });
}
const README_TXT = [
  "PikaStudy - Learn Smart. Shine Bright.",
  "Free educational books and resources for Class 10, 11 and 12.",
  "",
  "WHAT IS IN THIS ZIP",
  "  index.html            the complete website (all pages; works offline)",
  "  css/style.css         all styles (light + dark themes)",
  "  js/data.js            brand tokens, the 34 sample books and taxonomy",
  "  js/app.js             the whole app: router, library, search, admin,",
  "                        Supabase sync and the ZIP builder",
  "  assets/pika-mascot.svg  the PikaStudy mascot (owner-supplied image)",
  "  README.md             this file",
  "",
  "RUN IT",
  "  Option 1: unzip, then double-click index.html - everything works",
  "            straight from your local disk.",
  "  Option 2 (better): host the folder on any static host -",
  "            Netlify Drop (app.netlify.com/drop), GitHub Pages,",
  "            Vercel or Cloudflare Pages. No build step, no dependencies.",
  "",
  "ADMIN PANEL (#/admin)",
  "  Demo mode password: pika2026",
  "  In demo mode all changes are saved in the browser's localStorage only.",
  "",
  "GO LIVE WITH A REAL DATABASE (free, optional)",
  "  1. Create a project at supabase.com",
  "  2. Admin > Backend / Connect: copy the setup SQL and run it in the",
  "     Supabase SQL Editor (creates tables, security rules, file storage)",
  "  3. Supabase > Authentication > Users > Add user (your admin email)",
  "  4. Paste the Project URL + anon key into Admin > Backend / Connect",
  "     and press Connect, then sign in with your email.",
  "  Everything (books, requests, uploads, sign-ins) is then stored in",
  "  your own Postgres database. The anon key is public by design and safe",
  "  in the page - the service-role key must NEVER be pasted anywhere here.",
  "",
  "NOTES",
  "  - The mascot is the owner-supplied image. Confirm you have the rights",
  "    to use it before publishing publicly.",
  "  - Sample books are structural placeholders; attach real PDFs from the",
  "    admin panel once you go live.",
  "  - Dark mode: click the moon/sun icon in the navbar.",
  "",
  "Made for Akash Maurya - Learn Smart. Shine Bright.",
].join("\n");
function doZip() {
  const cssEl = document.getElementById("site-css"), dataEl = document.getElementById("site-data"), appEl = document.getElementById("site-app");
  if (!cssEl || !dataEl || !appEl) { toast("ZIP export is only available in the single-file version of the site.", "info"); return; }
  let html = window.__PRISTINE__ || ("<!DOCTYPE html>\n" + document.documentElement.outerHTML);
  html = html.replace(/<style id="site-css">[\s\S]*?<\/style>/, '<link rel="stylesheet" href="css/style.css">');
  html = html.replace(/<script id="site-data">[\s\S]*?<\/script>/, "<script src=\"js/data.js\"></" + "script>");
  html = html.replace(/<script id="site-app">[\s\S]*?<\/script>/, "<script src=\"js/app.js\"></" + "script>");
  const files = [
    { name: "index.html", text: html },
    { name: "css/style.css", text: cssEl.textContent },
    { name: "js/data.js", text: dataEl.textContent },
    { name: "js/app.js", text: appEl.textContent },
    { name: "assets/pika-mascot.svg", text: PIKA_FILE_SVG },
    { name: "README.md", text: README_TXT },
  ];
  try {
    const blob = makeZip(files);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pikastudy-website.zip";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("pikastudy-website.zip downloaded (" + Math.round(blob.size / 1024) + " KB) ⚡", "success");
  } catch (e) {
    toast("ZIP build failed: " + e.message, "error");
  }
}

/* ---------- router ---------- */
function render() {
  const h = (location.hash || "#/").slice(1);
  let page = "";
  if (h === "/" || h === "") page = homeHTML();
  else if (h === "/library") page = libraryHTML("Book Library", "Every book and resource on PikaStudy — filter by class, subject, type and publication.", "📚", null, null);
  else if (h.startsWith("/class/")) {
    const c = Number(h.split("/")[2]);
    if ([10, 11, 12].includes(c)) page = libraryHTML("Class " + c + " Library", "All resources for Class " + c + " — strictly no cross-class mixing, exactly how you study.", "🎓", c, null);
    else page = notFound();
  } else if (h.startsWith("/resources/")) {
    const k = h.split("/")[2];
    const rt = RESOURCE_TYPES[k];
    page = rt ? libraryHTML(rt.label, rt.desc, rt.emoji, null, k) : notFound();
  } else if (h.startsWith("/search")) {
    const q = decodeURIComponent((h.split("?q=")[1] || "").replace(/\+/g, " "));
    page = searchHTML(q);
  } else if (h.startsWith("/book/")) page = bookHTML(h.split("/")[2]);
  else if (h === "/admin") page = adminHTML();
  else page = notFound();
  document.getElementById("app").innerHTML = navHTML() + '<main>' + page + '</main>' + footerHTML();
}
function notFound() {
  return '<div class="wrap">' + emptyState("404 — page not found", "That page doesn't exist (yet!). Let's get you back to the library.", '<a class="btn btn-accent" href="#/">Go home</a>') + '</div>';
}

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
render();
if (conn) syncFromRemote(true);
