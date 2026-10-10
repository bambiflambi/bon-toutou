/* Bon toutou — Trier en mode cartes : un document à la fois, l'aperçu à gauche, la proposition à droite.
   ← Plus tard · ↓ Corriger · → Ranger · Z Annuler. Le mode Liste (app.js) reste disponible.
   Aussi : ce que Bon toutou a compris de ton rangement (import d'un dossier), et « Regrouper les employeurs » (Documents). */
const trierListe = trier;
try { S.tmode = localStorage.getItem("bt.trier") === "liste" ? "liste" : "cartes"; } catch (e) { S.tmode = "cartes"; }
S.later = S.later || [];

const ymLabel = (ym) => (ym ? `${M[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}` : "");
const isPdf = (n) => /\.pdf$/i.test(n || ""), isImg = (n) => /\.(jpe?g|png|gif|webp|heic|tiff?)$/i.test(n || "");
function queue() {
  const P = S.inbox || [], L = S.later.filter((id) => P.some((p) => p.id === id));
  S.later = L;
  const rank = (p) => (p.conflict ? 0 : isHi(p) ? 2 : 1);   // les conflits d'abord, un par un ; les sûrs à la fin
  return [...P.filter((p) => !L.includes(p.id)).sort((a, b) => rank(a) - rank(b)), ...L.map((id) => P.find((p) => p.id === id))];
}
const isUnknown = (p) => !p.conflict && (p.type === "autre" || p.confidence === "basse");   // temporaire : grand import (v0.6.3)
const folderOf = (p) => (p.origin || "").split("/").slice(0, -1).pop() || "";

trier = function () {
  if (S.tmode === "liste") return modeSwitch() + trierListe().replace(/^<h1>Trier<\/h1>/, "");
  const P = S.inbox || [], Q = queue(), p = Q[0], sure = P.filter(isHi);
  return `${modeSwitch()}
  <p class="lead">${P.length ? `${P.length} ${plural(P.length, "document")} à trier. <b>On ne va pas y passer la journée.</b>` : "Rien à trier."} Bon toutou propose, tu décides. Il ne détruit rien.</p>
  ${trierAdd(P)}
  ${S.st.counts.a_identifier ? `<div class="card box suresbar"><span class="oi">${IC.search}</span><div class="grow"><b>${S.st.counts.a_identifier} ${plural(S.st.counts.a_identifier, "document")} à identifier</b><div class="sub">Mis de côté avec « Inconnu », dans 00_A-TRIER/_A-IDENTIFIER.</div></div><button class="ghost small" data-act="c-unknown-back">Les revoir</button></div>` : ""}
  ${S.imported || P.some((x) => x.origin) ? understood(P) : ""}
  ${(() => { const U = P.filter(isUnknown); return U.length > 1 ? `<div class="card box suresbar"><span class="oi">${IC.search}</span><div class="grow"><b>${U.length} ${plural(U.length, "document inconnu", "documents inconnus")}</b><div class="sub">Type non reconnu ou confiance faible. Mets-les de côté pour avancer : ils attendent dans « À identifier » et ne reviennent pas avec un nouvel import. Annulable.</div></div><button class="ghost small" data-act="c-unknown-all">Mettre de côté les ${U.length}</button></div>` : ""; })()}
  ${sure.length > 1 ? `<div class="card box suresbar"><span class="oi" style="background:var(--success-light);color:var(--success)">${IC.check}</span><div class="grow"><b>${sure.length} ${plural(sure.length, "document sûr", "documents sûrs")}</b><div class="sub">Confiance élevée, aucun conflit : rangés comme proposé, en une fois. Annulable.</div></div><button class="cta small" data-act="c-sure">Ranger les sûrs d'un coup</button></div>` : ""}
  ${p ? card(p, Q.length) : !S.busy ? `<div class="card" style="padding:28px;text-align:center"><span class="oi" style="margin:0 auto 10px;background:var(--success-light);color:var(--success)">${IC.check}</span><b>Tout est trié.</b><div class="sub">Dépose un fichier ou un dossier ci-dessus.</div></div>` : ""}`;
};
function modeSwitch() {
  return `<div class="thead"><h1>Trier</h1><div class="seg" role="tablist" aria-label="Affichage">
    <button class="${S.tmode === "cartes" ? "on" : ""}" data-act="tmode" data-m="cartes" role="tab" aria-selected="${S.tmode === "cartes"}">Cartes</button>
    <button class="${S.tmode === "liste" ? "on" : ""}" data-act="tmode" data-m="liste" role="tab" aria-selected="${S.tmode === "liste"}">Liste</button></div></div>`;
}

function preview(p) {
  const src = "/api/inboxfile?id=" + encodeURIComponent(p.id);
  if (isPdf(p.orig)) {
    if (!window.pdfjsLib) return `<iframe class="cifr" src="${src}#toolbar=0&navpanes=0&view=FitH" title="Aperçu de ${esc(p.orig)}"></iframe>`;
    const P = S.pdf && S.pdf.id === p.id ? S.pdf : null;
    return `<div class="cpdf" id="cpdf" data-src="${src}" data-id="${esc(p.id)}"><canvas id="cpdfc" aria-label="Aperçu de ${esc(p.orig)}, page ${P ? P.page : 1}"></canvas>
      <div class="cpnav" ${P && P.n > 1 ? "" : "hidden"}><button class="cparr" data-act="c-page" data-d="-1" aria-label="Page précédente" ${P && P.page > 1 ? "" : "disabled"}>‹</button>
        <span class="cpnum">${P ? P.page : 1} / ${P ? P.n : 1}</span>
        <button class="cparr" data-act="c-page" data-d="1" aria-label="Page suivante" ${P && P.page < P.n ? "" : "disabled"}>›</button></div></div>`;
  }
  if (isImg(p.orig) && !/\.(heic|tiff?)$/i.test(p.orig)) return `<img class="cimg" src="${src}" alt="Aperçu de ${esc(p.orig)}">`;
  return `<div class="cnone"><span class="oi">${catIc(p.cat)}</span><span class="sub">Pas d'aperçu pour ce fichier</span></div>`;
}

