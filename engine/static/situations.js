/* Bon toutou — v0.9.4 « Composer » (chargé après essentiels.js).
   - L'onglet Dossiers devient « Situations » : chaque situation de la vie (louer, partir, demander un visa par pays,
     se marier, vendre un bien, préparer sa retraite…) montre ce qui est prêt et ce qui manque, avec où l'obtenir ;
     « Composer le dossier » prépare le paquet (copies + preuve), tes originaux ne bougent jamais.
   - Journal de résidence : où tu as vécu et quand, et les casiers judiciaires qu'on te demandera.
   - Archives s'ouvre sur les raisons de chercher un ancien papier (retraite, impôts, vente, fin de bail…). */

const SIT_GROUPS = ["Logement", "Banque", "Identité", "Famille", "Travail", "Impôts", "Aides", "Véhicule", "Patrimoine", "Retraite", "Voyage & étranger", "Visas par pays"];

const loadS = load;
load = async function () {
  if (S.v === "dossiers") {
    try { const r = await api("/api/situations"); S.sits = r.situations; S.resid = r.residence; } catch (e) { S.sits = []; }
    S.sitd = S.sit ? await api("/api/situation?id=" + encodeURIComponent(S.sit)) : null;
  }
  if (S.v === "archives") {
    if (!S.raisons) { try { S.raisons = await api("/api/raisons"); } catch (e) { S.raisons = []; } }
    if (!S.docs) { try { S.docs = await api("/api/docs"); } catch (e) {} }
  }
  return loadS();
};

