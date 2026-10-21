/* Bon toutou — v0.10.5 « Trier sans friction » : écarter une pièce, Réglages › Pièces écartées (suppression définitive
   décidée par toi), relève de l'adresse admin directement dans Trier, Aujourd'hui en deux colonnes sur grand écran.
   Chargé en dernier. */

/* ---------------------------------------------------------------- écarter une pièce de Trier */
document.addEventListener("click", async (e) => {
  const a = e.target.closest('[data-act="c-discard"]'); if (!a) return;
  e.stopImmediatePropagation();
  const r = await api("/api/ignore", { id: a.dataset.id });
  if (!r || !r.ok) return toast("Pas pu l'écarter");
  S.lastBatch = r.batch; S.et = {}; await load();
  toast("Écartée : elle ne reviendra pas · Réglages › Pièces écartées", r.batch);
}, true);

/* ---------------------------------------------------------------- Réglages › Pièces écartées */
const mo = (n) => (n > 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " Mo" : Math.max(1, Math.round(n / 1024)) + " ko");
try {
  const G = REG.find((g) => g[0] === "Bon toutou");
  if (G && !G[1].find((x) => x[0] === "ecartes")) G[1].splice(1, 0, ["ecartes", "archive", "Pièces écartées", () => {
    const n = (S.st.counts || {}).ecartes || 0; return n ? `${n} ${plural(n, "pièce")} · tu peux les supprimer définitivement` : "Aucune pour l'instant"; }]);
} catch (z) {}
const reglagesViewF = reglagesView;
reglagesView = function () {
  if (S.sv !== "ecartes") return reglagesViewF();
  if (!S.ign) { api("/api/ignored").then((r) => { S.ign = r; render(); }); }
  const I = S.ign || { items: [], n: 0, bytes: 0 }, sel = S.ignSel || (S.ignSel = new Set());
  return `${setHead("archive", "Pièces écartées", "Les pièces que tu as écartées de Trier. Elles sont gardées dans 00_A-TRIER/_IGNORES et ne reviennent jamais, même si tu les réimportes. Tu peux les remettre dans Trier, ou les supprimer pour de bon.")}
    ${!S.ign ? `<div class="card busy"><span class="spin"></span>Lecture…</div>` : !I.n ? `<div class="card" style="padding:18px">Aucune pièce écartée.</div>` : `
    <div class="card">${I.items.map((x) => `<label class="row" style="cursor:pointer"><input type="checkbox" data-ign="${esc(x.id)}" ${sel.has(x.id) ? "checked" : ""}>
      <div class="grow"><b class="mlname">${esc(x.name)}</b><div class="sub">${esc(x.source || "")} · écartée le ${frd(x.added)} · ${mo(x.size)}${x.present ? "" : " · fichier déjà absent"}</div></div></label>`).join("")}</div>
    <div class="mlbar"><span class="sub">${sel.size ? `${sel.size} ${plural(sel.size, "choisie")}` : `${I.n} ${plural(I.n, "pièce")} · ${mo(I.bytes)}`}</span>
      <span class="acts"><button class="ghost small" data-act="ign-back">Remettre dans Trier${sel.size ? ` (${sel.size})` : " (toutes)"}</button>
      <button class="cta small danger" data-act="ign-purge">Supprimer définitivement${sel.size ? ` (${sel.size})` : " (toutes)"}</button></span></div>`}`;
};
function purgeModal(m) {
  return `<h2 style="margin-top:0">Supprimer définitivement ?</h2>
    <p>${m.n} ${plural(m.n, "pièce écartée", "pièces écartées")} (${mo(m.bytes)}) ${m.n > 1 ? "seront effacées" : "sera effacée"} de ton ordinateur. <b>On ne pourra pas revenir en arrière.</b></p>
    <p class="sub">Seuls les fichiers de 00_A-TRIER/_IGNORES sont concernés : aucun document rangé, aucun original de ta boîte mail ou de tes dossiers. Elles ne reviendront pas si tu les réimportes.</p>
    <label class="chk" style="margin-top:10px"><input type="checkbox" id="purge_ok"> Oui, je veux les supprimer pour de bon</label>
    <div class="acts" style="margin-top:14px"><button class="cta danger" data-act="ign-purge-ok" disabled>Supprimer</button><button class="linkbtn" data-act="m-close">Annuler</button></div>`;
}
(function () {
  const prevModal = window.modalView;
  window.modalView = function () {
    if (S.modal && S.modal.kind === "purge") return `<div class="ov" data-act="m-close-bg"><div class="modal" role="dialog">${purgeModal(S.modal)}</div></div>`;
    return prevModal ? prevModal() : "";
  };
  const prevBind = window.bindExtra;
  window.bindExtra = function () {
    if (prevBind) prevBind();
    document.querySelectorAll("[data-ign]").forEach((el) => (el.onchange = () => { el.checked ? S.ignSel.add(el.dataset.ign) : S.ignSel.delete(el.dataset.ign); render(); }));
    const ok = $("#purge_ok"), b = document.querySelector('[data-act="ign-purge-ok"]'); if (ok && b) ok.onchange = () => (b.disabled = !ok.checked);
    if (S.v !== "reglages" || S.sv !== "ecartes") { S.ign = null; S.ignSel = null; }
  };
})();
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (!["ign-back", "ign-purge", "ign-purge-ok"].includes(act)) return;
  e.stopImmediatePropagation();
  const I = S.ign || { items: [] }, sel = S.ignSel || new Set(), ids = sel.size ? [...sel] : I.items.map((x) => x.id);
  if (act === "ign-back") { const r = await api("/api/ignored/back", { ids }); S.ign = null; S.ignSel = new Set(); await load(); return toast(`${r.n} ${plural(r.n, "pièce remise", "pièces remises")} dans Trier`, r.batch); }
  if (act === "ign-purge") { const L = I.items.filter((x) => ids.includes(x.id)); S.modal = { kind: "purge", ids, n: L.length, bytes: L.reduce((t, x) => t + x.size, 0) }; return render(); }
  if (act === "ign-purge-ok") { const m = S.modal; S.modal = null; const r = await api("/api/ignored/purge", { ids: m.ids, confirm: true }); S.ign = null; S.ignSel = new Set(); await load();
    return toast(r.ok ? `${r.n} ${plural(r.n, "pièce supprimée", "pièces supprimées")} définitivement · ${mo(r.bytes || 0)} libérés` : r.msg); }
}, true);

