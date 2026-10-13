/* Bon toutou — v0.9.1 : la règle des cases, partout.
   À chaque étage qui a au moins deux groupes : des cases ; un clic ouvre une nouvelle page. Un étage à un seul groupe est sauté.
   Ordre des étages : (Logement : la porte « Là où j'habite » / « Ce que je mets en location ») → sous-famille → titulaire → lieu →
   organisme → nature → année. La liste finale est courte, homogène, la plus récente en haut. Jamais de liste empilée.
   Aussi : flèches ← → (comme un navigateur, ⌘[ ⌘]) et, dans la fiche, le format du fichier, son poids et son aperçu. */

/* ---------------------------------------------------------------- Les étages */
const CS_HABITE = ["locataire", "proprietaire_occupant", "heberge"];
const CS_PORTES = { habite: ["Là où j'habite", "house", "Les logements où tu vis ou as vécu"], loue: ["Ce que je mets en location", "key", "Les biens que tu loues à quelqu'un"], autres: ["Autres papiers du logement", "folder", "Sans lieu ni rôle précis"] };
const CS_ORDER = { "02": ["porte", "sub", "lieu", "holder", "org", "nature", "year"], "10": ["sub", "lieu", "holder", "org", "nature", "year"] };
const CS_DEFAULT = ["sub", "holder", "lieu", "org", "nature", "year"];
const CS_MIN = { org: 7, nature: 7, year: 13 };   // organisme et nature : à partir de 7 documents ; années : au-delà de 12
const CS_HINT = { porte: "De quel côté ?", sub: "Choisis une sous-famille.", holder: "À qui sont ces papiers ?", lieu: "Quel lieu ?", org: "Quel organisme ?", nature: "Quel genre de document ?", year: "Quelle année ?" };

/* Les lieux que tu mets en location : ceux qui ont au moins un papier où tu es bailleur. */
function csBailleurLieux() {
  const all = [...(S.docs || []), ...((S.arch && S.arch.old) || []), ...((S.arch && S.arch.done) || [])];
  return new Set(all.filter((d) => d.role === "bailleur" && d.lieu).map((d) => d.lieu));
}
function csPorte(d, loueSet) {
  if (CS_HABITE.includes(d.role)) return "habite";
  if (d.role === "bailleur" || dnSubOf(d) === "02-7" || /^immo_/.test(d.type || "")) return "loue";
  if (d.lieu) return loueSet.has(d.lieu) ? "loue" : "habite";
  if (["02-3", "02-5"].includes(dnSubOf(d))) return "habite";   // énergie, justificatifs de domicile : là où tu vis
  return "autres";
}
function csKey(dim, d, ctx) {
  if (dim === "porte") return csPorte(d, ctx.loue);
  if (dim === "sub") return dnSubOf(d);
  if (dim === "holder") return holderName(d) || "";
  if (dim === "lieu") return d.lieu || "";
  if (dim === "org") return emDisp(d) || "";
  if (dim === "nature") return d.type || "";
  if (dim === "year") return String(d.doc_date || "").slice(0, 4);
  return "";
}
function csLabel(dim, k) {
  if (dim === "porte") return (CS_PORTES[k] || CS_PORTES.autres)[0];
  if (dim === "sub") return subName(k);
  if (dim === "holder") return k || "Titulaire inconnu";
  if (dim === "lieu") return k || "Sans lieu précis";
  if (dim === "org") return k || "Organisme inconnu";
  if (dim === "nature") return k ? ((S.st.types[k] || {}).label || k).replace(/^Autre — /, "Autres · ") : "Autre";
  if (dim === "year") return k && k > "1900" ? k : "Sans date";
  return k;
}
function csIcon(dim, k) {
  if (dim === "porte") return IC[(CS_PORTES[k] || CS_PORTES.autres)[1]];
  return IC[{ sub: "folder", holder: "id", lieu: "house", org: "building", nature: "tag", year: "calendar" }[dim]] || IC.folder;
}
function csSort(dim, K) {
  const owner = (S.st.settings && S.st.settings.owner) || "";
  if (dim === "porte") return ["habite", "loue", "autres"].filter((k) => K.includes(k));
  if (dim === "year") return K.sort((a, b) => b.localeCompare(a));
  if (dim === "holder") return K.sort((a, b) => (b === owner) - (a === owner) || !a - !b || a.localeCompare(b));
  if (dim === "sub") return K.sort((a, b) => /-9$/.test(a) - /-9$/.test(b) || a.localeCompare(b));
  return K.sort((a, b) => !a - !b || csLabel(dim, a).localeCompare(csLabel(dim, b), "fr"));
}

