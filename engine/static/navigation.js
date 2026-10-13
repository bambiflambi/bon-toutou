/* Bon toutou — v0.7.6 : chercher en petites étapes.
   Documents et Archives s'ouvrent sur les familles ; une famille montre ses sous-familles ; une sous-famille montre ses documents.
   Un fil (Documents › Famille › Sous-famille) permet de remonter d'un clic. La recherche donne une liste courte, chaque ligne dit
   où est le document. Ouvrir un document puis revenir ramène exactement où l'on était (Archives reste Archives, la recherche reste). */
S.dn = S.dn || { docs: {}, archives: {} };

/* ---- Revenir d'où l'on vient */
const goNav = go;
go = function (v, extra = {}) {
  if (v === "doc" && S.v !== "doc") S.from = { v: S.v, q: S.q, at: S.at, y: window.scrollY };
  if (v !== "doc" && v !== S.v) S.info = false;
  if (v === "archives" && S.v !== "archives" && S.v !== "dossier" && !("at" in extra)) S.at = "old";   // Archives s'ouvre sur les anciens documents
  return goNav(v, extra);
};
async function navBack() {
  const f = S.from && S.from.v ? S.from : { v: "docs", q: "", y: 0 };
  Object.assign(S, { v: f.v, q: f.q || "", at: f.at || S.at, fix: false, confirm: null, info: false });
  await load();
  window.scrollTo(0, f.y || 0);
}
const fromArchives = () => S.v === "doc" && S.from && S.from.v === "archives";

/* ---- À qui est ce papier : le nom s'affiche dès que ce n'est pas toi */
const whoOf = (d) => holderName(d);
const emDisp = (d) => { const ex = docExtra(d); return ex.emitter_display || String(d.emitter || "").replace(/-/g, " "); };

/* ---- Le fil d'étapes et les tuiles */
const dnSubOf = (d) => d.sub || String(d.sub_folder || "").split("_")[0] || "?";
function dnTiles(kind, L, level) {
  const key = level === "cat" ? (d) => d.cat : dnSubOf;
  const K = [...new Set(L.map(key))].sort();
  return `<div class="groups dntiles">${K.map((k) => {
    const n = L.filter((d) => key(d) === k).length;
    const lab = level === "cat" ? `${k} ${esc(catName(k))}` : esc(subName(k));
    return `<button class="group" data-dn="${kind}" data-dn-${level}="${esc(k)}"><span class="oi" style="width:30px;height:30px">${level === "cat" ? catIc(k) : IC.folder}</span><b>${lab}</b><span class="n">${n}</span></button>`;
  }).join("")}</div>`;
}
function dnCrumbs(kind, root, sub, single) {
  const st = S.dn[kind], parts = [`<button class="linkbtn" data-dn="${kind}" data-dn-up="root">${esc(root)}</button>`];
  if (st.cat) parts.push(sub && !single ? `<button class="linkbtn" data-dn="${kind}" data-dn-up="cat">${esc(catName(st.cat))}</button>` : `<b>${esc(catName(st.cat))}</b>`);
  if (sub) parts.push(`<b>${esc(subName(sub))}</b>`);
  return `<nav class="crumbs dncrumbs" aria-label="Où tu es">${parts.join("<span>›</span>")}</nav>`;
}
function dnCountries(kind, L) {
  const st = S.dn[kind], ccs = [...new Set(L.map((d) => d.country))].sort();
  if (st.cc && !ccs.includes(st.cc)) st.cc = null;
  if (ccs.length < 2) return "";
  return `<div class="dnpays">${[null, ...ccs].map((c) => `<button class="chip${(st.cc || null) === c ? " on" : ""}" data-dn="${kind}" data-dn-cc="${c || ""}">${c ? cc(c) + " " + esc(S.st.countries[c] || c) : "Tous les pays"} <span class="sub">${(c ? L.filter((d) => d.country === c) : L).length}</span></button>`).join("")}</div>`;
}
/* Le suivi dans le temps d'un bien ou d'un logement, en une ligne : acheté / vendu, loué de … à …, habité de … à … */
function bienInfo(X) {
  const yr = (L) => L.map((d) => String(d.doc_date || "").slice(0, 4)).filter((y) => y > "1900").sort();
  const of = (t) => yr(X.filter((d) => d.type === t)), all = yr(X), sub = X[0] && X[0].sub;
  if (sub === "10-1") { const a = of("immo_achat"), v = of("immo_vente");
    return [a.length ? "acheté en " + a[a.length - 1] : "", v.length ? "vendu en " + v[v.length - 1] : "à toi aujourd'hui"].filter(Boolean).join(" · "); }
  if (!all.length) return "";
  const live = X.some((d) => d.status === "actuel");
  if (sub === "02-7") return all[0] === all[all.length - 1] ? "loué en " + all[0] : `loué de ${all[0]} à ${live ? "aujourd'hui" : all[all.length - 1]}`;
  if (sub === "02-6") return live ? `depuis ${all[0]}` : (all[0] === all[all.length - 1] ? "en " + all[0] : `de ${all[0]} à ${all[all.length - 1]}`);
  return "";
}

