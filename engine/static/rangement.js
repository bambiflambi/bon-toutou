/* Bon toutou — v0.6 : Archives présentées comme Documents (catégorie › sous-dossier › employeur, une ligne par document suivi),
   et dans Documents : réparer un rangement fait avant la v0.5 à partir du dossier d'origine, ranger les anciens employeurs. */
const archivesOrig = archives;
S.openS = S.openS || new Set();

function suiviRows(X, kind) {
  const G = {};
  X.forEach((d) => { const k = d.suivi || d.id; (G[k] = G[k] || []).push(d); });
  return Object.values(G).sort((a, b) => (b[0].doc_date || "").localeCompare(a[0].doc_date || "")).map((L) => {
    L.sort((a, b) => (b.doc_date || "").localeCompare(a.doc_date || ""));
    const d = L[0], k = d.suivi || d.id, open = S.openS.has(k), n = L.length;
    const span = n > 1 ? `du ${frd(L[n - 1].doc_date)} au ${frd(d.doc_date)}` : frd(d.doc_date);
    const ended = L.some((x) => x.status === "termine");
    const what = n > 1 ? `${n} ${ended ? "documents" : "anciennes versions"} · ${span}` : (ended ? frd(d.doc_date) : `ancienne version du ${frd(d.doc_date)}`);
    const head = `<div class="row drow k-${esc(d.country)} arow" ${n > 1 ? `data-opens="${esc(k)}" role="button" tabindex="0" aria-expanded="${open}"` : `data-doc="${d.id}" role="button" tabindex="0"`} style="cursor:pointer">
      <span class="oi">${kind === "old" ? IC.archive : catIc(d.cat)}</span><div class="grow"><b>${esc(d.label)}</b> ${cc(d.country)}<div class="sub">${what}</div></div>
      ${L.some((x) => x.status === "termine") ? `<span class="pill neutral">situation finie</span>` : ""}<span class="chev">${n > 1 ? (open ? "▾" : "▸") : "›"}</span></div>`;
    const body = open ? `<div class="vlist">${L.map((v) => `<div class="row vrow" data-doc="${v.id}" role="button" tabindex="0" style="cursor:pointer"><span class="vdate">${frd(v.doc_date)}</span><span class="sub grow">${esc(v.label)}</span><button class="linkbtn" data-open="${esc(v.path)}">Ouvrir</button></div>`).join("")}</div>` : "";
    return head + body;
  }).join("");
}
function archSection(L, kind) {
  const ccs = [...new Set(L.map((d) => d.country))];
  return ccs.map((c) => {
    const D = L.filter((d) => d.country === c), cats = [...new Set(D.map((d) => d.cat))].sort();
    return `<div class="cframe k-${esc(c)}" style="margin-bottom:14px"><div class="cframe-h">${cc(c)}<b>${esc(S.st.countries[c] || c)}</b><span class="sub">${D.length} ${plural(D.length, "fichier")}</span></div>
      ${cats.map((cat) => { const X = D.filter((d) => d.cat === cat), subs = [...new Set(X.map((d) => d.sub_folder))].sort();
        return `<div class="catsec"><div class="cathead"><span class="oi">${catIc(cat)}</span><b>${cat} ${esc(S.st.categories[cat] || "")}</b><span class="n">${X.length}</span></div><div class="doclist">
          ${subs.map((sf) => { const Y = X.filter((d) => d.sub_folder === sf), E = [...new Set(Y.map((d) => d.emitter_folder || ""))].sort();
            return `<div class="subhead">${esc(String(sf || "").replace(/_/g, " ").replace(/-/g, " "))} · ${Y.length}</div>` + E.map((e) => { const Z = Y.filter((d) => (d.emitter_folder || "") === e);
              return (e ? `<div class="subhead" style="padding-left:34px;text-transform:none;letter-spacing:0">${IC.folder.replace("<svg", '<svg style="width:13px;height:13px;vertical-align:-2px"')} ${esc(e.replace(/-/g, " "))} · ${Z.length}</div>` : "") + suiviRows(Z, kind); }).join(""); }).join("")}</div></div>`; }).join("")}</div>`;
  }).join("");
}
archives = function () {
  if (S.at === "done") S.at = "old";   // « Terminés » est fusionné dans Anciennes versions (v0.6.1)
  if (!S.arch || S.at === "sent" || !S.at) return archivesOrig();
  const A = S.arch, q = S.q.toLowerCase(), m = (s) => !q || s.toLowerCase().includes(q);
  const old = [...A.old, ...A.done].filter((d) => m(d.label + d.path)), sent = A.sent.filter((e) => m(e.label + e.recipient));
  return `<h1>Archives</h1><p class="lead">Bon toutou ne détruit rien. Ce qui n'est plus valable ou déjà envoyé vit ici, dans le dossier <span class="fname">99_ARCHIVES</span> de chaque pays.</p>
  <div class="search">${IC.search}<input id="q" value="${esc(S.q)}" placeholder="Chercher dans les archives : ancien RIB, bail, avis d'impôt 2024…" aria-label="Chercher dans les archives"></div>
  <div class="axes">${[["sent", "Dossiers envoyés", sent.length], ["old", "Anciennes versions", old.length]].map((t) => `<button class="${S.at === t[0] ? "on" : ""}" data-at="${t[0]}">${t[1]} <span class="sub" style="color:inherit;opacity:.75">${t[2]}</span></button>`).join("")}</div>
  <p class="sub" style="margin:0 0 12px;max-width:72ch">Les versions remplacées et les papiers d'une situation finie (ancien employeur, bail terminé, véhicule vendu), rangés comme dans Documents. Touche un document pour voir toutes ses versions.</p>
  ${archSection(old, "old") || `<div class="card empty">${q ? "Aucun résultat." : "Aucune ancienne version."}</div>`}`;
};

