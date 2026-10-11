/* Bon toutou — v0.7.5 : valider un plan de rangement par groupes.
   Un plan (préparé à ta demande, par exemple par Claude) pré-remplit les documents de Trier sans rien ranger.
   Ici, les documents sont regroupés par dossier de destination : tu vérifies un groupe, tu décoches les exceptions,
   tu ranges le groupe d'un clic (un seul « Annuler »). Une exception se corrige en cartes. */
S.gsel = S.gsel || {};      // id -> false si décoché
S.gopen = S.gopen || new Set();
const trierCartes = trier;
const modeSwitchBase = modeSwitch;
modeSwitch = function () {
  return modeSwitchBase().replace('<button class="', `<button class="${S.tmode === "groupes" ? "on" : ""}" data-act="tmode" data-m="groupes" role="tab" aria-selected="${S.tmode === "groupes"}">Groupes</button><button class="`);
};
const queueBase = queue;
queue = function () {   // « Corriger » depuis un groupe : ce document passe en premier dans les cartes
  const Q = queueBase();
  if (S.focusId) { const i = Q.findIndex((p) => p.id === S.focusId); if (i > 0) Q.unshift(Q.splice(i, 1)[0]); if (i < 0) S.focusId = null; }
  return Q;
};
function gPath(p) {
  const T = S.st.types[p.type] || {}, seg = String(p.dest || "").split("/");
  const arch = seg.includes("99_ARCHIVES"), rest = seg.slice(seg.findIndex((x) => /^\d{2}-\d_/.test(x)) + 1).filter(Boolean);
  return [...(arch ? ["Archives"] : []), catName(T.cat), subName(T.sub), ...rest.map((x) => x.replace(/[-_]+/g, " "))];
}
function planBar() {
  const P = (S.plans || []).filter((x) => x.match > 0);
  if (!P.length) return "";
  return P.map((x) => `<div class="card box planbar"><span class="oi">${IC.sparkles}</span><div class="grow"><b>Plan de rangement préparé par ${esc(x.source)}</b>
    <div class="sub">${x.match} ${plural(x.match, "document")} de Trier concernés. Appliquer le plan pré-remplit les documents (rien n'est rangé) : tu valides ensuite chaque groupe.${x.applied ? " · déjà appliqué" : ""}</div></div>
    <button class="${x.applied ? "ghost" : "cta"} small" data-act="plan-apply" data-f="${esc(x.file)}">${x.applied ? "Réappliquer" : "Appliquer le plan"}</button></div>`).join("");
}
function groupView() {
  const P = S.inbox || [];
  const withPlan = P.filter((p) => p.plan || (p.usage && (p.set || []).includes("type")));
  const rest = P.filter((p) => !withPlan.includes(p));
  const G = {};
  withPlan.forEach((p) => { const k = (S.st.countries[p.country] || p.country) + " › " + gPath(p).join(" › ") + "|" + (p.usage || ""); (G[k] = G[k] || []).push(p); });
  const keys = Object.keys(G).sort((a, b) => G[b].length - G[a].length || a.localeCompare(b));
  const card = (k) => {
    const L = G[k], [path, usage] = k.split("|"), open = S.gopen.has(k), sel = L.filter((p) => S.gsel[p.id] !== false);
    const shown = open ? L : L.slice(0, 6);
    return `<div class="card gcard"><div class="ghead"><span class="oi">${IC.folder}</span><div class="grow"><b>${esc(path)}</b>
        <div class="sub">${L.length} ${plural(L.length, "document")}${usage ? ` · ${usage === "archive" ? "Archives" : "Utile aujourd'hui"}` : ""}</div></div>
        <button class="cta small" data-act="g-ok" data-k="${esc(k)}" ${sel.length ? "" : "disabled"}>Ranger ${sel.length === L.length ? "le groupe" : sel.length}</button></div>
      ${shown.map((p) => `<div class="grow-row"><input type="checkbox" data-gsel="${p.id}" ${S.gsel[p.id] !== false ? "checked" : ""} aria-label="Garder dans le groupe">
        <div class="grow"><div class="fname">${esc(p.name)}</div><div class="sub">${frd(p.date)} · reçu : ${esc(p.origin || p.orig)}${p.plan_note ? ` · <i>${esc(p.plan_note)}</i>` : ""}</div></div>
        <button class="linkbtn" data-open-inbox="${p.id}">Aperçu</button><button class="linkbtn" data-act="g-fix" data-id="${p.id}">Corriger</button></div>`).join("")}
      ${L.length > 6 ? `<button class="linkbtn gmore" data-act="g-more" data-k="${esc(k)}">${open ? "Réduire" : `Voir les ${L.length} documents`}</button>` : ""}</div>`;
  };
  return `${modeSwitch()}
    <p class="lead">${P.length} ${plural(P.length, "document")} à trier. Vérifie un groupe, décoche les exceptions, range-le d'un clic. Une exception se corrige en cartes.</p>
    ${planBar()}
    ${keys.map(card).join("")}
    ${rest.length ? `<div class="card box"><span class="oi">${IC.search}</span><div class="grow"><b>${rest.length} ${plural(rest.length, "document")} sans proposition</b><div class="sub">À trier en cartes, un par un.</div></div><button class="ghost small" data-act="tmode" data-m="cartes">Les trier en cartes</button></div>` : ""}
    ${!P.length ? `<div class="card" style="padding:28px;text-align:center"><b>Tout est trié.</b></div>` : ""}`;
}
trier = function () { return S.tmode === "groupes" ? groupView() : trierCartes(); };
document.addEventListener("change", (e) => { const c = e.target.closest && e.target.closest("[data-gsel]"); if (c) { S.gsel[c.dataset.gsel] = c.checked; render(); } });
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act === "plan-apply") {
    e.stopImmediatePropagation(); S.busy = "Application du plan…"; render();
    const r = await api("/api/plan/apply", { file: a.dataset.f }); S.busy = ""; S.tmode = "groupes"; await load();
    return toast(r.ok ? `${r.n} ${plural(r.n, "document pré-rempli", "documents pré-remplis")} · rien n'est encore rangé` : (r.msg || "Plan non appliqué"));
  }
  if (act === "g-more") { e.stopImmediatePropagation(); const k = a.dataset.k; S.gopen.has(k) ? S.gopen.delete(k) : S.gopen.add(k); return render(); }
  if (act === "g-fix") { e.stopImmediatePropagation(); S.focusId = a.dataset.id; S.tmode = "cartes"; S.et = {}; return render(); }
  if (act === "g-ok") {
    e.stopImmediatePropagation();
    const P = S.inbox || [], k = a.dataset.k;
    const ids = P.filter((p) => (p.plan || (p.usage && (p.set || []).includes("type"))) && ((S.st.countries[p.country] || p.country) + " › " + gPath(p).join(" › ") + "|" + (p.usage || "")) === k && S.gsel[p.id] !== false).map((p) => p.id);
    if (!ids.length) return;
    a.disabled = true;
    return cartesRange(ids, `${ids.length} ${plural(ids.length, "document rangé", "documents rangés")}`);
  }
}, true);