/* Liste d'une sous-famille : d'abord par titulaire (toi en premier), puis un intertitre par dossier ou émetteur. */
function dnList(kind, L) {
  if (false) {   // v0.9 : plus de dossiers par bien ; le lieu est une étiquette (vues Lieux à venir)
    const first = (bn) => L.filter((d) => (d.bien || "") === bn).map((d) => d.doc_date || "9999").sort()[0];   // ordre de la vie : le plus ancien d'abord
    const Bs = [...new Set(L.map((d) => d.bien || ""))].sort((a, b) => !a - !b || (/^\d{4}/.test(a) && /^\d{4}/.test(b) ? a.slice(0, 4).localeCompare(b.slice(0, 4)) || first(a).localeCompare(first(b)) : a.localeCompare(b)));
    return Bs.map((bn) => { const X = L.filter((d) => (d.bien || "") === bn);
      return `<div class="holderhead"><span class="oi">${IC.house}</span><b>${esc(String(bn || "Sans lieu précis").replace(/^\d{4}[_ ]/, ""))}</b>${bienInfo(X) ? ` <span class="pill neutral">${esc(bienInfo(X))}</span>` : ""}<span class="sub">${X.length} ${plural(X.length, "document")}</span></div>` + dnListOne(kind, X); }).join("");
  }
  const H = [...new Set(L.map(holderName))].sort((a, b) => (b === S.st.settings.owner) - (a === S.st.settings.owner) || a.localeCompare(b));
  if (H.length > 1)
    return H.map((h) => { const X = L.filter((d) => holderName(d) === h);
      return `<div class="holderhead"><span class="oi">${IC.id}</span><b>${esc(h || "Titulaire inconnu")}</b>${h === S.st.settings.owner ? ` <span class="pill acc">toi</span>` : ""}<span class="sub">${X.length} ${plural(X.length, "document")}</span></div>` + dnListOne(kind, X); }).join("");
  return dnListOne(kind, L);
}
function dnListOne(kind, L) {
  const rows = (X) => (kind === "archives" ? suiviRows(X, "old") : X.map(docRow).join(""));
  const E = [...new Set(L.map((d) => d.emitter_folder || ""))].sort((a, b) => (a === "Autres") - (b === "Autres") || a.localeCompare(b));
  if (E.length < 2) return `<div class="card doclist">${rows(L)}</div>`;
  const head = (e) => (e === "Autres" || e === "Copies" ? e : /^\d_/.test(e) ? e.slice(2).replace(/-/g, " ") : e ? e.replace(/-/g, " ") : subName(dnSubOf(L[0])));   // dossier « Autres » de la sous-famille, ou un émetteur
  return `<div class="card doclist">${E.map((e) => { const Y = L.filter((d) => (d.emitter_folder || "") === e);
    return `<div class="subhead" style="text-transform:none;letter-spacing:0">${esc(head(e))} · ${Y.length}</div>${rows(Y)}`; }).join("")}</div>`;
}
function drill(kind, L, root) {
  const st = S.dn[kind];
  const pays = dnCountries(kind, L);
  const X = st.cc ? L.filter((d) => d.country === st.cc) : L;
  if (st.cat && !X.some((d) => d.cat === st.cat)) { st.cat = null; st.sub = null; }
  if (!st.cat) return pays + `<p class="sub dnhint">Choisis une famille.</p>` + dnTiles(kind, X, "cat");
  const Y = X.filter((d) => d.cat === st.cat), subs = [...new Set(Y.map(dnSubOf))];
  if (st.sub && !subs.includes(st.sub)) st.sub = null;
  const single = subs.length === 1, sub = st.sub || (single ? subs[0] : null);   // une seule sous-famille : on l'ouvre directement
  if (!sub) return pays + dnCrumbs(kind, root) + dnTiles(kind, Y, "sub");
  return pays + dnCrumbs(kind, root, sub, single) + dnList(kind, Y.filter((d) => dnSubOf(d) === sub));
}
/* Recherche : une liste courte, chaque document avec son chemin. */
function dnSearch(kind, L, q) {
  const n = acNorm(q), hit = L.filter((d) => acNorm([d.label, d.emitter, d.detail, d.person, catName(d.cat), subName(dnSubOf(d))].join(" ")).includes(n));
  if (!hit.length) return `<div class="card empty">Aucun résultat pour « ${esc(q)} ».</div>`;
  const G = [...new Set(hit.map((d) => d.cat + "|" + dnSubOf(d)))].sort();
  return `<p class="sub dnhint">${hit.length} ${plural(hit.length, "résultat")}</p><div class="card doclist">${G.map((g) => { const [c, s] = g.split("|"), X = hit.filter((d) => d.cat === c && dnSubOf(d) === s);
    return `<div class="subhead" style="text-transform:none;letter-spacing:0">${esc(catName(c))} › ${esc(subName(s))} · ${X.length}</div>${kind === "archives" ? suiviRows(X, "old") : X.map(docRow).join("")}`; }).join("")}</div>`;
}

