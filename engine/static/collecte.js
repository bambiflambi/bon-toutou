/* Bon toutou — v0.11 « Aller chercher » : la tournée des sites officiels.
   Tu te connectes (ton gestionnaire de mots de passe remplit), tu cliques sur « Télécharger » ;
   Bon toutou ouvre la bonne page, te dit où cliquer, regarde Téléchargements PENDANT la tournée seulement,
   et copie chaque nouveau fichier dans Trier, reconnu. Tes mots de passe ne passent jamais par lui. */

if (!PLUS.find((x) => x[0] === "tournee")) PLUS.splice(0, 0, ["tournee", "Aller chercher", "globe"]);
S.col = S.col || null;

async function colLoad() { S.col = await api("/api/carte"); render(); }
const CH = { manquant: ["warn", "à aller chercher"], renouveler: ["warn", "à renouveler"], ok: ["ok", "à jour"], couvert: ["neutral", "couvert"] };
const CANAL = {
  telecharger: ["Télécharger sur les sites", "Tu te connectes et tu télécharges : je reconnais le fichier et je le range."],
  demander: ["À demander", "Il y a un délai (rendez-vous, courrier, traitement) : fais la demande à temps, je la suis jusqu'à la réception."],
  mail: ["Par mail", "Une fois réglé dans ton espace client, ça arrive tout seul à ton adresse admin."],
  produire: ["À produire toi-même", "C'est toi qui les fais : dépose-les dans Trier quand ils sont prêts."],
  garder: ["Délivrés une fois", "Rien à renouveler : il suffit de les avoir dans ton bureau."] };
