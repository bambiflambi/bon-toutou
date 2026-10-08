"""Banc d'essai de Bon toutou : passe tout un dossier de papiers dans le moteur, sur un bureau de TEST, et écrit un rapport.

    python3 tools/banc_essai.py <dossier_source> <dossier_essai> [--ranger]

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

WANTED = (".pdf", ".jpg", ".jpeg", ".png", ".heic", ".tif", ".tiff", ".txt")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    src, out = os.path.abspath(args[0]), os.path.abspath(args[1])
    ranger = "--ranger" in sys.argv
    root = os.path.join(out, "BUREAU_TEST")
    os.makedirs(root, exist_ok=True)
    os.environ["BONTOUTOU_DATA"] = os.path.join(out, ".appareil-test")
    from bontoutou.core import Bureau
    b = Bureau(root)
    b.save_settings({"diagnostic": True, "owner": b.settings.get("owner") or "Titulaire"})
    files = []
    for dp, dirs, fs in os.walk(src):
        dirs[:] = sorted(d for d in dirs if not d.startswith("."))
        for f in sorted(fs):
            if f.lower().endswith(WANTED) and not f.startswith("."):
                files.append(os.path.join(dp, f))
    print(f"{len(files)} fichiers à analyser", flush=True)
    t0 = time.time()
    base = os.path.dirname(src)
    for i, f in enumerate(files, 1):
        rel = os.path.relpath(f, base).replace(os.sep, "/")
        with open(f, "rb") as fh:
            b.add_upload(os.path.basename(f), fh.read(), rel=rel)
        if i % 10 == 0:
            print(f"  {i}/{len(files)} · {time.time() - t0:.0f} s", flush=True)
    props = b.inbox()
    rows = [{k: p.get(k) for k in ("orig", "type", "type_label", "emitter_display", "date", "date_note", "confidence", "doubts", "conflict",
                                    "lot", "origin", "dest", "name", "relation", "duplicate", "method", "reasons")} for p in props]
    report = {"source": src, "fichiers": len(files), "propositions": len(rows), "secondes": round(time.time() - t0),
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
    with open(os.path.join(out, "rapport.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1, default=str)
    lines = [f"# Banc d'essai Bon toutou", "", f"{len(files)} fichiers · {report['secondes']} s · confiance : "
             + ", ".join(f"{k} {v}" for k, v in report["confiance"].items()), ""]
    for r in sorted(rows, key=lambda x: (x["confidence"] != "basse", x["origin"] or x["orig"])):
        lines.append(f"- **{r['orig']}** → {r['type_label']} · {r['emitter_display']} · {r['date']} · *{r['confidence']}*"
                     + (f" · doutes : {', '.join(r['doubts'])}" if r["doubts"] else "") + (f" · ⚠ conflit {r['conflict']}" if r["conflict"] else "")
                     + f"  \n  `{r['dest']}/{r['name']}`")
    if ranger:
        lines += ["", "## Arborescence obtenue", ""] + [f"    {t}" for t in report["arborescence"]]
    with open(os.path.join(out, "rapport.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print(f"Rapport : {os.path.join(out, 'rapport.md')}")


if __name__ == "__main__":
    main()