/* ---- Documents */
docs = function () {
  const ax = S.ax === "exp" ? "exp" : "fam", q = S.q.trim();
  const head = `<div class="thead"><h1>Documents</h1><button class="ghost" data-act="doc-refresh" title="Retrouve les émetteurs manquants et range les anciens employeurs">${IC.sync} Mettre à jour</button></div>
  <p class="lead">${S.docs.length} ${plural(S.docs.length, "document suivi", "documents suivis")}, dans leur version actuelle.</p>
  <div class="search">${IC.search}<input id="q" value="${esc(S.q)}" placeholder="Chercher : passeport, EDF, fiche de paie…" aria-label="Chercher dans Documents"></div>
  ${q ? "" : `<div class="axes">${[["fam", "Par famille"], ["exp", "Expirent bientôt"]].map((a) => `<button class="${ax === a[0] ? "on" : ""}" data-ax="${a[0]}">${a[1]}</button>`).join("")}</div>`}`
    + (window.regroupCard ? regroupCard() : "");
  if (S.busy) return head + `<div class="card busy"><span class="spin"></span>${esc(S.busy)}</div>`;
  if (!S.docs.length) return head + `<div class="card empty">Aucun document pour l'instant. Commence par <button class="linkbtn" data-go="trier">Trier</button>.</div>`;
  if (q) return head + dnSearch("docs", S.docs, q);
  if (ax === "exp") { const L = S.docs.filter((d) => d.expiry && daysTo(d.expiry) <= 365).sort((a, b) => a.expiry.localeCompare(b.expiry));
    return head + `<div class="card doclist">${L.map(docRow).join("") || `<div class="row sub">Rien n'expire dans l'année.</div>`}</div>`; }
  return head + drill("docs", S.docs, "Documents");
};

