/* Bon toutou — v0.9.5 : les sites officiels s'ouvrent dans le navigateur que tu choisis.
   Le moteur demande au système d'ouvrir l'adresse (comme un double-clic sur un lien) ; seules les adresses connues sont acceptées.
   Chargé en dernier : remplace openExternal (setup.js) pour toute l'app. */

function openFallback(url) {
  try { const T = window.__TAURI__; if (T && T.opener && T.opener.openUrl) return T.opener.openUrl(url); } catch (z) {}
  window.open(url, "_blank");
}
async function openVia(url, browser, remember) {
  let r;
  try { r = await api("/api/openurl", { url, browser: browser || "", remember: !!remember }); } catch (z) { r = null; }
  if (r && r.ok) return true;
  if (r && r.msg) toast(r.msg);
  else openFallback(url);          // moteur ancien ou injoignable : on essaie quand même
  return false;
}
window.openExternal = openExternal = async function (url) {
  const st = S.st;
  if (!st || st.setup || /^mailto:/i.test(url)) return openVia(url, "");
  const choice = (st.settings && st.settings.navigateur) || "";
  if (choice) return openVia(url, choice);
  let L = S.browsers;
  if (!L) { try { L = (await api("/api/browsers")).browsers; } catch (z) { L = null; } S.browsers = L; }
  if (!L || L.length <= 1) return openVia(url, "defaut", true);   // un seul choix possible : pas de question
  S.modal = { kind: "browser", url, pick: L[0].id, always: true };
  render();
};

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (z) { return u; } }
function browserModal(m) {
  const L = S.browsers || [];
  return `<h2 style="margin-top:0">Avec quel navigateur ouvrir les sites ?</h2>
    <p class="sub">Bon toutou va ouvrir <b>${esc(hostOf(m.url))}</b>. Il n'envoie rien lui-même : c'est ton navigateur qui se connecte, avec tes comptes habituels.</p>
    <div class="brlist">${L.map((b) => `<label class="brrow${m.pick === b.id ? " on" : ""}"><input type="radio" name="br" value="${esc(b.id)}" ${m.pick === b.id ? "checked" : ""} data-br="${esc(b.id)}"><span class="oi">${IC.globe}</span><b>${esc(b.label)}</b></label>`).join("")}</div>
    <label class="chk" style="margin-top:12px"><input type="checkbox" id="br_always" ${m.always ? "checked" : ""}> Toujours utiliser ce choix (modifiable dans Réglages › Navigateur)</label>
    <div class="acts" style="margin-top:14px"><button class="cta" data-act="br-open">Ouvrir le site</button><button class="linkbtn" data-act="m-close">Annuler</button></div>`;
}
(function () {
  const prevModal = window.modalView;
  window.modalView = function () {
    if (S.modal && S.modal.kind === "browser") return `<div class="ov" data-act="m-close-bg"><div class="modal" role="dialog">${browserModal(S.modal)}</div></div>`;
    return prevModal ? prevModal() : "";
  };
  const prevBind = window.bindExtra;
  window.bindExtra = function () {
    if (prevBind) prevBind();
    document.querySelectorAll("[data-br]").forEach((el) => (el.onchange = () => { if (S.modal) { S.modal.pick = el.dataset.br; render(); } }));
    const al = $("#br_always"); if (al) al.onchange = () => { if (S.modal) S.modal.always = al.checked; };
  };
})();

/* Réglages › Navigateur */
const brLabel = () => { const c = S.st.settings.navigateur || ""; if (!c) return "Demander à la première ouverture";
  const b = (S.browsers || []).find((x) => x.id === c); return b ? b.label : c === "defaut" ? "Navigateur par défaut" : c; };
try { if (!REG[0][1].find((x) => x[0] === "navigateur")) REG[0][1].push(["navigateur", "globe", "Navigateur", brLabel]); } catch (z) {}
const reglagesViewL = reglagesView;
reglagesView = function () {
  if (S.sv !== "navigateur") return reglagesViewL();
  if (!S.browsers) { api("/api/browsers").then((r) => { S.browsers = r.browsers || []; render(); }); }
  const L = S.browsers || [], c = S.st.settings.navigateur || "";
  return `${setHead("globe", "Navigateur", "Les sites officiels (Ameli, impots.gouv, ANTS…) s'ouvrent dans ce navigateur, pour cet ordinateur seulement.")}
    <div class="card">${!L.length ? `<div class="row"><span class="sub">Recherche des navigateurs…</span></div>` : L.map((b) => `<label class="row brrow${c === b.id ? " on" : ""}"><input type="radio" name="brs" data-brset="${esc(b.id)}" ${c === b.id ? "checked" : ""}><span class="oi">${IC.globe}</span><div class="grow"><b>${esc(b.label)}</b></div></label>`).join("")}
      <label class="row brrow${!c ? " on" : ""}"><input type="radio" name="brs" data-brset="" ${!c ? "checked" : ""}><span class="oi">${IC.clock}</span><div class="grow"><b>Me demander à chaque fois</b><div class="sub">jusqu'à ce que je coche « Toujours utiliser ce choix »</div></div></label></div>
    <p class="sub">Bon toutou n'ouvre que des adresses officielles qu'il connaît. Rien ne part de l'app : c'est ton navigateur qui se connecte.</p>
    <div class="acts"><button class="ghost small" data-act="br-test">Essayer avec service-public.gouv.fr</button></div>`;
};

window.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act === "br-open" && S.modal && S.modal.kind === "browser") {
    e.stopImmediatePropagation();
    const m = S.modal; S.modal = null;
    const ok = await openVia(m.url, m.pick, m.always);
    if (m.always && ok) { S.st.settings.navigateur = m.pick; await load(); } else render();
    return;
  }
  if (act === "br-test") { e.stopImmediatePropagation(); return openExternal("https://www.service-public.gouv.fr"); }
}, true);
window.addEventListener("change", async (e) => {
  const el = e.target.closest && e.target.closest("[data-brset]"); if (!el) return;
  await api("/api/settings", { navigateur: el.dataset.brset });
  toast(el.dataset.brset ? "Navigateur enregistré" : "Bon toutou te demandera la prochaine fois");
  load();
}, true);
