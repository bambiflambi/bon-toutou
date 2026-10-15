/* Bon toutou — v0.7 : trier en étapes (idée de PiM, 10 oct. 2026).
   1. « Tu t'en sers encore ? » : Utile aujourd'hui / Archives — toujours ta décision, jamais celle de l'IA (sous l'aperçu, à gauche).
   2. La famille (catégorie) en tuiles, 3. la sous-famille, 4. le type s'il en reste plusieurs, 5. la fiche : émetteur, date, titulaire…
   Ce que Bon toutou a proposé est déjà choisi ; tout se rouvre d'un clic dans le fil en haut. Plus de longue liste déroulante :
   le même sélecteur en tuiles sert en mode Liste et dans « Corriger le classement ». */

/* ---------- le sélecteur de type en tuiles (famille › sous-famille › type), réutilisable */
const TP = {};   // état de chaque sélecteur ouvert, par clé
function tpTypes() {
  const C = S.st.settings.countries || [];
  return Object.entries(S.st.types).filter(([k, t]) => !t.generic && k !== "autre" && (!t.countries || t.countries.some((c) => C.includes(c))));
}
const AUTRE_CAT = () => (S.st.types.autre || {}).cat;
function tpFamilies() {   // toutes les familles (même sans type connu : leur « Autres » reste utile), sauf « Autres familles »
  return Object.keys(S.st.categories).filter((c) => c !== AUTRE_CAT()).sort();
}
const isAutre = (k) => k === "autre" || /^autre_/.test(k || "");
function catSubs(cat) {   // toutes les sous-familles d'une famille (même vides), sans son « Autres »
  return Object.keys(S.st.subs).filter((s) => s.slice(0, 2) === cat && !s.endsWith("-9")).sort();
}
function tpSubs(cat) {
  const subs = {};
  tpTypes().forEach(([k, t]) => { if (t.cat === cat) (subs[t.sub] = subs[t.sub] || []).push(k); });
  return Object.keys(subs).sort().map((s) => [s, subs[s]]);
}
const SUBL = { "01-5": "Service national", "02-2": "Quittances et avis d'échéance", "02-4": "Travaux et équipement", "02-5": "Justificatifs de domicile", "02-6": "Copropriété", "02-7": "Gestion locative", "04-4": "Taxes locales", "05-3": "Crédits", "07-6": "Emprunteur", "17-1": "Création et statuts", "17-2": "Comptabilité", "17-3": "Déclarations et impôts pro", "17-4": "Banque pro", "17-5": "Clients et factures", "06-4": "Santé voyage", "09-4": "Vie commune et tiers", "12-5": "Reconnaissance à l'étranger", "13-5": "Casiers judiciaires", "13-3": "Procurations et actes notariés", "18-1": "Visas et titres de séjour", "18-2": "Autorisations de voyage", "18-3": "Demandes et décisions", "18-4": "Parrainages et invitations", "18-5": "Résidence sur place", "01-1": "Pièces d'identité", "01-2": "État civil", "01-4": "Titres de séjour et visas", "02-1": "Baux et états des lieux", "02-3": "Énergie, eau, internet",
  "02-5": "Justificatifs d'adresse", "03-2": "Bulletins de paie", "03-3": "Activité indépendante", "03-4": "Chômage et retraite", "04-1": "Déclarations",
  "05-1": "Comptes et relevés", "05-3": "Crédits", "06-1": "Sécu et mutuelle", "06-3": "Dossier médical", "07-2": "Véhicule", "07-3": "Responsabilité civile",
  "07-4": "Prévoyance et vie", "08-1": "Achat et vente", "08-3": "Entretien et contrôles", "09-1": "Union, mariage, PACS", "09-3": "Parents à charge",
  "10-2": "Placements et épargne", "10-3": "Parts de société", "10-4": "Transmission, testament", "11-2": "Télécoms", "11-3": "Achats et garanties",
  "12-1": "Diplômes", "12-3": "Bulletins scolaires", "12-4": "Inscriptions et conventions", "13-2": "Recommandés", "14-1": "Allocations CAF",
  "14-3": "Aides au logement", "14-4": "Autres aides", "15-2": "Lettres de motivation", "16-1": "À étudier" };
