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
const folderOf = (p) => (p.origin || "").split("/").slice(0, -1).pop() || "";

trier = function () {
  if (S.tmode === "liste") return modeSwitch() + trierListe().replace(/^<h1>Trier<\/h1>/, "");
  const P = S.inbox || [], Q = queue(), p = Q[0], sure = P.filter(isHi);
  return `${modeSwitch()}
  <p class="lead">${P.length ? `${P.length} ${plural(P.length, "document")} à trier. <b>On ne va pas y passer la journée.</b>` : "Rien à trier."} Bon toutou propose, tu décides. Il ne détruit rien.</p>
  ${trierAdd(P)}
  ${S.imported || P.some((x) => x.origin) ? understood(P) : ""}
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
  if (isPdf(p.orig)) return `<iframe class="cframe" src="${src}#toolbar=0&navpanes=0&view=FitH" title="Aperçu de ${esc(p.orig)}"></iframe>`;
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
      <dl class="cdl">
        <dt>Type</dt><dd>${esc(T.label || p.type_label)}</dd>
        <dt>Émetteur</dt><dd>${esc(p.emitter_display || p.emitter)}</dd>
        <dt>Date</dt><dd>${esc(date)}${p.date_note ? ` <span class="sub">≈ ${esc(p.date_note)}</span>` : ""}</dd>
        <dt>Titulaire</dt><dd>${esc(p.person === "moi" ? S.st.settings.owner || "toi" : p.person)}</dd>
        <dt>Dossier</dt><dd class="fname">${esc(p.dest)}</dd>
        <dt>Nom</dt><dd class="fname"><b>${esc(p.name)}</b></dd>
        <dt>Suivi</dt><dd>${esc(p.relation)}</dd>
        <dt>Reçu</dt><dd class="sub">${esc(p.source)}${p.origin ? ` · depuis « ${esc(p.origin)} »` : ` · ${esc(p.orig)}`}</dd>
      </dl>
      ${reasons(p)}
      ${S.fixc ? `<div class="cfix">${editFields(p)}${window.ruleOffer ? ruleOffer({ inbox: p.id, overrides: p.overrides, type: p.type }) : ""}</div>` : ""}
      <div class="cacts">
        <button class="ghost" data-act="c-later" title="Flèche gauche">← Plus tard</button>
        <button class="ghost${S.fixc ? " on" : ""}" data-act="c-fix" title="Flèche bas">↓ ${S.fixc ? "Fermer" : "Corriger"}</button>
        <button class="cta" data-act="c-ok" data-id="${p.id}" title="Flèche droite">Ranger →</button>
      </div>
      <div class="ckeys"><button class="linkbtn" data-act="c-undo" ${S.lastBatch ? "" : "disabled"}>Annuler (Z)</button><span>·</span><button class="linkbtn" data-act="ignore" data-id="${p.id}">Ignorer</button><span class="sub">← → ↓ Z au clavier</span></div>
    </div></div>`;
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
  };
})();

document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, Q = () => queue();
  if (act === "tmode") { S.tmode = a.dataset.m; try { localStorage.setItem("bt.trier", S.tmode); } catch (x) {} return render(); }
  if (act === "c-ok") return cartesRange([a.dataset.id]);
  if (act === "c-sure") { const ids = (S.inbox || []).filter(isHi).map((p) => p.id); return cartesRange(ids, `${ids.length} documents rangés`); }
  if (act === "c-later") { const p = Q()[0]; if (p) { S.later = S.later.filter((x) => x !== p.id).concat(p.id); S.fixc = false; } return render(); }
  if (act === "c-fix") { S.fixc = !S.fixc; render(); const f = document.querySelector(".cfix select,.cfix input"); if (f && S.fixc) f.focus(); return; }
  if (act === "c-undo") return cartesUndo();
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
});