/* ---- Archives */
const archivesNav = archives;
archives = function () {
  if (!S.at || S.at === "done") S.at = "old";
  if (!S.arch || S.at === "sent") return archivesNav();
  const A = S.arch, L = [...A.old, ...A.done], q = S.q.trim();
  return `<h1>Archives</h1><p class="lead">Ce qui n'est plus valable ou déjà envoyé. Rien n'est détruit.</p>
  <div class="search">${IC.search}<input id="q" value="${esc(S.q)}" placeholder="Chercher dans les archives : ancien RIB, bail, avis d'impôt 2024…" aria-label="Chercher dans les archives"></div>
  <div class="axes">${[["old", "Anciens documents", L.length], ["sent", "Dossiers envoyés", A.sent.length]].map((t) => `<button class="${S.at === t[0] ? "on" : ""}" data-at="${t[0]}">${t[1]} <span class="sub" style="color:inherit;opacity:.75">${t[2]}</span></button>`).join("")}</div>
  ${!L.length ? `<div class="card empty">Aucun ancien document.</div>` : q ? dnSearch("archives", L, q) : drill("archives", L, "Archives")}`;
};

/* ---- Fiche d'un document : l'essentiel, le reste derrière « i » */
function docExtra(d) { try { return typeof d.extra === "string" ? JSON.parse(d.extra || "{}") || {} : d.extra || {}; } catch (e) { return {}; } }
const docViewNav = docView;
docView = function () {
  const d = S.doc; if (!d) return "";
  let h = docViewNav();
  const back = fromArchives() ? "← Archives" : S.from && S.from.v === "home" ? "← Aujourd'hui" : S.from && S.from.v === "cal" ? "← Calendrier" : S.from && S.from.v === "dossier" ? "← Dossier" : "← Documents";
  h = h.replace(/<button class="back" data-go="docs">← Documents<\/button>/, `<button class="back" data-act="nav-back">${back}</button>`);
  // annexes retirées de la fiche principale
  const annex = [];
  h = h.replace(/<dt>Fichier<\/dt><dd class="fname">([\s\S]*?)<\/dd>/, (m, v) => (annex.push(["Fichier", v, 1]), ""));
  h = h.replace(/<dt>Sorties<\/dt><dd>([\s\S]*?)<\/dd>/, (m, v) => (annex.push(["Sorties", v]), ""));
  h = h.replace(/<dt>Confidentialité<\/dt><dd>([\s\S]*?)<\/dd>/, (m, v) => (annex.push(["Confidentialité", v]), ""));
  h = h.replace(/<dt>Reçu sous le nom<\/dt><dd class="fname">([\s\S]*?)<\/dd>/, (m, v) => (annex.push(["Reçu sous le nom", v, 1]), ""));
  const ex = docExtra(d);
  if (ex.origin) annex.push(["Trouvé dans", esc(ex.origin), 1]);
  if (ex.lot) annex.push(["Lot", esc(typeof ex.lot === "string" ? ex.lot : JSON.stringify(ex.lot))]);
  if (ex.suggestion) annex.push(["Famille imaginée", esc(ex.suggestion)]);
  if (d.added_at) annex.push(["Rangé le", frd(String(d.added_at).slice(0, 10))]);
  if (d.sha) annex.push(["Empreinte", esc(String(d.sha).slice(0, 16)) + "…", 1]);
  const ibtn = `<button class="ibtn${S.info ? " on" : ""}" data-act="doc-info" aria-expanded="${!!S.info}" aria-label="Informations annexes" title="Informations annexes">i</button>`;
  h = h.replace(/(<h1 style="margin:0">[\s\S]*?<\/h1>)/, `$1${ibtn}`);
  const panel = S.info ? `<div class="infobox"><dl class="kv">${annex.map((a) => `<dt>${a[0]}</dt><dd${a[2] ? ' class="fname"' : ""}>${a[1]}</dd>`).join("")}</dl></div>` : "";
  h = h.replace(/(<\/dl>)(\s*<div class="acts" style="margin-top:12px">)/, `$1${panel}$2`);
  if (!S.info) h = h.replace(/<div class="fname sub">[^<]*<\/div><\/div><button class="linkbtn" data-open=/g, "</div><button class=\"linkbtn\" data-open=");
  // émetteur écrit comme un nom, pas comme un nom de fichier
  h = h.replace(/<dt>Émetteur<\/dt><dd>[^<]*<\/dd>/, `<dt>Émetteur</dt><dd>${esc(emDisp(d))}</dd>`);
  // à qui : dans le titre quand ce n'est pas toi
  if (whoOf(d)) h = h.replace(/(<h1 style="margin:0">)([\s\S]*?)(<\/h1>)/, `$1$2 <span class="whoname">— ${esc(whoOf(d))}</span>$3`);
  // versions : chacune à sa place. Depuis Documents, les anciennes (dans Archives) ; depuis Archives, l'actuelle (dans Documents)
  const H = (d.history || []).filter((x) => x.id !== d.id), cur = H.filter((x) => x.status === "actuel"), olds = H.filter((x) => x.status !== "actuel");
  const vrow = (x, where) => `<div class="row drow vjump" data-doc="${x.id}" role="button" tabindex="0" style="cursor:pointer"><span class="pill ${x.status === "actuel" ? "ok" : "neutral"}">${esc(x.status_label)}</span><div class="grow"><b>${frd(x.doc_date)}</b> <span class="sub">· ${where}</span></div><span>›</span></div>`;
  const vers = (d.status === "actuel"
      ? (olds.length ? `<div class="label" style="margin:22px 0 8px">Anciennes versions · rangées dans Archives</div><div class="card">${olds.map((x) => vrow(x, "dans Archives")).join("")}</div>` : "")
      : (cur.length ? `<div class="label" style="margin:22px 0 8px">Remplacé par · dans Documents</div><div class="card">${cur.map((x) => vrow(x, "dans Documents")).join("")}</div>` : "")
        + (olds.length ? `<div class="label" style="margin:22px 0 8px">Autres anciennes versions</div><div class="card">${olds.map((x) => vrow(x, "dans Archives")).join("")}</div>` : ""));
  h = h.replace(/<div class="label" style="margin:22px 0 8px">Version actuelle et historique<\/div>[\s\S]*?(<div class="label" style="margin:22px 0 8px">Utilisé dans)/, vers + "$1");
  // la ligne sous le titre : seulement ce qui aide à reconnaître le document
  h = h.replace(/<p class="sub" style="margin:0 0 14px"><span class="pill acc">Document suivi<\/span>[\s\S]*?<\/p>/, `<p class="sub" style="margin:0 0 14px">${esc(catName(d.cat))} › ${esc(subName(d.sub || dnSubOf(d)))}${d.status !== "actuel" ? ` · <span class="pill neutral">${esc(d.status_label)}</span>` : ""}</p>`);
  return h;
};

