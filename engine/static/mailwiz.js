/* Bon toutou — v0.10.3 : relier l'adresse admin, pas à pas, comme l'accueil (une question par écran).
   0 Choix (créer / j'en ai une) · 1 Créer chez Infomaniak · 2 Ton adresse · 3 Créer le code · 4 Coller et relier · 5 C'est relié
   Rien ne part sans ton accord : la connexion n'a lieu qu'à l'étape 4, case cochée. Lecture seule. */
S.mw = S.mw || { i: 0 };

// messageries : où créer le code pour Bon toutou, et comment (étapes courtes, mots de l'interface du fournisseur)
const MW_HELP = {
  Infomaniak: { url: "https://ksuite.infomaniak.com/mail", btn: "Ouvrir ma messagerie Infomaniak", code: "un mot de passe d'appareil",
    steps: ["Connecte-toi à ta messagerie Infomaniak.", "Clique sur <b>⋮</b> à droite de ton adresse, puis <b>Paramètres</b>.", "<b>Gérer le mot de passe</b> → <b>Ajouter un appareil</b>. Nomme-le « Bon toutou ».", "Choisis l'onglet <b>IMAP / SMTP</b> et génère le mot de passe.", "<b>Copie-le tout de suite</b> : il ne s'affiche qu'une fois."] },
  Gmail: { url: "https://myaccount.google.com/apppasswords", btn: "Ouvrir mon compte Google", code: "un mot de passe d'application",
    pre: "Google ne le propose que si la <b>validation en deux étapes</b> est activée sur ton compte.",
    steps: ["Connecte-toi à ton compte Google.", "Donne un nom : « Bon toutou », puis <b>Créer</b>.", "Google affiche un code de <b>16 lettres</b> : copie-le.", "Si Gmail refuse ensuite : Gmail › Paramètres › Transfert et POP/IMAP › <b>Activer IMAP</b>."] },
  iCloud: { url: "https://account.apple.com/", btn: "Ouvrir mon compte Apple", code: "un mot de passe pour app",
    steps: ["Connecte-toi à ton compte Apple.", "<b>Connexion et sécurité</b> → <b>Mots de passe pour app</b>.", "Crée-en un nommé « Bon toutou ».", "Copie le code affiché."] },
  Yahoo: { url: "https://login.yahoo.com/account/security", btn: "Ouvrir la sécurité Yahoo", code: "un mot de passe d'application",
    steps: ["Connecte-toi à ton compte Yahoo.", "<b>Générer un mot de passe d'application</b>, nommé « Bon toutou ».", "Copie le code affiché."] },
};
const MW_DEFAULT = { code: "ton mot de passe de messagerie",
  steps: ["Si ta messagerie propose un « mot de passe d'application », crée-en un nommé « Bon toutou » : c'est plus sûr, et tu peux le supprimer à tout moment.", "Sinon, utilise ton mot de passe de messagerie habituel.", "Vérifie que l'accès <b>IMAP</b> est autorisé dans les réglages de ta messagerie."] };
const mwHelp = (M) => MW_HELP[M.provider] || MW_DEFAULT;

