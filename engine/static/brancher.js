/* Bon toutou — v0.10 « Brancher » : créer et relier l'adresse admin (Infomaniak, Suisse), guide de l'IA locale,
   banc d'essai sur tes propres papiers. Chargé après liens.js. */

const IK = { inscription: "https://www.infomaniak.com/fr/ksuite/myksuite", webmail: "https://ksuite.infomaniak.com/mail",
  aide: "https://www.infomaniak.com/fr/support/faq/2904/gerer-les-mots-de-passe-my-ksuite-ikme-etikcom-ikmailcom" };
const IK_DOMS = /@(ik\.me|etik\.com|ikmail\.com)$/i;
const mg = () => S.st.settings.mail_guide || {};
async function mgSet(p) { const v = Object.assign({}, mg(), p); S.st.settings.mail_guide = v; await api("/api/settings", { mail_guide: v }); render(); }

/* ---------------------------------------------------------------- Adresse admin : l'accompagnement */
function gstep(n, done, cur, title, body) {
  return `<div class="gstep${done ? " done" : ""}${cur ? " cur" : ""}"><span class="gnum">${done ? "✓" : n}</span><div class="grow"><b>${title}</b>${cur || !done ? `<div class="gbody">${body}</div>` : ""}</div></div>`;
}
function mailAiCard() {
  const s = S.st.settings, on = s.use_ollama && s.ollama_model, b = (s.ai_banc || {})[s.ollama_model] || null;
  return `<div class="label" style="margin:22px 0 8px">Lecture des pièces reçues</div>
  <div class="card box"><div class="row" style="padding:0;border:0"><span class="oi">${IC.sparkles}</span><div class="grow">
    <b>${on ? `L'IA locale lit les pièces reçues · ${esc(s.ollama_model)}` : "Les règles de Bon toutou lisent les pièces reçues"}</b>
    <div class="sub">${on ? (b ? `Banc d'essai : ${esc(b.mot)} (${b.justes} types justes sur ${b.total})` : "Pas encore de banc d'essai sur tes papiers") : "Active l'IA locale pour les papiers inhabituels : elle tourne sur ton ordinateur, rien ne sort."}</div></div>
    <button class="ghost small" data-go="reglages" data-sv="ia">${on ? "Voir" : "Activer"}</button></div>
    <p class="sub" style="margin-bottom:0">Bon toutou ne lit que les pièces jointes (PDF et images), jamais le texte de tes mails. Rien n'est envoyé à une IA en ligne.</p></div>`;
}
const mailViewB = mailView;
mailView = function () {
  const h = mailViewB(), M = S.mst || {};
  if (S.ml && S.ml.busy) return h;
  if (!M.saved) return h;   // pas encore reliée : l'assistant pas à pas (mailwiz.js) s'en charge
  const j = h.indexOf('<p class="sub" style="margin-top:10px">Connexion directe');
  return j < 0 ? h + mailAiCard() : h.slice(0, j) + mailAiCard() + h.slice(j);
};