/* ---------------------------------------------------------------- Trier : relever l'adresse admin sur place */
const trierAddF = trierAdd;
trierAdd = function (P) {
  let h = trierAddF(P);
  const s = S.st.settings;
  if (s.mail_saved) h = h.replace(/<button class="ghost" data-go="reglages" data-sv="mail">([\s\S]*?)<\/button>/, `<button class="ghost${S.ml && S.ml.inTrier ? " on" : ""}" data-act="tr-mail">$1</button>`);
  return h + (S.ml && S.ml.inTrier ? trMailPanel() : "");
};
function trMailPanel() {
  const L = S.ml, M = S.mst || {};
  const body = L.busy ? `<div class="busy" style="padding:6px 0"><span class="spin"></span>${esc(L.busy)}</div>`
    : L.items ? mlGroups(L.items, L.sel || new Set())
    : M.address ? mlScanBar(M) : `<div class="sub">Lecture…</div>`;
  return `<div class="card box trmail"><div class="trmhead"><span class="oi">${IC.mail}</span><div class="grow"><b>Ton adresse admin</b><div class="sub">${esc(M.address || S.st.settings.mail || "")} · seuls les noms des pièces jointes sont lus, tes mails restent intacts</div></div>
    <button class="linkbtn" data-go="reglages" data-sv="mail">Réglages</button><button class="iconbtn" data-act="tr-mail-close" aria-label="Fermer">✕</button></div>
    ${L.msg ? `<div class="hint warn">${esc(L.msg)}</div>` : ""}${body}</div>`;
}
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act === "tr-mail-close") { e.stopImmediatePropagation(); S.ml.inTrier = false; S.ml.items = null; return render(); }
  if (act !== "tr-mail") return;
  e.stopImmediatePropagation();
  S.ml.inTrier = true; S.ml.items = null; S.ml.msg = ""; render();
  S.mst = await api("/api/mail/status", {});
  if (S.mst.since) return mlScan(null, false);   // déjà relevée : seulement les nouveautés
  render();                                          // première fois : choisir la période
}, true);
// après « Copier dans Trier » depuis Trier, on reste dans Trier avec le panneau fermé
const loadF = load;
load = async function () {
  await loadF();
  if (S.v !== "trier" && S.ml) S.ml.inTrier = false;
};

/* ---------------------------------------------------------------- Aujourd'hui : deux colonnes sur grand écran */
const homeViewF = homeView;
homeView = function () {
  const h = homeViewF();
  const a = h.indexOf('<div class="today">'), b = h.indexOf('<button class="calcard"');
  if (a < 0 || b < 0) return h;
  return `${h.slice(0, a)}<div class="homecols"><div class="hleft">${h.slice(a, b)}</div><div class="hright">${h.slice(b)}</div></div>`;
};
