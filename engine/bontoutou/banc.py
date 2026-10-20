"""Banc d'essai de l'IA locale sur TES papiers (v0.10).

On prend quelques documents déjà rangés (un par type, texte déjà lu), on cache leur nom de fichier, et on demande
au modèle choisi ce qu'il y voit. Puis on compare à ton classement : type, date, organisme, pays.
Tout reste sur l'ordinateur : seuls les moteurs locaux sont acceptés (ia.ask le vérifie). Rien n'est modifié.
"""
import datetime as dt
import threading
import time

from . import classify, ia

STATE = {}          # modèle -> {status, done, total, items, started, ...}
_STOP = set()


def sample(B, n=6):
    """Un document par type (hors « Autres »), avec assez de texte lu ; les plus récents d'abord."""
    rows = B.db.execute(
        "SELECT d.id, d.type, d.label, d.country, d.emitter, d.doc_date, d.sha, d.path, d.orig_name FROM docs d "
        "JOIN texts t ON t.sha = d.sha WHERE d.status != 'copie' AND length(coalesce(t.text,'')) >= 80 "
        "ORDER BY d.doc_date DESC").fetchall()
    seen, out = set(), []
    for r in rows:
        T = classify.TYPES.get(r["type"]) or {}
        if not T or T.get("generic") or r["type"].startswith("autre") or r["type"] in seen:
            continue
        seen.add(r["type"])
        out.append(dict(r))
        if len(out) >= n:
            break
    return out


def _cmp_type(truth, got):
    if got == truth:
        return "juste"
    a, b = classify.TYPES.get(truth) or {}, classify.TYPES.get(got) or {}
    if a and b and a.get("cat") and a.get("cat") == b.get("cat"):
        return "proche"
    return "faux"


def _cmp_date(truth, got):
    if not truth:
        return None
    got = str(got or "")
    if got == truth:
        return "juste"
    if got[:7] == truth[:7]:
        return "proche"
    return "faux"


def _cmp_emitter(B, truth, got):
    t = (truth or "").strip()
    if not t or t.lower() in ("inconnu", "") or (hasattr(B, "_is_owner") and B._is_owner(t)):
        return None
    g = classify.slugify(str(got or "")).lower()
    if not g:
        return "faux"
    if g == classify.slugify(t).lower() or classify.same_emitter(t, got) or g in t.lower().replace(" ", "-") or t.lower().replace(" ", "-") in g:
        return "juste"
    return "faux"


def verdict(items):
    """Un avis en mots (jamais en pourcentage)."""
    done = [i for i in items if i.get("type")]
    if not done:
        return {"mot": "pas encore mesuré", "phrase": ""}
    ok = sum(1 for i in done if i["type"] == "juste")
    near = sum(1 for i in done if i["type"] == "proche")
    secs = [i["secs"] for i in done if i.get("secs")]
    avg = round(sum(secs) / len(secs), 1) if secs else 0
    n = len(done)
    if ok >= 0.8 * n:
        mot, phrase = "fiable", "Il reconnaît presque tous tes papiers : tu peux l'activer, Bon toutou vérifiera quand même chaque réponse."
    elif ok + near >= 0.6 * n:
        mot, phrase = "utile avec vérification", "Il trouve la bonne famille mais se trompe parfois de type : utile pour les papiers « à vérifier », toi tu valides."
    else:
        mot, phrase = "pas assez fiable", "Il se trompe trop souvent sur tes papiers : garde les règles seules, ou essaie un autre modèle."
    if avg > 90:
        phrase += " Il est lent sur cet ordinateur : Bon toutou ne le sollicitera que pour les documents incertains."
    return {"mot": mot, "phrase": phrase, "justes": ok, "proches": near, "total": n, "secondes": avg}


def start(B, engine_id, model, n=6):
    eng = ia.engine_by_id(engine_id)
    if not eng or not eng.get("running"):
        return {"ok": False, "msg": "Ce moteur d'IA ne tourne pas en ce moment."}
    if not model:
        return {"ok": False, "msg": "Choisis d'abord un modèle."}
    if STATE.get(model, {}).get("status") == "en cours":
        return {"ok": True, "deja": True}
    docs = sample(B, n)
    if len(docs) < 3:
        return {"ok": False, "msg": "Il faut au moins 3 documents rangés et lus (de types différents) pour un banc d'essai."}
    st = {"status": "en cours", "done": 0, "total": len(docs), "items": [], "started": dt.datetime.now().isoformat(timespec="seconds"),
          "engine": eng.get("name", ""), "model": model}
    STATE[model] = st
    _STOP.discard(model)
    countries = B.settings.get("countries") or ["FR"]

    def work():
        for d in docs:
            if model in _STOP:
                st["status"] = "arrêté"
                break
            text, _ = B.text_of(d["sha"], d["path"])
            it = {"doc_id": d["id"], "label": d["label"] or d["type"], "truth_type": d["type"]}
            t0 = time.time()
            try:
                # nom de fichier caché : il contient la réponse
                o = ia.ask(eng, model, classify.build_prompt(text, "document.pdf", countries), None, timeout=240)
                o = o if isinstance(o, dict) else {}
                it.update(secs=round(time.time() - t0, 1), got_type=o.get("type"),
                          type=_cmp_type(d["type"], o.get("type")), date=_cmp_date(d["doc_date"], o.get("date")),
                          emitter=_cmp_emitter(B, d["emitter"], o.get("emitter")),
                          country=("juste" if o.get("country") == d["country"] else "faux") if d["country"] else None)
            except Exception as e:
                it.update(secs=round(time.time() - t0, 1), erreur=f"{type(e).__name__}"[:80])
            st["items"].append(it)
            st["done"] += 1
        if st["status"] == "en cours":
            st["status"] = "fini"
        st["verdict"] = verdict(st["items"])
        if st["items"]:
            res = dict(B.settings.get("ai_banc") or {})
            res[model] = {"date": dt.date.today().isoformat(), "engine": st["engine"], **st["verdict"]}
            B.save_settings({"ai_banc": res})
    threading.Thread(target=work, daemon=True).start()
    return {"ok": True, "total": len(docs)}


def stop(model):
    _STOP.add(model)
    return {"ok": True}


def status(B):
    return {"runs": STATE, "saved": B.settings.get("ai_banc") or {}}
