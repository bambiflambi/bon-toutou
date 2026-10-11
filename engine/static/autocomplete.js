/* Bon toutou — v0.7.2 : ce que tu as déjà écrit revient tout seul.
   Tout champ marqué data-ac="emitters | persons | details" propose, dès 2 lettres, les noms déjà connus de ton bureau
   (documents rangés et corrections en cours), du plus utilisé au plus rare. ↓ ↑ pour choisir, Entrée ou Tab pour prendre. */
const AC = { el: null, items: [], i: 0, box: null };
const acNorm = (x) => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function acMatches(kind, q, extra) {
  const n = acNorm(q); if (n.length < 2) return [];
  const all = [...(extra || []), ...(((S.known || {})[kind]) || [])].filter((v, i, a) => v && a.indexOf(v) === i);
  const words = (v) => acNorm(v).split(/[\s\-_'’.]+/);
  const starts = all.filter((v) => acNorm(v).startsWith(n));
  const word = all.filter((v) => !starts.includes(v) && words(v).some((w) => w.startsWith(n)));
  const inside = all.filter((v) => !starts.includes(v) && !word.includes(v) && acNorm(v).includes(n));
  return [...starts, ...word, ...inside].filter((v) => acNorm(v) !== n).slice(0, 6);
}
function acClose() { if (AC.box) AC.box.remove(); AC.box = null; AC.el = null; AC.items = []; }
function acShow(el) {
  const extra = el.dataset.acExtra ? el.dataset.acExtra.split("|") : [];
  AC.items = acMatches(el.dataset.ac, el.value, extra); AC.i = 0; AC.el = el;
  if (!AC.items.length) { if (AC.box) AC.box.remove(); AC.box = null; return; }
  if (!AC.box) { AC.box = document.createElement("div"); AC.box.className = "acbox"; AC.box.setAttribute("role", "listbox"); document.body.appendChild(AC.box); }
  const r = el.getBoundingClientRect();
  Object.assign(AC.box.style, { left: r.left + window.scrollX + "px", top: r.bottom + window.scrollY + 4 + "px", width: Math.max(r.width, 220) + "px" });
  const n = acNorm(el.value);
  AC.box.innerHTML = AC.items.map((v, i) => {
    const k = acNorm(v).indexOf(n), hl = k >= 0 ? esc(v.slice(0, k)) + "<b>" + esc(v.slice(k, k + n.length)) + "</b>" + esc(v.slice(k + n.length)) : esc(v);
    return `<div class="acitem${i === AC.i ? " on" : ""}" role="option" data-aci="${i}">${hl}</div>`;
  }).join("") + `<div class="achint">Entrée ou Tab pour choisir · déjà utilisé dans ton bureau</div>`;
}
function acPick(i) {
  const el = AC.el, v = AC.items[i]; if (!el || v == null) return;
  el.value = v; el.dataset.acPicked = "1"; acClose();
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
document.addEventListener("input", (e) => { const el = e.target.closest && e.target.closest("[data-ac]"); if (el) acShow(el); });
document.addEventListener("focusout", (e) => { if (e.target === AC.el) setTimeout(() => { if (AC.el === e.target && document.activeElement !== e.target) acClose(); }, 150); });
document.addEventListener("mousedown", (e) => { const it = e.target.closest && e.target.closest("[data-aci]"); if (it) { e.preventDefault(); acPick(+it.dataset.aci); } });
document.addEventListener("keydown", (e) => {
  if (!AC.box || e.target !== AC.el) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault(); e.stopImmediatePropagation();
    AC.i = (AC.i + (e.key === "ArrowDown" ? 1 : -1) + AC.items.length) % AC.items.length;
    AC.box.querySelectorAll(".acitem").forEach((x, i) => x.classList.toggle("on", i === AC.i)); return;
  }
  if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopImmediatePropagation(); return acPick(AC.i); }
  if (e.key === "Escape") { e.stopImmediatePropagation(); acClose(); }
}, true);
window.addEventListener("resize", acClose);