function conflictBox(p) {
  const c = p.conflict; if (!c) return "";
  if (c.field === "date" || /^\d{4}-\d{2}-\d{2}$/.test(c.content || ""))
    return `<div class="cconf"><b>Ton dossier et le document ne disent pas la même chose</b><div class="sub">Ton dossier couvre ${esc(c.folder)} ; le document est daté du ${frd(p.date)}.</div>
      <div class="acts"><button class="ghost small" data-act="c-keep" data-id="${p.id}">Garder le ${frd(p.date)}</button><button class="ghost small" data-act="c-fix">Corriger la date</button></div></div>`;
  return `<div class="cconf"><b>Ton dossier et le document ne disent pas la même chose</b><div class="sub">Ton dossier dit « ${esc(c.folder)} », le document met en avant « ${esc(c.content)} ».</div>
    <div class="acts"><button class="ghost small" data-act="c-keep" data-id="${p.id}">Garder « ${esc(c.folder)} »</button><button class="ghost small" data-act="c-take" data-id="${p.id}" data-v="${esc(c.content)}">Prendre « ${esc(c.content)} »</button></div></div>`;
}

function card(p, n) {
  const T = S.st.types[p.type] || {}, pos = (S.inbox || []).length - n + 1;
  const date = p.lot ? `de ${ymLabel(p.lot[0])} à ${ymLabel(p.lot[1])}` : frd(p.date);
  return `<div class="ccard card ${p.confidence}" id="ccard">
    <div class="cleft">${preview(p)}<button class="linkbtn copen" data-open-inbox="${p.id}">Ouvrir en grand</button></div>
    <div class="cright">
      <div class="ctop"><span class="sub">${pos} / ${(S.inbox || []).length}</span><span class="conf ${p.confidence}">${CONF[p.confidence]}</span>${p.cat ? lvBadge(p.cat) : ""}${p.ai_pending ? `<span class="pill acc"><span class="spin" style="width:11px;height:11px"></span> IA locale en train de lire…</span>` : ""}</div>
      <h2 class="ctitle">${esc(p.label)} ${cc(p.country)}</h2>
      ${p.duplicate ? `<span class="pill bad">Doublon exact de « ${esc(p.duplicate.label)} »</span>` : ""}
      ${conflictBox(p)}
      ${phrase(p)}
      <div class="cdest"><span class="sub">Rangé dans</span> <span class="fname">${esc(p.dest)}/</span><br><span class="fname"><b>${esc(p.name)}</b></span>
        <div class="sub">${esc(p.relation)} · reçu : ${esc(p.source)}${p.origin ? ` · depuis « ${esc(p.origin)} »` : ` · ${esc(p.orig)}`}</div></div>
      ${reasons(p)}
      ${S.fixc ? `<div class="cfix"><div class="sub" style="margin-bottom:8px">Tous les champs</div>${editFields(p)}${window.ruleOffer ? ruleOffer({ inbox: p.id, overrides: p.overrides, type: p.type }) : ""}</div>` : ""}
      <div class="cacts">
        <button class="ghost" data-act="c-later" title="Flèche gauche">← Plus tard</button>
        <button class="ghost${S.blank ? " on" : ""}" data-act="c-fix" title="Flèche bas">↓ Corriger</button>
        <button class="cta" data-act="c-ok" data-id="${p.id}" title="Flèche droite">${(p.doubts || []).length ? "Ranger quand même →" : "Ranger →"}</button>
      </div>
      <div class="ckeys"><button class="linkbtn" data-act="c-undo" ${S.lastBatch ? "" : "disabled"}>Annuler (Z)</button><span>·</span><button class="linkbtn" data-act="c-unknown" data-id="${p.id}" title="Il quitte la file et ne revient pas, même si tu réimportes le dossier. « Les revoir » le ramène.">Inconnu · plus tard (I)</button><span class="sub">← → ↓ I Z au clavier</span></div>
    </div></div>`;
}

