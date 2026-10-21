"""Bon toutou — v0.9.3 « Retrouver et prêt à l'emploi ».

Tout est calculé sur ton ordinateur, à partir de l'index et du texte déjà lu (aucun nouvel OCR, aucun réseau) :
- recherche dans le texte lu + synonymes par type + étiquettes ;
- ce que prouve chaque document et jusqu'à quand (usages) ;
- les Essentiels (étage du haut de Documents) avec leur voyant et où les renouveler ;
- les rappels (« sonder » un organisme au bon moment) ;
- la fiche Profil : les numéros qu'on te demande toujours, retrouvés dans tes documents (jamais envoyés à une IA) ;
- les doublons élargis (même type, même date, même organisme, même taille ; même bande MRZ ; même nom de fichier).
Les données (usages, fraîcheur, organismes, synonymes, liste des Essentiels) sont dans packs/usages.json.
"""
import datetime as dt
import json
import os
import re
import unicodedata

from . import classify
from .catalog import TYPES, CATEGORIES, SUB_FOLDERS_FR

_PACK = {}


def pack():
    if not _PACK:
        p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "packs", "usages.json")
        try:
            with open(p, encoding="utf-8") as f:
                _PACK.update(json.load(f))
        except Exception:
            _PACK.update({"usages": {}, "renouveler": {}, "essentiels": [], "synonymes": {}})
    return _PACK


def _ex(d):
    try:
        return (json.loads(d["extra"]) or {}) if d["extra"] else {}
    except Exception:
        return {}


def _date(s):
    try:
        return dt.date.fromisoformat(str(s)[:10])
    except Exception:
        return None


# ------------------------------------------------------------------ fiche : période, émission, forme, collections
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
FORMES = {"original": "Original", "copie": "Copie", "apostille": "Apostillé", "legalise": "Légalisé", "traduit": "Traduit"}
BIEN_KINDS = {"logement": "Logement", "vehicule": "Véhicule", "compte": "Compte", "entreprise": "Entreprise", "autre": "Autre bien"}


def period_of(d, ex=None):
    """Période couverte : écrite dans la fiche, sinon déduite du type (mensuel → le mois, annuel → l'année)."""
    ex = _ex(d) if ex is None else ex
    if ex.get("period"):
        return ex["period"]
    if ex.get("lot") and isinstance(ex["lot"], list) and len(ex["lot"]) == 2:
        return f"{ex['lot'][0]}/{ex['lot'][1]}"
    per = (TYPES.get(d["type"]) or {}).get("period")
    if per == "month" and d["doc_date"]:
        return d["doc_date"][:7]
    if per == "year" and d["doc_date"]:
        return d["doc_date"][:4]
    return None


def period_label(p):
    if not p:
        return ""
    p = str(p)
    if "/" in p:
        a, b = p.split("/", 1)
        return f"de {period_label(a)} à {period_label(b)}"
    if re.fullmatch(r"\d{4}-\d{2}", p):
        return f"{MOIS[int(p[5:7]) - 1]} {p[:4]}"
    if re.fullmatch(r"\d{4}-T[1-4]", p):
        return f"{p[6]}{'er' if p[6] == '1' else 'e'} trimestre {p[:4]}"
    return p


def issued_of(d, ex=None):
    ex = _ex(d) if ex is None else ex
    return ex.get("issued") or d["doc_date"]


def usages_of(d, today=None, ex=None):
    """Ce que prouve ce document, et jusqu'à quand. state : ok | soon | old."""
    today = today or dt.date.today()
    ex = _ex(d) if ex is None else ex
    out = []
    issued = _date(issued_of(d, ex))
    for usage, days, serie in pack().get("usages", {}).get(d["type"], []):
        u = {"usage": usage, "until": None, "state": "ok", "serie": serie}
        if days and issued:
            until = issued + dt.timedelta(days=days)
            u["until"] = until.isoformat()
            left = (until - today).days
            u["state"] = "old" if left < 0 else "soon" if left <= 21 else "ok"
        elif d["expiry"]:
            u["until"] = d["expiry"]
            exp = _date(d["expiry"])
            if exp:
                left = (exp - today).days
                u["state"] = "old" if left < 0 else "soon" if left <= (183 if d["type"] == "passeport" else 60) else "ok"
        if d["status"] != "actuel" and u["state"] == "ok" and not serie:
            u["state"] = "old"   # une ancienne version ne sert plus, sauf dans une série (« 3 derniers »)
        out.append(u)
    return out