document.addEventListener("click", (e) => {
  const t = e.target;
  const a = t.closest("[data-act]");
  if (a && a.dataset.act === "nav-back") { e.stopImmediatePropagation(); return navBack(); }
  if (a && a.dataset.act === "doc-info") { e.stopImmediatePropagation(); S.info = !S.info; return render(); }
  const b = t.closest("[data-dn]"); if (!b) return;
  e.stopImmediatePropagation();
  const st = S.dn[b.dataset.dn];
  if (b.dataset.dnCc !== undefined) { st.cc = b.dataset.dnCc || null; st.cat = null; st.sub = null; }
  else if (b.dataset.dnCat) { st.cat = b.dataset.dnCat; st.sub = null; }
  else if (b.dataset.dnSub) st.sub = b.dataset.dnSub;
  else if (b.dataset.dnUp === "root") { st.cat = null; st.sub = null; }
  else if (b.dataset.dnUp === "cat") st.sub = null;
  render(); window.scrollTo(0, 0);
}, true);
/* Échap remonte d'une étape. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || editing() || S.modal) return;
  if (S.v === "doc" && S.from) return navBack();
  const st = S.v === "docs" ? S.dn.docs : S.v === "archives" ? S.dn.archives : null;
  if (!st || (!st.cat && !st.sub)) return;
  if (st.sub) st.sub = null; else st.cat = null;
  render();
});