const subName = (s) => SUBL[s] || (/-9$/.test(s) ? "Autres" : String(S.st.subs[s] || s).replace(/-/g, " "));
const catName = (c) => S.st.categories[c] || c;
function tpOpen(key, cur, onPick, step) {
  const t = S.st.types[cur] || {};
  TP[key] = { cur, onPick, step: step || "famille", cat: t.cat, sub: null, q: "" };
}
function tpInner(key) {
  const st = TP[key]; if (!st) return "";
  const T = S.st.types, curT = T[st.cur] || {};
  const n = (i) => (i < 9 ? `<kbd>${i + 1}</kbd>` : "");
  let head = "", body = "";
  if (st.q) {
    const ids = typeSearch(unaccent(st.q)).filter((k) => tpTypes().some(([x]) => x === k)).slice(0, 9);
    head = `<div class="tp-h">Résultats pour « ${esc(st.q)} »</div>`;
    body = ids.length ? `<div class="tiles">${ids.map((k, i) => `<button type="button" class="tile${k === st.cur ? " prop" : ""}" data-tp="${key}" data-tp-type="${k}">${n(i)}<span class="oi">${catIc(T[k].cat)}</span><b>${esc(T[k].label)}</b><small>${esc(catName(T[k].cat))} › ${esc(subName(T[k].sub))}</small></button>`).join("")}</div>`
      : `<div class="sub" style="padding:8px 2px">Aucun type ne correspond. Essaie un autre mot, ou choisis une famille.</div>`;
  } else if (st.step === "famille") {
    const F = tpFamilies(); const prop = F.includes(curT.cat) ? [curT.cat, ...F.filter((c) => c !== curT.cat)] : F;
    head = `<div class="tp-h">Quelle famille ?</div>`;
    body = `<div class="tiles">${prop.map((c, i) => `<button type="button" class="tile${c === curT.cat ? " prop" : ""}" data-tp="${key}" data-tp-cat="${c}">${n(i)}<span class="oi">${catIc(c)}</span><b>${esc(catName(c))}</b>${c === curT.cat ? `<small>proposé</small>` : ""}</button>`).join("")}
      <button type="button" class="tile autre" data-tp="${key}" data-tp-type="autre"><span class="oi">${IC.folder}</span><b>Autre famille</b><small>Aucune ne convient : tu diras laquelle tu imagines</small></button></div>`;
  } else if (st.step === "sous") {
    const L = tpSubs(st.cat);
    head = `<div class="tp-h"><button type="button" class="linkbtn" data-tp="${key}" data-tp-back="famille">← Familles</button> ${esc(catName(st.cat))} : quelle sous-famille ?</div>`;
    const ac = "autre_" + st.cat, inSubs = catSubs(st.cat).filter((x) => T["autre_" + x.replace("-", "_")]);
    body = `<div class="tiles">${L.map(([s, ks], i) => `<button type="button" class="tile${s === curT.sub ? " prop" : ""}" data-tp="${key}" data-tp-sub="${s}">${n(i)}<b>${esc(subName(s))}</b><small>${ks.map((k) => esc(T[k].label)).join(" · ")}</small></button>`).join("")}
      ${T[ac] ? `<button type="button" class="tile autre" data-tp="${key}" data-tp-type="${ac}"><span class="oi">${IC.folder}</span><b>Autres</b><small>Dans ${esc(catName(st.cat))}, sans sous-famille</small></button>` : ""}</div>
      ${inSubs.length ? `<div class="tp-autres"><span class="sub">Un autre papier dans une sous-famille :</span>${inSubs.map((x) => `<button type="button" class="chip" data-tp="${key}" data-tp-type="autre_${x.replace("-", "_")}">${esc(subName(x))} › Autres</button>`).join("")}</div>` : ""}`;
  } else {
    const ks = (tpSubs(st.cat).find(([s]) => s === st.sub) || [, []])[1];
    head = `<div class="tp-h"><button type="button" class="linkbtn" data-tp="${key}" data-tp-back="sous">← ${esc(catName(st.cat))}</button> ${esc(subName(st.sub))} : lequel ?</div>`;
    const as = "autre_" + String(st.sub).replace("-", "_");
    body = `<div class="tiles">${ks.map((k, i) => `<button type="button" class="tile${k === st.cur ? " prop" : ""}" data-tp="${key}" data-tp-type="${k}">${n(i)}<b>${esc(T[k].label)}</b></button>`).join("")}
      ${T[as] ? `<button type="button" class="tile autre" data-tp="${key}" data-tp-type="${as}"><b>Autre</b><small>Dans ${esc(subName(st.sub))} › Autres</small></button>` : ""}</div>`;
  }
  return head + body;
}
function tpHTML(key) {
  const st = TP[key]; if (!st) return "";
  return `<div class="tpick" data-tpk="${key}">
    <label class="say"><span aria-hidden="true">✎</span><input class="tp-q" data-tp="${key}" value="${esc(st.q)}" placeholder="Ou cherche : relevé, contrat d'apprentissage, assurance…" aria-label="Chercher un type"></label>
    <div class="tp-body" id="tpb_${key}">${tpInner(key)}</div></div>`;
}
function tpRefresh(key) { const el = document.getElementById("tpb_" + key); if (el) el.innerHTML = tpInner(key); }
function tpChooseType(key, k) { const st = TP[key]; if (st && st.onPick) st.onPick(k); }
function tpChooseSub(key, s) {
  const st = TP[key], ks = (tpSubs(st.cat).find(([x]) => x === s) || [, []])[1];
  if (ks.length === 1) return tpChooseType(key, ks[0]);
  st.sub = s; st.step = "type"; tpRefresh(key);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tp]"); if (!b || b.classList.contains("tp-q")) return;
  const key = b.dataset.tp, st = TP[key]; if (!st) return;
  e.preventDefault(); e.stopPropagation();
  if (b.dataset.tpCat) { st.cat = b.dataset.tpCat; st.step = "sous"; return tpRefresh(key); }
  if (b.dataset.tpSub) return tpChooseSub(key, b.dataset.tpSub);
  if (b.dataset.tpType) return tpChooseType(key, b.dataset.tpType);
  if (b.dataset.tpBack) { st.step = b.dataset.tpBack; return tpRefresh(key); }
}, true);
document.addEventListener("input", (e) => {
  const q = e.target.closest && e.target.closest(".tp-q"); if (!q) return;
  const st = TP[q.dataset.tp]; if (!st) return;
  st.q = q.value.trim(); tpRefresh(q.dataset.tp);
});
document.addEventListener("keydown", (e) => {
  // chiffres 1–9 : la tuile correspondante du sélecteur visible ; Entrée dans la recherche : le premier résultat
  const box = document.querySelector(".tpick"); if (!box || e.metaKey || e.ctrlKey || e.altKey) return;
  const inQ = e.target.classList && e.target.classList.contains("tp-q");
  if (inQ && e.key === "Enter") { const t = box.querySelector(".tile"); if (t) { e.preventDefault(); t.click(); } return; }
  if (!inQ && e.target.closest && e.target.closest("input,select,textarea")) return;
  if (/^[1-9]$/.test(e.key)) { const t = box.querySelectorAll(".tile")[+e.key - 1]; if (t) { e.preventDefault(); e.stopImmediatePropagation(); t.click(); } }
}, true);