/* ---------------------------------------------------------------- IA locale : guide + banc d'essai */
S.banc = S.banc || null;
function iaCtx() {
  const st = S.st, I = st.ia || {}, M = I.machine || {}, cat = I.catalogue || { modeles: [] }, engs = I.engines || [];
  const eng = engs.find((e) => e.id === iaEngId()) || engs.find((e) => e.running) || {};
  const keyOf = (m) => (eng.kind === "integre" ? (m.gguf || {}).fichier : m.ollama);
  const inst = new Set(eng.models || []);
  const isIn = (k) => !!k && (inst.has(k) || inst.has(k + ":latest"));
  const rec = cat.modeles.find((m) => m.conseille && m.niveau === M.niveau) || cat.modeles.find((m) => m.conseille) || cat.modeles[0] || {};
  const model = st.settings.ollama_model || (isIn(keyOf(rec)) ? keyOf(rec) : (eng.models || [])[0]) || "";
  return { st, M, eng, rec, recKey: keyOf(rec), recIn: isIn(keyOf(rec)), model, running: !!eng.running };
}
const bw = { juste: ["juste", "ok"], proche: ["proche", "warn"], faux: ["faux", "bad"] };
const bcell = (v) => (v ? `<span class="bv ${bw[v][1]}">${bw[v][0]}</span>` : `<span class="sub">—</span>`);
function bancCard(C) {
  const st = C.st, saved = (st.settings.ai_banc || {})[C.model], run = S.banc && S.banc.runs && S.banc.runs[C.model];
  const going = run && run.status === "en cours";
  const V = (run && run.verdict) || saved;
  return `<div class="label" style="margin:22px 0 8px">Banc d'essai sur tes papiers</div>
  <div class="card box"><p class="sub" style="margin-top:0">Bon toutou prend 6 documents déjà rangés (un par type), <b>cache leur nom</b>, et demande au modèle ce qu'il y voit. Puis il compare à ton classement. Tout se passe sur ton ordinateur et rien n'est modifié.</p>
    ${!C.running ? `<div class="hint">Lance d'abord un moteur d'IA (étape 1).</div>` : !C.model ? `<div class="hint">Installe d'abord un modèle (étape 2).</div>` : ""}
    ${going ? `<div class="bar"><i style="width:${Math.round((100 * run.done) / Math.max(1, run.total))}%"></i></div><div class="sub">${run.done} sur ${run.total} documents · compte jusqu'à une minute par document sur un ordinateur modeste</div>` : ""}
    ${V && !going ? `<div class="bverdict ${V.mot === "fiable" ? "ok" : V.mot === "pas assez fiable" ? "bad" : "warn"}"><b>${esc(C.model)} : ${esc(V.mot)}</b> · ${V.justes} ${V.justes > 1 ? "types justes" : "type juste"} sur ${V.total}${V.proches ? `, ${V.proches} ${plural(V.proches, "proche")}` : ""} · ${String(V.secondes).replace(".", ",")} s par document${V.date ? ` · mesuré le ${frd(V.date)}` : ""}<div class="sub">${esc(V.phrase || "")}</div></div>` : ""}
    ${run && run.items && run.items.length ? `<table class="btab"><thead><tr><th>Document</th><th>Type</th><th>Date</th><th>Organisme</th><th>Temps</th></tr></thead><tbody>
      ${run.items.map((i) => `<tr><td><button class="linkbtn" style="padding:0;text-align:left" data-doc="${i.doc_id}">${esc(i.label)}</button></td>${i.erreur ? `<td colspan="3"><span class="sub">pas de réponse (${esc(i.erreur)})</span></td>` : `<td>${bcell(i.type)}</td><td>${bcell(i.date)}</td><td>${bcell(i.emitter)}</td>`}<td class="sub">${String(i.secs || 0).replace(".", ",")} s</td></tr>`).join("")}</tbody></table>` : ""}
    <div class="acts" style="margin-top:12px">${going ? `<button class="ghost small" data-act="banc-stop">Arrêter</button>` : `<button class="cta small" data-act="banc-go" ${C.running && C.model ? "" : "disabled"}>${V ? "Refaire le banc d'essai" : "Lancer le banc d'essai"}${C.model ? ` · ${esc(C.model)}` : ""}</button>`}</div></div>`;
}
function iaGuide(C) {
  const s = C.st.settings, b = (s.ai_banc || {})[C.model];
  const d1 = C.running, d2 = !!C.model, d3 = !!b, d4 = !!(s.use_ollama && s.ollama_model);
  const cur = !d1 ? 1 : !d2 ? 2 : !d3 ? 3 : !d4 ? 4 : 0;
  const NV = { modeste: "Modeste", equilibre: "Équilibré", puissant: "Puissant" };
  return `<div class="label" style="margin:0 0 8px">Mettre l'IA locale en route, pas à pas</div>
  <div class="card box ikguide">
    <p class="sub" style="margin-top:0">Ton ordinateur : ${esc(C.M.puce || "")} · ${C.M.ram_go || "?"} Go de mémoire → niveau <b style="color:var(--text)">${NV[C.M.niveau] || "?"}</b>. Modèle conseillé : <b style="color:var(--text)">${esc(C.rec.nom || "")}</b> (${esc(C.rec.auteur || "")}, ${String(C.rec.taille_go || "").replace(".", ",")} Go).</p>
    ${gstep(1, d1, cur === 1, "Installer un moteur d'IA sur ton ordinateur", `<span class="sub">Le plus simple : <b>Ollama</b>, gratuit. Télécharge-le, ouvre-le une fois (une petite icône apparaît dans la barre des menus), puis reviens ici.</span>
      <div class="acts"><button class="cta small" data-ext="https://ollama.com/download">Télécharger Ollama ↗</button><button class="ghost small" data-act="ia-refresh">C'est fait : détecter</button></div>`)}
    ${gstep(2, d2, cur === 2, `Installer ${esc(C.rec.nom || "le modèle conseillé")}`, `<span class="sub">${String(C.rec.taille_go || "").replace(".", ",")} Go à télécharger, une seule fois. Noté dans ton journal des sorties ; aucun document ne sort.</span>
      <div class="acts">${C.rec.id ? `<button class="cta small" data-act="ia-get" data-m="${esc(C.rec.id)}">Installer</button>` : ""}</div>`)}
    ${gstep(3, d3, cur === 3, "Le mettre à l'épreuve sur tes papiers", `<span class="sub">Le banc d'essai ci-dessous dit, avec tes vrais documents, s'il est fiable sur cet ordinateur.</span>`)}
    ${gstep(4, d4, cur === 4, "L'activer", `<span class="sub">Il ne donnera son avis que sur les papiers dont Bon toutou n'est pas sûr. Chaque réponse est vérifiée, et toi tu valides.</span>
      <div class="acts">${C.model ? `<button class="cta small" data-act="ia-use" data-m="${esc(C.model)}">Activer ${esc(C.model)}</button>` : ""}</div>`)}
  </div>`;
}
if (window.iaSection) {
  const iaSectionB = iaSection;
  window.iaSection = iaSection = function () {
    const C = iaCtx();
    if (!S.banc && !S.bancAsked) { S.bancAsked = true; api("/api/ia/banc").then((r) => { S.banc = r; render(); }); }
    return `<div class="label">IA locale (optionnelle)</div>${iaGuide(C)}${bancCard(C)}<div style="margin-top:22px"></div>${iaSectionB()}`;
  };
}

/* ---------------------------------------------------------------- liaisons */
(function () {
  const prevBind = window.bindExtra;
  window.bindExtra = function () {
    if (prevBind) prevBind();
    clearTimeout(S.bancPoll);
    const R = S.banc && S.banc.runs ? Object.values(S.banc.runs) : [];
    if (S.v === "reglages" && S.sv === "ia" && R.some((r) => r.status === "en cours"))
      S.bancPoll = setTimeout(async () => { S.banc = await api("/api/ia/banc"); if (!Object.values(S.banc.runs || {}).some((r) => r.status === "en cours")) await load(); else render(); }, 3000);
  };
})();
window.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act === "banc-go") { e.stopImmediatePropagation();
    const C = iaCtx(); const r = await api("/api/ia/banc", { engine: C.eng.id, model: C.model, n: 6 });
    if (!r.ok) return toast(r.msg || "Banc d'essai impossible");
    S.banc = await api("/api/ia/banc"); return render(); }
  if (act === "banc-stop") { e.stopImmediatePropagation(); await api("/api/ia/banc/stop", { model: iaCtx().model }); toast("Le banc d'essai s'arrête après le document en cours"); return; }
}, true);
