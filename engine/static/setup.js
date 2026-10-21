/* Bon toutou — installation (premier lancement) et mises à jour / rapport de bug (Réglages).
   L'installation ne demande que ce qui est nécessaire, une chose par écran, et dit ce qu'elle fait. */
S.su = S.su || { i: 0, path: "", owner: "", countries: ["FR"], maj: false };
/* v0.10.2 : accueil refait — une question par écran, gros caractères, rien de technique.
   0 Bienvenue · 1 Ton nom · 2 Tes pays · 3 Ton dossier (création) · 4 Deux options · 5 C'est prêt */
const FLAGS = { FR: "🇫🇷", NZ: "🇳🇿", INT: "🌍", AU: "🇦🇺", CA: "🇨🇦", ES: "🇪🇸", IT: "🇮🇹", PT: "🇵🇹", DE: "🇩🇪", BE: "🇧🇪", CH: "🇨🇭", GB: "🇬🇧", US: "🇺🇸", JP: "🇯🇵", TH: "🇹🇭" };
const CHELP = { INT: "Passeport international, permis international, diplômes étrangers…" };
function shortPath(p) { const parts = String(p || "").split(/[\\/]+/).filter(Boolean); return parts.slice(-2).join(" › ") || p; }

function setupView() {
  const st = S.st, u = S.su, i = u.i;
  const first = (u.owner || "").trim().split(/\s+/)[0];
  const steps = 4, k = Math.min(i, steps);
  const prog = i >= 1 && i <= 3 ? `<div class="obprog" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow="${i}" aria-label="Étape ${i} sur 3">
      <button class="obback" data-act="su-prev">← Retour</button><div class="obbar"><i style="width:${(i / 3) * 100}%"></i></div><span>Étape ${i} sur 3</span></div>` : "";
  const err = u.err ? `<div class="oberr" role="alert">${esc(u.err)}</div>` : "";
  const btn = (lab, act = "su-next", ok = true) => `<button class="obcta" data-act="${act}" ${ok ? "" : "disabled"}>${lab}</button>`;
  let b = "";
  if (i === 0) b = `<div class="obhero">${IC.dog}</div>
    <h1>Bonjour, moi c'est Bon toutou.</h1>
    <p class="oblead">Je range tes papiers administratifs, je te préviens quand l'un d'eux expire, et je prépare tes dossiers en un clic.</p>
    <ul class="obpromise">
      <li><span>${IC.lock}</span><div><b>Tout reste chez toi</b><small>Tes papiers ne quittent pas ton ordinateur.</small></div></li>
      <li><span>${IC.shield}</span><div><b>Rien n'est jamais effacé</b><small>Je copie et je range. Tu peux toujours annuler.</small></div></li>
      <li><span>${IC.heart}</span><div><b>Gratuit, sans compte</b><small>Pas d'inscription, pas de publicité.</small></div></li></ul>
    ${btn("C'est parti")}<p class="obnote">2 minutes · 3 petites questions</p>`;
  if (i === 1) b = `<h1>Comment t'appelles-tu ?</h1>
    <p class="oblead">Pour reconnaître <b>tes</b> papiers parmi ceux de tes proches.</p>
    <label class="oblabel" for="su_owner">Prénom et nom</label>
    <input class="obinput" id="su_owner" placeholder="ex. Camille Martin" autocomplete="name" value="${esc(u.owner)}">
    ${err}${btn("Continuer")}<button class="oblink" data-act="su-next">Passer cette étape</button>`;
  if (i === 2) b = `<h1>${first ? esc(first) + ", tes" : "Tes"} papiers viennent d'où ?</h1>
    <p class="oblead">Coche tous les pays où tu as (ou as eu) des papiers. Tu pourras en ajouter plus tard.</p>
    <div class="obtiles" role="group" aria-label="Pays">${Object.entries(st.countries || {}).map(([c, n]) => { const on = u.countries.includes(c);
      return `<button class="obtile${on ? " on" : ""}" data-act="su-cc" data-cc="${c}" aria-pressed="${on}"><span class="flag" aria-hidden="true">${FLAGS[c] || "🏳️"}</span><span class="tn"><b>${esc(n)}</b>${CHELP[c] ? `<small>${esc(CHELP[c])}</small>` : ""}</span><span class="tick" aria-hidden="true">${on ? "✓" : ""}</span></button>`; }).join("")}</div>
    ${err}${btn("Continuer", "su-next", u.countries.length > 0)}${u.countries.length ? "" : `<p class="obnote">Choisis au moins un pays.</p>`}`;
  if (i === 3) { const p = u.path || st.suggest;
    b = `<h1>Où ranger ton dossier ?</h1>
    <p class="oblead">Je crée <b>un seul dossier</b> pour tous tes papiers. Un dossier ordinaire, lisible même sans moi.</p>
    <div class="obfolder"><span class="fi">${IC.folder}</span><div class="grow"><b>${esc(shortPath(p))}</b><small>${esc(p)}</small></div>
      ${window.__TAURI__ ? `<button class="obghost" data-act="su-pick">Changer…</button>` : `<button class="obghost" data-act="su-edit">Changer…</button>`}</div>
    ${u.editPath ? `<label class="oblabel" for="su_path">Chemin du dossier</label><input class="obinput" id="su_path" value="${esc(p)}">` : ""}
    <p class="obnote" style="text-align:left">Je n'accède à rien d'autre sur ton ordinateur. S'il y a déjà des papiers dans ce dossier, je n'y touche pas.</p>
    ${err}${btn(u.busy ? "Création…" : "Créer mon dossier", "su-next", !u.busy)}`; }
  if (i === 4) {
    const I = st.ia || {}, M = I.machine || {}, cat = (I.catalogue || {}).modeles || [], m = cat.find((x) => x.niveau === M.niveau && x.conseille) || cat[0] || {};
    const E = I.engines || [], integ = E.find((e) => e.id === "integre" && e.running), oll = E.find((e) => e.id === "ollama" && e.running);
    const can = (integ && m.gguf && m.gguf.sha256) || oll;
    u.iaKey = can ? (integ ? m.id : m.ollama) : ""; u.iaEng = integ ? "integre" : "ollama";
    b = `<h1>Ton dossier est créé ✓</h1>
    <p class="oblead">Deux options, à toi de voir. Tu pourras les changer à tout moment dans Réglages.</p>
    <label class="obopt"><input type="checkbox" id="su_maj" ${u.maj ? "checked" : ""}><span class="sw" aria-hidden="true"></span><div><b>Me prévenir des nouvelles versions</b><small>Je regarde une fois par semaine s'il y a une mise à jour. Jamais obligatoire.</small></div></label>
    <label class="obopt${can ? "" : " off"}"><input type="checkbox" id="su_ia" ${u.ia && can ? "checked" : ""} ${can ? "" : "disabled"}><span class="sw" aria-hidden="true"></span><div><b>Installer l'assistant IA${m.taille_go ? ` (${String(m.taille_go).replace(".", ",")} Go)` : ""}</b><small>${can ? "Il m'aide pour les papiers inhabituels. Il tourne sur ton ordinateur : rien ne sort." : "Facultatif, je fonctionne très bien sans. Tu pourras l'installer plus tard : Réglages › IA locale."}</small></div></label>
    <p class="obnote">${IC.lock} Je ne me connecte à internet que si tu le demandes, et je note chaque sortie.</p>
    ${btn("Terminer", "su-finish")}`;
  }
  if (i === 5) b = `<div class="obhero ok">✓</div><h1>C'est prêt${first ? ", " + esc(first) : ""} !</h1>
    <p class="oblead">Par quoi veux-tu commencer ?</p>
    <div class="obchoices">
      <button class="obchoice main" data-act="su-go" data-to="trier"><span class="ci">${IC.inbox}</span><span><b>Ajouter mes papiers</b><small>Glisse des PDF, des photos ou un dossier entier. Les originaux ne bougent pas.</small></span></button>
      <button class="obchoice" data-act="su-go" data-to="guide"><span class="ci">${IC.sparkles}</span><span><b>Essayer avec 3 papiers</b><small>Une visite guidée de 5 minutes.</small></span></button>
      <button class="obchoice" data-act="su-go" data-to="mail"><span class="ci">${IC.mail}</span><span><b>Relier une adresse e-mail</b><small>Tes pièces jointes administratives arrivent toutes seules.</small></span></button></div>
    <button class="oblink" data-act="su-go" data-to="home">Découvrir l'app d'abord</button>
    ${u.dl ? `<p class="obnote">${esc(u.dl)}</p>` : ""}`;
  return `<div class="ob">${prog}<section class="obcard" aria-labelledby="obh">${b.replace("<h1>", "<h1 id=\"obh\" tabindex=\"-1\">")}</section></div>`;
}