const todo = (x) => x.state === "manquant" || x.state === "renouveler";
function colRow(x, got, openId) {
  const rec = got.find((g) => g.type === x.type);
  const chip = rec ? `<span class="pill ok">reçu ✓</span>` : `<span class="pill ${CH[x.state][0]}">${CH[x.state][1]}</span>`;
  const key = x.canal + ":" + x.type, open = S.colOpen === undefined ? key === openId : S.colOpen === key;
  const steps = x.chemin || [`Connecte-toi à ${x.guichet_label}.`, `Cherche « ${x.label} » dans tes documents ou attestations.`, "Télécharge-le : je le reconnais et je le range."];
  let body = "";
  if (x.canal === "telecharger") body = `<ol class="obsteps">${steps.map((y) => `<li><span>${esc(y)}</span></li>`).join("")}</ol>${x.quand ? `<p class="sub">${esc(x.quand)}</p>` : ""}
    <div class="acts">${x.url ? `<button class="cta" data-act="col-go" data-url="${esc(x.url)}">Ouvrir ${esc(x.guichet_label)} ↗</button>` : `<button class="cta" data-act="col-watch">Je suis prêt : regarde mes téléchargements</button>`}</div>`;
  else if (x.canal === "demander") body = `<p>${x.note ? esc(x.note) + " " : ""}Compte environ <b>${x.delai} jour${x.delai > 1 ? "s" : ""}</b>.</p>
    <div class="acts">${x.url ? `<button class="ghost" data-act="col-ext" data-url="${esc(x.url)}">Ouvrir ${esc(x.guichet_label)} ↗</button>` : ""}<button class="cta" data-act="col-dem" data-t="${esc(x.type)}">J'ai fait la demande</button></div>`;
  else if (x.canal === "mail") body = `<p>${esc(x.comment || `Dans ton espace client chez ${x.guichet_label.replace(/^(Ton|Ta|Tes) /, "")}, choisis l'envoi par e-mail vers ton adresse admin.`)}</p>
    <div class="acts">${S.st.settings.mail_saved ? `<button class="ghost small" data-go="trier">Relever mon adresse</button>` : `<button class="cta small" data-go="reglages" data-sv="mail">Relier mon adresse admin</button>`}</div>`;
  else body = `<p>${x.canal === "produire" ? "Quand tu l'as, dépose-le dans Trier : je le reconnais." : "Si tu l'as quelque part (papier, mail, ordinateur), dépose-le une fois dans Trier."}</p><div class="acts"><button class="ghost small" data-go="trier">Ouvrir Trier</button></div>`;
  return `<div class="colrow${todo(x) && !rec ? "" : " done"}${open ? " open" : ""}">
    <button class="colhead" data-act="col-open" data-k="${esc(key)}" aria-expanded="${open}">
      <span class="grow"><b>${esc(x.label)}</b><small>${esc(x.guichet_label)} · ${esc(rec ? `${rec.name} est arrivé dans Trier` : x.msg)}</small></span>
      <span class="coln" title="${esc(x.situations.join(", "))}">${x.n} situation${x.n > 1 ? "s" : ""}</span>${chip}<span class="chev">${open ? "▴" : "▾"}</span></button>
    ${open ? `<div class="colbody">${body}${x.doc_id ? `<button class="linkbtn" data-doc="${esc(x.doc_id)}">voir celui que j'ai</button>` : ""}<p class="sub">Demandé pour : ${esc(x.situations.join(" · "))}${x.n > x.situations.length ? "…" : ""}</p></div>` : ""}</div>`;
}
function colSection(c, L, got, openId) {
  if (!L || !L.length) return "";
  const T = L.filter((x) => todo(x) && !got.some((g) => g.type === x.type)), D = L.filter((x) => !T.includes(x));
  const show = S.colAll && S.colAll[c];
  return `<div class="colsec" id="sec-${c}"><div class="colsh"><div><b>${CANAL[c][0]}</b> <span class="pill ${T.length ? "warn" : "ok"}">${T.length ? T.length + " à faire" : "rien à faire"}</span><div class="sub">${CANAL[c][1]}</div></div></div>
    <div class="card">${T.map((x) => colRow(x, got, openId)).join("")}
      ${D.length ? (show ? D.map((x) => colRow(x, got, openId)).join("") : "") + `<button class="colmore" data-act="col-all" data-c="${c}">${show ? "Masquer" : `Voir aussi les ${D.length} à jour ou couverts`}</button>` : ""}</div></div>`;
}
function coursHTML(C) {
  if (!C.cours.length) return "";
  return `<div class="colsec"><div class="colsh"><div><b>Demandes en cours</b> <span class="pill acc">${C.cours.length}</span><div class="sub">Ce que tu as déjà demandé : je te dis quand l'attendre, et je le reconnais quand il arrive.</div></div></div>
    <div class="card">${C.cours.map((d) => `<div class="row"><span class="oi">${IC.clock}</span><div class="grow"><b>${esc(d.label)}</b><div class="sub">${esc(d.guichet_label)} · demandé le ${frd(d.date)}${d.recu ? " · reçu ✓" : d.prevu ? ` · à attendre vers le ${frd(d.prevu)}` : ""}</div></div>
      ${d.recu ? `${d.doc_id ? `<button class="linkbtn" data-doc="${esc(d.doc_id)}">voir</button>` : ""}<button class="ghost small" data-act="col-dem-done" data-t="${esc(d.type)}">Terminer le suivi</button>`
        : `${d.url ? `<button class="linkbtn" data-act="col-ext" data-url="${esc(d.url)}">suivre sur le site ↗</button>` : ""}<button class="linkbtn" data-act="col-dem-cancel" data-t="${esc(d.type)}">annuler</button>`}</div>`).join("")}</div></div>`;
}
function tourneeView() {
  const C = S.col, T = S.tour || { got: [] };
  if (!C) { colLoad(); return `<h1>Aller chercher</h1><div class="card busy"><span class="spin"></span>Lecture…</div>`; }
  const got = T.got || [], added = got.filter((g) => g.status === "ajoute"), K = C.canaux;
  const watching = C.tour || T.active;
  const first = ["telecharger", "demander", "mail", "produire", "garder"].map((c) => (K[c] || []).find((x) => todo(x) && !got.some((g) => g.type === x.type)) && c).find(Boolean);
  const firstX = first && K[first].find((x) => todo(x) && !got.some((g) => g.type === x.type));
  const openId = firstX ? first + ":" + firstX.type : null;
  const cnt = (c) => (K[c] || []).filter(todo).length;
  return `<div class="thead"><h1>Aller chercher tes papiers</h1></div>
    <p class="lead">Toutes les pièces que demandent les situations de la vie, réunies par guichet. Tu te connectes, je fais le reste. <b>Tes mots de passe ne passent jamais par Bon toutou.</b></p>
    <div class="colsum">${["telecharger", "demander", "mail", "produire", "garder"].map((c) => `<button class="colsumi${cnt(c) ? " warn" : ""}" data-act="col-jump" data-c="${c}"><b>${cnt(c)}</b><span>${CANAL[c][0]}</span></button>`).join("")}
      ${C.cours.length ? `<button class="colsumi" data-act="col-jump" data-c="cours"><b>${C.cours.length}</b><span>Demandes en cours</span></button>` : ""}</div>
    <div class="card box colbar${watching ? " on" : ""}">
      ${watching ? `<span class="pulse" aria-hidden="true"></span><div class="grow"><b>Je regarde ton dossier Téléchargements</b><div class="sub">Seulement les nouveaux fichiers, jusqu'à « Terminer ». Ils sont copiés : rien n'est déplacé ni supprimé.</div></div>
        <button class="cta" data-act="col-stop">Terminer${added.length ? ` · ${added.length} ${plural(added.length, "papier")}` : ""}</button>`
      : `<span class="oi">${IC.inbox}</span><div class="grow"><b>${C.due ? `${C.due} ${plural(C.due, "papier")} à télécharger · environ ${C.minutes} min` : "Rien à télécharger pour l'instant"}</b><div class="sub">Pendant la tournée, je regarde seulement les nouveaux fichiers de ton dossier Téléchargements${C.downloads ? "" : " (introuvable sur cet ordinateur)"}.</div></div>
        ${C.downloads ? `<button class="cta" data-act="col-start">Commencer la tournée</button>` : ""}`}
    </div>
    ${got.length ? `<div class="card colgot">${got.map((g) => `<div class="row"><span class="oi" style="background:var(--success-light);color:var(--success)">${IC.check}</span><div class="grow"><b class="mlname">${esc(g.name)}</b><div class="sub">${g.status === "ajoute" ? `dans Trier${g.label ? ` · reconnu : ${esc(g.label)}` : ""}` : g.status === "deja_trier" ? "déjà dans Trier" : "déjà rangé dans ton bureau"}</div></div></div>`).join("")}</div>` : ""}
    ${colSection("telecharger", K.telecharger, got, openId)}
    ${colSection("demander", K.demander, got, openId)}
    <div id="sec-cours">${coursHTML(C)}</div>
    ${colSection("mail", K.mail, got, openId)}
    ${colSection("produire", K.produire, got, openId)}
    ${colSection("garder", K.garder, got, openId)}
    <details class="why" style="margin-top:16px"><summary>Quels papiers de la banque garder ?</summary><ul>${C.banque.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>`;
}
const renderC = render;
render = function () {
  if (S.v !== "tournee") return renderC();
  navTrack(); topbar();
  $("#app").innerHTML = tourneeView();
  $("#modal").innerHTML = S.modal && window.modalView ? modalView() : "";
  bind(); if (window.bindExtra) bindExtra();
  clearTimeout(S.tourPoll);
  if (S.tour && S.tour.active) S.tourPoll = setTimeout(tourPoll, 2500);
};
async function tourPoll() {
  if (S.v !== "tournee" || !S.tour || !S.tour.active) return;
  const r = await api("/api/tour/poll", {});
  const before = (S.tour.got || []).length;
  S.tour = { active: r.active, got: r.got || [] };
  if (r.got && r.got.length > before) { S.colOpen = undefined; const g = r.got[r.got.length - 1]; toast(`${g.name} → ${g.status === "ajoute" ? "Trier" : "déjà là"}${g.label ? ` · ${g.label}` : ""}`); }
  render();
}
async function tourStart() {
  const r = await api("/api/tour/start", {});
  if (!r.ok) { toast(r.msg || "Impossible"); return false; }
  S.tour = { active: true, got: [] }; S.col.tour = true; render(); return true;
}
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (!act.startsWith("col-")) return;
  e.stopImmediatePropagation();
  if (act === "col-open") { S.colOpen = S.colOpen === a.dataset.k ? null : a.dataset.k; return render(); }
  if (act === "col-all") { S.colAll = S.colAll || {}; S.colAll[a.dataset.c] = !S.colAll[a.dataset.c]; return render(); }
  if (act === "col-jump") { const el = document.getElementById("sec-" + a.dataset.c); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (act === "col-ext") return openExternal(a.dataset.url);
  if (act === "col-dem" || act === "col-dem-cancel" || act === "col-dem-done") {
    await api("/api/demande", { type: a.dataset.t, action: act === "col-dem" ? "add" : "cancel" });
    S.colOpen = undefined; await colLoad();
    return toast(act === "col-dem" ? "Noté : suivi dans « Demandes en cours »" : act === "col-dem-done" ? "Suivi terminé" : "Demande annulée");
  }
  if (act === "col-start" || act === "col-watch") { if (!(S.tour && S.tour.active)) await tourStart(); return; }
  if (act === "col-go") { if (!(S.tour && S.tour.active)) await tourStart(); return openExternal(a.dataset.url); }
  if (act === "col-stop") {
    clearTimeout(S.tourPoll);
    await api("/api/tour/poll", {});
    const r = await api("/api/tour/stop", {});
    S.tour = null; S.col = null; S.colDue = undefined; await load();
    if (r.added) { toast(`${r.added} ${plural(r.added, "papier arrivé", "papiers arrivés")} dans Trier : à ranger`); return go("trier"); }
    return toast("Tournée terminée");
  }
}, true);
// en quittant la page, la tournée s'arrête : Bon toutou ne regarde Téléchargements que quand tu le vois faire
const goC = go;
go = function (v, extra) {
  if (S.v === "tournee" && v !== "tournee" && S.tour && S.tour.active) { clearTimeout(S.tourPoll); api("/api/tour/poll", {}).then(() => api("/api/tour/stop", {})); S.tour = null; }
  if (v === "tournee") S.col = null;
  return goC(v, extra);
};