/* ---------- Trier en cartes : de petites étapes rapides, à droite (v0.7.2 → v0.7.3, demandes de PiM)
   1. Tu t'en sers encore ?  2. Où le ranger (le chemin, comme dans le Finder)  3. Qui l'a émis ?  4. Le nom du fichier → Ranger.
   v0.7.3 : vue épurée (le reste est dans « Options »), aperçu qui ne se recharge plus, et propositions de Bon toutou masquées par
   défaut (Réglage « propositions ») : tu choisis, Bon toutou apprend de tes choix. */
S.et = S.et || {};
const PROPS = () => !!(S.st && S.st.settings && S.st.settings.propositions);
const needType = (p) => p.type === "autre" || (p.doubts || []).includes("type");
const chose = (p, f) => (p.set || []).includes(f);
const etSteps = (p) => ["usage", "chemin", ...((S.st.types[p.type] || {}).emetteur !== false ? ["emetteur"] : []), "nom"];
function etStep(p) {
  if (S.et.id !== p.id) S.et = { id: p.id, step: p.usage ? "chemin" : "usage", pick: false, opts: false };
  if (!p.usage) S.et.step = "usage";
  if (!etSteps(p).includes(S.et.step)) S.et.step = "nom";
  return S.et.step;
}
function etNext(p) {
  const L = etSteps(p), i = L.indexOf(S.et.step);
  S.et.step = L[Math.min(i + 1, L.length - 1)]; S.et.pick = false; render();
  setTimeout(() => { const f = document.querySelector(".etbig [data-autofocus]"); if (f) f.focus(); }, 30);
}
function etOpenPicker(p) {
  tpOpen("card", PROPS() || chose(p, "type") ? p.type : null, async (k) => {
    S.et.pick = false;
    const r = await api("/api/propose", { id: p.id, overrides: { type: k } });
    if (!r || r.error) { toast("Pas enregistré : " + ((r && r.error) || "erreur")); return load(); }
    await load();   // on reste sur « Où le ranger ? » : le chemin s'affiche, tu le valides
  });
  TP.card.for = p.id;
}
/* Le chemin, comme dans le Finder : un dossier par ligne, le fichier au bout */
function pathTree(p) {
  const T = S.st.types[p.type] || {}, seg = String(p.dest || "").split("/");
  const arch = seg.includes("99_ARCHIVES"), rest = seg.slice(seg.findIndex((x) => /^\d{2}-\d_/.test(x)) + 1).filter(Boolean);
  const lv = [S.st.countries[p.country] || p.country, ...(arch ? ["Archives"] : []), catName(T.cat), subName(T.sub), ...rest.map((x) => x.replace(/[-_]+/g, " "))];
  const fold = IC.folder.replace("<svg", '<svg class="ti"');
  return `<div class="tree">${lv.map((x, i) => `<div class="tl" style="--d:${i}">${fold}<span>${esc(x)}</span></div>`).join("")}
    <div class="tl file" style="--d:${lv.length}"><span class="fname">${esc(p.name)}</span></div></div>`;
}
function etDone(p, step) {
  const L = etSteps(p), cur = L.indexOf(step), T = S.st.types[p.type] || {};
  const lab = { usage: p.usage === "archive" ? "Archives" : "Utile aujourd'hui", chemin: `${catName(T.cat)} › ${subName(T.sub)} · ${T.label || p.type_label}`,
    emetteur: p.emitter && p.emitter !== "Inconnu" ? p.emitter_display || p.emitter : "Inconnu" };
  const head = { usage: "Usage", chemin: "Rangé dans", emetteur: "Émetteur" };
  return `<div class="etprog">${L.map((s, i) => `<i class="${i < cur ? "d" : i === cur ? "c" : ""}"></i>`).join("")}<span>${cur + 1} / ${L.length}</span></div>`
    + L.slice(0, cur).map((s) => `<button type="button" class="etdone" data-act="et-go" data-s="${s}"><span class="ok">✓</span><span class="h">${head[s]}</span><b>${esc(lab[s])}</b></button>`).join("");
}
function stepUsage(p) {
  const h = PROPS() ? (p.usage_hint === "archive" ? "archive" : "utile") : null;
  const btn = (u, t, d, key) => `<button type="button" class="ubig${p.usage === u ? " on" : ""}${h === u ? " prop" : ""}" data-act="et-usage" data-u="${u}" data-id="${p.id}" ${h === u ? "data-et-enter" : ""}><b>${t}</b><small>${d}</small><kbd>${key}</kbd></button>`;
  return `<div class="etbig"><h2 class="etq">Tu t'en sers encore ?</h2>
    <div class="ubigs">${btn("utile", "Utile aujourd'hui", "Il va dans Documents", "U")}${btn("archive", "Archives", "Gardé, rangé à part", "A")}</div></div>`;
}
function stepChemin(p) {
  const C = S.st.settings.countries || [];
  const pick = S.et.pick || (!chose(p, "type") && (!PROPS() || needType(p)));
  if (pick && (!TP.card || TP.card.for !== p.id)) etOpenPicker(p);
  return `<div class="etbig"><h2 class="etq">${pick ? "C'est quoi, ce document ?" : "Il sera rangé ici"}</h2>
    ${pick ? tpHTML("card") : `${pathTree(p)}
      ${isAutre(p.type) ? `<label class="ff sugg"><span>Quelle famille imagines-tu pour lui ? <small>facultatif — pour étudier plus tard les « Autres »</small></span>
        <input class="field" data-et-f="suggest" data-ac="suggestions" autocomplete="off" value="${esc(p.suggest || "")}" placeholder="ex. Travail › Formation professionnelle"></label>` : ""}
      <div class="etacts"><button type="button" class="cta" data-act="et-ok" data-et-enter>Valider <kbd>Entrée</kbd></button><button type="button" class="ghost" data-act="et-pick">Changer</button></div>
      ${C.length > 1 ? `<div class="segc">${C.map((c) => `<button type="button" class="${c === p.country ? "on" : ""}" data-act="et-set" data-f="country" data-v="${c}">${esc(S.st.countries[c] || c)}</button>`).join("")}</div>` : ""}`}</div>`;
}
function stepEmetteur(p) {
  const shown = PROPS() || chose(p, "emitter"), has = shown && p.emitter && p.emitter !== "Inconnu", em = has ? p.emitter_display || p.emitter : "";
  const cands = PROPS() ? (p.emitter_candidates || []).filter((x) => x !== em) : [];
  return `<div class="etbig"><h2 class="etq">Qui l'a émis ?</h2>
    ${has ? `<div class="bigval">${esc(em)}</div><div class="etacts"><button type="button" class="cta" data-act="et-ok" data-et-enter>Valider <kbd>Entrée</kbd></button></div>` : ""}
    <input class="field big" data-et-f="emitter" data-ac="emitters" data-ac-extra="${esc(cands.join("|"))}" autocomplete="off" ${has ? "" : "data-autofocus"} placeholder="${has ? "Ou un autre nom…" : "Banque, employeur, école, organisme…"}">
    ${cands.length ? `<div class="chips">${cands.map((x) => `<button type="button" class="chip" data-act="et-set" data-f="emitter" data-v="${esc(x)}" data-next="1">${esc(x)}</button>`).join("")}</div>` : ""}</div>`;
}
function stepNom(p) {
  const T = S.st.types[p.type] || {};
  const own = S.st.settings.owner || "toi", who = p.person === "moi" || !p.person || p.person === own ? "moi" : p.person;
  const holders = (S.st.settings.holders || []).map((h) => h.nom).filter(Boolean);
  const chip = (v, label, on) => `<button type="button" class="${on ? "on" : ""}" data-act="et-set" data-f="person" data-v="${esc(v)}">${esc(label)}</button>`;
  return `<div class="etbig"><h2 class="etq">Le nom du fichier</h2>
    <div class="bigname fname">${esc(p.name)}</div>
    <div class="fiche">
      <label class="ff"><span>Date du document</span><input class="field" type="date" data-et-f="date" value="${esc(p.date || "")}"></label>
      <div class="ff"><span>Titulaire</span><div class="segc">${chip("moi", "Toi", who === "moi")}${holders.map((h) => chip(h, h, who === h)).join("")}${who !== "moi" && !holders.includes(who) ? chip(who, who, true) : ""}</div>
        <input class="field" data-et-f="person" data-ac="persons" autocomplete="off" value="" placeholder="Quelqu'un d'autre…"></div>
      <label class="ff"><span>Intitulé <small>facultatif</small></span><input class="field" data-et-f="detail" data-ac="details" autocomplete="off" value="${esc(p.detail || "")}" placeholder="ex. Contrat d'apprentissage BTS"></label>
      ${T.expiry ? `<label class="ff"><span>Expire le</span><input class="field" type="date" data-et-f="expiry" value="${esc(p.expiry || "")}"></label>` : ""}
    </div>
    <div class="etacts"><button type="button" class="cta" data-act="c-ok" data-id="${p.id}" data-et-enter>Ranger <kbd>Entrée</kbd></button></div></div>`;
}
function etOptions(p) {
  if (!S.et.opts) return `<div class="etfoot"><button type="button" class="linkbtn" data-act="et-later">← Plus tard</button><button type="button" class="linkbtn" data-act="et-opts">Options</button></div>`;
  const it = (act, label, extra = "") => `<button type="button" class="optrow" data-act="${act}" data-id="${p.id}" ${extra}>${label}</button>`;
  return `<div class="etfoot"><button type="button" class="linkbtn" data-act="et-later">← Plus tard</button><button type="button" class="linkbtn on" data-act="et-opts">Fermer les options</button></div>
    <div class="optbox">
      ${it("c-unknown", "Je ne sais pas ce que c'est — le mettre de côté <kbd>I</kbd>")}
      ${it("c-undo", "Annuler le dernier rangement <kbd>Z</kbd>", S.lastBatch ? "" : "disabled")}
      ${p.usage ? it("c-ok", "Ranger tout de suite, sans finir les étapes") : ""}
      ${it("reanalyze", "Relire les documents à trier")}
      ${it("et-props", PROPS() ? "Masquer les propositions de Bon toutou" : "Afficher les propositions de Bon toutou")}
      <div class="optmeta">${esc(p.orig)}${p.origin ? ` · depuis « ${esc(p.origin)} »` : ""} · ${CONF[p.confidence]} · ${esc(LVL[lvOf(p.cat)] ? LVL[lvOf(p.cat)][1] : "")}${p.ai_pending ? " · l'IA locale lit encore ce document" : ""}</div>
      ${reasons(p)}
    </div>`;
}
card = function (p, n) {
  const step = etStep(p);
  const body = { usage: stepUsage, chemin: stepChemin, emetteur: stepEmetteur, nom: stepNom }[step](p);
  return `<div class="ccard card et" id="ccard">
    <div class="cleft" data-doc="${p.id}">${preview(p)}<button class="linkbtn copen" data-open-inbox="${p.id}">Ouvrir en grand</button></div>
    <div class="cright">
      ${p.duplicate ? `<div class="pill bad" style="margin-bottom:8px">Doublon exact de « ${esc(p.duplicate.label)} »</div>` : ""}
      ${conflictBox(p)}
      ${etDone(p, step)}
      ${body}
      ${etOptions(p)}
    </div></div>`;
};
/* L'aperçu reste en place quand l'écran se met à jour (plus de rechargement pendant que l'IA lit) */
const renderBase = render;
render = function () {
  const old = document.querySelector("#ccard .cleft"), oldId = old && old.dataset.doc;
  topbar();
  const V = { home: () => window.homeView ? homeView() : "", cal: () => window.calView ? calView() : "", contacts: () => window.contactsView ? contactsView() : "",
              trier, docs, doc: docView, dossiers, dossier: dossierView, archives, reglages: () => window.reglagesView ? reglagesView() : "",
              guide: () => window.guideView ? guideView() : "", setup: () => window.setupView ? setupView() : "" }[S.v];
  $("#app").innerHTML = V ? V() : "";
  const nw = document.querySelector("#ccard .cleft");
  if (old && nw && nw.dataset.doc === oldId) nw.replaceWith(old);
  $("#modal").innerHTML = S.modal && window.modalView ? modalView() : "";
  $("#holders").innerHTML = ((S.st && S.st.settings && S.st.settings.holders) || []).map((h) => `<option value="${esc(h.nom)}">`).join("");
  if (typeof acClose === "function") acClose();
  bind();
  if (window.bindExtra) bindExtra();
};