function openExternal(url) {
  const T = window.__TAURI__;
  if (T && T.opener && T.opener.openUrl) return T.opener.openUrl(url);
  window.open(url, "_blank");
}
function majSection() {
  const st = S.st, m = S.maj;
  return `<div class="label">Version et mises à jour</div>
  <div class="card box"><b>Bon toutou ${esc(st.version || "")}</b> <span class="sub">· code public, licence AGPL-3.0</span>
    <p class="sub">Les mises à jour ne sont jamais obligatoires. Vérifier envoie une seule requête à la page publique de Bon toutou, notée dans le journal des sorties.</p>
    <div class="acts"><button class="ghost small" data-act="maj-check">Vérifier les mises à jour</button>
      <label class="chk"><input type="checkbox" id="maj_auto" ${st.settings.maj_auto ? "checked" : ""}> toute seule, une fois par semaine</label></div>
    ${m ? (!m.ok ? `<div class="hint">${esc(m.msg)}</div>` : !m.nouvelle ? `<div class="hint">Tu as la dernière version (${esc(m.installee)}).</div>`
      : `<div class="hint" style="${m.important ? "background:var(--bad-bg)" : ""}"><b>${m.important ? "Important : corrige une faille · " : ""}Version ${esc(m.derniere)} disponible</b>
          <div style="white-space:pre-wrap;margin:6px 0">${esc(m.notes)}</div>
          <div class="acts"><button class="cta small" data-act="maj-open">Télécharger</button><button class="linkbtn" data-act="maj-later">Plus tard</button></div>
          <div class="sub">Tes documents ne sont jamais touchés par une mise à jour. L'ancienne version reste disponible sur la même page.</div></div>`) : ""}</div>
  <div class="label">Signaler un problème</div>
  <div class="card box"><span class="sub">Prépare un rapport sans aucun document ni nom de fichier, que tu relis avant de décider de l'envoyer.</span>
    <div class="acts" style="margin-top:8px"><button class="ghost small" data-act="bug-open">Préparer un rapport</button></div></div>`;
}
function bugModal(m) {
  const r = m.r;
  return `<h2>Rapport de problème</h2><p class="sub">${esc(r ? r.rappel : "Préparation…")}</p>
  ${r ? `<p class="sub">Décris en une phrase ce qui s'est passé, puis relis tout :</p>
    <textarea class="field mono" id="bug_txt" rows="12">Ce qui s'est passé : \n\n${esc(r.text)}</textarea>
    ${r.masque.length ? `<div class="sub">Masqué automatiquement : ${esc(r.masque.join(", "))}</div>` : ""}
    <div class="acts" style="margin-top:12px"><button class="cta" data-act="bug-copy">Copier</button>
      ${r.issue ? `<button class="ghost" data-act="bug-issue">Ouvrir un ticket public…</button>` : ""}${r.mailto ? `<button class="ghost" data-act="bug-mail">Envoyer par e-mail</button>` : ""}
      <button class="linkbtn" data-act="m-close">Annuler</button></div>
    ${r.issue ? `<p class="sub">Un ticket public est visible par tout le monde sur GitHub : n'y mets rien de personnel.</p>` : ""}` : ""}`;
}
(function () {
  const prevModal = window.modalView;
  window.modalView = function () {
    if (S.modal && S.modal.kind === "bug") return `<div class="ov" data-act="m-close-bg"><div class="modal" role="dialog">${bugModal(S.modal)}</div></div>`;
    return prevModal ? prevModal() : "";
  };
  const prevBind = window.bindExtra;
  window.bindExtra = function () {
    if (prevBind) prevBind();
    const p = $("#su_path"); if (p) p.oninput = () => (S.su.path = p.value);
    const o = $("#su_owner"); if (o) o.oninput = () => (S.su.owner = o.value);
    document.querySelectorAll("[data-su-cc]").forEach((el) => (el.onchange = () => {
      S.su.countries = [...document.querySelectorAll("[data-su-cc]:checked")].map((x) => x.dataset.suCc); render(); }));
    const mj = $("#su_maj"); if (mj) mj.onchange = () => (S.su.maj = mj.checked);
    const ia = $("#su_ia"); if (ia) ia.onchange = () => (S.su.ia = ia.checked);
    document.querySelectorAll(".obinput").forEach((f) => (f.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); const n = document.querySelector('.obcta[data-act="su-next"]'); if (n && !n.disabled) n.click(); } }));
    const ma = $("#maj_auto"); if (ma) ma.onchange = async () => { await api("/api/settings", { maj_auto: ma.checked }); toast(ma.checked ? "Vérification hebdomadaire activée" : "Vérification automatique désactivée"); load(); };
    // vérification hebdomadaire, seulement si tu l'as demandée
    const st = S.st;
    if (st && !st.setup && st.settings.maj_auto && !S.majAutoDone) {
      S.majAutoDone = true;
      const last = Date.parse(st.settings.maj_last || 0) || 0;
      if (Date.now() - last > 7 * 864e5) api("/api/maj/check", { consent: true }).then(async (r) => {
        await api("/api/settings", { maj_last: new Date().toISOString() });
        if (r.ok && r.nouvelle) { S.maj = r; toast(`Bon toutou ${r.derniere} est disponible · voir Réglages`); }
      });
    }
  };
})();
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, u = S.su;
  if (act === "su-prev") { u.i = Math.max(0, u.i - 1); u.err = ""; return render(); }
  if (act === "su-cc") { const c = a.dataset.cc; u.countries = u.countries.includes(c) ? u.countries.filter((x) => x !== c) : u.countries.concat(c); u.err = ""; return render(); }
  if (act === "su-edit") { u.editPath = true; render(); const f = $("#su_path"); if (f) f.focus(); return; }
  if (act === "su-pick") {
    try { const d = await window.__TAURI__.dialog.open({ directory: true, multiple: false, title: "Ton dossier administratif" }); if (d) { u.path = d; u.err = ""; render(); } }
    catch (x) { u.editPath = true; u.err = "Le sélecteur ne s'ouvre pas : écris le chemin du dossier."; render(); }
    return;
  }
  if (act === "su-next") {
    u.err = "";
    if (u.i === 2 && !u.countries.length) { u.err = "Choisis au moins un pays."; return render(); }
    if (u.i === 3) {
      if (!u.path) u.path = S.st.suggest;
      u.busy = true; render();
      const r = await api("/api/setup", { path: u.path, owner: u.owner, countries: u.countries });
      u.busy = false;
      if (!r.ok) { u.err = r.msg; u.editPath = true; return render(); }
      S.st = await api("/api/state"); S.setupDone = true;
    }
    u.i++; render();
    const f = document.querySelector(".obinput"); if (f) f.focus();
    return;
  }
  if (act === "su-finish") {
    const mj = $("#su_maj"), ia = $("#su_ia");
    await api("/api/settings", { maj_auto: !!(mj && mj.checked) });
    if (ia && ia.checked && u.iaKey) {
      const r = await api("/api/ia/pull", { engine: u.iaEng, model: u.iaKey, consent: true });
      if (r.ok) { await api("/api/settings", { ai_engine: u.iaEng, use_ollama: true }); u.dl = "L'assistant IA se télécharge en arrière-plan. Tu peux commencer sans attendre."; }
      else u.dl = r.msg || "";
    }
    u.i = 5; return render();
  }
  if (act === "su-go") {
    const to = a.dataset.to;
    S.su = { i: 0, path: "", owner: "", countries: ["FR"], maj: false };
    if (to === "mail") return go("reglages", { sv: "mail" });
    if (to === "guide") { S.gids = S.gids || []; return go("guide"); }
    return go(to);
  }
  if (act === "su-done") { await api("/api/settings", { maj_auto: !!u.maj }); S.v = "trier"; return load(); }
  if (act === "maj-check") { S.maj = { ok: false, msg: "Vérification…" }; render(); S.maj = await api("/api/maj/check", { consent: true }); await api("/api/settings", { maj_last: new Date().toISOString() }); return load(); }
  if (act === "maj-later") { S.maj = null; return render(); }
  if (act === "bug-open") { S.modal = { kind: "bug" }; render(); S.modal.r = await api("/api/bug", {}); return render(); }
  if (act === "bug-copy") { const t = $("#bug_txt").value; try { await navigator.clipboard.writeText(t); } catch (x) { /* sélection manuelle */ }
    await api("/api/bug/sent", { dest: "copié pour envoi manuel", bytes: t.length }); return toast("Copié"); }
  if (act === "bug-issue") { const t = $("#bug_txt").value; await api("/api/bug/sent", { dest: "github.com (ticket public)", bytes: t.length });
    openExternal(S.modal.r.issue + "?title=" + encodeURIComponent("Problème") + "&body=" + encodeURIComponent(t)); }
  if (act === "bug-mail") { const t = $("#bug_txt").value; await api("/api/bug/sent", { dest: "ta messagerie", bytes: t.length });
    openExternal(S.modal.r.mailto + "?subject=" + encodeURIComponent("Problème Bon toutou") + "&body=" + encodeURIComponent(t)); }
  if (act === "maj-open" && S.maj && S.maj.page) openExternal(S.maj.page);
});