function mwView() {
  const w = S.mw, M = S.mst || {}, s = S.st.settings, i = w.i;
  const addr = w.addr !== undefined ? w.addr : (s.mail || "");
  const H = mwHelp(M);
  const stepN = { 2: 1, 3: 2, 4: 3 }[i];
  const prog = stepN ? `<div class="obprog" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow="${stepN}" aria-label="Étape ${stepN} sur 3">
      <button class="obback" data-act="mw-prev">← Retour</button><div class="obbar"><i style="width:${(stepN / 3) * 100}%"></i></div><span>Étape ${stepN} sur 3</span></div>`
    : i === 1 ? `<div class="obprog"><button class="obback" data-act="mw-prev">← Retour</button></div>` : "";
  const err = w.err ? `<div class="oberr" role="alert">${w.err}</div>` : "";
  const cta = (lab, act, ok = true) => `<button class="obcta" data-act="${act}" ${ok ? "" : "disabled"}>${lab}</button>`;
  let b = "";
  if (i === 0) b = `<div class="obhero">${IC.mail}</div>
    <h1>Une adresse rien que pour tes papiers</h1>
    <p class="oblead">Donne-la à tes organismes. Je relève les pièces jointes (PDF, photos) et elles arrivent dans Trier. Tu valides toujours.</p>
    <div class="obchoices">
      <button class="obchoice main" data-act="mw-create"><span class="ci">${IC.plus || IC.mail}</span><span><b>Créer une adresse gratuite</b><small>Chez Infomaniak, une entreprise suisse. Hébergée en Suisse. Recommandé.</small></span></button>
      <button class="obchoice" data-act="mw-have"><span class="ci">${IC.mail}</span><span><b>J'ai déjà une adresse</b><small>Gmail, iCloud, Infomaniak, Yahoo, Orange, Free, La Poste…</small></span></button></div>
    <p class="obnote">${IC.lock} Lecture seule : je n'envoie, ne supprime et ne déplace jamais un mail.</p>`;
  if (i === 1) b = `<h1>Crée ton adresse chez Infomaniak</h1>
    <p class="oblead">C'est gratuit et ça prend 3 minutes. Je t'attends ici.</p>
    <ul class="obpromise">
      <li><span>${IC.mail}</span><div><b>Une adresse en @ik.me</b><small>ou @etik.com, @ikmail.com. Idée : prenom.nom.admin@ik.me</small></div></li>
      <li><span>${IC.id}</span><div><b>Un portable européen</b><small>Infomaniak envoie un code par SMS. Réservé aux résidents d'un pays de l'OCDE.</small></div></li>
      <li><span>${IC.key || IC.lock}</span><div><b>Ton mot de passe reste à toi</b><small>Je ne te le demanderai jamais. J'utiliserai un code à part.</small></div></li></ul>
    <button class="obcta" data-ext="https://www.infomaniak.com/fr/ksuite/myksuite">Ouvrir l'inscription ↗</button>
    <button class="oblink" data-act="mw-next">C'est fait, j'ai mon adresse</button>`;
  if (i === 2) b = `<h1>Quelle est ton adresse ?</h1>
    <p class="oblead">Celle que tu réserves à l'administratif.</p>
    <label class="oblabel" for="mw_addr">Adresse e-mail</label>
    <input class="obinput" id="mw_addr" type="email" inputmode="email" autocomplete="email" spellcheck="false" placeholder="ex. camille.admin@ik.me" value="${esc(addr)}">
    ${err}${cta("Continuer", "mw-addr")}
    <p class="obnote">Gmail, iCloud, Infomaniak, Yahoo, Orange, Free, SFR, La Poste et la plupart des autres. Pas encore : Outlook / Hotmail.</p>`;
  if (i === 3) b = `<h1>Crée un code pour Bon toutou</h1>
    <p class="oblead">${esc(M.provider || "Ta messagerie")} te donne ${H.code} rien que pour moi. Tu pourras le supprimer à tout moment, sans toucher à ton vrai mot de passe.</p>
    ${H.pre ? `<div class="obinfo">${H.pre}</div>` : ""}
    <ol class="obsteps">${H.steps.map((x) => `<li><span>${x}</span></li>`).join("")}</ol>
    ${H.url ? `<button class="obghost obwide" data-ext="${esc(H.url)}">${esc(H.btn)} ↗</button>` : ""}
    ${cta("J'ai copié le code", "mw-next")}`;
  if (i === 4) { const custom = M.provider === "Ta messagerie";
    b = `<h1>Colle le code ici</h1>
    <p class="oblead">Pour <b>${esc(addr)}</b>. Il sera rangé dans ${esc(M.where || "le trousseau de ton ordinateur")}, jamais dans un fichier.</p>
    ${custom ? `<label class="oblabel" for="mw_host">Serveur IMAP (indiqué par ta messagerie)</label><input class="obinput" id="mw_host" spellcheck="false" placeholder="imap.exemple.fr" value="${esc(w.host || M.host || "")}">` : ""}
    <label class="oblabel" for="mw_pw">Code</label>
    <div class="obpw"><input class="obinput" id="mw_pw" type="${w.show ? "text" : "password"}" autocomplete="new-password" spellcheck="false" placeholder="Colle-le ici" value="${esc(w.pw || "")}"><button class="obeye" data-act="mw-show" aria-label="${w.show ? "Masquer" : "Afficher"} le code">${w.show ? "Masquer" : "Afficher"}</button></div>
    <label class="obopt"><input type="checkbox" id="mw_ok" ${w.ok ? "checked" : ""}><span class="sw" aria-hidden="true"></span><div><b>J'autorise Bon toutou à lire cette boîte</b><small>Depuis cet ordinateur, en lecture seule. Chaque connexion est notée dans le journal des sorties.</small></div></label>
    ${err}${cta(w.busy ? "Connexion…" : "Relier mon adresse", "mw-connect", !w.busy)}`; }
  if (i === 5) b = `<div class="obhero ok">✓</div><h1>C'est relié !</h1>
    <p class="oblead"><b>${esc(M.address || addr)}</b> est reliée${w.n ? ` : ${w.n} mails dans la boîte` : ""}. Je ne lis que les pièces jointes.</p>
    <label class="obopt"><input type="checkbox" id="mw_auto" ${M.auto ? "checked" : ""}><span class="sw" aria-hidden="true"></span><div><b>Relever à chaque ouverture de Bon toutou</b><small>Les nouvelles pièces jointes arrivent dans Trier. Tu valides toujours.</small></div></label>
    <div class="obchoices" style="margin-top:6px">
      <button class="obchoice main" data-act="mw-scan"><span class="ci">${IC.inbox}</span><span><b>Voir mes pièces jointes</b><small>Celles des ${M.days || 90} derniers jours. Tu choisis lesquelles copier dans Trier.</small></span></button>
      <button class="obchoice" data-go="reglages" data-sv="orgs"><span class="ci">${IC.building || IC.send}</span><span><b>Donner l'adresse à mes organismes</b><small>Impôts, assurance maladie, banque… la liste à cocher.</small></span></button></div>
    <button class="oblink" data-act="mw-done">Plus tard</button>`;
  return `<div class="ob">${prog}<section class="obcard" aria-labelledby="mwh">${b.replace("<h1>", '<h1 id="mwh" tabindex="-1">')}</section></div>`;
}