/* ---- Corriger en complétant une phrase : seuls les doutes sont soulignés, on touche un mot et on choisit */
const FEM = /^(carte|fiche|facture|quittance|attestation|d[ée]claration|demande|amende|assurance|immatriculation|lettre|aide|allocation|relev[ée]x?)\b/i;
const unaccent = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function blankBtn(p, k, text) {
  const d = (p.doubts || []).includes(k), o = S.blank === k, set = (p.set || []).includes(k), fresh = S.justSet === p.id + ":" + k;
  return `<button type="button" class="blank${d ? " doubt" : ""}${set ? " set" : ""}${fresh ? " fresh" : ""}${o ? " open" : ""}" data-blank="${k}" aria-expanded="${o}" title="${set ? "Choisi par toi" : "Proposé par Bon toutou"}">${esc(text)}</button>`;
}
function phrase(p) {
  if (S.blankFor !== p.id) { S.blankFor = p.id; S.blank = (p.doubts || [])[0] || null; S.tq = ""; S.allTypes = false; }
  if (S.blank === "__next") S.blank = (p.doubts || [])[0] || null;
  const tl = (S.st.types[p.type] || {}).label || p.type_label || "document";
  const tw = (FEM.test(tl) ? "une " : "un ") + tl.charAt(0).toLowerCase() + tl.slice(1);
  const em = p.emitter && p.emitter !== "Inconnu" ? p.emitter_display || p.emitter : "";
  const who = p.person === "moi" || !p.person || p.person === S.st.settings.owner ? "toi" : p.person;
  const dt = p.lot ? `de ${ymLabel(p.lot[0])} à ${ymLabel(p.lot[1])}` : p.date_year ? `de ${p.date_year} (année seulement)` : `daté du ${frd(p.date)}`;
  const de = em ? (/^[aeiouyhéè]/i.test(em) ? "d'" : "de ") : "de ";
  const n = (p.doubts || []).length;
  return `<div class="phrase"><p class="sentence">C'est ${blankBtn(p, "type", tw)} ${de}${blankBtn(p, "emitter", em || "qui")}, pour ${blankBtn(p, "person", who)}, ${blankBtn(p, "date", dt)}.</p>
    <div class="sub">${n ? `${n} ${plural(n, "mot")} en pointillés : touche-${n > 1 ? "les" : "le"} pour choisir.` : "Tout est clair. Touche un mot pour le changer."}</div>
    ${S.blank ? ask(p, S.blank) : ""}</div>`;
}
function chip(v, label, first, extra) { return `<button type="button" class="chip${first ? " first" : ""}" data-pick="${esc(v)}">${esc(label)}${extra ? `<small>${esc(extra)}</small>` : ""}</button>`; }
/* « dis-le avec tes mots » : cherche dans le nom du type, sa catégorie et ses mots-clés ; les petits mots (de, d', la…) sont ignorés,
   et si aucun type ne contient tous les mots, on garde ceux qui en contiennent le plus. */
