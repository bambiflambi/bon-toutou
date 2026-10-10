/* Bon toutou — v0.7 : trier en étapes (idée de PiM, 10 oct. 2026).
   1. « Tu t'en sers encore ? » : Utile aujourd'hui / Archives — toujours ta décision, jamais celle de l'IA (sous l'aperçu, à gauche).
   2. La famille (catégorie) en tuiles, 3. la sous-famille, 4. le type s'il en reste plusieurs, 5. la fiche : émetteur, date, titulaire…
   Ce que Bon toutou a proposé est déjà choisi ; tout se rouvre d'un clic dans le fil en haut. Plus de longue liste déroulante :
   le même sélecteur en tuiles sert en mode Liste et dans « Corriger le classement ». */

/* ---------- le sélecteur de type en tuiles (famille › sous-famille › type), réutilisable */
const TP = {};   // état de chaque sélecteur ouvert, par clé
function tpTypes() {
  const C = S.st.settings.countries || [];
  return Object.entries(S.st.types).filter(([, t]) => !t.countries || t.countries.some((c) => C.includes(c)));
}
function tpFamilies() {
  const seen = new Set(tpTypes().map(([, t]) => t.cat));
  return Object.keys(S.st.categories).filter((c) => seen.has(c)).sort();
}
function tpSubs(cat) {
  const subs = {};
  tpTypes().forEach(([k, t]) => { if (t.cat === cat) (subs[t.sub] = subs[t.sub] || []).push(k); });
  return Object.keys(subs).sort().map((s) => [s, subs[s]]);
}
const subName = (s) => String(S.st.subs[s] || s).replace(/-/g, " ");
const catName = (c) => S.st.categories[c] || c;
function tpOpen(key, cur, onPick, step) {
  const t = S.st.types[cur] || {};
  TP[key] = { cur, onPick, step: step || "famille", cat: t.cat, sub: null, q: "" };
}
function tpInner(key) {
  const st = TP[key]; if (!st) return "";
  const T = S.st.types, curT = T[st.cur] || {};
  const n = (i) => (i < 9 ? `<kbd>${i + 1}</kbd>` : "");
  let head = "", body = "";
  if (st.q) {
    const ids = typeSearch(unaccent(st.q)).filter((k) => tpTypes().some(([x]) => x === k)).slice(0, 9);
    head = `<div class="tp-h">Résultats pour « ${esc(st.q)} »</div>`;
    body = ids.length ? `<div class="tiles">${ids.map((k, i) => `<button type="button" class="tile${k === st.cur ? " prop" : ""}" data-tp="${key}" data-tp-type="${k}">${n(i)}<span class="oi">${catIc(T[k].cat)}</span><b>${esc(T[k].label)}</b><small>${esc(catName(T[k].cat))} › ${esc(subName(T[k].sub))}</small></button>`).join("")}</div>`
      : `<div class="sub" style="padding:8px 2px">Aucun type ne correspond. Essaie un autre mot, ou choisis une famille.</div>`;
  } else if (st.step === "famille") {
    const F = tpFamilies(); const prop = F.includes(curT.cat) ? [curT.cat, ...F.filter((c) => c !== curT.cat)] : F;
    head = `<div class="tp-h">Quelle famille ?</div>`;
    body = `<div class="tiles">${prop.map((c, i) => `<button type="button" class="tile${c === curT.cat ? " prop" : ""}" data-tp="${key}" data-tp-cat="${c}">${n(i)}<span class="oi">${catIc(c)}</span><b>${esc(catName(c))}</b>${c === curT.cat ? `<small>proposé</small>` : ""}</button>`).join("")}</div>`;
  } else if (st.step === "sous") {
    const L = tpSubs(st.cat);
    head = `<div class="tp-h"><button type="button" class="linkbtn" data-tp="${key}" data-tp-back="famille">← Familles</button> ${esc(catName(st.cat))} : quelle sous-famille ?</div>`;
    body = `<div class="tiles">${L.map(([s, ks], i) => `<button type="button" class="tile${s === curT.sub ? " prop" : ""}" data-tp="${key}" data-tp-sub="${s}">${n(i)}<b>${esc(subName(s))}</b><small>${ks.map((k) => esc(T[k].label)).join(" · ")}</small></button>`).join("")}</div>`;
  } else {
    const ks = (tpSubs(st.cat).find(([s]) => s === st.sub) || [, []])[1];
    head = `<div class="tp-h"><button type="button" class="linkbtn" data-tp="${key}" data-tp-back="sous">← ${esc(catName(st.cat))}</button> ${esc(subName(st.sub))} : lequel ?</div>`;
    body = `<div class="tiles">${ks.map((k, i) => `<button type="button" class="tile${k === st.cur ? " prop" : ""}" data-tp="${key}" data-tp-type="${k}">${n(i)}<b>${esc(T[k].label)}</b></button>`).join("")}</div>`;
  }
  return head + body;
}
function tpHTML(key) {
  const st = TP[key]; if (!st) return "";
  return `<div class="tpick" data-tpk="${key}">
    <label class="say"><span aria-hidden="true">✎</span><input class="tp-q" data-tp="${key}" value="${esc(st.q)}" placeholder="Ou cherche : relevé, contrat d'apprentissage, assurance…" aria-label="Chercher un type"></label>
    <div class="tp-body" id="tpb_${key}">${tpInner(key)}</div></div>`;
}
function tpRefresh(key) { const el = document.getElementById("tpb_" + key); if (el) el.innerHTML = tpInner(key); }
function tpChooseType(key, k) { const st = TP[key]; if (st && st.onPick) st.onPick(k); }
function tpChooseSub(key, s) {
  const st = TP[key], ks = (tpSubs(st.cat).find(([x]) => x === s) || [, []])[1];
  if (ks.length === 1) return tpChooseType(key, ks[0]);
  st.sub = s; st.step = "type"; tpRefresh(key);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tp]"); if (!b || b.classList.contains("tp-q")) return;
  const key = b.dataset.tp, st = TP[key]; if (!st) return;
  e.preventDefault(); e.stopPropagation();
  if (b.dataset.tpCat) { st.cat = b.dataset.tpCat; st.step = "sous"; return tpRefresh(key); }
  if (b.dataset.tpSub) return tpChooseSub(key, b.dataset.tpSub);
  if (b.dataset.tpType) return tpChooseType(key, b.dataset.tpType);
  if (b.dataset.tpBack) { st.step = b.dataset.tpBack; return tpRefresh(key); }
}, true);
document.addEventListener("input", (e) => {
  const q = e.target.closest && e.target.closest(".tp-q"); if (!q) return;
  const st = TP[q.dataset.tp]; if (!st) return;
  st.q = q.value.trim(); tpRefresh(q.dataset.tp);
});
document.addEventListener("keydown", (e) => {
  // chiffres 1–9 : la tuile correspondante du sélecteur visible ; Entrée dans la recherche : le premier résultat
  const box = document.querySelector(".tpick"); if (!box || e.metaKey || e.ctrlKey || e.altKey) return;
  const inQ = e.target.classList && e.target.classList.contains("tp-q");
  if (inQ && e.key === "Enter") { const t = box.querySelector(".tile"); if (t) { e.preventDefault(); t.click(); } return; }
  if (!inQ && e.target.closest && e.target.closest("input,select,textarea")) return;
  if (/^[1-9]$/.test(e.key)) { const t = box.querySelectorAll(".tile")[+e.key - 1]; if (t) { e.preventDefault(); e.stopImmediatePropagation(); t.click(); } }
}, true);