const mailViewW = mailView;
mailView = function () {
  const M = S.mst || {};
  if (S.ml && S.ml.busy) return mailViewW();
  if (!M.saved || (S.mw && S.mw.i === 5)) return `<div class="navline"><button class="back" data-go="reglages">← Réglages</button></div>${mwView()}`;
  return mailViewW();
};

(function () {
  const prevBind = window.bindExtra;
  window.bindExtra = function () {
    if (prevBind) prevBind();
    const w = S.mw;
    const a = $("#mw_addr"); if (a) { a.oninput = () => (w.addr = a.value); a.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); document.querySelector('[data-act="mw-addr"]').click(); } }; }
    const p = $("#mw_pw"); if (p) { p.oninput = () => (w.pw = p.value); p.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); document.querySelector('[data-act="mw-connect"]').click(); } }; }
    const h = $("#mw_host"); if (h) h.oninput = () => (w.host = h.value);
    const ok = $("#mw_ok"); if (ok) ok.onchange = () => { w.ok = ok.checked; w.err = ""; };
    const au = $("#mw_auto"); if (au) au.onchange = async () => { await api("/api/settings", { mail_auto: au.checked }); S.mst = await api("/api/mail/status", {}); toast(au.checked ? "Relève à l'ouverture activée" : "Relève à l'ouverture désactivée"); };
    if (S.v === "reglages" && S.sv === "mail" && w.focus) { w.focus = false; const f = document.querySelector(".obinput") || $("#mwh"); if (f) f.focus(); }
  };
})();

window.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-act^=mw-]"); if (!t) return;
  e.stopImmediatePropagation();
  const act = t.dataset.act, w = S.mw;
  const goTo = (i) => { w.i = i; w.err = ""; w.focus = true; render(); };
  if (act === "mw-create") { w.from = 1; return goTo(1); }
  if (act === "mw-have") { w.from = 0; return goTo(2); }
  if (act === "mw-prev") return goTo(w.i === 2 ? (w.from || 0) : Math.max(0, w.i - 1));
  if (act === "mw-next") return goTo(w.i + 1);
  if (act === "mw-show") { w.show = !w.show; return render(); }
  if (act === "mw-addr") {
    const v = (w.addr !== undefined ? w.addr : S.st.settings.mail || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { w.err = "Cette adresse ne semble pas complète (ex. camille.admin@ik.me)."; return render(); }
    await api("/api/settings", { mail: v }); S.st.settings.mail = v; w.addr = v;
    S.mst = await api("/api/mail/status", {});
    if (S.mst.unsupported) { w.err = esc(S.mst.unsupported); return render(); }
    return goTo(3);
  }
  if (act === "mw-connect") {
    const M = S.mst || {};
    if (!(w.pw || "").trim()) { w.err = "Colle d'abord le code."; return render(); }
    if (!w.ok) { w.err = "Coche l'autorisation : sans ton accord, je ne me connecte pas."; return render(); }
    w.busy = true; w.err = ""; render();
    const r = await api("/api/mail/connect", { address: w.addr || S.st.settings.mail, password: M.provider === "Gmail" ? w.pw.replace(/\s+/g, "") : w.pw.trim(), host: M.provider === "Ta messagerie" ? (w.host || "").trim() || null : null, consent: true });
    w.busy = false;
    if (!r.ok) {
      const tip = M.provider === "Gmail" ? " Vérifie que la validation en deux étapes et IMAP sont activés, puis recrée un code." : "";
      w.err = esc(r.msg || "La connexion n'a pas marché.") + tip; return render();
    }
    w.pw = ""; w.n = r.messages || 0; S.mst = r.status; await load();
    return goTo(5);
  }
  if (act === "mw-scan") { S.mw = { i: 0 }; render(); const b = document.querySelector('[data-act="ml-scan"]'); if (b) b.click(); return; }
  if (act === "mw-done") { S.mw = { i: 0 }; return render(); }
}, true);
