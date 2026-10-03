/* Bon toutou — Réglages › Adresse admin : relier sa boîte (IMAP), depuis cet ordinateur.
   Le mot de passe d'application va au trousseau du système, jamais dans un fichier ; l'IA ne le voit pas.
   Bon toutou ne fait que lire : jamais envoyer, supprimer, déplacer ni marquer comme lu. */
S.ml = S.ml || { items: null, sel: null, msg: "", busy: "" };
const ko = (n) => (n > 1e6 ? (n / 1048576).toFixed(1).replace(".", ",") + " Mo" : Math.max(1, Math.round(n / 1024)) + " ko");

function mailView() {
  const s = S.st.settings, M = S.mst || {}, L = S.ml;
  const head = setHead("mail", "Adresse admin", "Une adresse e-mail rien que pour l'administratif. Bon toutou relève ses pièces jointes depuis ton ordinateur, et toi tu valides dans Trier.");
  const never = `<p class="sub" style="margin-top:10px">Connexion directe de ton ordinateur à ta messagerie, chiffrée. Bon toutou <b>lit seulement</b> : il n'envoie, ne supprime, ne déplace et ne marque rien comme lu. Chaque connexion est notée dans le <button class="linkbtn" style="padding:0" data-go="reglages" data-sv="priv">journal des sorties</button>.</p>`;
  if (L.busy) return head + `<div class="card busy"><span class="spin"></span>${esc(L.busy)}</div>`;
  if (!M.saved) {
    const custom = M.address && M.provider === "Ta messagerie";
    return `${head}
    <div class="card box mailbox">
      <label class="lab2">Ton adresse admin<div class="fieldwrap" style="max-width:460px"><span class="oi">${IC.mail}</span><input id="ml_addr" type="email" value="${esc(s.mail || "")}" placeholder="papiers@ik.me" autocomplete="off" aria-label="Adresse admin"></div></label>
      ${M.address ? (M.unsupported ? `<div class="hint warn">${esc(M.unsupported)}</div>`
        : `<div class="sub" style="margin:8px 0 0">Messagerie : <b style="color:var(--text)">${esc(M.provider)}</b> · serveur ${esc(M.host || "")}</div>
      ${custom ? `<label class="lab2" style="margin-top:12px">Serveur IMAP (indiqué par ta messagerie)<input class="field" id="ml_host" value="${esc(s.mail_host || M.host || "")}" placeholder="imap.exemple.fr" style="max-width:320px"></label>` : ""}
      <label class="lab2" style="margin-top:14px">Mot de passe d'application<input class="field" id="ml_pw" type="password" autocomplete="new-password" spellcheck="false" placeholder="xxxx xxxx xxxx xxxx" style="max-width:320px"></label>
      <p class="sub" style="margin:6px 0 0">Pas ton mot de passe habituel : un code créé exprès pour Bon toutou, que tu peux révoquer à tout moment.${M.help ? ` <button class="linkbtn" style="padding:0" data-ext="${esc(M.help)}">Créer un mot de passe d'application ↗</button>` : ""}</p>
      <label class="consent"><input type="checkbox" id="ml_ok"> J'autorise Bon toutou à se connecter à ${esc(M.host || "ma messagerie")} depuis cet ordinateur, en lecture seule.</label>`) : ""}
      <div class="acts" style="margin-top:12px">${M.address && !M.unsupported ? `<button class="cta small" data-act="ml-test">Tester la connexion</button>` : `<button class="cta small" data-act="ml-addr">Continuer</button>`}
        ${M.address ? `<button class="linkbtn" data-act="ml-change">changer d'adresse</button>` : ""}</div>
      ${L.msg ? `<div class="hint warn">${esc(L.msg)}</div>` : ""}
      <p class="sub" style="margin-bottom:0">Le mot de passe sera rangé dans ${esc(M.where || "le trousseau de ton système")}, jamais dans un fichier.</p></div>
    <div class="label" style="margin:22px 0 8px">Messageries</div>
    <div class="card box"><div class="sub">Prises en charge : ${esc((M.providers || []).join(", "))}, et la plupart des autres (IMAP).<br>
      Pas encore : Outlook / Hotmail (prévu). Non : Proton Mail et Tuta, qui ne laissent pas une autre app relever les mails.</div>
      <p class="sub" style="margin-bottom:0"><b style="color:var(--text)">Pas encore d'adresse admin ?</b> Une adresse Infomaniak (hébergée en Suisse) est un bon choix pour tes papiers. Gmail, iCloud et La Poste marchent aussi.</p></div>
    ${never}`;
  }
  const items = L.items, sel = L.sel || new Set();
  return `${head}
  <div class="card box mailbox"><div class="row" style="padding:0;border:0"><span class="oi" style="background:var(--success-light);color:var(--success)">${IC.check}</span>
    <div class="grow"><b>${esc(M.address)}</b><div class="sub">${esc(M.provider)} · reliée · mot de passe dans ${esc(M.where)}${M.seen ? ` · ${M.seen} ${plural(M.seen, "pièce jointe déjà copiée", "pièces jointes déjà copiées")}` : ""}</div></div>
    <button class="linkbtn" data-act="ml-forget">Oublier le mot de passe</button></div>
    <label class="consent"><input type="checkbox" id="ml_auto" ${M.auto ? "checked" : ""}> Relever à l'ouverture de Bon toutou (les nouvelles pièces jointes arrivent dans Trier ; tu valides toujours)</label>
    <div class="acts" style="margin-top:12px"><button class="cta small" data-act="ml-scan">${IC.sync} Voir les pièces jointes des ${M.days} derniers jours</button></div>
    ${L.msg ? `<div class="hint warn">${esc(L.msg)}</div>` : ""}</div>
  ${items ? (items.length ? `<div class="label" style="margin:22px 0 8px">${items.length} ${plural(items.length, "pièce jointe nouvelle", "pièces jointes nouvelles")} · seuls les noms ont été lus</div>
    <div class="card">${items.map((i) => `<label class="row" style="cursor:pointer"><input type="checkbox" data-mlk="${esc(i.key)}" ${sel.has(i.key) ? "checked" : ""}>
      <div class="grow"><b class="fname">${esc(i.filename)}</b><div class="sub">${esc(i.from || i.from_addr)} · ${esc(i.subject || "(sans objet)")} · ${frd(i.date)} · ${ko(i.size)}</div></div></label>`).join("")}
      <div class="bfoot"><span class="sub">Copiées dans Trier : le mail reste tel quel dans ta boîte.</span><button class="cta small" data-act="ml-import" ${sel.size ? "" : "disabled"}>Copier ${sel.size} dans Trier</button></div></div>`
    : `<div class="card" style="padding:18px;margin-top:14px">Rien de nouveau : toutes les pièces jointes récentes sont déjà passées par Trier.</div>`) : ""}
  ${never}`;
}

(function () {
  const prevBind = window.bindExtra;
  window.bindExtra = function () {
    if (prevBind) prevBind();
    document.querySelectorAll("[data-mlk]").forEach((el) => (el.onchange = () => { const k = el.dataset.mlk; el.checked ? S.ml.sel.add(k) : S.ml.sel.delete(k); render(); }));
    const au = $("#ml_auto"); if (au) au.onchange = async () => { await api("/api/settings", { mail_auto: au.checked }); S.mst = await api("/api/mail/status", {}); toast(au.checked ? "Relève à l'ouverture activée" : "Relève à l'ouverture désactivée"); render(); };
    const ad = $("#ml_addr"); if (ad) ad.onkeydown = (e) => { if (e.key === "Enter") document.querySelector("[data-act=ml-addr],[data-act=ml-test]").click(); };
  };
})();

async function mailRefresh() { S.mst = await api("/api/mail/status", {}); render(); }
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act^=ml-]"); if (!a) return;
  const act = a.dataset.act, L = S.ml;
  L.msg = "";
  if (act === "ml-addr" || act === "ml-change") {
    if (act === "ml-change") { S.mst = Object.assign({}, S.mst, { address: "" }); return render(); }
    const v = $("#ml_addr").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { L.msg = "Cette adresse ne semble pas valide."; return render(); }
    await api("/api/settings", { mail: v }); S.st.settings.mail = v; return mailRefresh();
  }
  if (act === "ml-test") {
    const v = $("#ml_addr").value.trim(), pw = ($("#ml_pw") || {}).value || "", h = $("#ml_host") ? $("#ml_host").value.trim() : null;
    if (v !== S.st.settings.mail) { await api("/api/settings", { mail: v }); S.st.settings.mail = v; return mailRefresh(); }
    if (!pw) { L.msg = "Colle le mot de passe d'application."; return render(); }
    if (!$("#ml_ok").checked) { L.msg = "Coche l'autorisation : sans ton accord, Bon toutou ne se connecte pas."; return render(); }
    L.busy = "Connexion à ta messagerie…"; render();
    const r = await api("/api/mail/connect", { address: v, password: pw, host: h, consent: true });
    L.busy = "";
    if (!r.ok) { L.msg = r.msg; return render(); }
    S.mst = r.status; await load();
    return toast(r.keychain ? `Reliée · mot de passe rangé dans ${r.where}` : "Reliée · mot de passe gardé jusqu'à la fermeture (pas de trousseau trouvé)");
  }
  if (act === "ml-scan") {
    L.busy = "Lecture des noms des pièces jointes…"; render();
    const r = await api("/api/mail/scan", { consent: true });
    L.busy = "";
    if (!r.ok) { L.msg = r.msg; return render(); }
    L.items = r.items; L.sel = new Set(r.items.map((i) => i.key)); return render();
  }
  if (act === "ml-import") {
    const keys = [...L.sel];
    L.busy = `Copie de ${keys.length} ${plural(keys.length, "pièce jointe", "pièces jointes")} dans Trier…`; render();
    const r = await api("/api/mail/import", { keys, consent: true });
    L.busy = "";
    if (!r.ok) { L.msg = r.msg; return render(); }
    L.items = (L.items || []).filter((i) => !L.sel.has(i.key)); L.sel = new Set();
    S.mst = await api("/api/mail/status", {}); await load();
    return toast(`${r.added} ${plural(r.added, "document copié", "documents copiés")} dans Trier${r.dup ? ` · ${r.dup} déjà là` : ""}${r.failed ? ` · ${r.failed} illisible${r.failed > 1 ? "s" : ""}` : ""}`);
  }
  if (act === "ml-forget") { const r = await api("/api/mail/forget", {}); S.mst = r.status; L.items = null; await load(); return toast("Mot de passe retiré du trousseau"); }
});

/* Relève à l'ouverture (désactivée par défaut) : une seule fois par lancement. */
async function mailAutoOnce() {
  if (S.mailAutoDone || !S.st || S.st.setup) return;
  S.mailAutoDone = true;
  const s = S.st.settings;
  if (!(s.mail_auto && s.mail_saved)) return;
  const r = await api("/api/mail/auto", {});
  if (r.ok && r.added) { await load(); toast(`${r.added} ${plural(r.added, "pièce jointe arrivée", "pièces jointes arrivées")} dans Trier depuis ton adresse admin`); }
  else if (r.ok === false && r.msg) toast("Adresse admin : " + r.msg);
}