/* ---- Documents : réparer depuis le dossier d'origine, ranger les anciens employeurs */
function repairCard() {
  const R = S.repair, oldJobs = (S.st.counts || {}).old_jobs || 0;
  const hasPay = (S.docs || []).some((d) => ["bulletin_paie", "solde_tout_compte", "contrat_travail", "attestation_employeur"].includes(d.type)) || (S.arch && S.arch.done && S.arch.done.length);
  let out = "";
  if (oldJobs) out += `<div class="card box suresbar"><span class="oi">${IC.work}</span><div class="grow"><b>${oldJobs} ${plural(oldJobs, "ancien employeur", "anciens employeurs")} encore dans Documents</b><div class="sub">Seul ton emploi actuel reste dans Documents. Les fiches des employeurs précédents passent dans Archives › Anciennes versions, chacune dans son dossier. Annulable.</div></div><button class="cta small" data-act="rep-tidy">Ranger dans Anciennes versions</button></div>`;
  if (R && R.busy) return out + `<div class="card busy"><span class="spin"></span>${esc(R.busy)}</div>`;
  if (R && R.items) {
    const sel = R.sel;
    out += `<div class="card repair"><div class="box"><b>${R.items.length ? `${R.items.length} ${plural(R.items.length, "document à corriger", "documents à corriger")}` : "Rien à corriger"}</b>
      <div class="sub">${R.files} ${plural(R.files, "fichier lu", "fichiers lus")} dans ton dossier d'origine (noms seulement, rien n'est recopié) · ${R.matched} ${plural(R.matched, "retrouvé", "retrouvés")} dans ton bureau.</div></div>
      ${R.items.map((x) => `<label class="row" style="cursor:pointer"><input type="checkbox" data-rsel="${x.id}" ${sel.has(x.id) ? "checked" : ""}><div class="grow"><b>${esc(x.label)}</b><div class="sub">${x.changes.map(esc).join(" · ")}</div><div class="fname sub">depuis « ${esc(x.origin)} »</div></div></label>`).join("")}
      <div class="bfoot"><span class="sub">Les fichiers sont renommés et rangés dans le dossier de leur employeur. Un seul « Annuler » pour tout.</span>
        <span class="acts"><button class="linkbtn" data-act="rep-cancel">Fermer</button>${R.items.length ? `<button class="cta small" data-act="rep-apply" ${sel.size ? "" : "disabled"}>Corriger ${sel.size}</button>` : ""}</span></div></div>`;
    return out;
  }
  if (hasPay) out += `<div class="card box suresbar"><span class="oi">${IC.folder}</span><div class="grow"><b>Fiches de paie mal rangées ?</b><div class="sub">Choisis le dossier où tu les gardais (par exemple Administration › Paye) : Bon toutou retrouve chaque fiche déjà rangée et lit l'employeur et le mois dans les noms de tes dossiers.</div></div>
    <span class="ghost small filebtn">${IC.folder} Réparer depuis mon dossier<input type="file" id="repairIn" webkitdirectory multiple aria-label="Choisir le dossier d'origine"></span></div>`;
  return out;
}
async function sha256File(f) {
  const buf = await f.arrayBuffer();
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function repairFrom(files) {
  const F = [...files].filter((f) => f && !f.name.startsWith(".") && /\.(pdf|jpe?g|png|heic|tiff?)$/i.test(f.name));
  if (!F.length) return toast("Aucun document dans ce dossier");
  S.repair = { busy: "" }; const items = [];
  for (let i = 0; i < F.length; i++) {
    if (i % 5 === 0) { S.repair.busy = `Reconnaissance des fichiers ${i + 1}/${F.length}…`; render(); }
    try { items.push({ sha: await sha256File(F[i]), rel: F[i].webkitRelativePath || F[i].name }); } catch (e) { /* illisible : ignoré */ }
  }
  const r = await api("/api/repair/preview", { items });
  S.repair = { files: r.files, matched: r.matched, items: r.items || [], sel: new Set((r.items || []).map((x) => x.id)) };
  render();
}
(function () {
  const prevBind = window.bindExtra;
  window.bindExtra = function () {
    if (prevBind) prevBind();
    const ri = $("#repairIn"); if (ri) ri.onchange = () => repairFrom(ri.files);
    document.querySelectorAll("[data-rsel]").forEach((el) => (el.onchange = () => { el.checked ? S.repair.sel.add(el.dataset.rsel) : S.repair.sel.delete(el.dataset.rsel); render(); }));
  };
})();
document.addEventListener("click", async (e) => {
  const os = e.target.closest("[data-opens]"); if (os && !e.target.closest("[data-open]")) { const k = os.dataset.opens; S.openS.has(k) ? S.openS.delete(k) : S.openS.add(k); return render(); }
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act === "rep-cancel") { S.repair = null; return render(); }
  if (act === "rep-apply") { const items = S.repair.items.filter((x) => S.repair.sel.has(x.id)).map((x) => ({ id: x.id, fields: x.fields }));
    S.repair = { busy: "Correction en cours…" }; render();
    const r = await api("/api/repair/apply", { items }); S.repair = null; await load();
    return toast(`${r.n} ${plural(r.n, "document corrigé", "documents corrigés")}${(r.closed || []).length ? ` · ${r.closed.length} ${plural(r.closed.length, "ancien employeur", "anciens employeurs")} dans Anciennes versions` : ""}`, r.batch); }
  if (act === "rep-tidy") { const r = await api("/api/jobs/tidy", {}); await load();
    return toast((r.closed || []).length ? `${r.closed.length} ${plural(r.closed.length, "ancien employeur rangé", "anciens employeurs rangés")} dans Archives › Anciennes versions` : "Rien à ranger", r.batch); }
});
document.addEventListener("keydown", (e) => {
  const os = e.target.closest && e.target.closest("[data-opens]");
  if (os && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); os.click(); }
});