/* ---------- Trier en cartes : les étapes */
S.et = S.et || {};
const needType = (p) => p.type === "autre" || (p.doubts || []).includes("type");
function etStep(p) {
  if (S.et.id !== p.id) {
    S.et = { id: p.id, step: p.usage ? (needType(p) ? "famille" : "fiche") : "usage" };
    if (S.et.step === "famille") etOpenPicker(p);
  }
  if (!p.usage) S.et.step = "usage";
  return S.et.step;
}
function etOpenPicker(p, step) {
  tpOpen("card", p.type, async (k) => {
    S.et.step = "fiche";
    const r = await api("/api/propose", { id: p.id, overrides: { type: k } });
    if (!r || r.error) { toast("Pas enregistré : " + ((r && r.error) || "erreur")); return load(); }
    await load(); toast(`${S.st.types[k].label} · le nom et le dossier sont mis à jour`);
  }, step);
  if (step === "sous") TP.card.cat = (S.st.types[p.type] || {}).cat;
}
function crumbs(p) {
  const T = S.st.types[p.type] || {}, st = S.et.step;
  const c = (k, label, on, title) => `<button type="button" class="crumb${on ? " on" : ""}" data-act="et-go" data-s="${k}" title="${esc(title)}">${label}</button>`;
  const u = p.usage === "archive" ? "Archives" : p.usage === "utile" ? "Utile aujourd'hui" : "Utile ou archives ?";
  return `<nav class="crumbs" aria-label="Étapes">${c("usage", esc(u), st === "usage", "Tu t'en sers encore ?")}<span>›</span>${c("famille", esc(catName(T.cat)), st === "famille", "Changer la famille")}<span>›</span>${c("sous", esc(subName(T.sub)), false, "Changer la sous-famille")}<span>›</span>${c("fiche", esc(T.label || p.type_label), st === "fiche", "Nom, émetteur, date…")}</nav>`;
}
function usageLeft(p) {
  const hint = p.usage ? "" : `<div class="sub" style="text-align:center;margin-top:6px">Bon toutou pense : ${p.usage_hint === "archive" ? "plutôt Archives" : "plutôt utile aujourd'hui"}${p.usage_hint === "archive" ? " (une version plus récente existe ou la situation est finie)" : ""}. C'est toi qui décides.</div>`;
  return `<div class="usage${p.usage ? "" : " ask"}"><div class="u-q">Tu t'en sers encore ?</div><div class="u-btns">
    <button type="button" class="ubtn${p.usage === "utile" ? " on" : ""}" data-act="et-usage" data-u="utile" data-id="${p.id}"><b>Utile aujourd'hui</b><small>Dans Documents (U)</small></button>
    <button type="button" class="ubtn${p.usage === "archive" ? " on" : ""}" data-act="et-usage" data-u="archive" data-id="${p.id}"><b>Archives</b><small>Gardé, rangé à part (A)</small></button></div>${hint}</div>`;
}
function fiche(p) {
  const T = S.st.types[p.type] || {}, C = S.st.settings.countries || [];
  const own = S.st.settings.owner || "toi", who = p.person === "moi" || !p.person || p.person === own ? "moi" : p.person;
  const holders = (S.st.settings.holders || []).map((h) => h.nom).filter(Boolean);
  const em = p.emitter && p.emitter !== "Inconnu" ? p.emitter_display || p.emitter : "";
  const chip = (f, v, label, on) => `<button type="button" class="chip${on ? " first" : ""}" data-act="et-set" data-f="${f}" data-v="${esc(v)}">${esc(label)}</button>`;
  const dbt = (k) => ((p.doubts || []).includes(k) ? ` <span class="pill warn">à vérifier</span>` : "");
  return `<div class="fiche">
    ${T.emetteur !== false ? `<label class="ff"><span>Émetteur${dbt("emitter")}</span><input class="field" data-et-f="emitter" value="${esc(em)}" placeholder="Nom de l'entreprise, de l'école, de l'organisme…">
      ${(p.emitter_candidates || []).length ? `<div class="chips">${p.emitter_candidates.map((x) => chip("emitter", x, x, false)).join("")}</div>` : ""}</label>` : ""}
    <label class="ff"><span>Date du document${dbt("date")}</span><input class="field" type="date" data-et-f="date" value="${esc(p.date || "")}">${p.date_note ? `<small class="sub" style="color:var(--warning)">≈ ${esc(p.date_note)}</small>` : ""}</label>
    <div class="ff"><span>Titulaire${dbt("person")}</span><div class="chips">${chip("person", "moi", "Toi", who === "moi")}${holders.map((h) => chip("person", h, h, who === h)).join("")}${who !== "moi" && !holders.includes(who) ? chip("person", who, who, true) : ""}</div>
      <input class="field" data-et-f="person" value="" placeholder="Quelqu'un d'autre : son nom" style="margin-top:6px"></div>
    <label class="ff"><span>Intitulé exact <small class="sub">(facultatif)</small></span><input class="field" data-et-f="detail" value="${esc(p.detail || "")}" placeholder="ex. Contrat d'apprentissage BTS, ASSR2…"></label>
    ${T.expiry ? `<label class="ff"><span>Expire le</span><input class="field" type="date" data-et-f="expiry" value="${esc(p.expiry || "")}"></label>` : ""}
    ${C.length > 1 ? `<div class="ff"><span>Pays</span><div class="chips">${C.map((c) => chip("country", c, `${c} · ${S.st.countries[c] || c}`, c === p.country)).join("")}</div></div>` : ""}
  </div>`;
}
card = function (p, n) {
  const pos = (S.inbox || []).length - n + 1, step = etStep(p);
  let right;
  if (step === "usage") right = `<div class="et-wait"><b>D'abord, à gauche : tu t'en sers encore ?</b><div class="sub">Bon toutou propose : ${esc(p.label)}${p.emitter && p.emitter !== "Inconnu" ? ` · ${esc(p.emitter_display || p.emitter)}` : ""} · ${frd(p.date)}. Tu pourras tout changer à l'étape suivante.</div></div>`;
  else if (step === "famille" || step === "sous") { if (!TP.card || S.et.pk !== p.id + step) { etOpenPicker(p, step); S.et.pk = p.id + step; } right = tpHTML("card"); }
  else right = fiche(p);
  return `<div class="ccard card ${p.confidence}" id="ccard">
    <div class="cleft">${usageLeft(p)}${preview(p)}<button class="linkbtn copen" data-open-inbox="${p.id}">Ouvrir en grand</button></div>
    <div class="cright">
      <div class="ctop"><span class="sub">${pos} / ${(S.inbox || []).length}</span><span class="conf ${p.confidence}">${CONF[p.confidence]}</span>${p.cat ? lvBadge(p.cat) : ""}${p.ai_pending ? `<span class="pill acc"><span class="spin" style="width:11px;height:11px"></span> IA locale en train de lire…</span>` : ""}</div>
      ${crumbs(p)}
      <h2 class="ctitle">${esc(p.label)} ${cc(p.country)}</h2>
      ${p.duplicate ? `<span class="pill bad">Doublon exact de « ${esc(p.duplicate.label)} »</span>` : ""}
      ${conflictBox(p)}
      ${right}
      ${step !== "usage" ? `<div class="cdest"><span class="sub">Rangé dans</span> <span class="fname">${esc(p.dest)}/</span><br><span class="fname"><b>${esc(p.name)}</b></span>
        <div class="sub">${esc(p.relation)} · reçu : ${esc(p.source)}${p.origin ? ` · depuis « ${esc(p.origin)} »` : ` · ${esc(p.orig)}`}</div></div>` : ""}
      ${reasons(p)}
      <div class="cacts">
        <button class="ghost" data-act="c-later" title="Flèche gauche">← Plus tard</button>
        <button class="ghost${step === "famille" || step === "sous" ? " on" : ""}" data-act="et-go" data-s="famille" title="Changer la famille (flèche bas)">↓ Changer</button>
        <button class="cta" data-act="c-ok" data-id="${p.id}" title="${p.usage ? "Flèche droite" : "Choisis d'abord : utile aujourd'hui ou archives"}" ${p.usage ? "" : "disabled"}>Ranger →</button>
      </div>
      <div class="ckeys"><button class="linkbtn" data-act="c-undo" ${S.lastBatch ? "" : "disabled"}>Annuler (Z)</button><span>·</span><button class="linkbtn" data-act="c-unknown" data-id="${p.id}" title="Il quitte la file et ne revient pas, même si tu réimportes le dossier. « Les revoir » le ramène.">Inconnu · plus tard (I)</button><span>·</span><button class="linkbtn" data-act="reanalyze" title="Relit les documents à trier avec les règles actuelles. Tes corrections sont gardées.">Relancer l'analyse</button><span class="sub">U A ← → ↓ 1–9 I Z au clavier</span></div>
    </div></div>`;
};

