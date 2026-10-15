/* Bon toutou — v0.9.3 « Retrouver et prêt à l'emploi » (chargé après cases.js).
   - Documents s'ouvre sur les Essentiels : chaque pièce avec un voyant (vert prêt, orange bientôt, rouge trop vieux / expiré,
     gris à ajouter) et « Renouveler » qui ouvre le site de l'organisme dans ton navigateur (rien ne sort du moteur).
   - Mes collections : tes regroupements libres (« Préparer mon déménagement »), sans déplacer aucun fichier.
   - Recherche dans le texte lu, les synonymes et les étiquettes (moteur local) ; l'extrait cité masque mots de passe et numéros.
   - Fiche : période, date d'émission, forme, bien concerné, collections, ce que le document prouve et jusqu'à quand.
   - Aujourd'hui : les rappels (sonder un organisme au bon moment).
   - Mon profil : les numéros qu'on te demande toujours, retrouvés dans tes documents, masqués par défaut. */

/* ---------------------------------------------------------------- chargement */
const loadE = load;
load = async function () {
  if (S.v === "docs" || S.v === "home") { try { S.ess = await api("/api/essentiels"); } catch (e) { S.ess = null; } }
  if (S.v === "profil") {
    S.st = await api("/api/state"); applyTheme();
    try { S.prof = await api("/api/profil"); } catch (e) { S.prof = { ids: [], manual: {} }; }
    return render();
  }
  return loadE();
};
const ESS_DOT = { ok: "ok", soon: "warn", old: "bad", missing: "neutral" };
const ESS_WORD = { ok: "prêt", soon: "bientôt", old: "à renouveler", missing: "à ajouter" };

/* ---------------------------------------------------------------- Essentiels + collections (Documents, racine) */
function essHTML() {
  const E = (S.ess && S.ess.essentiels) || [];
  if (!E.length) return "";
  const n = { ok: 0, soon: 0, old: 0, missing: 0 }; E.forEach((e) => n[e.state]++);
  const open = S.essOpen !== false;
  const tile = (e) => `<div class="esstile st-${e.state}">
      <button class="essmain" ${e.doc_id ? `data-doc="${e.doc_id}"` : `data-act="ess-add" data-label="${esc(e.label)}"`} title="${esc(e.doc_label || e.label)}">
        <span class="oi">${IC[e.ic] || IC.folder}</span><span class="grow"><b>${esc(e.label)}</b><small>${esc(e.msg)}</small></span>
        <span class="pill ${ESS_DOT[e.state]}">${ESS_WORD[e.state]}</span></button>
      ${e.renew && e.state !== "ok" ? `<button class="linkbtn essrenew" ${e.renew.url ? `data-ext="${esc(e.renew.url)}"` : `data-act="ess-how" data-n="${esc((e.renew.organisme || "") + (e.renew.note ? " · " + e.renew.note : ""))}"`}>${e.state === "missing" ? "Obtenir" : "Renouveler"} · ${esc(e.renew.organisme || "")}</button>` : ""}
    </div>`;
  return `<section class="ess"><div class="esshead"><button class="linkbtn" data-act="ess-toggle" aria-expanded="${open}"><b>Essentiels</b></button>
      <span class="sub">${n.ok} ${plural(n.ok, "prêt")} · ${n.soon + n.old} à renouveler · ${n.missing} à ajouter</span></div>
    ${open ? `<div class="essgrid">${E.map(tile).join("")}</div>` : ""}</section>`;
}
function collHTML() {
  const C = (S.ess && S.ess.collections) || [];
  if (!C.length) return "";
  return `<div class="colls"><span class="label">Mes collections</span>${C.map((c) => `<button class="chip" data-coll="${esc(c.name)}">${IC.tag} ${esc(c.name)} <span class="sub">${c.n}</span></button>`).join("")}</div>`;
}
function collView(name) {
  const L = (S.docs || []).filter((d) => (d.collections || []).includes(name));
  return `<nav class="crumbs dncrumbs" aria-label="Où tu es"><button class="linkbtn" data-coll="">Documents</button><span>›</span><b>${esc(name)}</b></nav>
    <p class="sub dnhint">${L.length} ${plural(L.length, "document")} dans cette collection · rien n'est déplacé dans ton Finder</p>
    <div class="card doclist">${csNewest(L).map(docRow).join("") || `<div class="row sub">Plus aucun document actuel dans cette collection.</div>`}</div>`;
}
const drillE = drill;
drill = function (kind, L, root) {
  if (kind === "docs" && S.coll) return collView(S.coll);
  const h = drillE(kind, L, root);
  return kind === "docs" && !S.dn.docs.cat ? essHTML() + collHTML() + h : h;
};