/* Aujourd'hui : une entrée « Aller chercher » quand des papiers sont à récupérer */
const homeViewC = homeView;
homeView = function () {
  const h = homeViewC();
  const n = S.colDue;
  if (S.colDue === undefined) { S.colDue = null; api("/api/carte").then((r) => { S.colDue = r.due + r.a_demander; S.colMin = r.minutes; S.colDem = r.a_demander; if (S.v === "home") render(); }); }
  if (!n) return h;
  const item = `<button class="titem" data-go="tournee"><span class="oi">${IC.globe}</span><div class="grow"><b><span class="vb">Aller chercher</span> ${n} ${plural(n, "papier")}</b><small>${n - S.colDem ? `${n - S.colDem} à télécharger (environ ${S.colMin} min)` : ""}${n - S.colDem && S.colDem ? " · " : ""}${S.colDem ? `${S.colDem} à demander` : ""}</small></div><span class="go">›</span></button>`;
  const h2 = h.replace(/<h1>([^<]*?)(\d+) petites? choses? aujourd'hui<\/h1>/, (m, pre, k) => { const t = +k + 1; return `<h1>${pre}${t} petite${t > 1 ? "s" : ""} chose${t > 1 ? "s" : ""} aujourd'hui</h1>`; })
    .replace(/<h1>Tout est à jour(, [^<]*)?<\/h1>/, (m, who) => `<h1>${who ? who.slice(2) + ", " : ""}1 petite chose aujourd'hui</h1>`);
  return h2.replace('<div class="today">', `<div class="today">${item}`);
};