/* L'étage suivant : le premier, dans l'ordre, qui sépare vraiment les documents. */
function csNext(cat, X, trail, ctx) {
  const used = new Set(trail.map((t) => t[0]));
  for (const dim of CS_ORDER[cat] || CS_DEFAULT) {
    if (used.has(dim)) continue;
    if (CS_MIN[dim] && X.length < CS_MIN[dim]) continue;
    const K = [...new Set(X.map((d) => csKey(dim, d, ctx)))];
    if (K.length >= 2) return [dim, K];
  }
  return null;
}
function csTiles(kind, dim, K, X, ctx) {
  const owner = (S.st.settings && S.st.settings.owner) || "";
  return `<p class="sub dnhint">${esc(CS_HINT[dim] || "Choisis.")}</p><div class="groups dntiles">${csSort(dim, K).map((k) => {
    const n = X.filter((d) => csKey(dim, d, ctx) === k).length;
    const sub = dim === "porte" ? (CS_PORTES[k] || CS_PORTES.autres)[2] : dim === "holder" && k === owner ? "toi" : "";
    return `<button class="group" data-cs="${kind}" data-cs-dim="${dim}" data-cs-val="${esc(k)}"><span class="oi" style="width:30px;height:30px">${csIcon(dim, k)}</span><b>${esc(csLabel(dim, k))}${sub ? `<small class="sub" style="display:block;font-weight:400">${esc(sub)}</small>` : ""}</b><span class="n">${n}</span></button>`;
  }).join("")}</div>`;
}
function csCrumbs(kind, root, st) {
  const parts = [`<button class="linkbtn" data-cs="${kind}" data-cs-up="root">${esc(root)}</button>`];
  const T = st.trail || [], items = [[`${esc(catName(st.cat))}`, "cat"], ...T.map((t, i) => [esc(csLabel(t[0], t[1])), String(i)])];
  items.forEach((it, i) => parts.push(i === items.length - 1 ? `<b>${it[0]}</b>` : `<button class="linkbtn" data-cs="${kind}" data-cs-up="${it[1]}">${it[0]}</button>`));
  return `<nav class="crumbs dncrumbs" aria-label="Où tu es">${parts.join("<span>›</span>")}</nav>`;
}
function csCats(kind, X) {
  const K = [...new Set(X.map((d) => d.cat))].sort((a, b) => (a === "16") - (b === "16") || a.localeCompare(b));   // « Autres familles » toujours en dernier
  return `<p class="sub dnhint">Choisis une famille.</p><div class="groups dntiles">${K.map((k) => `<button class="group" data-cs="${kind}" data-cs-cat="${esc(k)}"><span class="oi" style="width:30px;height:30px">${catIc(k)}</span><b>${k} ${esc(catName(k))}</b><span class="n">${X.filter((d) => d.cat === k).length}</span></button>`).join("")}</div>`;
}
const csNewest = (L) => [...L].sort((a, b) => String(b.doc_date || "").localeCompare(String(a.doc_date || "")) || String(a.label).localeCompare(String(b.label)));

drill = function (kind, L, root) {
  const st = S.dn[kind];
  st.trail = st.trail || [];
  const pays = dnCountries(kind, L);
  const X = st.cc ? L.filter((d) => d.country === st.cc) : L;
  if (st.cat && !X.some((d) => d.cat === st.cat)) { st.cat = null; st.trail = []; }
  if (!st.cat) return pays + csCats(kind, X);
  const ctx = { loue: csBailleurLieux() };
  let Y = X.filter((d) => d.cat === st.cat);
  const ok = [];
  for (const [dim, val] of st.trail) {   // un étage qui n'existe plus (document déplacé) : on s'arrête là
    const Z = Y.filter((d) => csKey(dim, d, ctx) === val);
    if (!Z.length) break;
    ok.push([dim, val]); Y = Z;
  }
  st.trail = ok;
  const nx = csNext(st.cat, Y, st.trail, ctx);
  if (nx) return pays + csCrumbs(kind, root, st) + csTiles(kind, nx[0], nx[1], Y, ctx);
  return pays + csCrumbs(kind, root, st) + `<p class="sub dnhint">${Y.length} ${plural(Y.length, "document")} · le plus récent en haut</p><div class="card doclist">${csNewest(Y).map(docRow).join("")}</div>`;
};