async function etSet(id, f, v, next) {
  const r = await api("/api/propose", { id, overrides: { [f]: v } });
  if (!r || r.error) { toast("Pas enregistré : " + ((r && r.error) || "erreur")); return load(); }
  await load();
  if (next) { const q = (S.inbox || []).find((x) => x.id === id); if (q) etNext(q); }
}
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (!["et-usage", "et-go", "et-set", "et-ok", "et-pick", "et-opts", "et-later", "et-props", "c-fix"].includes(act)) return;
  e.stopImmediatePropagation();
  const p = (S.inbox || []).find((x) => x.id === (a.dataset.id || S.et.id)) || queue()[0];
  if (act === "et-props") { await api("/api/settings", { propositions: !PROPS() }); S.et.opts = false; S.et.id = null; return load(); }
  if (!p) return;
  if (act === "et-opts") { S.et.opts = !S.et.opts; return render(); }
  if (act === "et-later") { const b = document.createElement("button"); b.dataset.act = "c-later"; document.body.appendChild(b); b.click(); b.remove(); return; }
  if (act === "et-usage") {
    const r = await api("/api/propose", { id: p.id, overrides: { usage: a.dataset.u } });
    if (!r || r.error) { toast("Pas enregistré"); return load(); }
    await load();
    const q = (S.inbox || []).find((x) => x.id === p.id); if (q) { S.et.step = "usage"; etNext(q); } return;
  }
  if (act === "et-ok") return etNext(p);
  if (act === "et-pick") { S.et.pick = true; TP.card = null; return render(); }
  if (act === "et-go" || act === "c-fix") {
    const s = act === "c-fix" ? "nom" : a.dataset.s;
    if (s !== "usage" && !p.usage) return toast("D'abord : tu t'en sers encore ?");
    S.et.step = s; S.et.pick = false; return render();
  }
  if (act === "et-set") return etSet(p.id, a.dataset.f, a.dataset.v, !!a.dataset.next);
}, true);
document.addEventListener("change", (e) => {
  const el = e.target.closest && e.target.closest("[data-et-f]"); if (!el || !S.et.id) return;
  const v = el.value.trim(); if (!v && el.dataset.etF !== "detail") return;
  etSet(S.et.id, el.dataset.etF, v, el.dataset.etF === "emitter" && S.et.step === "emetteur");
});
document.addEventListener("keydown", (e) => {
  if (S.v !== "trier" || S.tmode !== "cartes" || S.modal || e.metaKey || e.ctrlKey || e.altKey) return;
  const inField = e.target.closest && e.target.closest("input,select,textarea,[contenteditable]");
  if (inField) {   // Entrée dans un champ : enregistre (et passe à la suite pour l'émetteur)
    if (e.key === "Enter" && !AC.box && e.target.dataset && e.target.dataset.etF && !e.target.classList.contains("tp-q")) { e.preventDefault(); e.target.blur(); }
    return;
  }
  const p = queue()[0]; if (!p) return;
  const click = (sel) => { const b = document.querySelector(sel); if (b && !b.disabled) { e.preventDefault(); e.stopImmediatePropagation(); b.click(); } };
  if (e.key === "Enter") return click("[data-et-enter]");
  if (e.key === "u" || e.key === "U") return click('[data-act=et-usage][data-u=utile]');
  if (e.key === "a" || e.key === "A") return click('[data-act=et-usage][data-u=archive]');
  if (e.key === "ArrowDown") return click("[data-act=et-pick]");
  if (e.key === "ArrowRight" && !p.usage) { e.preventDefault(); e.stopImmediatePropagation(); return toast("D'abord : utile aujourd'hui (U) ou archives (A) ?"); }
}, true);