async function etSet(id, f, v) {
  const r = await api("/api/propose", { id, overrides: { [f]: v } });
  if (!r || r.error) { toast("Pas enregistré : " + ((r && r.error) || "erreur")); return load(); }
  await load();
  toast({ emitter: "Émetteur", date: "Date", person: "Titulaire", detail: "Intitulé", country: "Pays", expiry: "Expiration" }[f] + " enregistré · le nom et le dossier sont mis à jour");
}
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (!["et-usage", "et-go", "et-set", "c-fix"].includes(act)) return;
  e.stopImmediatePropagation();
  const p = (S.inbox || []).find((x) => x.id === (a.dataset.id || S.et.id)) || queue()[0]; if (!p) return;
  if (act === "et-usage") {
    const first = !p.usage;
    S.et = { id: p.id, step: first ? (needType(p) ? "famille" : "fiche") : S.et.step === "usage" ? "fiche" : S.et.step };
    if (S.et.step === "famille") etOpenPicker(p);
    const r = await api("/api/propose", { id: p.id, overrides: { usage: a.dataset.u } });
    if (!r || r.error) { toast("Pas enregistré"); return load(); }
    await load(); return toast(a.dataset.u === "archive" ? "Archives · il sera rangé à part, toujours retrouvable" : "Utile aujourd'hui · il sera dans Documents");
  }
  if (act === "et-go" || act === "c-fix") {
    const s = act === "c-fix" ? "fiche" : a.dataset.s;   // « Corriger la date » (conflit) : la fiche
    if (s === "usage") { S.et.step = p.usage ? S.et.step : "usage"; const el = document.querySelector(".usage"); if (el) { el.classList.add("pulse"); setTimeout(() => el.classList.remove("pulse"), 900); } return; }
    if (!p.usage) return toast("D'abord, à gauche : utile aujourd'hui ou archives ?");
    S.et.step = s === "sous" ? "sous" : s; S.et.pk = null;
    if (s === "famille" || s === "sous") { etOpenPicker(p, s); S.et.pk = p.id + s; }
    return render();
  }
  if (act === "et-set") return etSet(p.id, a.dataset.f, a.dataset.v);
}, true);
document.addEventListener("change", (e) => {
  const el = e.target.closest && e.target.closest("[data-et-f]"); if (!el || !S.et.id) return;
  const v = el.value.trim(); if (!v && el.dataset.etF !== "detail") return;
  etSet(S.et.id, el.dataset.etF, v);
});
document.addEventListener("keydown", (e) => {
  if (S.v !== "trier" || S.tmode !== "cartes" || S.modal || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input,select,textarea,[contenteditable]")) return;
  const p = queue()[0]; if (!p) return;
  const click = (sel) => { const b = document.querySelector(sel); if (b && !b.disabled) { e.preventDefault(); e.stopImmediatePropagation(); b.click(); } };
  if (e.key === "u" || e.key === "U") return click('[data-act=et-usage][data-u=utile]');
  if (e.key === "a" || e.key === "A") return click('[data-act=et-usage][data-u=archive]');
  if (e.key === "ArrowDown") return click('[data-act=et-go][data-s=famille]');
  if (e.key === "ArrowRight" && !p.usage) { e.preventDefault(); e.stopImmediatePropagation(); return toast("D'abord : utile aujourd'hui (U) ou archives (A) ?"); }
}, true);

/* ---------- mode Liste : le type se choisit en tuiles, et « tu t'en sers encore ? » */
const editFieldsListe = editFields;
editFields = function (p) {
  let h = editFieldsListe(p);
  const T = S.st.types[p.type] || {};
  const open = S.tpList === p.id;
  const pick = `<div class="ff-type"><span class="lbl">Type</span><button type="button" class="ghost small" data-act="tp-list" data-id="${p.id}">${catIc(T.cat).replace("<svg", '<svg style="width:14px;height:14px"')} ${esc(catName(T.cat))} › ${esc(T.label || p.type)} · ${open ? "fermer" : "changer"}</button>
    <span class="seg u-seg"><button type="button" class="${p.usage === "utile" ? "on" : ""}" data-act="et-usage-l" data-u="utile" data-id="${p.id}">Utile aujourd'hui</button><button type="button" class="${p.usage === "archive" ? "on" : ""}" data-act="et-usage-l" data-u="archive" data-id="${p.id}">Archives</button></span>
    ${open ? tpHTML("list_" + p.id) : ""}</div>`;
  return h.replace(/<label>Type<select[\s\S]*?<\/select><\/label>/, "") .replace('<div class="edit">', pick + '<div class="edit">');
};
document.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  if (a.dataset.act === "tp-list") {
    e.stopImmediatePropagation();
    const id = a.dataset.id, p = (S.inbox || []).find((x) => x.id === id); if (!p) return;
    if (S.tpList === id) { S.tpList = null; return render(); }
    S.tpList = id;
    tpOpen("list_" + id, p.type, async (k) => { S.tpList = null; await api("/api/propose", { id, overrides: { type: k } }); await load(); toast(`${S.st.types[k].label} · le nom et le dossier sont mis à jour`); });
    return render();
  }
  if (a.dataset.act === "et-usage-l") {
    e.stopImmediatePropagation();
    await api("/api/propose", { id: a.dataset.id, overrides: { usage: a.dataset.u } }); await load();
  }
}, true);

/* ---------- « Corriger le classement » d'un document rangé : les mêmes tuiles */
const docViewListe = docView;
docView = function () {
  let h = docViewListe();
  const d = S.doc; if (!d || !S.fix) return h;
  if (!TP.doc || TP.doc.for !== d.id) {
    tpOpen("doc", d.type, (k) => {
      TP.doc.cur = k; const inp = document.getElementById("fx_type"); if (inp) inp.value = k;
      const lab = document.getElementById("fx_type_lab"); if (lab) lab.textContent = `${catName(S.st.types[k].cat)} › ${S.st.types[k].label}`;
      TP.doc.step = "famille"; TP.doc.q = ""; tpRefresh("doc");
    });
    TP.doc.for = d.id;
  }
  const k = TP.doc.cur, T = S.st.types[k] || {};
  const picker = `<div class="ff-type" style="grid-column:1/-1"><span class="lbl">Type</span><b id="fx_type_lab">${esc(catName(T.cat))} › ${esc(T.label || k)}</b><input type="hidden" id="fx_type" value="${esc(k)}">${tpHTML("doc")}</div>`;
  return h.replace(/<label>Type<select class="field" id="fx_type">[\s\S]*?<\/select><\/label>/, picker);
};