/* ---------------------------------------------------------------- Format et poids */
function fileFmt(p) {
  const x = (String(p || "").match(/\.([A-Za-z0-9]+)$/) || [, ""])[1].toLowerCase();
  if (x === "pdf") return { k: "pdf", label: "PDF", ic: "doc" };
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "tif", "tiff", "bmp"].includes(x)) return { k: "img", label: "Image " + (x === "jpg" ? "JPEG" : x.toUpperCase()), ic: "image" };
  if (["xls", "xlsx", "xlsm", "ods", "numbers"].includes(x)) return { k: "sheet", label: x === "ods" ? "Tableur" : x === "numbers" ? "Numbers" : "Excel", ic: "sheet" };
  if (x === "csv") return { k: "sheet", label: "Tableur CSV", ic: "sheet" };
  if (["doc", "docx", "odt", "rtf", "pages"].includes(x)) return { k: "word", label: x === "odt" ? "Texte" : x === "pages" ? "Pages" : "Word", ic: "doc" };
  if (["txt", "md"].includes(x)) return { k: "txt", label: "Texte", ic: "doc" };
  if (["eml", "msg"].includes(x)) return { k: "mail", label: "E-mail", ic: "mail" };
  if (x === "zip") return { k: "zip", label: "Archive ZIP", ic: "archive" };
  return { k: "other", label: x ? x.toUpperCase() : "Fichier", ic: "doc" };
}
function frSize(n) {
  if (n == null) return "";
  if (n < 1024) return n + " o";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " Ko";
  return (n / 1024 / 1024).toFixed(1).replace(".", ",") + " Mo";
}
/* Dans les listes : le format discret à la fin de la ligne du dessous. */
const docRowCs = docRow;
docRow = function (d) {
  const f = fileFmt(d.path);
  return docRowCs(d).replace(/(<div class="sub">[\s\S]*?)(<\/div><\/div>)/, `$1 · ${esc(f.label)}$2`);
};

/* ---------------------------------------------------------------- Aperçu dans la fiche */
function docPreview(d) {
  const f = fileFmt(d.path), src = "/api/file?p=" + encodeURIComponent(d.path), name = esc(d.label);
  let inner;
  if (f.k === "pdf" && window.pdfjsLib) {
    const id = "doc:" + d.id, P = S.pdf && S.pdf.id === id ? S.pdf : null;
    inner = `<div class="cpdf" id="cpdf" data-src="${src}" data-id="${esc(id)}"><canvas id="cpdfc" aria-label="Aperçu de ${name}"></canvas>
      <div class="cpnav" ${P && P.n > 1 ? "" : "hidden"}><button class="cparr" data-act="c-page" data-d="-1" aria-label="Page précédente" ${P && P.page > 1 ? "" : "disabled"}>‹</button>
        <span class="cpnum">${P ? P.page : 1} / ${P ? P.n : 1}</span>
        <button class="cparr" data-act="c-page" data-d="1" aria-label="Page suivante" ${P && P.page < P.n ? "" : "disabled"}>›</button></div></div>`;
  } else if (f.k === "pdf") inner = `<iframe class="cifr" src="${src}#toolbar=0&navpanes=0&view=FitH" title="Aperçu de ${name}"></iframe>`;
  else if (f.k === "img" && !/\.(heic|heif|tiff?)$/i.test(d.path)) inner = `<img class="cimg" src="${src}" alt="Aperçu de ${name}">`;
  else inner = `<div class="cnone docthumb"><span class="oi fmtbig">${IC[f.ic] || IC.doc}</span><b>${esc(f.label)}</b><span class="sub">Pas d'aperçu dans Bon toutou pour ce format.</span><button class="ghost small" data-open="${esc(d.path)}">Ouvrir le fichier</button></div>`;
  return `<div class="label" style="margin:22px 0 8px">Aperçu</div><div class="card docprev">${inner}</div>`;
}

const docViewCs = docView;
docView = function () {
  const d = S.doc; if (!d) return "";
  let h = docViewCs();
  const f = fileFmt(d.path), size = frSize(d.size);
  h = h.replace(/(<dt>Date<\/dt><dd>[\s\S]*?<\/dd>)/, `$1<dt>Format</dt><dd><span class="pill neutral fmtpill">${esc(f.label)}</span>${size ? ` <span class="sub">${size}</span>` : ""}</dd>`);
  const at = h.indexOf('<div class="label" style="margin:22px 0 8px">');
  return at < 0 ? h + docPreview(d) : h.slice(0, at) + docPreview(d) + h.slice(at);
};

