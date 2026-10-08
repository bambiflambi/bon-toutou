"""Banc d'essai de Bon toutou : passe tout un dossier de papiers dans le moteur, sur un bureau de TEST, et écrit un rapport.

    python3 tools/banc_essai.py <dossier_source> <dossier_essai> [--ranger] [--profil chemin/profil.json]

- <dossier_source> n'est jamais modifié : chaque fichier est COPIÉ dans le bureau de test (avec son chemin, comme « Importer un dossier »).
- <dossier_essai> reçoit : BUREAU_TEST/ (le bureau rangé, si --ranger), rapport.md, rapport.json, et le mode test (diagnostic).
- Règles + lecture (pypdf / pdftotext / OCR) ; l'IA locale se vérifie dans l'app, avec le mode test (.bontoutou/diagnostic).
Le vrai bureau de l'utilisateur n'est jamais touché.
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, "engine"))

WANTED = (".pdf", ".jpg", ".jpeg", ".png", ".heic", ".tif", ".tiff", ".txt", ".docx", ".doc", ".odt", ".pages", ".rtf")
NOM = __import__("re").compile(r"(?i)\b(n[ée]e?\s+le|date de naissance|lieu de naissance|nom de naissance|adresse|domicili[ée]e?)\b")


def main():
    argv = sys.argv[1:]
    args = [a for i, a in enumerate(argv) if not a.startswith("--") and not (i and argv[i - 1] == "--profil")]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    src, out = os.path.abspath(args[0]), os.path.abspath(args[1])
    ranger = "--ranger" in sys.argv
    root = os.path.join(out, "BUREAU_TEST")
    os.makedirs(root, exist_ok=True)
    os.environ.setdefault("BONTOUTOU_DATA", os.path.join(out, ".appareil-test"))   # index local du test (hors du dossier partagé si besoin)
    from bontoutou.core import Bureau
    b = Bureau(root)
    prof = {}
    if "--profil" in sys.argv:   # profil.json du vrai bureau : ton nom, tes proches, tes pays (lu, jamais modifié)
        with open(sys.argv[sys.argv.index("--profil") + 1], encoding="utf-8") as fh:
            prof = {k: v for k, v in json.load(fh).items() if k in ("owner", "holders", "countries")}
    b.save_settings(dict({"diagnostic": True, "owner": b.settings.get("owner") or "Titulaire"}, **prof))
    files = []
    for dp, dirs, fs in os.walk(src):
        dirs[:] = sorted(d for d in dirs if not d.startswith("."))
        for f in sorted(fs):
            if f.lower().endswith(WANTED) and not f.startswith("."):
                files.append(os.path.join(dp, f))
    print(f"{len(files)} fichiers à analyser", flush=True)
    t0 = time.time()
    budget = float(sys.argv[sys.argv.index("--budget") + 1]) if "--budget" in sys.argv else 1e9
    base = os.path.dirname(src)
    import hashlib
    rel_of = {}
    for f in files:
        with open(f, "rb") as fh:
            rel_of[hashlib.sha256(fh.read()).hexdigest()] = os.path.relpath(f, base).replace(os.sep, "/")
    # reprise : une copie arrivée dans 00_A-TRIER sans avoir été analysée (interruption) est analysée avec son chemin d'origine
    known = {r[0] for r in b.db.execute("SELECT path FROM inbox")}
    for fn in sorted(os.listdir(b.inbox_dir)):
        fp = os.path.join(b.inbox_dir, fn)
        if os.path.isfile(fp) and not fn.startswith(".") and b.rel(fp) not in known:
            from bontoutou.core import sha256 as _sha
            hh = _sha(fp)
            if not b.db.execute("SELECT 1 FROM inbox WHERE sha=?", (hh,)).fetchone():
                b.register(fp, "Dossier importé", rel_of.get(hh))
    doublons = []
    rel_of = {}
    for f in files:   # premier chemin rencontré pour chaque contenu
        with open(f, "rb") as fh:
            rel_of.setdefault(hashlib.sha256(fh.read()).hexdigest(), os.path.relpath(f, base).replace(os.sep, "/"))
    for i, f in enumerate(files, 1):
        if time.time() - t0 > budget:
            print("SUITE : relance la même commande pour continuer", flush=True)
            sys.exit(3)
        rel = os.path.relpath(f, base).replace(os.sep, "/")
        with open(f, "rb") as fh:
            data = fh.read()
        h = hashlib.sha256(data).hexdigest()
        if b.db.execute("SELECT 1 FROM inbox WHERE sha=? UNION SELECT 1 FROM docs WHERE sha=?", (h, h)).fetchone():
            if rel_of.get(h) != rel:
                doublons.append(f"{rel} = {rel_of.get(h)}")
            continue   # déjà passé, ou copie exacte d'un autre fichier
        b.add_upload(os.path.basename(f), data, rel=rel)
        if i % 10 == 0:
            print(f"  {i}/{len(files)} · {time.time() - t0:.0f} s", flush=True)
    props = b.inbox()
    rows = [{k: p.get(k) for k in ("orig", "type", "type_label", "emitter_display", "date", "date_note", "confidence", "doubts", "conflict",
                                    "lot", "origin", "dest", "name", "relation", "duplicate", "method", "reasons")} for p in props]
    # Ce qu'il faudrait anonymiser pour réutiliser ces papiers comme exemples : les NATURES seulement, jamais les valeurs
    from bontoutou import sortie
    names = [w for w in ((b.settings.get("owner") or "") + " " + " ".join(h.get("nom", "") for h in b.settings.get("holders") or [])).split() if len(w) >= 3]
    sens = []
    for p in props:
        row = b.db.execute("SELECT sha, path FROM inbox WHERE id=?", (p["id"],)).fetchone()
        text = (b.text_of(row["sha"], row["path"])[0] or "") if row else ""
        _, found = sortie.mask(text)
        low = text.lower()
        extra = [f"ton nom ×{sum(low.count(n.lower()) for n in names)}"] if names and any(n.lower() in low for n in names) else []
        extra += ["date / lieu de naissance ou adresse"] if NOM.search(text) else []
        if not text.strip():
            extra.append("texte non lu (scan ou format) : à vérifier à l'œil")
        sens.append({"fichier": p["orig"], "origine": p.get("origin"), "a_masquer": found + extra})
    report = {"doublons": doublons, "source": src, "fichiers": len(files), "propositions": len(rows), "secondes": round(time.time() - t0),
              "confiance": {c: sum(1 for r in rows if r["confidence"] == c) for c in ("haute", "moyenne", "basse")}, "documents": rows}
    if ranger:
        r = b.validate([p["id"] for p in props])
        report["rangement"] = {"ranges": r.get("done", 0), "anciens_employeurs": r.get("closed", [])}
        tree = []
        for dp, dirs, fs in os.walk(root):
            dirs[:] = sorted(d for d in dirs if not d.startswith(".") and d not in ("ANIMAUX", "ENFANTS"))
            for f in sorted(fs):
                if not f.startswith("."):
                    tree.append(os.path.relpath(os.path.join(dp, f), root))
        report["arborescence"] = tree
    report["a_anonymiser"] = sens
    with open(os.path.join(out, "a_anonymiser.md"), "w", encoding="utf-8") as fh:
        fh.write("# À anonymiser avant de réutiliser ces papiers comme exemples\n\nNatures repérées automatiquement (jamais les valeurs). "
                 "Les noms de tiers, montants et adresses ne sont pas tous repérés : relis à l'œil.\n\n")
        for x in sorted(sens, key=lambda x: -len(x["a_masquer"])):
            fh.write(f"- **{x['origine'] or x['fichier']}** : {', '.join(x['a_masquer']) or 'rien de repéré'}\n")
    with open(os.path.join(out, "rapport.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1, default=str)
    lines = [f"# Banc d'essai Bon toutou", "", f"{len(files)} fichiers · {report['secondes']} s · confiance : "
             + ", ".join(f"{k} {v}" for k, v in report["confiance"].items()), ""]
    for r in sorted(rows, key=lambda x: (x["confidence"] != "basse", x["origin"] or x["orig"])):
        lines.append(f"- **{r['orig']}** → {r['type_label']} · {r['emitter_display']} · {r['date']} · *{r['confidence']}*"
                     + (f" · doutes : {', '.join(r['doubts'])}" if r["doubts"] else "") + (f" · ⚠ conflit {r['conflict']}" if r["conflict"] else "")
                     + f"  \n  `{r['dest']}/{r['name']}`")
    if doublons:
        lines += ["", "## Copies exactes (non rangées deux fois)", ""] + [f"- {x}" for x in doublons]
    if ranger:
        lines += ["", "## Arborescence obtenue", ""] + [f"    {t}" for t in report["arborescence"]]
    with open(os.path.join(out, "rapport.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print(f"Rapport : {os.path.join(out, 'rapport.md')}")


if __name__ == "__main__":
    main()