/* ---------- mode Liste : le type se choisit en tuiles, et « tu t'en sers encore ? » */
const editFieldsListe = editFields;
editFields = function (p) {
  let h = editFieldsListe(p);
  const T = S.st.types[p.type] || {};
  const open = S.tpList === p.id;
  const pick = `<div class="ff-type"><span class="lbl">Type</span><button type="button" class="ghost small" data-act="tp-list" data-id="${p.id}">${catIc(T.cat).replace("<svg", '<svg style="width:14px;height:14px"')} ${esc(catName(T.cat))} › ${esc(T.label || p.type)} · ${open ? "fermer" : "changer"}</button>
    <span class="seg u-seg"><button type="button" class="${p.usage === "utile" ? "on" : ""}" data-act="et-usage-l" data-u="utile" data-id="${p.id}">Utile aujourd'hui</button><button type="button" class="${p.usage === "archive" ? "on" : ""}" data-act="et-usage-l" data-u="archive" data-id="${p.id}">Archives</button></span>
    ${open ? tpHTML("list_" + p.id) : ""}</div>`;
  h = h.replace('data-f="emitter"', 'data-f="emitter" data-ac="emitters" autocomplete="off"').replace('data-f="detail"', 'data-f="detail" data-ac="details" autocomplete="off"').replace('data-f="person"', 'data-f="person" data-ac="persons" autocomplete="off"');
  return h.replace(/<label>Type<select[\s\S]*?<\/select><\/label>/, "") .replace('<div class="edit">', pick + '<div class="edit">');
};
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  if (a.dataset.act === "tp-list") {
    e.stopImmediatePropagation();
    const id = a.dataset.id, p = (S.inbox || []).find((x) => x.id === id); if (!p) return;
    if (S.tpList === id) { S.tpList = null; return render(); }
    S.tpList = id;
    tpOpen("list_" + id, p.type, async (k) => { S.tpList = null; await api("/api/propose", { id, overrides: { type: k } }); await load(); toast(`${S.st.types[k].label} · le nom et le dossier sont mis à jour`); });
    return render();
  }
  if (a.dataset.act === "et-usage-l") {
    e.stopImmediatePropagation();
    await api("/api/propose", { id: a.dataset.id, overrides: { usage: a.dataset.u } }); await load();
  }
}, true);