/* ---------------------------------------------------------------- Flèches ← → */
const NAV = { back: [], fwd: [], cur: null, curKey: "", restoring: false, y: 0 };
const navSnap = () => ({ v: S.v, docId: S.docId, dosId: S.dosId, at: S.at, ax: S.ax, sv: S.sv, q: S.q, dn: JSON.parse(JSON.stringify(S.dn || {})) });
const navKey = (s) => JSON.stringify([s.v, s.v === "doc" ? s.docId : null, s.v === "dossier" ? s.dosId : null, s.v === "archives" ? s.at : null, s.v === "docs" ? s.ax : null, s.v === "reglages" ? s.sv : null, s.v === "docs" || s.v === "archives" ? s.dn[s.v] : null]);
function navTrack() {
  if (NAV.restoring || !S.st || S.st.setup || S.v === "setup") return;
  const s = navSnap(), k = navKey(s);
  if (k === NAV.curKey) return;
  if (NAV.cur) { NAV.cur.y = NAV.y; NAV.back.push(NAV.cur); if (NAV.back.length > 60) NAV.back.shift(); NAV.fwd = []; }
  NAV.cur = s; NAV.curKey = k;
}
async function navMove(dir) {
  const from = dir < 0 ? NAV.back : NAV.fwd, to = dir < 0 ? NAV.fwd : NAV.back;
  if (!from.length || NAV.restoring) return;
  const s = from.pop();
  if (NAV.cur) { NAV.cur.y = window.scrollY; to.push(NAV.cur); }
  NAV.cur = s; NAV.curKey = navKey(s);
  NAV.restoring = true;
  try {
    Object.assign(S, { v: s.v, docId: s.docId, dosId: s.dosId, at: s.at, ax: s.ax, sv: s.sv, q: s.q || "", fix: false, confirm: null, pm: false, tm: false, info: false });
    S.dn = JSON.parse(JSON.stringify(s.dn || { docs: {}, archives: {} }));
    await load();
  } finally { NAV.restoring = false; }
  NAV.curKey = navKey(navSnap());
  topbar();
  window.scrollTo(0, s.y || 0);
}
/* La position quittée : notée juste avant chaque changement (go remonte en haut de page avant de recharger). */
const goCs = go;
go = function (v, extra = {}) { NAV.y = window.scrollY; return goCs(v, extra); };
window.addEventListener("scroll", () => { if (!NAV.restoring) NAV.y = window.scrollY; }, { passive: true });

const topbarCs = topbar;
topbar = function () {
  topbarCs();
  const setup = S.v === "setup" || (S.st && S.st.setup);
  const br = document.querySelector("#topbar .brand");
  if (setup || !br) return;
  br.insertAdjacentHTML("afterend", `<span class="histnav"><button class="iconbtn" data-act="hist-back" aria-label="Page précédente" title="Page précédente (⌘[)" ${NAV.back.length ? "" : "disabled"}>←</button><button class="iconbtn" data-act="hist-fwd" aria-label="Page suivante" title="Page suivante (⌘])" ${NAV.fwd.length ? "" : "disabled"}>→</button></span>`);
};
const renderCs = render;
render = function () {
  navTrack();
  return renderCs();
};

/* ---------------------------------------------------------------- Clics et clavier */
window.addEventListener("click", (e) => {
  const a = e.target.closest("[data-act]");
  if (a && (a.dataset.act === "hist-back" || a.dataset.act === "hist-fwd")) { e.stopImmediatePropagation(); return navMove(a.dataset.act === "hist-back" ? -1 : 1); }
  const b = e.target.closest("[data-cs],[data-dn-cc]"); if (!b) return;
  e.stopImmediatePropagation();
  const kind = b.dataset.cs || b.dataset.dn, st = S.dn[kind] || (S.dn[kind] = {});
  st.trail = st.trail || [];
  if (b.dataset.dnCc !== undefined) { st.cc = b.dataset.dnCc || null; st.cat = null; st.trail = []; }
  else if (b.dataset.csCat) { st.cat = b.dataset.csCat; st.trail = []; }
  else if (b.dataset.csDim) st.trail = [...st.trail, [b.dataset.csDim, b.dataset.csVal]];
  else if (b.dataset.csUp === "root") { st.cat = null; st.trail = []; }
  else if (b.dataset.csUp === "cat") st.trail = [];
  else if (b.dataset.csUp !== undefined) st.trail = st.trail.slice(0, +b.dataset.csUp + 1);
  NAV.y = window.scrollY;
  render(); window.scrollTo(0, 0);
}, true);
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === "[" || e.key === "]") && !editing()) { e.preventDefault(); return navMove(e.key === "[" ? -1 : 1); }
  if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !editing()) { e.preventDefault(); return navMove(e.key === "ArrowLeft" ? -1 : 1); }
  if (e.key !== "Escape" || editing() || S.modal) return;
  const st = S.v === "docs" ? S.dn.docs : S.v === "archives" ? S.dn.archives : null;
  if (!st || S.q.trim() || (!st.cat && !(st.trail || []).length)) return;
  e.stopImmediatePropagation();
  if ((st.trail || []).length) st.trail = st.trail.slice(0, -1); else st.cat = null;
  render();
}, true);
window.addEventListener("mouseup", (e) => { if (e.button === 3 || e.button === 4) { e.preventDefault(); navMove(e.button === 3 ? -1 : 1); } });