/* ---------------------------------------------------------------- Situations */
const pctPill = (s) => s.ok >= s.total ? `<span class="pill ok">prêt</span>` : `<span class="pill ${s.ok ? "warn" : "neutral"}">${s.ok}/${s.total}</span>`;
function sitTile(s) {
  return `<button class="sit2" data-sit="${esc(s.id)}"><span class="oi">${IC[s.icone] || IC.folder}</span><span class="grow"><b>${esc(s.label)}</b>
    <small>${s.ok >= s.total ? "toutes les pièces sont prêtes" : `il manque : ${esc(s.manque.slice(0, 2).join(", "))}${s.manque.length > 2 ? "…" : ""}`}</small></span>${pctPill(s)}</button>`;
}
function residHTML() {
  const R = S.resid; if (!R || !R.periods || !R.periods.length) return "";
  const per = R.periods.map((p) => `<div class="row"><span class="cc">${cc(p.country)}</span><div class="grow"><b>${esc(p.lieu || S.st.countries[p.country] || p.country)}</b><div class="sub">${p.from === p.to ? frd(p.from) : `${frd(p.from)} → ${frd(p.to)}`} · ${esc(p.sources.join(", "))}</div></div></div>`).join("");
  const cas = (R.casiers || []).map((c) => `<span class="chip">${cc(c.country)} ${esc(S.st.countries[c.country] || c.country)}</span>`).join("");
  return `<div class="label" style="margin:26px 0 8px">Journal de résidence</div>
    <div class="card">${per}<div class="row"><span class="oi">${IC.scale}</span><div class="grow"><b>Casiers judiciaires à prévoir</b><div class="sub">Pays où tu as vécu au moins 6 mois ces 10 dernières années, et ton pays de nationalité. Le Canada, l'Australie ou la Nouvelle-Zélande peuvent demander chacun d'eux.</div><div class="chips" style="margin-top:6px">${cas}</div></div></div></div>
    <p class="sub" style="margin-top:6px">Tiré de tes baux, quittances, justificatifs et papiers de séjour. Pour le compléter, donne un lieu et un rôle (« locataire »…) à tes papiers de logement.</p>`;
}
function situationsHome() {
  const L = S.sits || [], q = acNorm(S.sitq || "");
  const F = q ? L.filter((s) => acNorm(s.label + " " + s.groupe + " " + (s.pays || "")).includes(q)) : L;
  const groups = [...SIT_GROUPS, ...new Set(F.map((s) => s.groupe).filter((g) => !SIT_GROUPS.includes(g)))];
  const cur = (S.dossiers || []);
  return `<h1>Situations</h1><p class="lead">Choisis une situation : Bon toutou trouve les pièces dans tes documents, te dit ce qui manque ou est trop ancien, et compose le dossier en un clic. Tes originaux ne bougent jamais.</p>
    ${cur.length ? `<div class="label" style="margin-bottom:8px">En cours</div><div class="card" style="margin-bottom:22px">${cur.map((k) => `<button class="row rowbtn" data-dos="${k.id}"><span class="oi">${IC.send}</span><div class="grow"><b>${esc(k.label)}</b> ${cc(k.country)}<div class="sub">pour ${esc(k.recipient)} · ${k.state === "finalise" ? "finalisé, à envoyer" : "en préparation"}</div></div><span class="pill ${k.ok === k.total ? "ok" : "warn"}">${k.ok}/${k.total}</span><span>›</span></button>`).join("")}</div>` : ""}
    <div class="search">${IC.search}<input id="sitq" value="${esc(S.sitq || "")}" placeholder="Chercher une situation : visa, louer, retraite, Canada…" aria-label="Chercher une situation"></div>
    ${groups.map((g) => { const X = F.filter((s) => s.groupe === g); return X.length ? `<div class="label" style="margin:18px 0 8px">${esc(g)}</div><div class="sitgrid">${X.map(sitTile).join("")}</div>` : ""; }).join("")}
    ${window.rentalCard ? `<div style="margin-top:26px">${rentalCard()}</div>` : ""}
    ${residHTML()}`;
}
function pieceRow(p) {
  const icon = p.status === "ok" ? "✓" : p.status === "part" ? "!" : "–";
  const cls = p.status === "ok" ? "ok" : p.status === "part" ? "part" : p.optional ? "opt" : "miss";
  const docs = p.docs.map((d) => `<button class="linkbtn" style="padding:0" data-doc="${d.id}">${esc(d.label)}</button> <span class="sub">· ${frd(d.date)}${d.status !== "actuel" ? " · dans Archives" : ""}</span>`).join("<br>");
  const rn = p.renew && p.status !== "ok" ? `<div class="sub" style="margin-top:4px">${p.renew.url ? `<button class="linkbtn" style="padding:0" data-ext="${esc(p.renew.url)}">${p.docs.length ? "Renouveler" : "Obtenir"} · ${esc(p.renew.organisme || "")}</button>` : `À demander : ${esc(p.renew.organisme || "")}`}${p.renew.note ? ` — ${esc(p.renew.note)}` : ""}</div>` : "";
  return `<div class="piece ${cls}"><span class="st ${p.status === "optional" ? "missing" : p.status}">${icon}</span><div class="grow"><b>${esc(p.label)}</b>${p.optional ? ` <span class="pill neutral">si besoin</span>` : ""}${p.count > 1 ? ` <span class="sub">(${p.have}/${p.count})</span>` : ""}
    <small class="sub">${docs || (p.optional ? "pas dans tes documents" : "introuvable dans tes documents — ajoute-le dans Trier")}</small>
    ${p.problems.length ? `<small class="sub" style="color:var(--warning)">${esc(p.problems.join(" · "))}</small>` : ""}${rn}</div></div>`;
}
function situationView() {
  const r = S.sitd; if (!r) return `<div class="card busy"><span class="spin"></span>Chargement…</div>`;
  const ready = r.ok >= r.total;
  return `<nav class="crumbs dncrumbs"><button class="linkbtn" data-sit="">Situations</button><span>›</span><b>${esc(r.label)}</b></nav>
    <h1>${esc(r.label)}</h1><p class="lead">${esc(r.intro || "")}${r.url ? ` <button class="linkbtn" style="padding:0" data-ext="${esc(r.url)}">Site officiel ›</button>` : ""}</p>
    <div class="sitsum ${ready ? "ok" : "warn"}"><b>${r.ok} sur ${r.total} pièces prêtes</b>${ready ? " · tu peux composer le dossier" : " · les pièces facultatives ne bloquent pas"}</div>
    <div class="card" style="margin:14px 0 18px">${r.pieces.map(pieceRow).join("")}</div>
    ${S.compose ? `<div class="card box finalbox"><b>Composer « ${esc(r.label)} »</b><div class="edit" style="margin-top:10px">
        <label>Pour qui ?<input class="field" id="sit_rcp" placeholder="ex. Agence Horizon, Consulat du Canada"></label>
        <label>Pays du dossier<select class="field" id="sit_cc">${Object.entries(S.st.countries).map(([k, v]) => `<option value="${k}" ${k === (r.pays && S.st.countries[r.pays] ? r.pays : r.country) ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
        <label>&nbsp;<span class="acts"><button class="cta" data-act="sit-create">Préparer le dossier</button><button class="linkbtn" data-act="sit-cancel">annuler</button></span></label></div>
        <p class="sub">Tu pourras remplacer une pièce par une autre, puis finaliser : Bon toutou copie les pièces dans un dossier et un ZIP, avec une preuve. Tes originaux restent où ils sont.</p></div>`
      : `<div class="acts"><button class="cta" data-act="sit-compose">${ready ? "Composer le dossier" : "Préparer quand même le dossier"}</button><span class="sub">${ready ? "" : "Tu pourras compléter les pièces manquantes ensuite."}</span></div>`}`;
}
dossiers = function () { return S.sit ? situationView() : situationsHome(); };

/* ---------------------------------------------------------------- Archives : par raisons */
function raisonsHTML() {
  const R = S.raisons || []; if (!R.length) return "";
  return `<div class="label" style="margin:4px 0 8px">Pourquoi tu cherches ?</div><div class="sitgrid raisons">${R.map((r) => `<button class="sit2" data-raison="${esc(r.id)}"><span class="oi">${IC.archive}</span><span class="grow"><b>${esc(r.label)}</b><small>${esc(r.intro)}</small></span></button>`).join("")}</div>`;
}
function raisonView(id, L) {
  const R = (S.raisons || []).find((r) => r.id === id); if (!R) return "";
  const lim = R.years ? new Date(Date.now() - R.years * 365.25 * 864e5).toISOString().slice(0, 10) : "0000";
  const seen = new Set(), all = [...L, ...(S.docs || [])].filter((d) => R.types.includes(d.type) && (d.doc_date || "") >= lim && !seen.has(d.id) && seen.add(d.id));
  const rows = csNewest(all).map((d) => docRow(d).replace(/(<\/div><\/div>)/, d.status === "actuel" ? ` <span class="pill ok" style="margin-left:4px">dans Documents</span>$1` : "$1")).join("");
  return `<nav class="crumbs dncrumbs"><button class="linkbtn" data-raison="">Archives</button><span>›</span><b>${esc(R.label)}</b></nav>
    <p class="sub dnhint">${esc(R.intro)} · ${all.length} ${plural(all.length, "document")}${R.years ? ` sur ${R.years} ans` : ""}, le plus récent en haut</p>
    <div class="card doclist">${rows || `<div class="row sub">Aucun document de ce genre pour l'instant.</div>`}</div>`;
}
const drillS = drill;
drill = function (kind, L, root) {
  if (kind === "archives" && S.raison) return raisonView(S.raison, L);
  const h = drillS(kind, L, root);
  return kind === "archives" && !S.dn.archives.cat ? raisonsHTML() + `<div class="label" style="margin:22px 0 8px">Ou par famille</div>` + h : h;
};

/* ---------------------------------------------------------------- clics, saisie */
window.addEventListener("click", async (e) => {
  const t = e.target;
  const s = t.closest("[data-sit]");
  if (s) { e.stopImmediatePropagation(); S.sit = s.dataset.sit || null; S.compose = false; if (S.v !== "dossiers") return go("dossiers", { sit: S.sit }); await load(); return window.scrollTo(0, 0); }
  const rz = t.closest("[data-raison]");
  if (rz) { e.stopImmediatePropagation(); S.raison = rz.dataset.raison || null; render(); return window.scrollTo(0, 0); }
  const a = t.closest("[data-act]"); if (!a) return;
  if (a.dataset.act === "sit-compose") { e.stopImmediatePropagation(); S.compose = true; return render(); }
  if (a.dataset.act === "sit-cancel") { e.stopImmediatePropagation(); S.compose = false; return render(); }
  if (a.dataset.act === "sit-create") { e.stopImmediatePropagation();
    const r = await api("/api/dossier/create", { template: S.sit, recipient: $("#sit_rcp").value, country: $("#sit_cc").value });
    S.compose = false; S.sit = null; return openDos(r.id); }
}, true);
const bindS = window.bindExtra;
window.bindExtra = function () {
  if (bindS) bindS();
  const q = $("#sitq"); if (q) q.oninput = () => { S.sitq = q.value; const pos = q.selectionStart; render(); const n = $("#sitq"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
};
const goS = go;
go = function (v, extra = {}) { if (v !== "dossiers") { S.sit = null; S.compose = false; } if (v !== "archives") S.raison = null; return goS(v, extra); };
/* Le menu dit « Situations ». */
const topbarS = topbar;
topbar = function () { topbarS(); const b = document.querySelector('#topbar .nav [data-go="dossiers"]'); if (b) b.firstChild.textContent = "Situations"; };