/* ---------- « Corriger le classement » d'un document rangé : les mêmes tuiles */
const docViewListe = docView;
docView = function () {
  let h = docViewListe();
  const d = S.doc; if (!d || !S.fix) return h;
  if (!TP.doc || TP.doc.for !== d.id) {
    tpOpen("doc", d.type, (k) => {
      TP.doc.cur = k; const inp = document.getElementById("fx_type"); if (inp) inp.value = k;
      const lab = document.getElementById("fx_type_lab"); if (lab) lab.textContent = `${catName(S.st.types[k].cat)} › ${S.st.types[k].label}`;
      TP.doc.step = "famille"; TP.doc.q = ""; tpRefresh("doc");
    });
    TP.doc.for = d.id;
  }
  const k = TP.doc.cur, T = S.st.types[k] || {};
  const picker = `<div class="ff-type" style="grid-column:1/-1"><span class="lbl">Type</span><b id="fx_type_lab">${esc(catName(T.cat))} › ${esc(T.label || k)}</b><input type="hidden" id="fx_type" value="${esc(k)}">${tpHTML("doc")}</div>`;
  h = h.replace('id="fx_emitter"', 'id="fx_emitter" data-ac="emitters" autocomplete="off"').replace('id="fx_detail"', 'id="fx_detail" data-ac="details" autocomplete="off"').replace('id="fx_person"', 'id="fx_person" data-ac="persons" autocomplete="off"');
  return h.replace(/<label>Type<select class="field" id="fx_type">[\s\S]*?<\/select><\/label>/, picker);
};