const STOP = new Set(["de", "d", "du", "des", "la", "le", "les", "l", "un", "une", "mon", "ma", "mes", "et", "a", "au", "en", "pour"]);
function typeSearch(q) {
  const T = S.st.types, W = q.split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));
  if (!W.length) return [];
  const score = Object.keys(T).map((t) => { const hay = unaccent(T[t].label + " " + (S.st.categories[T[t].cat] || "") + " " + (T[t].mots || ""));
    const lab = unaccent(T[t].label); return [t, W.filter((w) => hay.includes(w)).length + W.filter((w) => lab.includes(w)).length * 0.5]; });
  const all = score.filter((x) => x[1] >= W.length).sort((a, b) => b[1] - a[1]);
  return (all.length ? all : score.filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1])).map((x) => x[0]);
}
function ask(p, k) {
  const T = S.st.types;
  if (k === "type") {
    const q = unaccent(S.tq);
    let ids = q ? typeSearch(q).slice(0, 6)
                : [...(p.type === "autre" ? [] : [p.type]), ...(p.candidates || []), ...["certificat", "facture", "formulaire", "justificatif_domicile"].filter((t) => T[t]), "autre"].filter((t, i, a) => T[t] && a.indexOf(t) === i).slice(0, 6);
    return `<div class="ask"><b>C'est quoi, ce document ?</b>${(p.candidates || []).length ? `<span class="from">D'après ce qui est écrit dedans</span>` : ""}
      <div class="chips">${ids.map((t, i) => chip(t, T[t].label, i === 0 && !q && p.type !== "autre", t === p.type && !q && t !== "autre" ? "proposé" : "")).join("") || `<span class="sub">Aucun type ne correspond.</span>`}</div>
      <label class="say"><span aria-hidden="true">✎</span><input id="say_type" value="${esc(S.tq || "")}" placeholder="Ou dis-le avec tes mots : facture, diplôme, assurance…" aria-label="Chercher un type"></label>
      <div class="askfoot">${S.allTypes ? `<select class="field" id="all_type" aria-label="Tous les types">${typeOptions(p.type)}</select>` : `<button type="button" class="linkbtn" data-act="c-alltypes">Voir tous les types</button>`}<button type="button" class="linkbtn" data-act="c-more">Tous les champs</button></div></div>`;
  }
  if (k === "emitter") {
    const C = (p.emitter_candidates || []).filter(Boolean);
    return `<div class="ask"><b>Qui te l'a envoyé ?</b>${C.length ? `<span class="from">Lu en haut du document : « ${esc(C[0])} »</span>` : ""}
      <div class="chips">${C.map((c, i) => chip(c, c, i === 0, i === 0 ? "lu dedans" : "")).join("")}${p.emitter && p.emitter !== "Inconnu" ? chip(p.emitter_display || p.emitter, "Garder « " + (p.emitter_display || p.emitter) + " »", !C.length) : ""}</div>
      <label class="say"><span aria-hidden="true">✎</span><input id="say_emitter" placeholder="Nom de l'entreprise, de l'école, de l'organisme…" aria-label="Émetteur"></label></div>`;
  }
  if (k === "person") {
    const H = [S.st.settings.owner || "toi", ...((S.st.settings.holders || []).map((h) => h.nom))].filter(Boolean);
    const seen = p.holder_seen && !H.includes(p.holder_seen) ? p.holder_seen : null;
    return `<div class="ask"><b>C'est à qui ?</b>${seen ? `<span class="from">Nom lu sur le document : « ${esc(seen)} ». Si c'est toi, choisis « Toi » : Bon toutou s'en souviendra.</span>` : ""}
      <div class="chips">${H.map((h, i) => chip(i === 0 ? S.st.settings.owner || "moi" : h, i === 0 ? "Toi" : h, i === 0)).join("")}${seen ? chip(seen, seen, false, "un proche") : ""}</div>
      <label class="say"><span aria-hidden="true">✎</span><input id="say_person" list="holders" placeholder="Un autre prénom" aria-label="Titulaire"></label></div>`;
  }
  return `<div class="ask"><b>Quelle date garder ?</b>${p.date_note ? `<span class="from">${esc(p.date_note)}</span>` : ""}
    <div class="chips">${chip(p.date, p.date_year ? `Garder l'année ${p.date_year}` : `Garder le ${frd(p.date)}`, true)}${chip(S.st.today, "Aujourd'hui")}</div>
    <label class="say"><span aria-hidden="true">📅</span><input id="say_date" type="date" value="${esc(p.date)}" aria-label="Choisir une date"></label></div>`;
}
async function pickBlank(k, v) {
  const p = queue()[0]; if (!p) return;
  const f = k === "person" ? "person" : k;
  S.blank = "__next"; S.tq = ""; S.allTypes = false;
  const r = await api("/api/propose", { id: p.id, overrides: { [f]: v } });
  if (!r || r.error) { toast("Pas enregistré : " + ((r && r.error) || "erreur")); return load(); }
  S.justSet = p.id + ":" + k;
  await load();
  const L = { type: "Type", emitter: "Émetteur", person: "Titulaire", date: "Date" }[k];
  toast(`${L} enregistré · le nom et le dossier sont mis à jour`);
  setTimeout(function clear() { if (S.justSet !== p.id + ":" + k) return; if (editing()) return setTimeout(clear, 1500); S.justSet = null; if (S.v === "trier") render(); }, 2500);
}

/* ---- Ce que Bon toutou a compris de ton rangement (import d'un dossier) */
function understood(P) {
  const R = P.filter((p) => p.origin), respect = S.st.settings.respect_folders !== false;
  if (!R.length) return "";
  const G = {};
  R.forEach((p) => { const k = respect ? p.emitter_display || p.emitter : folderOf(p) || "—"; (G[k] = G[k] || []).push(p); });
  const rows = Object.entries(G).sort((a, b) => b[1].length - a[1].length).map(([k, L]) => {
    const ds = L.flatMap((p) => (p.lot ? [p.lot[0], p.lot[1]] : [String(p.date || "").slice(0, 7)])).filter(Boolean).sort();
    const nc = L.filter((p) => p.conflict).length;
    return `<div class="row"><div class="grow"><b>${esc(k)}</b><div class="sub">${L.length} ${plural(L.length, "document")}${ds.length ? ` · ${ymLabel(ds[0])}${ds[0] !== ds[ds.length - 1] ? " – " + ymLabel(ds[ds.length - 1]) : ""}` : ""}${L.some((p) => p.lot) ? ` · dont ${L.filter((p) => p.lot).length} sur plusieurs mois` : ""}</div></div>${nc ? `<span class="pill bad">${nc} à vérifier</span>` : ""}</div>`;
  }).join("");
  const nc = R.filter((p) => p.conflict).length;
  return `<details class="card box understood" ${S.imported ? "open" : ""}><summary><b>Ce que Bon toutou a compris de ton rangement</b> <span class="sub">· ${R.length} ${plural(R.length, "document importé", "documents importés")}${nc ? ` · ${nc} à vérifier, présentés un par un` : ""}</span></summary>
    <div class="seg" style="margin:12px 0 4px"><button class="${respect ? "on" : ""}" data-act="c-respect" data-v="1">Respecter mon rangement</button><button class="${respect ? "" : "on"}" data-act="c-respect" data-v="0">Tout réorganiser</button></div>
    <p class="sub" style="margin:4px 0 10px">${respect ? "Les noms de tes dossiers font foi (employeur, période) ; le contenu sert à vérifier. Lu sur les noms seulement." : "Bon toutou propose son propre rangement, d'après le contenu. Tes dossiers d'origine ne bougent pas."}</p>
    <div class="card">${rows}</div></details>`;
}

/* ---- Documents › Regrouper les employeurs */
function regroupCard() {
  const G = S.groups || [];
  if (!G.length || !Array.isArray(G)) return "";
  S.gtarget = S.gtarget || {};
  return `<div class="card box regroup"><span class="oi">${IC.work}</span><div class="grow"><b>${G.length === 1 ? "Un employeur semble rangé" : `${G.length} employeurs semblent rangés`} sous plusieurs noms</b>
    <div class="sub">Regroupe-les dans un seul dossier. Les fichiers sont renommés et déplacés ; une seule annulation suffit pour tout remettre.</div>
    ${G.map((g, i) => `<div class="rgrow"><span>${g.names.map((x) => `<span class="pill n">${esc(x.label)} · ${x.n}</span>`).join(" ")}</span> → <input class="field" data-gt="${i}" value="${esc(S.gtarget[i] != null ? S.gtarget[i] : g.target)}" aria-label="Nom gardé"></div>`).join("")}
    <div class="acts" style="margin-top:10px"><button class="cta small" data-act="c-regroup">Regrouper par employeur</button></div></div></div>`;
}

/* ---- Aperçu des PDF page par page (pdf.js embarqué dans l'app : rien n'est chargé depuis internet) */
if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = "/static/vendor/pdfjs/pdf.worker.min.js";
async function pdfDraw() {
  const box = document.getElementById("cpdf"); if (!box || !window.pdfjsLib) return;
  const id = box.dataset.id;
  try {
    if (!S.pdf || S.pdf.id !== id) {
      if (S.pdf && S.pdf.doc) S.pdf.doc.destroy();
      S.pdf = { id, page: 1, n: 1, doc: null };
      const doc = await pdfjsLib.getDocument({ url: box.dataset.src, isEvalSupported: false }).promise;
      if (!S.pdf || S.pdf.id !== id) return doc.destroy();
      S.pdf.doc = doc; S.pdf.n = doc.numPages;
      const nav = box.querySelector(".cpnav"); if (nav && doc.numPages > 1) { nav.hidden = false; pdfNav(box); }
    }
    const P = S.pdf, page = await P.doc.getPage(P.page);
    const cv = document.getElementById("cpdfc"); if (!cv || document.getElementById("cpdf").dataset.id !== id) return;
    const v0 = page.getViewport({ scale: 1 }), r = window.devicePixelRatio || 1;
    const fit = Math.min((box.clientWidth - 24) / v0.width, (Math.max(420, box.clientHeight) - (P.n > 1 ? 72 : 24)) / v0.height);   // la page entière, flèches comprises
    const vp = page.getViewport({ scale: fit * r });
    cv.width = vp.width; cv.height = vp.height; cv.style.width = Math.round(v0.width * fit) + "px";
    if (P.task) P.task.cancel();
    P.task = page.render({ canvasContext: cv.getContext("2d"), viewport: vp });
    await P.task.promise.catch(() => {});
    P.task = null;
  } catch (e) {
    box.outerHTML = `<iframe class="cifr" src="${box.dataset.src}#toolbar=0&view=FitH" title="Aperçu"></iframe>`;
  }
}
function pdfNav(box) {
  const P = S.pdf, b = box.querySelectorAll(".cparr");
  box.querySelector(".cpnum").textContent = `${P.page} / ${P.n}`;
  b[0].disabled = P.page <= 1; b[1].disabled = P.page >= P.n;
  const cv = document.getElementById("cpdfc"); if (cv) cv.setAttribute("aria-label", `Aperçu, page ${P.page} sur ${P.n}`);
}
function pdfPage(d) {
  const P = S.pdf, box = document.getElementById("cpdf");
  if (!P || !P.doc || !box) return;
  const n = Math.min(P.n, Math.max(1, P.page + d)); if (n === P.page) return;
  P.page = n; pdfNav(box); pdfDraw();
}

async function cartesRange(ids, label) {
  const r = await api("/api/validate", { ids });
  if (r.ok) { S.lastBatch = r.batch; S.fixc = false; }
  await load();
  if (r.ok) toast(label || "Rangé", r.batch); else toast("Rien n'a été rangé");
}
async function cartesUndo() {
  if (!S.lastBatch) return toast("Rien à annuler");
  const r = await api("/api/undo", { batch: S.lastBatch }); S.lastBatch = null; $("#toast").hidden = true; await load(); toast(r.msg || "Annulé");
}

(function () {
  const prevBind = window.bindExtra;
  window.bindExtra = function () {
    if (prevBind) prevBind();
    document.querySelectorAll("[data-gt]").forEach((el) => (el.oninput = () => (S.gtarget[+el.dataset.gt] = el.value)));
    pdfDraw();
    const st = $("#say_type"); if (st) st.oninput = () => { S.tq = st.value; const pos = st.selectionStart; render(); const n = $("#say_type"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
    if (st) st.onkeydown = (e) => { if (e.key === "Enter") { const c = document.querySelector(".ask .chip"); if (c) c.click(); } };
    ["emitter", "person"].forEach((k) => { const el = $("#say_" + k); if (el) el.onkeydown = (e) => { if (e.key === "Enter" && el.value.trim()) pickBlank(k, el.value.trim()); }; });
    const sd = $("#say_date"); if (sd) sd.onchange = () => { if (sd.value) pickBlank("date", sd.value); };
    const at = $("#all_type"); if (at) at.onchange = () => pickBlank("type", at.value);
  };
})();

document.addEventListener("click", async (e) => {
  const bl = e.target.closest("[data-blank]"); if (bl) { S.blank = S.blank === bl.dataset.blank ? null : bl.dataset.blank; S.tq = ""; S.allTypes = false; return render(); }
  const pk = e.target.closest("[data-pick]"); if (pk && S.blank) return pickBlank(S.blank, pk.dataset.pick);
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, Q = () => queue();
  if (act === "tmode") { S.tmode = a.dataset.m; try { localStorage.setItem("bt.trier", S.tmode); } catch (x) {} return render(); }
  if (act === "c-ok") return cartesRange([a.dataset.id]);
  if (act === "c-sure") { const ids = (S.inbox || []).filter(isHi).map((p) => p.id); return cartesRange(ids, `${ids.length} documents rangés`); }
  if (act === "c-later") { const p = Q()[0]; if (p) { S.later = S.later.filter((x) => x !== p.id).concat(p.id); S.fixc = false; } return render(); }
  if (act === "c-fix") { const p = queue()[0]; if (!p) return; const order = [...(p.doubts || []), "type", "emitter", "person", "date"].filter((x, i, a) => a.indexOf(x) === i);
    S.blank = S.blank ? order[order.indexOf(S.blank) + 1] || null : order[0]; return render(); }
  if (act === "c-more") { S.fixc = !S.fixc; return render(); }
  if (act === "c-alltypes") { S.allTypes = true; return render(); }
  if (act === "c-unknown") { const r = await api("/api/unknown", { id: a.dataset.id }); S.lastBatch = r.batch; await load(); return toast("Mis de côté : il t'attend dans « À identifier »", r.batch); }
  if (act === "c-unknown-all") { const ids = (S.inbox || []).filter(isUnknown).map((p) => p.id); const r = await api("/api/unknown/many", { ids }); S.lastBatch = r.batch; await load();
    return toast(`${r.n} ${plural(r.n, "document mis", "documents mis")} de côté dans « À identifier »`, r.batch); }
  if (act === "c-unknown-back") { const r = await api("/api/unknown/back", {}); await load(); return toast(`${r.n} ${plural(r.n, "document remis", "documents remis")} dans Trier`, r.batch); }
  if (act === "c-undo") return cartesUndo();
  if (act === "c-page") return pdfPage(+a.dataset.d);
  if (act === "c-keep") { await api("/api/propose", { id: a.dataset.id, overrides: { resolved: true } }); return load(); }
  if (act === "c-take") { await api("/api/propose", { id: a.dataset.id, overrides: { emitter: a.dataset.v } }); return load(); }
  if (act === "c-respect") { const on = a.dataset.v === "1"; if (on === (S.st.settings.respect_folders !== false)) return;
    S.busy = on ? "Bon toutou relit tes documents en suivant ton rangement…" : "Bon toutou relit tes documents d'après leur contenu…"; render();
    await api("/api/settings", { respect_folders: on }); await api("/api/reanalyze", { cached: true }); S.busy = ""; await load(); return; }
  if (act === "c-regroup") {
    const groups = (S.groups || []).map((g, i) => ({ names: g.names.map((x) => x.emitter), target: (S.gtarget && S.gtarget[i] != null ? S.gtarget[i] : g.target).trim() })).filter((g) => g.target);
    S.busy = "Regroupement…"; const r = await api("/api/emitters/regroup", { groups }); S.busy = ""; S.gtarget = {}; await load();
    return toast(r.n ? `${r.n} ${plural(r.n, "document regroupé", "documents regroupés")}` : "Déjà regroupés", r.batch);
  }
});

document.addEventListener("keydown", (e) => {
  if (S.v !== "trier" || S.tmode !== "cartes" || S.modal || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input,select,textarea,[contenteditable]")) return;
  const p = queue()[0];
  const click = (sel) => { const b = document.querySelector(sel); if (b && !b.disabled) { e.preventDefault(); b.click(); } };
  if (e.key === "ArrowRight" && p) return click("[data-act=c-ok]");
  if (e.key === "ArrowLeft" && p) return click("[data-act=c-later]");
  if (e.key === "ArrowDown" && p) return click("[data-act=c-fix]");
  if (e.key === "z" || e.key === "Z") return click("[data-act=c-undo]");
  if ((e.key === "i" || e.key === "I") && p) return click("[data-act=c-unknown]");
  if (e.key === "PageDown" && p) { e.preventDefault(); return pdfPage(1); }
  if (e.key === "PageUp" && p) { e.preventDefault(); return pdfPage(-1); }
});