def renew_of(d_type, emitter_display=""):
    r = dict(pack().get("renouveler", {}).get(d_type) or {})
    if r and r.get("organisme", "").startswith("Ton ") and emitter_display:
        r["organisme"] = r["organisme"] + f" ({emitter_display})"
    return r or None


# ------------------------------------------------------------------ titulaire
def _is_me(B, d):
    p = (d["person"] or "").strip()
    if not p or p == "moi":
        return True
    own = (B.settings.get("owner") or "").strip()
    try:
        return bool(own) and (p == own or B._is_owner(p))
    except Exception:
        return p == own


# ------------------------------------------------------------------ Essentiels
def _fr(iso):
    d = _date(iso)
    return d.strftime("%d/%m/%Y") if d else (iso or "")


def _match(u, usage):
    return not usage or u["usage"] == usage or u["usage"].startswith(usage)


def essentials(B, today=None):
    today = today or dt.date.today()
    P = pack()
    rows = B.db.execute("SELECT * FROM docs WHERE status IN ('actuel','ancienne_version')").fetchall()
    mine = [r for r in rows if _is_me(B, r)]
    out = []
    for slot in P.get("essentiels", []):
        types = slot["types"]
        cands = [r for r in mine if r["type"] in types]
        cur = [r for r in cands if r["status"] == "actuel"]
        if not cands and not slot.get("always"):
            continue
        item = {"id": slot["id"], "label": slot["label"], "ic": slot.get("ic", "folder"), "types": types, "state": "missing",
                "doc_id": None, "doc_label": "", "date": None, "until": None, "msg": "pas encore dans ton bureau", "count": 0, "serie": slot.get("serie")}
        usage = slot.get("usage")
        if slot.get("serie"):
            n = slot["serie"]
            best = None
            for r in cands:
                for u in usages_of(r, today):
                    if _match(u, usage) and u["state"] != "old":
                        item["count"] += 1
            pool = sorted(cands, key=lambda r: issued_of(r) or "", reverse=True)
            best = pool[0] if pool else None
            if best:
                item.update(doc_id=best["id"], doc_label=best["label"], date=issued_of(best))
                c = min(item["count"], n)
                item["state"] = "ok" if c >= n else "soon" if c else "old"
                item["msg"] = f"{c} sur {n} de moins de 3 mois" if c < n else f"les {n} derniers sont prêts"
        elif cur or cands:
            pool = cur or cands
            def score(r):
                us = [u for u in usages_of(r, today) if _match(u, usage)]
                rank = {"ok": 0, "soon": 1, "old": 2}
                st = min((rank[u["state"]] for u in us), default=0 if r["status"] == "actuel" else 2)
                return (st, -(int((issued_of(r) or "0000")[:4]) * 10000 + int((issued_of(r) or "0000-00-00")[5:7] or 0) * 100 + int((issued_of(r) or "0000-00-00")[8:10] or 0)))
            best = sorted(pool, key=score)[0]
            us = [u for u in usages_of(best, today) if _match(u, usage)]
            st = {0: "ok", 1: "soon", 2: "old"}[score(best)[0]]
            until = next((u["until"] for u in us if u["until"]), best["expiry"])
            item.update(doc_id=best["id"], doc_label=best["label"], date=issued_of(best), until=until, state=st)
            if st == "old":
                item["msg"] = (f"expiré le {_fr(until)}" if best["expiry"] and until == best["expiry"] else f"trop ancien depuis le {_fr(until)}" if until else "ancienne version")
            elif st == "soon":
                item["msg"] = ("moins de 6 mois de validité" if best["type"] == "passeport" else f"valable jusqu'au {_fr(until)}")
            else:
                item["msg"] = f"valable jusqu'au {_fr(until)}" if until else f"du {_fr(issued_of(best))}"
        best_type = next((r["type"] for r in cands), types[0])
        em = ""
        if item["doc_id"]:
            r = B.db.execute("SELECT emitter, extra FROM docs WHERE id=?", (item["doc_id"],)).fetchone()
            em = _ex(r).get("emitter_display") or (r["emitter"] or "").replace("-", " ")
            em = "" if em == "Inconnu" else em
        item["renew"] = renew_of(best_type, em)
        out.append(item)
    return out


