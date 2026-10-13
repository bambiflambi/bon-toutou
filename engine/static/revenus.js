/* Bon toutou — v0.8.3 : dossier « Revenus locatifs » d'un bien pour une année.
   Bon toutou va chercher dans le dossier du bien (Biens loués et Patrimoine) les recettes (quittances émises), les charges
   (copropriété, énergie, assurance propriétaire, taxe foncière, travaux, gestion), le financement (prêt, assurance emprunteur)
   et la comptabilité de l'année d'avant. Les montants sont lus dans chaque pièce : tu les vérifies, tu corriges, puis le dossier
   est créé dans Démarches avec un récapitulatif (recapitulatif.csv, ouvrable dans Excel ou Numbers). Tes originaux ne bougent pas. */
S.rl = S.rl || { bien: "", year: "", data: null, amounts: {}, built: null };
const eur = (v) => (v == null || v === "" || isNaN(v) ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €");
function rlTotal(sec) { return sec.docs.reduce((a, d) => a + (Number(S.rl.amounts[d.id] ?? d.amount) || 0), 0); }
function rentalCard() {
  const B = S.biens || [];
  if (!B.length) return "";
  const R = S.rl, cur = B.find((b) => b.bien === R.bien) || B[0];
  if (!R.bien) R.bien = cur.bien;
  const years = cur.years || [];
  if (!R.year || !years.includes(R.year)) R.year = years[0] || "";
  const nice = (b) => String(b).replace(/^\d{4} /, "");
  let body = "";
  if (R.data && R.data.bien === R.bien && R.data.year === R.year) {
    const S2 = R.data.sections.filter((x) => x.docs.length);
    const rec = S2.find((x) => x.key === "recettes"), ch = S2.find((x) => x.key === "charges");
    body = S2.map((sec) => `<div class="label" style="margin:14px 0 6px">${esc(sec.label)} · ${sec.docs.length}${sec.total != null ? ` · <b>${eur(rlTotal(sec))}</b>` : ""}</div>
      <div class="card">${sec.docs.map((d) => `<div class="row"><div class="grow"><b>${esc(d.label)}</b><div class="sub">${frd(d.date)}${d.emitter && d.emitter !== "Inconnu" ? " · " + esc(d.emitter) : ""}${d.why ? " · " + esc(d.why) : ""}</div></div>
        ${["recettes", "charges", "financement"].includes(sec.key) ? `<input class="field rlamt" type="number" step="0.01" min="0" data-rl-amt="${d.id}" value="${S.rl.amounts[d.id] ?? (d.amount ?? "")}" placeholder="montant" aria-label="Montant en euros" style="width:120px;text-align:right">` : ""}
        <button class="linkbtn" data-open="${esc(d.path)}">ouvrir</button></div>`).join("")}</div>`).join("")
      + `<div class="card box" style="margin-top:14px"><div class="grow"><b>Recettes ${eur(rec ? rlTotal(rec) : 0)} · Charges ${eur(ch ? rlTotal(ch) : 0)} · Différence ${eur((rec ? rlTotal(rec) : 0) - (ch ? rlTotal(ch) : 0))}</b>
        <div class="sub">Montants lus dans chaque pièce : vérifie-les, corrige si besoin. Le financement (intérêts, assurance emprunteur) se lit dans le tableau d'amortissement. Ce n'est pas un conseil fiscal : c'est ton dossier, prêt pour toi ou ton comptable.</div></div>
        <button class="cta small" data-act="rl-build">Créer le dossier</button></div>`
      + (R.built ? `<div class="hint" style="margin-top:10px">Dossier créé (${R.built.n} pièces copiées, originaux à leur place) · <button class="linkbtn" style="padding:0" data-act="reveal" data-p="${esc(R.built.folder)}">Montrer dans le Finder</button> · <button class="linkbtn" style="padding:0" data-open="${esc(R.built.csv)}">ouvrir le récapitulatif</button></div>` : "");
  }
  return `<div class="label" style="margin:26px 0 8px">Revenus locatifs d'un bien</div>
  <div class="card box rlbox"><span class="oi">${IC.house}</span><div class="grow"><b>Préparer la déclaration d'une année</b>
    <div class="sub">Recettes, charges, financement et comptabilité, pris dans le dossier du bien.</div>
    <div class="acts" style="margin-top:10px;flex-wrap:wrap">
      <select class="field small" id="rl_bien" aria-label="Bien">${B.map((b) => `<option value="${esc(b.bien)}" ${b.bien === R.bien ? "selected" : ""}>${esc(nice(b.bien))}</option>`).join("")}</select>
      <select class="field small" id="rl_year" aria-label="Année">${years.map((y) => `<option ${y === R.year ? "selected" : ""}>${y}</option>`).join("")}</select>
      <button class="ghost small" data-act="rl-show">Voir les pièces</button></div>
    ${body}</div></div>`;
}
const dossiersRL = dossiers;
dossiers = function () { return dossiersRL() + rentalCard(); };
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "rl_bien") { S.rl.bien = t.value; S.rl.year = ""; S.rl.data = null; S.rl.built = null; return render(); }
  if (t.id === "rl_year") { S.rl.year = t.value; S.rl.data = null; S.rl.built = null; return render(); }
  if (t.dataset && t.dataset.rlAmt) { S.rl.amounts[t.dataset.rlAmt] = t.value === "" ? "" : Number(t.value); S.rl.built = null; return render(); }
});
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  if (a.dataset.act === "rl-show") {
    e.stopImmediatePropagation(); S.busy = ""; S.rl.data = await api("/api/rental", { bien: S.rl.bien, year: S.rl.year }); S.rl.amounts = {}; S.rl.built = null; return render();
  }
  if (a.dataset.act === "rl-build") {
    e.stopImmediatePropagation(); a.disabled = true;
    const am = {}; Object.entries(S.rl.amounts).forEach(([k, v]) => { if (v !== "" && v != null) am[k] = Number(v); });
    const r = await api("/api/rental/build", { bien: S.rl.bien, year: S.rl.year, amounts: am });
    if (!r.ok) { a.disabled = false; return toast(r.msg || "Dossier non créé"); }
    S.rl.built = r; render(); toast(`Dossier « Revenus locatifs ${S.rl.year} » créé dans Démarches`);
  }
}, true);