/* ---------------------------------------------------------------- Recherche (moteur local : texte lu + synonymes) */
let srTimer = null;
function srFetch(kind, q) {
  clearTimeout(srTimer);
  srTimer = setTimeout(async () => {
    const res = await api("/api/search?scope=" + (kind === "archives" ? "archives" : "docs") + "&q=" + encodeURIComponent(q));
    if (S.q.trim() !== q) return;
    S.sr = { kind, q, res };
    const el = $("#q"), pos = el ? el.selectionStart : null, had = el && document.activeElement === el;
    render();
    const n = $("#q"); if (had && n) { n.focus(); if (pos !== null) n.setSelectionRange(pos, pos); }
  }, 180);
}
dnSearch = function (kind, L, q) {
  if (!S.sr || S.sr.q !== q || S.sr.kind !== kind) { srFetch(kind, q); return `<div class="card busy"><span class="spin"></span>Recherche dans tes documents…</div>`; }
  const byId = {}; L.forEach((d) => (byId[d.id] = d));
  const hit = S.sr.res.filter((r) => byId[r.id]);
  if (!hit.length) return `<div class="card empty">Aucun résultat pour « ${esc(q)} ». La recherche lit les intitulés, les organismes, les synonymes (IBAN = RIB…) et le texte de chaque document.</div>`;
  const row = (r) => { const d = byId[r.id];
    return docRow(d).replace(/(<\/div><\/div>)/, `${r.snippet ? `<div class="snip">${esc(r.snippet)}</div>` : ""}$1`).replace(/<span class="oi">/, `<span class="oi" title="${esc(catName(d.cat))} › ${esc(subName(d.sub || dnSubOf(d)))}">`); };
  return `<p class="sub dnhint">${hit.length} ${plural(hit.length, "résultat")} · ${hit.filter((r) => r.where === "texte").length} trouvés dans le texte des documents</p><div class="card doclist">${hit.map(row).join("")}</div>`;
};

/* ---------------------------------------------------------------- Lignes : la période quand elle compte */
const docRowE = docRow;
docRow = function (d) {
  let h = docRowE(d);
  if (d.period_label && /^\d{4}-\d{2}$/.test(d.period || "")) h = h.replace(/(<div class="sub">)([^<·]*?)(\s*)(·|<)/, `$1${esc(d.period_label)}$3$4`);
  return h;
};

