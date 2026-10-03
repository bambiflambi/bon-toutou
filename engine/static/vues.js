/* Bon toutou — Aujourd'hui, Calendrier, Contacts (aperçu). Tout vient de ton bureau, lu sur ton ordinateur. */
const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
function nextMonths(n) {
  const t = S.st.today, y0 = +t.slice(0, 4), m0 = +t.slice(5, 7) - 1;
  return [...Array(n)].map((_, i) => { const m = (m0 + i) % 12, y = y0 + Math.floor((m0 + i) / 12); return { y, m, key: monthKey(y, m) }; });
}
const upcoming = () => (S.st.events || []).filter((e) => !e.past);
const COLC = { FR: "#2F5DA8", NZ: "#0E7C6B", INT: "#7A4FB0" };

/* ------------------------------------------------ AUJOURD'HUI */
function homeView() {
  const st = S.st, c = st.counts, ev = upcoming(), items = [];
  const g = st.settings.guide || {};
  if (c.inbox) items.push(`<button class="titem main" data-go="trier"><span class="oi">${IC.inbox}</span><div class="grow"><b><span class="vb">Trier</span> tes nouveaux documents</b><small>${c.inbox} ${plural(c.inbox, "reçu")}${st.high ? `, ${st.high} ${plural(st.high, "peut", "peuvent")} être ${plural(st.high, "validé")} en un clic` : ""}</small></div><span class="go">›</span></button>`);
  const dos = (st.dossiers_open || []).find((d) => d.missing > 0), ready = (st.dossiers_open || []).find((d) => d.missing === 0);
  if (!dos && ready) items.push(`<button class="titem" data-dos="${ready.id}"><span class="oi">${IC.send}</span><div class="grow"><b><span class="vb">Finaliser</span> « ${esc(ready.label)} »</b><small>pour ${esc(ready.recipient)} · toutes les pièces sont prêtes</small></div><span class="go">›</span></button>`);
  if (dos) items.push(`<button class="titem" data-dos="${dos.id}"><span class="oi">${IC.folder}</span><div class="grow"><b><span class="vb">Compléter</span> « ${esc(dos.label)} »</b><small>pour ${esc(dos.recipient)} · ${dos.missing} ${plural(dos.missing, "pièce")} à ajouter</small></div><span class="go">›</span></button>`);
  const late = (st.events || []).find((e) => e.past && e.k === "expire");
  const soon = ev.find((e) => daysTo(e.d) <= 30);
  if (late) items.push(`<button class="titem warn" data-doc="${late.id}"><span class="oi">${IC.alert}</span><div class="grow"><b><span class="vb warn">Renouveler</span> ${esc(late.t)}</b><small>expiré depuis le ${frd(late.d)}</small></div><span class="go">›</span></button>`);
  else if (soon) items.push(`<button class="titem warn" ${soon.id ? `data-doc="${soon.id}"` : 'data-go="cal"'}><span class="oi">${IC.clock}</span><div class="grow"><b><span class="vb warn">${soon.k === "expire" ? "Renouveler" : "À faire"}</span> ${esc(soon.t)}</b><small>${daysTo(soon.d) === 0 ? "aujourd'hui" : `dans ${daysTo(soon.d)} ${plural(daysTo(soon.d), "jour")}`} · ${frd(soon.d)}</small></div><span class="go">›</span></button>`);
  if (!c.docs && !c.inbox && !g.fini && !g.masque) items.push(`<button class="titem main" data-act="g-start"><span class="oi">${IC.sparkles}</span><div class="grow"><b><span class="vb">Commencer</span> le premier tri guidé</b><small>5 minutes avec 3 de tes papiers</small></div><span class="go">›</span></button>`);
  const n = items.length;
  const strip = nextMonths(6).map((M) => { const es = ev.filter((e) => e.d.startsWith(M.key));
    return `<div class="mcol${es.length ? " has" : ""}"><span class="mn">${M_[M.m]}</span><span class="dots">${es.slice(0, 4).map((e) => `<i style="background:${COLC[e.cc] || "var(--accent)"}" title="${esc(e.t)}"></i>`).join("") || "<em>—</em>"}</span></div>`; }).join("");
  const owner = (st.settings.owner || "").split(" ")[0];
  return `<div class="hello"><div><div class="label">${frd(st.today)}</div><h1>${n ? `${owner ? esc(owner) + ", " : ""}${n} petite${n > 1 ? "s" : ""} chose${n > 1 ? "s" : ""} aujourd'hui` : `Tout est à jour${owner ? ", " + esc(owner) : ""}`}</h1>
    <p class="lead brandline" style="margin:4px 0 0">L'administration est absurde. <b>Bon toutou, lui, est dressé pour ça.</b></p>
    <p class="lead" style="margin:4px 0 0">${c.docs ? `Le reste est rangé. ${c.docs} ${plural(c.docs, "document")} à jour.` : "Ton bureau est prêt à recevoir tes premiers papiers."}</p></div></div>
  <div class="today">${items.join("") || `<div class="card" style="padding:18px">Rien d'urgent. Profite.</div>`}</div>
  <button class="calcard" data-go="cal"><div class="calhead"><span class="oi">${IC.calendar}</span><div class="grow"><b>Prochaines échéances</b><small>${ev.slice(0, 3).map((e) => `${esc(e.t)} · ${+e.d.slice(8)} ${M_[+e.d.slice(5, 7) - 1]}`).join("  ·  ") || "Aucune date connue pour l'instant : elles sont lues dans tes documents."}</small></div><span class="go">Calendrier ›</span></div><div class="mstrip">${strip}</div></button>
  <div class="tiles">
    <button class="tile" data-go="trier"><div class="top2"><span class="oi">${IC.inbox}</span><span class="num">${c.inbox}</span></div><b>Trier</b><small>ce qui vient d'arriver</small></button>
    <button class="tile" data-go="docs"><div class="top2"><span class="oi">${IC.folder}</span><span class="num">${c.docs}</span></div><b>Documents</b><small>une seule version de chaque</small></button>
    <button class="tile" data-go="dossiers"><div class="top2"><span class="oi">${IC.send}</span><span class="num">${c.dossiers}</span></div><b>Dossiers</b><small>à préparer ou en cours</small></button>
    <button class="tile" data-go="archives"><div class="top2"><span class="oi">${IC.archive}</span><span class="num">${st.archives_n}</span></div><b>Archives</b><small>envoyés, anciennes versions</small></button>
  </div>
  <p class="promise2">${IC.lock}<span>${st.local_only} ${plural(st.local_only, "document")} ne ${plural(st.local_only, "quitte", "quittent")} jamais ton ordinateur · ${c.egress} ${plural(c.egress, "sortie")} · <button class="linkbtn" style="padding:0" data-go="reglages" data-sv="priv">voir le journal</button></span></p>`;
}
const M_ = M;

/* ------------------------------------------------ CALENDRIER */
function calView() {
  const st = S.st, all = st.events || [], ev = upcoming(), past = all.filter((e) => e.past);
  const months = nextMonths(12).map((x) => Object.assign(x, { es: ev.filter((e) => e.d.startsWith(x.key)) }));
  const lastKey = months[11].key, later = ev.filter((e) => e.d.slice(0, 7) > lastKey);
  const evRow = (e) => `<button class="evt k-${esc(e.cc)}${e.past ? " past" : ""}" ${e.id ? `data-doc="${e.id}"` : `data-act="evnote" data-n="${esc(e.note || "")}"`}><span class="day">${+e.d.slice(8)}</span><span class="grow"><b>${esc(e.t)}</b><small>${cc(e.cc)} ${e.k}${!e.past && daysTo(e.d) <= 30 ? ` · <em class="soon">dans ${daysTo(e.d)} j</em>` : ""}</small></span></button>`;
  const ccs = [...new Set([...st.settings.countries, ...all.map((e) => e.cc)])];
  return `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h1>Calendrier</h1><p class="lead">Les dates lues dans tes documents (expirations, renouvellements) et les grandes échéances de tes pays. Tu es prévenu à l'avance, rien d'autre.</p></div>
    <button class="ghost" data-act="ics-dl" style="margin-bottom:20px">${IC.calendar} Ajouter à mon calendrier (.ics)</button></div>
  <div class="calleg">${ccs.map((c) => `<span>${cc(c)} ${esc(st.countries[c] || c)}</span>`).join("")}<span class="sub">· Le fichier .ics contient un rappel 30 jours avant chaque date. Il est créé ici : rien ne sort.</span></div>
  ${past.length ? `<div class="label" style="margin:0 0 8px">Déjà expiré</div><div class="card" style="margin-bottom:18px">${past.map((e) => `<button class="row rowbtn" data-doc="${e.id}">${cc(e.cc)}<div class="grow"><b>${esc(e.t)}</b><div class="sub">expiré le ${frd(e.d)} · à renouveler ou à terminer</div></div><span class="pill bad">expiré</span><span>›</span></button>`).join("")}</div>` : ""}
  <div class="calgrid">${months.map((X) => `<div class="mcard${X.es.length ? "" : " empty"}"><div class="mh"><b>${MONTHS_LONG[X.m]}</b><span class="sub">${X.y}</span></div>${X.es.map(evRow).join("") || `<div class="sub" style="padding:6px 2px">Rien</div>`}</div>`).join("")}</div>
  ${later.length ? `<div class="label" style="margin:22px 0 8px">Plus tard</div><div class="card">${later.map((e) => `<button class="row rowbtn" ${e.id ? `data-doc="${e.id}"` : ""}>${cc(e.cc)}<div class="grow"><b>${esc(e.t)}</b><div class="sub">${e.k} · ${frd(e.d)}</div></div><span>›</span></button>`).join("")}</div>` : ""}
  <p class="sub" style="margin-top:18px">Les dates « à faire » sont indicatives (elles varient selon l'année et ta situation). Abonnement automatique à ton agenda : <button class="linkbtn" style="padding:0" data-go="reglages" data-sv="calendrier">Réglages › Calendrier</button>.</p>`;
}

/* ------------------------------------------------ CONTACTS (bientôt) */
function contactsView() {
  return `<h1>Contacts</h1>
  <div class="card" style="padding:32px;text-align:center;max-width:560px"><span class="oi" style="margin:0 auto 12px">${IC.name}</span><b style="font-size:17px">Bientôt disponible</b>
    <p class="sub" style="margin:8px auto 0;max-width:42ch">Tes interlocuteurs administratifs, et pour chacun ce que tu lui as transmis. Rien n'est importé de ton carnet d'adresses.</p></div>`;
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-act=evnote]"); if (a) toast(a.dataset.n || "Échéance de ton pays");
});