def reminders(B, today=None):
    """Ce qu'il faut aller chercher (sonder) maintenant : essentiels trop vieux ou bientôt, nouvel avis d'impôt publié."""
    today = today or dt.date.today()
    out = []
    for e in essentials(B, today):
        if e["state"] in ("old", "soon") and e["doc_id"]:
            out.append({"id": e["id"], "label": e["label"], "state": e["state"], "msg": e["msg"], "doc_id": e["doc_id"], "renew": e["renew"]})
    last = B.db.execute("SELECT doc_date FROM docs WHERE type='avis_impot' AND status='actuel' ORDER BY doc_date DESC LIMIT 1").fetchone()
    if last and today.month >= 8 and (last["doc_date"] or "")[:4] < str(today.year):
        out.insert(0, {"id": "avis_impot_new", "label": f"Avis d'impôt {today.year}", "state": "soon",
                       "msg": "publié fin juillet : télécharge-le pour qu'il soit prêt", "doc_id": None, "renew": renew_of("avis_impot")})
    order = {"old": 0, "soon": 1}
    return sorted(out, key=lambda x: order.get(x["state"], 2))


# ------------------------------------------------------------------ recherche
def _fold(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn").lower()


def _fold_map(text):
    """Texte replié (minuscules, sans accents) + position d'origine de chaque caractère, pour citer le vrai texte."""
    out, idx = [], []
    for i, c in enumerate(text):
        f = _fold(c)
        for ch in f:
            out.append(ch)
            idx.append(i)
    return "".join(out), idx


_MASK = [
    (re.compile(r"(mot de passe|password|mdp)\s*:?\s*\S+", re.I), lambda m: m.group(1) + " : ••••"),
    (re.compile(r"\b([A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?)\b"), lambda m: "IBAN ••••" + re.sub(r"\s", "", m.group(1))[-4:]),
    (re.compile(r"(?<!\d)(\d[\d ]{11,20}\d)(?!\d)"), lambda m: "••••" + re.sub(r"\D", "", m.group(1))[-3:]),
]


def mask(s):
    for rx, f in _MASK:
        s = rx.sub(f, s)
    return s


def _snippet(text, folded, idx, tok):
    i = folded.find(tok)
    if i < 0:
        return ""
    a, b = idx[i], idx[min(i + len(tok), len(idx) - 1)]
    s = text[max(0, a - 60):b + 80]
    s = re.sub(r"\s+", " ", s).strip()
    return mask(("…" if a > 60 else "") + s + "…")


def _meta(d, ex):
    T = TYPES.get(d["type"]) or {}
    em = ex.get("emitter_display") or (d["emitter"] or "").replace("-", " ")
    sub = d["sub"] or ""
    parts = [d["label"] or "", d["detail"] or "", em, d["person"] or "", ex.get("lieu") or "", " ".join(ex.get("collections") or []),
             CATEGORIES.get(d["cat"], ""), SUB_FOLDERS_FR.get(sub, "").replace("-", " "), T.get("label", ""), d["orig_name"] or "",
             " ".join(pack().get("synonymes", {}).get(d["type"], [])), period_label(period_of(d, ex)), d["doc_date"] or "",
             FORMES.get(ex.get("forme") or "", "")]
    return _fold(" ".join(parts))


_FOLD_CACHE = {}


def _folded(sha, text):
    k = (sha, len(text))
    v = _FOLD_CACHE.get(k)
    if v is None:
        if len(_FOLD_CACHE) > 5000:
            _FOLD_CACHE.clear()
        v = _FOLD_CACHE[k] = _fold_map(text)
    return v


def search(B, q, scope="docs", limit=150):
    """Tous les mots doivent se trouver dans les étiquettes, les synonymes du type ou le texte lu."""
    toks = [t for t in re.split(r"[\s,;]+", _fold(q).strip()) if t]
    if not toks:
        return []
    where = {"docs": "status='actuel'", "archives": "status IN ('ancienne_version','termine')", "all": "status!='copie'"}.get(scope, "status='actuel'")
    res = []
    for d in B.db.execute(f"SELECT * FROM docs WHERE {where}").fetchall():
        ex = _ex(d)
        meta = _meta(d, ex)
        r = B.db.execute("SELECT text FROM texts WHERE sha=?", (d["sha"],)).fetchone()
        text = (r["text"] if r else "") or ""
        folded, idx = _folded(d["sha"], text) if text else ("", [])
        score, hit_text = 0, None
        ok = True
        for t in toks:
            pat = re.compile(r"(?<![a-z0-9])" + re.escape(t))
            if pat.search(meta):
                score += 3
            elif t in meta:
                score += 2
            elif folded and t in folded:
                score += 1
                hit_text = hit_text or t
            else:
                ok = False
                break
        if not ok:
            continue
        res.append({"id": d["id"], "score": score + (1 if d["status"] == "actuel" else 0),
                    "where": "texte" if hit_text else "fiche", "snippet": _snippet(text, folded, idx, hit_text) if hit_text else ""})
    res.sort(key=lambda x: -x["score"])
    return res[:limit]


# ------------------------------------------------------------------ collections
def collections(B):
    from collections import Counter
    C = Counter()
    for r in B.db.execute("SELECT extra FROM docs WHERE status!='copie' AND extra LIKE '%\"collections\"%'").fetchall():
        for c in _ex(r).get("collections") or []:
            C[c] += 1
    return [{"name": k, "n": v} for k, v in sorted(C.items(), key=lambda x: x[0].lower())]


# ------------------------------------------------------------------ fiche Profil
def _mod97_iban(s):
    s = re.sub(r"\s", "", s).upper()
    if not re.fullmatch(r"[A-Z]{2}\d{2}[A-Z0-9]{10,30}", s):
        return False
    r = s[4:] + s[:4]
    n = "".join(str(int(c, 36)) for c in r)
    return int(n) % 97 == 1


def _nir_ok(s):
    s = re.sub(r"\s", "", s).upper()
    if len(s) != 15:
        return False
    body = s[:13].replace("2A", "19").replace("2B", "18")
    try:
        return 97 - int(body) % 97 == int(s[13:])
    except ValueError:
        return False


def _luhn(s):
    s = re.sub(r"\D", "", s)
    tot = 0
    for i, c in enumerate(reversed(s)):
        n = int(c) * (2 if i % 2 else 1)
        tot += n - 9 if n > 9 else n
    return tot % 10 == 0


def _mrz_cd(s):
    w, tot = (7, 3, 1), 0
    for i, c in enumerate(s):
        v = 0 if c == "<" else int(c) if c.isdigit() else ord(c) - 55
        tot += v * w[i % 3]
    return str(tot % 10)


def _mrz_ids(text):
    """Numéro de document et nationalité dans une vraie bande MRZ (lignes complètes, chiffres de contrôle vérifiés) :
    passeport (TD3), carte d'identité au format carte (TD1) et ancienne CNI française."""
    out = []
    lines = [re.sub(r"\s", "", l).upper() for l in (text or "").splitlines()]
    for i, l in enumerate(lines):
        if i + 1 < len(lines) and len(l) == 44 and l[0] == "P":
            m = re.fullmatch(r"([A-Z0-9<]{9})(\d)([A-Z<]{3})(\d{6})(\d)[MFX<](\d{6})\d.*", lines[i + 1])
            if m and _mrz_cd(m.group(1)) == m.group(2) and _mrz_cd(m.group(4)) == m.group(5):
                out.append(("passeport", m.group(1).replace("<", ""), m.group(3).replace("<", "")))
        m = re.fullmatch(r"[IAC][A-Z<]([A-Z<]{3})([A-Z0-9<]{9})(\d)[A-Z0-9<]{15}", l)
        if m and _mrz_cd(m.group(2)) == m.group(3):
            out.append(("cni", m.group(2).replace("<", ""), m.group(1).replace("<", "")))
        if re.fullmatch(r"IDFRA[A-Z<]{25}[0-9<]{6}", l) and i + 1 < len(lines):
            m = re.match(r"([0-9A-Z]{12})(\d)", lines[i + 1])
            if m and _mrz_cd(m.group(1)) == m.group(2):
                out.append(("cni", m.group(1), "FRA"))
    return out


ID_LABELS = {"iban": "IBAN", "fiscal": "Numéro fiscal (SPI)", "nir": "Numéro de sécurité sociale", "passeport": "Numéro de passeport",
             "cni": "Numéro de carte d'identité", "caf": "Numéro d'allocataire CAF", "france_travail": "Identifiant France Travail",
             "siren": "SIREN", "ird": "Numéro fiscal NZ (IRD)", "nationalite": "Nationalité (lue dans la bande MRZ)", "naissance": "Date de naissance"}


def profile(B):
    """Les numéros qu'on te demande toujours, retrouvés dans TES documents. Chacun renvoie au document où il est lu.
    Rien n'est envoyé : la fiche est calculée ici et masquée par défaut dans l'interface."""
    found = {}

    def add(key, value, d):
        value = re.sub(r"\s+", " ", value).strip()
        k = (key, re.sub(r"\s", "", value).upper())
        if k in found:
            found[k]["n"] += 1
            return
        found[k] = {"key": key, "label": ID_LABELS.get(key, key), "value": value, "doc_id": d["id"], "doc_label": d["label"],
                    "doc_date": d["doc_date"], "n": 1}

    rows = B.db.execute("SELECT * FROM docs WHERE status!='copie' ORDER BY doc_date DESC").fetchall()
    for d in rows:
        if not _is_me(B, d):
            continue
        r = B.db.execute("SELECT text FROM texts WHERE sha=?", (d["sha"],)).fetchone()
        text = (r["text"] if r else "") or ""
        if not text.strip():
            continue
        f = _fold(text)
        if d["type"] in ("rib", "releve_bancaire", "attestation_bancaire"):
            for m in re.finditer(r"\b([A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?)\b", text):
                if _mod97_iban(m.group(1)):
                    add("iban", re.sub(r"\s", "", m.group(1)), d)
        for m in re.finditer(r"numero fiscal[^0-9]{0,40}(\d[\d ]{11,16}\d)", f):
            v = re.sub(r"\D", "", m.group(1))
            if len(v) == 13:
                add("fiscal", v, d)
        for m in re.finditer(r"(?<![\d])([12]\s?\d{2}\s?\d{2}\s?(?:\d{2}|2a|2b)\s?\d{3}\s?\d{3}\s?\d{2})(?!\d)", f):
            if _nir_ok(m.group(1)):
                add("nir", re.sub(r"\s", "", m.group(1)).upper(), d)
        for kind, num, nat in _mrz_ids(text):
            if len(num) >= 8:
                add(kind, num, d)
            if nat and re.fullmatch(r"[A-Z]{3}", nat):
                add("nationalite", nat, d)
        M = classify.mrz(text)
        if M and M.get("birth") and d["type"] in ("passeport", "carte_identite"):
            add("naissance", M["birth"].isoformat(), d)
        for m in re.finditer(r"(?:numero|n°|no)\s*(?:d.)?allocataire\s*:?\s*(\d{6,8})", f):
            add("caf", m.group(1), d)
        for m in re.finditer(r"identifiant\s*(?:france travail|pole emploi)?\s*:?\s*(\d{7}[a-z])\b", f):
            add("france_travail", m.group(1).upper(), d)
        for m in (re.finditer(r"siren\s*:?\s*(\d{3}\s?\d{3}\s?\d{3})(?!\d)", f) if d["cat"] == "17" else ()):   # ton entreprise, pas celle d'un employeur
            if _luhn(m.group(1)):
                add("siren", re.sub(r"\s", "", m.group(1)), d)
        for m in re.finditer(r"ird (?:number|no\.?|#)\s*:?\s*(\d{2,3}-?\d{3}-?\d{3})", f):
            add("ird", m.group(1), d)
    order = list(ID_LABELS)
    out = sorted(found.values(), key=lambda x: (order.index(x["key"]) if x["key"] in order else 99, -x["n"]))
    manual = B.settings.get("fiche") or {}
    return {"owner": B.settings.get("owner") or "", "ids": out, "manual": manual if isinstance(manual, dict) else {}}


# ------------------------------------------------------------------ doublons élargis
_STEM_JUNK = re.compile(r"(\bcopie?\b|\bcopy\b|\(\d\)|\bfiligranee?\b|\bsigned\b|\bsigne\b|\bfinal\b|\bv\d\b|(?<=[a-z]) [2-9]$)")
_GENERIC = {"image", "img", "photo", "scan", "download", "document", "fichier", "page", "pdf", "unknown", "capture", "ecran", "screenshot", "doc"}


def _stem(name):
    s = _fold(os.path.splitext(name or "")[0])
    s = re.sub(r"[_\-.]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    for _ in range(3):
        s = re.sub(r"\s+", " ", _STEM_JUNK.sub(" ", s)).strip()
    return s


def _telling(stem):
    """Un nom qui veut dire quelque chose : au moins un vrai mot (4 lettres ou plus), hors « image », « scan », « download »…"""
    return any(w not in _GENERIC for w in re.findall(r"[a-z]{4,}", stem))


def extra_duplicates(B, already):
    """Paires de doublons au-delà du texte identique. already = shas déjà rattachés (texte identique).
    Retourne une liste de (main_row, copy_row, raison)."""
    rows = [r for r in B.db.execute("SELECT * FROM docs WHERE status!='copie' ORDER BY CASE status WHEN 'actuel' THEN 0 ELSE 1 END, length(orig_name), added_at").fetchall()
            if r["sha"] not in already]
    pairs, used = [], set()

    def size(r):
        try:
            return os.path.getsize(B.abs(r["path"]))
        except OSError:
            return 0

    groups = {}
    for r in rows:   # 1. même type, même date, même organisme, même format, taille à 1 % près
        groups.setdefault((r["type"], r["doc_date"], r["emitter"], os.path.splitext(r["path"] or "")[1].lower()), []).append(r)
    for L in groups.values():
        if len(L) < 2:
            continue
        sz = {r["id"]: size(r) for r in L}
        for i, a in enumerate(L):
            for b in L[i + 1:]:
                if b["id"] in used or a["id"] in used or sz[a["id"]] < 20000:
                    continue
                if sz[a["id"]] == sz[b["id"]]:
                    pairs.append((a, b, "même type, même date, même organisme et exactement la même taille"))
                    used.add(b["id"])
    mz = {}
    for r in rows:   # 2. même bande MRZ (même titre d'identité scanné deux fois)
        if r["id"] in used or r["type"] not in ("passeport", "carte_identite", "visa", "titre_sejour"):
            continue
        t = B.db.execute("SELECT text FROM texts WHERE sha=?", (r["sha"],)).fetchone()
        ids = _mrz_ids((t["text"] if t else "") or "")
        if ids:
            k = (r["type"], ids[0][1])
            if k in mz:
                pairs.append((mz[k], r, "même numéro dans la bande MRZ"))
                used.add(r["id"])
            else:
                mz[k] = r
    st = {}
    raw = lambda r: re.sub(r"\s+", " ", re.sub(r"[_\-.]+", " ", _fold(os.path.splitext(r["orig_name"] or "")[0]))).strip()
    for r in rows:   # 3. même nom une fois retirés « copie », « (2) », « filigrane », « signed »… (nom parlant, même format)
        if r["id"] in used:
            continue
        s = _stem(r["orig_name"])
        if len(s) < 6 or not _telling(s):
            continue
        k = (r["type"], s, os.path.splitext(r["orig_name"] or "")[1].lower())
        if k in st:
            a = st[k]
            if raw(a) != raw(r) and (raw(a) != s or raw(r) != s):   # au moins un des deux portait « copie », « (2) »…
                pairs.append((a, r, "même nom de fichier (copie, version signée ou filigranée)"))
                used.add(r["id"])
        else:
            st[k] = r
    return pairs


# ------------------------------------------------------------------ journal de résidence (v0.9.4)
HABITE = ("locataire", "proprietaire_occupant", "heberge")
LOGE_TYPES = ("bail", "quittance_loyer", "justificatif_domicile", "facture_energie", "attestation_energie", "assurance_habitation",
              "attestation_hebergement", "election_domicile", "enregistrement_adresse", "attestation_residence")
SEJOUR_TYPES = ("visa", "titre_sejour", "autorisation_voyage", "demande_visa", "enregistrement_adresse", "attestation_residence")


def residence(B, today=None):
    """Où tu as vécu, et quand : tiré de tes baux, quittances, justificatifs (avec un lieu et un rôle « j'habite ») et de
    tes papiers de séjour à l'étranger. Sert à prévoir les casiers judiciaires qu'un pays te demandera (pays où tu as
    vécu au moins 6 mois sur les 10 dernières années)."""
    today = today or dt.date.today()
    P = {}
    for d in B.db.execute("SELECT * FROM docs WHERE status!='copie'").fetchall():
        if not _is_me(B, d):
            continue
        ex = _ex(d)
        lieu, role = ex.get("lieu"), ex.get("role")
        start = _date(d["doc_date"])
        if not start or (d["doc_date"] == (d["added_at"] or "")[:10] and not ex.get("date_ok")):
            continue   # date du rangement (aucune date lue) : ne dit rien de l'endroit où tu vivais
        end = start
        if d["type"] in SEJOUR_TYPES and d["expiry"]:
            e = _date(d["expiry"])
            if e:
                end = min(e, today)
        if lieu and (role in HABITE or (d["type"] in LOGE_TYPES and role != "bailleur")):
            k = (d["country"], lieu)
        elif d["type"] in SEJOUR_TYPES or (d["country"] not in ("FR", "INT") and d["type"] not in ("passeport", "carte_identite")):
            k = (d["country"], "")
        else:
            continue
        p = P.setdefault(k, {"country": d["country"], "lieu": lieu if k[1] else "", "from": start, "to": end, "n": 0, "sources": set()})
        p["from"], p["to"] = min(p["from"], start), max(p["to"], end)
        p["n"] += 1
        p["sources"].add((TYPES.get(d["type"]) or {}).get("label", d["type"]))
    periods = sorted(P.values(), key=lambda p: p["from"])
    ten = today.replace(year=today.year - 10)
    span = {}
    for p in periods:
        a, b = max(p["from"], ten), p["to"]
        if b > a:
            span[p["country"]] = span.get(p["country"], 0) + (b - a).days
    casiers = [{"country": c, "jours": n} for c, n in sorted(span.items(), key=lambda x: -x[1]) if n >= 183]
    if "FR" not in [c["country"] for c in casiers]:
        casiers.insert(0, {"country": "FR", "jours": span.get("FR", 0), "nationalite": True})
    return {"periods": [{"country": p["country"], "lieu": p["lieu"], "from": p["from"].isoformat(), "to": p["to"].isoformat(), "n": p["n"],
                         "sources": sorted(p["sources"])[:4]} for p in periods], "casiers": casiers}


# ------------------------------------------------------------------ v0.11 « Aller chercher »
def collecte(B, today=None):
    """Ce qu'il faut aller chercher sur les sites (tu te connectes, Bon toutou reconnaît le fichier téléchargé)
    et ce qui peut arriver tout seul par mail. Pour chaque pièce : où elle en est dans ton bureau."""
    today = today or dt.date.today()
    C = pack().get("collecte") or {}

    def last(types):
        q = ",".join("?" * len(types))
        rows = B.db.execute(f"SELECT id, doc_date, person FROM docs WHERE type IN ({q}) AND status IN ('actuel','ancienne_version','termine') "
                            "ORDER BY doc_date DESC", types).fetchall()
        rows = [r for r in rows if _is_me(B, r)] or rows
        return rows[0] if rows else None

    site = []
    for it in C.get("site", []):
        r = last(it["types"])
        if not r and not it.get("always"):
            continue   # tu n'es pas concerné (pas d'allocations, pas inscrit à France Travail…)
        d = (r["doc_date"] or "") if r else ""
        state, msg = "due", "pas encore dans ton bureau"
        if d:
            try:
                dd = dt.date.fromisoformat(d)
            except ValueError:
                dd = None
            if dd and it.get("rythme") == "annuel":
                m = int(it.get("mois") or 1)
                ready = today.year if today.month >= m else today.year - 1
                state = "ok" if dd.year >= ready else "due"
                msg = f"celui de {dd.year} est dans ton bureau" if state == "ok" else f"le dernier date du {_fr(d)} : le nouveau est disponible"
            elif dd:
                age = (today - dd).days
                state = "ok" if age <= int(it.get("jours") or 90) else "due"
                msg = f"à jour (du {_fr(d)})" if state == "ok" else f"le dernier date du {_fr(d)}"
        site.append(dict(it, state=state, msg=msg, doc_id=r["id"] if r else None))
    mail = []
    for it in C.get("mail", []):
        r = last(it["types"])
        mail.append(dict(it, last=_fr(r["doc_date"]) if r and r["doc_date"] else "", doc_id=r["id"] if r else None))
    due = [x for x in site if x["state"] == "due"]
    return {"site": sorted(site, key=lambda x: x["state"] != "due"), "mail": mail, "due": len(due),
            "minutes": sum(int(x.get("min") or 2) for x in due), "banque": C.get("banque_utiles", [])}


# ------------------------------------------------------------------ v0.11.1 la carte des sources
CANAUX = ("telecharger", "demander", "mail", "produire", "garder")


def carte(B, today=None):
    """Toutes les pièces demandées par au moins une situation (le « pire cas »), avec qui les délivre (guichet),
    comment on les obtient (canal), combien de situations les demandent, et où elles en sont dans ton bureau.
    Les demandes déjà faites (réglage `demandes`) sont suivies à part jusqu'à la réception."""
    from .catalog import TEMPLATES
    today = today or dt.date.today()
    P = pack()
    SRC, G = P.get("sources") or {}, P.get("guichets") or {}
    site_info = {x["id"]: x for x in (P.get("collecte") or {}).get("site", [])}
    mail_info = {x["id"]: x for x in (P.get("collecte") or {}).get("mail", [])}
    need = {}     # type -> {count, fresh, valid, pieces}
    pieces = []
    for tid, T in TEMPLATES.items():
        for p in T.get("pieces", []):
            ts = [t for t in p.get("types", []) if t]
            pieces.append(ts)
            for t in ts:
                n = need.setdefault(t, {"sit": set(), "fresh": None, "valid": False})
                n["sit"].add(T.get("label", tid))
                if p.get("fresh"):
                    n["fresh"] = min(n["fresh"] or 10 ** 6, int(p["fresh"]))
                n["valid"] = n["valid"] or bool(p.get("valid"))
    rows = B.db.execute("SELECT id, type, doc_date, expiry, person, added_at FROM docs WHERE status IN ('actuel','ancienne_version','termine')").fetchall()
    by = {}
    for r in rows:
        by.setdefault(r["type"], []).append(r)

    def latest(t):
        L = by.get(t) or []
        L = [r for r in L if _is_me(B, r)] or L
        return max(L, key=lambda r: r["doc_date"] or "") if L else None

    def state(t):
        r, n = latest(t), need.get(t) or {}
        if not r:
            return "manquant", "pas encore dans ton bureau", None
        exp, d = _date(r["expiry"]), _date(r["doc_date"])
        if n.get("valid") and exp and (exp - today).days < 30:
            return "renouveler", (f"expiré le {_fr(r['expiry'])}" if exp < today else f"expire le {_fr(r['expiry'])}"), r["id"]
        if n.get("fresh") and d and (today - d).days > n["fresh"]:
            return "renouveler", f"le dernier date du {_fr(r['doc_date'])} (il faut moins de {n['fresh']} jours)", r["id"]
        return "ok", (f"à jour (du {_fr(r['doc_date'])})" if d else "dans ton bureau"), r["id"]

    st = {t: state(t) for t in need}
    dem = {d.get("type"): d for d in (B.settings.get("demandes") or []) if d.get("type")}
    items = []
    for t, n in need.items():
        g, canal, delai = (SRC.get(t) or ["garder", "garder"]) + [None] * (3 - len(SRC.get(t) or ["", ""]))
        s_, msg, did = st[t]
        if s_ == "manquant":   # couvert par une autre pièce acceptée partout où celle-ci est demandée (ex. CNI ↔ passeport)
            alts = [ts for ts in pieces if t in ts]
            if alts and all(any(st.get(o, ("manquant",))[0] == "ok" for o in ts if o != t) for ts in alts):
                s_, msg = "couvert", "remplacé par une autre pièce que tu as"
        info = site_info.get(t) or {}
        GG = G.get(g) or {}
        items.append({"type": t, "label": (TYPES.get(t) or {}).get("label", t), "guichet": g, "guichet_label": GG.get("label", g),
                      "url": info.get("url") or GG.get("url"), "canal": canal, "delai": delai, "n": len(n["sit"]),
                      "situations": sorted(n["sit"])[:6], "fresh": n["fresh"], "state": s_, "msg": msg, "doc_id": did,
                      "chemin": info.get("chemin"), "quand": info.get("quand") or (mail_info.get(t) or {}).get("quand"),
                      "comment": (mail_info.get(t) or {}).get("comment"), "note": ((P.get("renouveler") or {}).get(t) or {}).get("note"),
                      "min": info.get("min", 2)})
    # demandes en cours : reçues dès qu'un document de ce type arrive après la date de la demande
    cours = []
    for t, d in dem.items():
        it = next((x for x in items if x["type"] == t), None)
        L = by.get(t) or []
        got = [r for r in L if (r["added_at"] or "")[:10] >= (d.get("date") or "")]
        dd = _date(d.get("date"))
        delai = (it or {}).get("delai") or (SRC.get(t) or [None, None, 7])[2] or 7
        cours.append({"type": t, "label": (TYPES.get(t) or {}).get("label", t), "guichet_label": (it or {}).get("guichet_label", ""),
                      "date": d.get("date"), "prevu": (dd + dt.timedelta(days=int(delai))).isoformat() if dd else None,
                      "recu": bool(got), "doc_id": got[0]["id"] if got else None, "url": (it or {}).get("url")})
    todo = lambda x: x["state"] in ("manquant", "renouveler")
    out = {c: [] for c in CANAUX}
    for x in sorted(items, key=lambda x: (not todo(x), -x["n"], x["label"])):
        if x["canal"] == "demander" and x["type"] in dem and not next((c for c in cours if c["type"] == x["type"] and c["recu"]), None):
            continue   # déjà demandée : elle est dans « Demandes en cours »
        out.setdefault(x["canal"], []).append(x)
    due = [x for x in out.get("telecharger", []) if todo(x)]
    return {"canaux": out, "cours": sorted(cours, key=lambda c: c["date"] or ""), "due": len(due),
            "a_demander": sum(1 for x in out.get("demander", []) if todo(x)), "minutes": sum(int(x.get("min") or 2) for x in due),
            "banque": (P.get("collecte") or {}).get("banque_utiles", [])}