/* ---------------------------------------------------------------- Fiche */
const FORMES = [["", "—"], ["original", "Original"], ["copie", "Copie"], ["apostille", "Apostillé"], ["legalise", "Légalisé"], ["traduit", "Traduit"]];
const BIENS = [["", "—"], ["logement", "Logement"], ["vehicule", "Véhicule"], ["compte", "Compte"], ["entreprise", "Entreprise"], ["autre", "Autre bien"]];
function usagesHTML(d) {
  const U = d.usages || [];
  if (!U.length && !d.renew) return "";
  const rows = U.map((u) => `<div class="row"><span class="pill ${ESS_DOT[u.state]}">${u.state === "ok" ? "valable" : u.state === "soon" ? "bientôt" : "trop ancien"}</span><div class="grow"><b>${esc(u.usage)}</b>${u.until ? `<div class="sub">${u.state === "old" ? "plus valable depuis le" : "jusqu'au"} ${frd(u.until)}</div>` : ""}</div></div>`).join("");
  const rn = d.renew ? `<div class="row"><span class="oi">${IC.sync}</span><div class="grow"><b>Renouveler · ${esc(d.renew.organisme || "")}</b>${d.renew.note ? `<div class="sub">${esc(d.renew.note)}</div>` : ""}</div>${d.renew.url ? `<button class="ghost small" data-ext="${esc(d.renew.url)}">Ouvrir le site</button>` : ""}</div>` : "";
  return `<div class="label" style="margin:22px 0 8px">Ce qu'il prouve</div><div class="card">${rows}${rn}</div>`;
}
function metaForm(d) {
  return `<div class="edit metaedit" style="margin-top:14px">
    <label>Période<input class="field" id="mt_period" value="${esc(d.period || "")}" placeholder="2026-09, 2026, 2026-T3 ou 2026-01/2026-06"></label>
    <label>Émis le<input class="field" type="date" id="mt_issued" value="${esc(d.issued || "")}"></label>
    <label>Forme<select class="field" id="mt_forme">${FORMES.map(([k, v]) => `<option value="${k}" ${(d.forme || "") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>Langue (si traduit)<input class="field" id="mt_langue" value="${esc(d.langue || "")}" placeholder="anglais, espagnol…"></label>
    <label>Genre de bien<select class="field" id="mt_bien_kind">${BIENS.map(([k, v]) => `<option value="${k}" ${(d.bien_kind || "") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
    <div class="acts" style="margin-top:10px"><button class="cta small" data-act="metasave">Enregistrer</button><button class="linkbtn" data-act="metacancel">annuler</button><span class="sub">Rien n'est renommé ni déplacé. Annulable.</span></div>`;
}
function collEdit(d) {
  const C = d.collections || [];
  return `<div class="collrow"><span class="label" style="margin:0">Collections</span>${C.map((c) => `<span class="chip on">${esc(c)} <button class="linkbtn" data-act="coll-rm" data-c="${esc(c)}" aria-label="Retirer de ${esc(c)}">×</button></span>`).join("")}
    <span class="colladd"><input class="field small" id="coll_new" data-ac="collections" list="collist" placeholder="+ ajouter à une collection" autocomplete="off"><datalist id="collist">${((S.ess && S.ess.collections) || []).map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist></span></div>`;
}
const docViewE = docView;
docView = function () {
  const d = S.doc; if (!d) return "";
  let h = docViewE();
  const kv = [];
  if (d.period_label) kv.push(["Période", esc(d.period_label)]);
  if (d.issued && d.issued !== d.doc_date) kv.push(["Émis le", frd(d.issued)]);
  if (d.forme_label) kv.push(["Forme", esc(d.forme_label) + (d.langue ? ` <span class="sub">(${esc(d.langue)})</span>` : "")]);
  const add = kv.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  h = h.replace(/(<dt>Format<\/dt><dd>[\s\S]*?<\/dd>)/, `$1${add}`);
  const kind = (BIENS.find((b) => b[0] === d.bien_kind) || [])[1];
  h = h.replace(/<dt>Lieu<\/dt><dd>([\s\S]*?)<\/dd>/, (m, v) => `<dt>Bien concerné</dt><dd>${v}${kind ? ` <span class="sub">· ${esc(kind)}</span>` : ""}</dd>`);
  h = h.replace(/<label>Lieu<input/, "<label>Bien concerné<input");
  h = h.replace(/(<button class="ghost small" data-act="fixopen">Corriger le classement<\/button>)/, `$1<button class="ghost small" data-act="metaopen">Compléter la fiche</button>`);
  h = h.replace(/(<div class="acts" style="margin-top:12px">[\s\S]*?<\/div>)/, (m) => m + (S.metaEdit ? metaForm(d) : "") + collEdit(d));
  const at = h.indexOf('<div class="label" style="margin:22px 0 8px">Aperçu</div>');
  return at < 0 ? h + usagesHTML(d) : h.slice(0, at) + usagesHTML(d) + h.slice(at);
};

/* ---------------------------------------------------------------- Aujourd'hui : rappels */
const homeViewE = homeView;
homeView = function () {
  let h = homeViewE();
  const R = ((S.ess && S.ess.rappels) || []).slice(0, 4);
  if (!R.length) return h;
  const items = R.map((r) => `<button class="titem ${r.state === "old" ? "warn" : ""}" ${r.doc_id ? `data-doc="${r.doc_id}"` : r.renew && r.renew.url ? `data-ext="${esc(r.renew.url)}"` : 'data-go="docs"'}><span class="oi">${IC.sync}</span><div class="grow"><b><span class="vb${r.state === "old" ? " warn" : ""}">Renouveler</span> ${esc(r.label)}</b><small>${esc(r.msg)}${r.renew && r.renew.organisme ? " · " + esc(r.renew.organisme) : ""}</small></div><span class="go">›</span></button>`).join("");
  return h.replace('<div class="today">', `<div class="today">${items}`).replace(/<div class="card" style="padding:18px">Rien d'urgent\. Profite\.<\/div>/, "");
};

/* ---------------------------------------------------------------- Mon profil */
if (!PLUS.find((x) => x[0] === "profil")) PLUS.splice(PLUS.length - 1, 0, ["profil", "Mon profil", "user"]);
const MANUAL = [["adresse", "Adresse principale"], ["telephone", "Téléphone"], ["urgence", "Contact d'urgence"], ["permis", "Numéro de permis de conduire"],
  ["fiscaux_etrangers", "Numéros fiscaux étrangers (NIF, NIE, codice fiscale, TFN, SIN…)"], ["consulat", "Registre des Français de l'étranger"], ["autres", "Autres numéros utiles"]];
const maskv = (v) => { const s = String(v || ""); return s.length <= 4 ? "••••" : "•••• " + s.slice(-3); };
function profilView() {
  const P = S.prof || { ids: [], manual: {} }, sh = S.profShow || {};
  const ids = P.ids || [];
  const row = (x, i) => `<div class="row"><div class="grow"><b>${esc(x.label)}</b><div class="sub">lu dans <button class="linkbtn" style="padding:0" data-doc="${x.doc_id}">${esc(x.doc_label)}</button>${x.n > 1 ? ` · retrouvé dans ${x.n} documents` : ""}</div></div>
      <code class="pval">${sh[i] ? esc(x.value) : esc(maskv(x.value))}</code>
      <button class="ghost small" data-act="pf-show" data-i="${i}">${sh[i] ? "Masquer" : "Afficher"}</button><button class="ghost small" data-act="pf-copy" data-i="${i}">Copier</button></div>`;
  const M = P.manual || {};
  return `<h1>Mon profil</h1><p class="lead">${esc(P.owner || (S.st.settings.owner || ""))} · les numéros qu'on te demande toujours, retrouvés dans tes documents.</p>
    <div class="hint" style="margin-bottom:16px">${IC.lock} Calculé sur ton ordinateur, masqué par défaut, jamais envoyé à une IA ni ailleurs. Chaque numéro renvoie au document où il est écrit.</div>
    <div class="label" style="margin-bottom:8px">Trouvés dans tes documents</div>
    <div class="card">${ids.map(row).join("") || `<div class="row sub">Rien de trouvé pour l'instant : ajoute ton passeport, un RIB, un avis d'impôt ou une attestation Ameli.</div>`}</div>
    <div class="label" style="margin:22px 0 8px">À compléter toi-même</div>
    <div class="card box"><div class="edit">${MANUAL.map(([k, l]) => `<label>${esc(l)}<input class="field" id="pf_${k}" value="${esc(M[k] || "")}" autocomplete="off"></label>`).join("")}</div>
      <div class="acts" style="margin-top:10px"><button class="cta small" data-act="pf-save">Enregistrer</button><span class="sub">Gardé dans ton dossier (profil.json), comme ton nom.</span></div></div>`;
}
const renderE = render;
render = function () {
  if (S.v !== "profil") return renderE();
  navTrack(); topbar();
  $("#app").innerHTML = profilView();
  $("#modal").innerHTML = S.modal && window.modalView ? modalView() : "";
  bind(); if (window.bindExtra) bindExtra();
};

/* ---------------------------------------------------------------- clics */
window.addEventListener("click", async (e) => {
  const t = e.target;
  const c = t.closest("[data-coll]");
  if (c) { e.stopImmediatePropagation(); S.coll = c.dataset.coll || null; if (S.v !== "docs") return go("docs"); render(); return window.scrollTo(0, 0); }
  const x = t.closest("[data-ext]");
  if (x && !t.closest(".modal")) { e.preventDefault(); e.stopImmediatePropagation(); return window.openExternal ? openExternal(x.dataset.ext) : window.open(x.dataset.ext, "_blank"); }
  const a = t.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act === "ess-toggle") { e.stopImmediatePropagation(); S.essOpen = S.essOpen === false; try { localStorage.setItem("bt.ess", S.essOpen ? "1" : "0"); } catch (z) {} return render(); }
  if (act === "ess-add") { e.stopImmediatePropagation(); return go("trier"); }
  if (act === "ess-how") { e.stopImmediatePropagation(); return toast(a.dataset.n || ""); }
  if (act === "metaopen") { e.stopImmediatePropagation(); S.metaEdit = !S.metaEdit; return render(); }
  if (act === "metacancel") { e.stopImmediatePropagation(); S.metaEdit = false; return render(); }
  if (act === "metasave") { e.stopImmediatePropagation();
    const v = (k) => ($("#mt_" + k) ? $("#mt_" + k).value.trim() : "");
    const r = await api("/api/doc/meta", { id: S.doc.id, fields: { period: v("period"), issued: v("issued"), forme: v("forme"), langue: v("langue"), bien_kind: v("bien_kind") } });
    S.metaEdit = false; await load(); return toast(r.ok ? "Fiche complétée" : (r.msg || "Erreur"), r.batch); }
  if (act === "coll-rm") { e.stopImmediatePropagation();
    const r = await api("/api/doc/meta", { id: S.doc.id, fields: { collections_remove: [a.dataset.c] } }); S.ess = await api("/api/essentiels"); await load(); return toast("Retiré de « " + a.dataset.c + " »", r.batch); }
  if (act === "pf-show") { e.stopImmediatePropagation(); S.profShow = S.profShow || {}; S.profShow[a.dataset.i] = !S.profShow[a.dataset.i]; return render(); }
  if (act === "pf-copy") { e.stopImmediatePropagation(); const x2 = (S.prof.ids || [])[+a.dataset.i]; try { await navigator.clipboard.writeText(x2.value); toast("Copié"); } catch (z) { toast("Copie impossible ici : affiche-le puis sélectionne-le"); } return; }
  if (act === "pf-save") { e.stopImmediatePropagation(); const f = {}; MANUAL.forEach(([k]) => { const v = $("#pf_" + k).value.trim(); if (v) f[k] = v; });
    await api("/api/settings", { fiche: f }); S.prof = await api("/api/profil"); render(); return toast("Profil enregistré"); }
}, true);
window.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter" || !e.target || e.target.id !== "coll_new") return;
  const v = e.target.value.trim(); if (!v || !S.doc) return;
  e.preventDefault();
  const r = await api("/api/doc/meta", { id: S.doc.id, fields: { collections_add: [v] } });
  S.ess = await api("/api/essentiels"); await load(); toast("Ajouté à « " + v + " »", r.batch);
}, true);
try { if (localStorage.getItem("bt.ess") === "0") S.essOpen = false; } catch (e) {}
/* Quitter la collection quand on change d'onglet ou qu'on cherche. */
const goE = go;
go = function (v, extra = {}) { if (v !== "docs" && v !== "doc") S.coll = null; return goE(v, extra); };
/* Premier affichage : l'app a déjà chargé la page avant ce fichier ; on ajoute Essentiels et rappels. */
if (S.v === "home" || S.v === "docs") api("/api/essentiels").then((r) => { S.ess = r; render(); }).catch(() => {});
