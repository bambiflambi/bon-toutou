/* Bon toutou — v0.7.7 : la Revue des documents déjà rangés.
   Une revue (préparée par exemple par Claude après avoir vérifié tes papiers avec toi) dit, document par document, ce qui change
   et pourquoi : date, titulaire, statut, copies. Rien ne bouge avant « Appliquer » ; un seul « Annuler » remet tout. */
const FIELD_FR = { type: "type", country: "pays", emitter: "émetteur", date: "date", expiry: "expiration", person: "titulaire", detail: "intitulé", status: "statut", bien: "bien" };
const STATUS_FR = { actuel: "version actuelle", ancienne_version: "ancienne version", termine: "terminé (Archives)", copie: "copie" };
function revueVal(k, v) {
  if (k === "status") return STATUS_FR[v] || v;
  if (k === "date" || k === "expiry") return frd(v);
  if (k === "type") return (S.st.types[v] || {}).label || v;
  if (k === "person" && v === "moi") return "toi";
  return String(v).replace(/-/g, " ");
}
function revueCards() {
  const R = (S.revues || []).filter((r) => !r.applied && r.match > 0);
  return R.map((r) => {
    const open = S.rvOpen === r.file;
    return `<div class="card box revuebox"><span class="oi">${IC.sparkles}</span><div class="grow"><b>${esc(r.title)}</b>
      <div class="sub">${r.match} ${plural(r.match, "correction")} · préparé par ${esc(r.source)} · rien ne bouge avant « Appliquer », un seul « Annuler » pour tout.</div>
      ${open ? `<div class="rvlist">${r.profile && r.profile.owner ? `<div class="rvline"><b>Ton nom</b><div class="sub">titulaire de tes documents → <b>${esc(r.profile.owner)}</b>${(r.profile.owner_aliases || []).length ? ` · reconnu aussi : ${r.profile.owner_aliases.map(esc).join(", ")}` : ""}</div><div class="sub rvwhy">Toutes les écritures de ton nom (initiales, majuscules, prénoms complets) sont regroupées sous celle-ci, fichiers renommés.</div></div>` : ""}${(r.dossiers || []).map((z) => `<div class="rvline"><b>Dossier reconstitué : ${esc(z.label)}</b><div class="sub">${z.n} ${plural(z.n, "pièce")} regroupée${z.n > 1 ? "s" : ""} dans Archives › Dossiers envoyés${z.recipient ? ` · pour ${esc(z.recipient)}` : ""}${z.sent_at ? ` · ${frd(z.sent_at)}` : ""}</div>${z.note ? `<div class="sub rvwhy">${esc(z.note)}</div>` : ""}</div>`).join("")}${r.lines.map((l) => `<div class="rvline"><b>${esc(l.label)}</b><div class="sub">${Object.entries(l.to).map(([k, v]) => `${FIELD_FR[k] || k} → <b>${esc(revueVal(k, v))}</b>`).join(" · ")}</div>${l.why ? `<div class="sub rvwhy">${esc(l.why)}</div>` : ""}</div>`).join("")}</div>` : ""}
      <div class="acts" style="margin-top:8px"><button class="linkbtn" data-act="rv-open" data-f="${esc(r.file)}">${open ? "Masquer le détail" : "Voir le détail"}</button>
        <button class="cta small" data-act="rv-apply" data-f="${esc(r.file)}">Appliquer la revue</button></div></div></div>`;
  }).join("");
}
const docsRevue = docs;
docs = function () {
  const h = docsRevue(), c = revueCards();
  if (!c || S.q) return h;
  const i = h.indexOf('<div class="search">');
  return i < 0 ? c + h : h.slice(0, i) + c + h.slice(i);
};
/* Fiche : les copies rattachées, derrière « i ». */
const docViewRevue = docView;
docView = function () {
  let h = docViewRevue();
  const d = S.doc; if (!d || !S.info || !(d.copies || []).length) return h;
  const rows = d.copies.map((c) => `<dt>Copie</dt><dd class="fname">${esc(c.orig_name || c.path)} <button class="linkbtn" data-open="${esc(c.path)}">ouvrir</button></dd>`).join("");
  return h.replace(/(<div class="infobox"><dl class="kv">)/, `$1${rows}`);
};
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  if (a.dataset.act === "rv-open") { e.stopImmediatePropagation(); S.rvOpen = S.rvOpen === a.dataset.f ? null : a.dataset.f; return render(); }
  if (a.dataset.act === "rv-apply") {
    e.stopImmediatePropagation(); S.busy = "Application de la revue…"; render();
    const r = await api("/api/revue/apply", { file: a.dataset.f }); S.busy = ""; await load();
    return toast(r.ok ? `${r.n} ${plural(r.n, "correction appliquée", "corrections appliquées")}` : (r.msg || "Revue non appliquée"), r.ok ? r.batch : undefined);
  }
}, true);
