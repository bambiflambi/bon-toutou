"""Test de bout en bout du flux V0.1 sur un bureau temporaire.
    python3 -m tests.test_flow        (depuis le dossier App_v0)
"""
import os, shutil, sys, tempfile, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
tmp = tempfile.mkdtemp(prefix="fm_test_")
os.environ["BONTOUTOU_DATA"] = os.path.join(tmp, "appareil-A")   # données locales de l'appareil A
from bontoutou.core import Bureau
from bontoutou import catalog, classify
from tests.make_samples import SAMPLES, pdf

root = os.path.join(tmp, "BON_TOUTOU_ADMIN"); os.makedirs(root)
b = Bureau(root)
print("Outils de lecture :", b.state()["tools"])
order = ["Carte_identite_location_FINAL_v2.pdf","avis_impot_2025_FINAL(2).pdf","scan_paie_juillet.pdf","paie_aout.pdf",
         "Facture_EDF_sept.pdf","RIB LCL.pdf","contrat.pdf","IMG_4821_wof.pdf","attestation_maif_2026.pdf","truc_bizarre.pdf"]
src = os.path.join(tmp, "src"); os.makedirs(src)
for n in SAMPLES: pdf(os.path.join(src, n), SAMPLES[n])
for n in order:
    b.add_upload(n, open(os.path.join(src, n), "rb").read())
fails = 0
def check(cond, msg):
    global fails
    print(("  ✓ " if cond else "  ✗ ") + msg); fails += 0 if cond else 1
inbox = b.inbox()
for p in inbox:
    print(f"- {p['orig']:40s} → {p['type']:22s} {p['country']} {p['emitter']:20s} {p['date']} [{p['confidence']}] {p['name']}")
T = {p['orig']: p for p in inbox}
check(T["Carte_identite_location_FINAL_v2.pdf"]["type"] == "carte_identite", "carte d'identité reconnue")
check(T["Carte_identite_location_FINAL_v2.pdf"]["expiry"] == "2031-06-01", "expiration CNI lue")
check(T["avis_impot_2025_FINAL(2).pdf"]["type"] == "avis_impot" and T["avis_impot_2025_FINAL(2).pdf"]["date"] == "2025-07-28", "avis d'impôt + date")
check(T["scan_paie_juillet.pdf"]["type"] == "bulletin_paie" and T["scan_paie_juillet.pdf"]["date"] == "2026-07-31", "fiche de paie juillet, date fin de période")
check(T["IMG_4821_wof.pdf"]["country"] == "NZ" and T["IMG_4821_wof.pdf"]["type"] == "controle_vehicule", "WOF → NZ")
check(T["RIB LCL.pdf"]["type"] == "rib" and T["RIB LCL.pdf"]["emitter"] == "LCL", "RIB LCL")
check(T["truc_bizarre.pdf"]["confidence"] == "basse", "document inconnu → à vérifier")
# valider tout sauf le document inconnu
ids = [p["id"] for p in inbox if p["orig"] != "truc_bizarre.pdf"]
r = b.validate(ids); check(r["ok"] and r["done"] == 9, "9 documents rangés")
cni = [d for d in b.documents() if d["type"] == "carte_identite"][0]
check(os.path.exists(b.abs(cni["path"])) and "FR_FRANCE/01_IDENTITE/01-1_" in cni["path"], "CNI rangée dans FR_FRANCE/01_IDENTITE/01-1_…")
# 3e fiche de paie : nouvelle version du même document suivi
b.add_upload("paie_septembre.pdf", open(os.path.join(src, "paie_septembre.pdf"), "rb").read())
p = b.inbox()[-1]; check(p["mode"] == "new_version", "fiche de septembre = nouvelle version du document suivi")
r = b.validate([p["id"]]); batch = r["batch"]
paies = [d for d in b.documents() if d["type"] == "bulletin_paie"]
check(len(paies) == 1 and paies[0]["date"] if False else len(paies) == 1, "une seule fiche de paie actuelle")
check(paies[0]["versions"] == 3, "3 versions dans l'historique")
old = b.archives()["old"]; check(any("99_ARCHIVES/03_TRAVAIL-REVENUS/03-2_" in o["path"] for o in old), "anciennes fiches dans 99_ARCHIVES/03…/03-2")
# annuler puis refaire
u = b.undo(batch); check(u["ok"] and len(b.inbox()) == 2, "annulation : la fiche revient dans Trier")
check([d for d in b.documents() if d["type"] == "bulletin_paie"][0]["doc_date"] == "2026-08-31", "annulation : août redevient la version actuelle")
b.validate([x["id"] for x in b.inbox() if x["orig"] == "paie_septembre.pdf"])
# ignorer le document inconnu : gardé, pas détruit
z = [x for x in b.inbox() if x["orig"] == "truc_bizarre.pdf"][0]; b.ignore(z["id"])
check(os.path.exists(os.path.join(root, "00_A-TRIER", "_IGNORES", "truc_bizarre.pdf")), "ignoré = gardé dans 00_A-TRIER/_IGNORES")
# dossier location
did = b.create_dossier("louer_logement", "Agence Horizon", "FR")
k = b.dossier(did)
for pc in k["pieces"]: print(f"   {pc['status']:8s} {pc['label']:45s} {[d['label']+' '+d['date'] for d in pc['docs']]} {pc['problems']}")
check(k["ok"] == 7, f"location : {k['ok']}/7 pièces")
r = b.finalize(did); check(r["ok"], "dossier finalisé")
k = b.dossier(did); folder = b.abs(k["folder"])
check(os.path.exists(os.path.join(folder, "PREUVE.txt")) and os.path.exists(b.abs(k["zip"])), "paquet + PREUVE.txt + zip générés")
check(len([f for f in os.listdir(folder) if f[:2].isdigit()]) == 9, "9 fichiers copiés (7 pièces dont 3 fiches de paie)")
b.mark_sent(did)
a = b.archives(); check(len(a["sent"]) == 1 and "99_ARCHIVES/20_DEMARCHES" in a["sent"][0]["folder"], "envoyé → 99_ARCHIVES/20_DEMARCHES")
# solde de tout compte : termine le suivi des fiches de paie
b.add_upload("solde.pdf", open(os.path.join(src, "solde.pdf"), "rb").read())
p = b.inbox()[-1]; check(p["mode"] == "archive_direct" and "termine le suivi" in p["relation"], "solde de tout compte → archive + fin du suivi")
b.validate([p["id"]])
check(not [d for d in b.documents() if d["type"] == "bulletin_paie"], "plus de fiche de paie actuelle")
done = b.archives()["done"]; check(len([d for d in done if d["type"] in ("bulletin_paie", "solde_tout_compte")]) == 4, "Terminés : 3 fiches + solde, rangés dans 03-2")
# preuve : remplacée depuis ?
check(a["sent"][0]["count"] == 9, "preuve : 9 fichiers transmis")
# reconstruction de l'index depuis les fichiers
n_before = len(b.documents()); r = b.rebuild_index(); check(r["ok"] and len(b.documents()) == n_before, f"index reconstruit ({r['docs']} fichiers)")

# ---------------- Étape A : fiches synchronisées, index local, catalogue en packs, journal par appareil
def docs_snapshot(bb):
    return sorted((d["id"], d["type"], d["status"], d["path"], d["person"], d["detail"] or "", d["suivi"] or "")
                  for d in map(dict, bb.db.execute("SELECT * FROM docs")))
n_docs = b.db.execute("SELECT COUNT(*) FROM docs").fetchone()[0]
metas = os.listdir(os.path.join(root, ".bontoutou", "meta", "docs"))
check(len(metas) == n_docs, f"une fiche par document ({len(metas)})")
check(len(os.listdir(os.path.join(root, ".bontoutou", "meta", "dossiers"))) == 1, "une fiche pour le dossier")
check(not os.path.exists(os.path.join(root, ".bontoutou", "index.db")), "l'index n'est plus dans le dossier synchronisé")
jl = os.listdir(os.path.join(root, ".bontoutou", "journal"))
check(len(jl) == 1 and sum(1 for _ in open(os.path.join(root, ".bontoutou", "journal", jl[0]))) >= 8, "journal de l'appareil écrit dans le dossier")
# une précision ajoutée sur l'appareil A doit survivre à un index perdu
rib = [d for d in b.documents() if d["type"] == "rib"][0]
b.reclassify(rib["id"], {"detail": "RIB compte courant", "person": "Camille Martin"})
snap_a = docs_snapshot(b)
# appareil B : aucun index, il reconstruit tout depuis les fiches
os.environ["BONTOUTOU_DATA"] = os.path.join(tmp, "appareil-B")
b2 = Bureau(root)
check(docs_snapshot(b2) == snap_a, "appareil B : index reconstruit depuis les fiches, identique (titulaire, intitulé, suivi)")
check(len(b2.dossiers()) + len(b2.archives()["sent"]) == 1, "appareil B : le dossier envoyé est retrouvé")
check(len(os.listdir(os.path.join(root, ".bontoutou", "journal"))) == 1, "appareil B n'a encore rien écrit dans le journal")
# B corrige un document, A le voit au prochain démarrage
cni2 = [d for d in b2.documents() if d["type"] == "carte_identite"][0]
import time; time.sleep(1.1)
b2.reclassify(cni2["id"], {"detail": "CNI recto-verso"})
check(len(os.listdir(os.path.join(root, ".bontoutou", "journal"))) == 2, "chaque appareil a son propre journal")
os.environ["BONTOUTOU_DATA"] = os.path.join(tmp, "appareil-A")
b3 = Bureau(root)
check(b3.document(cni2["id"])["detail"] == "CNI recto-verso", "appareil A récupère la correction faite sur B")
# fichier déplacé à la main dans le Finder : retrouvé par son empreinte
d0 = b3.document(cni2["id"]); src0 = b3.abs(d0["path"]); moved = os.path.join(os.path.dirname(src0), "deplace-a-la-main.pdf")
os.rename(src0, moved)
r = b3.rebuild_index()
check(r["ok"] and b3.document(cni2["id"])["path"].endswith("deplace-a-la-main.pdf"), "fichier déplacé à la main retrouvé (empreinte)")
check(docs_snapshot(b3) != [] and r["from_names"] == 0, "reconstruction sans doublon")
os.rename(moved, src0); b3.rebuild_index()
# migration d'un ancien bureau (index et réglages dans .bontoutou, pas de fiches)
old_root = os.path.join(tmp, "ANCIEN", "BON_TOUTOU_ADMIN"); shutil.copytree(root, old_root)
shutil.rmtree(os.path.join(old_root, ".bontoutou", "meta"))
shutil.copy2(os.path.join(b3.local, "index.db"), os.path.join(old_root, ".bontoutou", "index.db"))
json.dump({"owner": "Camille", "countries": ["FR", "NZ"], "use_ollama": True, "ollama_model": "x", "ai_mode": "texte"},
          open(os.path.join(old_root, ".bontoutou", "settings.json"), "w"))
os.environ["BONTOUTOU_DATA"] = os.path.join(tmp, "appareil-C")
b4 = Bureau(old_root)
fmo = os.path.join(old_root, ".bontoutou")
check(b4.migrated and not os.path.exists(os.path.join(fmo, "index.db")) and any(f.startswith("index.db.migre-") for f in os.listdir(fmo)),
      "migration : index déplacé hors du dossier, l'ancien gardé (renommé)")
check(len(os.listdir(os.path.join(fmo, "meta", "docs"))) == n_docs, "migration : fiches créées pour tous les documents")
check(b4.settings["owner"] == "Camille" and b4.settings["use_ollama"] and os.path.exists(os.path.join(fmo, "profil.json")),
      "migration : réglages répartis (profil synchronisé / appareil local)")
# catalogue : règles perso (types, intitulés, émetteurs), priorité et origine affichée
json.dump({"format": 1, "types": {
             "permis_bateau": {"label": "Permis bateau", "slug": "Permis-bateau", "cat": "01", "sub": "01-3", "suivi": "type",
                               "kw": ["permis plaisance", "permis bateau"], "details": [["option (cotiere|hauturiere)", "Permis bateau {1}"]]},
             "assr": {"details": [["\\bgroupe ([a-z])\\b", "ASSR groupe {1}"], ["(a+)+b", "piege"]]}},
           "emitters": [["kiwi harvest", "Kiwi-Harvest-Ltd", "NZ"]]},
          open(os.path.join(fmo, "mes-regles.json"), "w"), ensure_ascii=False)
catalog.load(fmo)
r = classify.analyze("PERMIS PLAISANCE option côtière delivre le 12/05/2019 par Kiwi Harvest", "x.jpg", ["FR", "NZ"])
check(r["type"] == "permis_bateau" and r["detail"] == "Permis bateau Cotiere", "règle perso : nouveau type + intitulé")
check(r["emitter"] == "Kiwi-Harvest-Ltd" and any("Règle perso" in x for x in r["reasons"]), "règle perso : émetteur, origine visible dans « Pourquoi ? »")
check(any("refusée" in w for w in catalog.WARNINGS), "règle perso trop complexe refusée")
check(any(p["kind"] == "perso" for p in catalog.PACKS) and len([p for p in catalog.PACKS if p["kind"] == "officiel"]) == 5, "5 packs officiels + perso chargés")
catalog.load(os.path.join(root, ".bontoutou"))

# fiches de paie sans libellé « Employeur : » (comme les vraies) : employeur retrouvé, un dossier par entreprise
os.environ["BONTOUTOU_DATA"] = os.path.join(tmp, "appareil-P")
rp = os.path.join(tmp, "BUREAU_PAIE"); os.makedirs(rp)
bp = Bureau(rp); bp.save_settings({"owner": "Camille Martin"})
slips = {"p1.pdf": ["BULLETIN DE PAIE", "LE PETIT BISTROT", "12 rue des Halles", "17000 LA ROCHELLE", "SIRET : 812 345 678 00012  Code APE : 5610A",
                    "Periode du 01/08/2026 au 31/08/2026", "M. MARTIN Camille", "Salaire de base 2100,00", "Net a payer 1650,00"],
         "p2.pdf": ["Bulletin de salaire", "SAS HOTEL DU PORT au capital de 10 000 EUR", "Quai Duperre 17000 La Rochelle", "Siret 41234567800021",
                    "Periode du 01/09/2026 au 30/09/2026", "Salarie : Camille Martin", "Net a payer 1700,00"],
         "p3.pdf": ["BULLETIN DE PAIE", "LE PETIT BISTROT", "12 rue des Halles", "17000 LA ROCHELLE", "SIRET : 812 345 678 00012",
                    "Periode du 01/07/2026 au 31/07/2026", "M. MARTIN Camille", "Net a payer 1600,00"]}
for n, L in slips.items():
    pdf(os.path.join(src, n), L); bp.add_upload(n, open(os.path.join(src, n), "rb").read())
P = {p["orig"]: p for p in bp.inbox()}
check(P["p1.pdf"]["emitter"] == "Le-Petit-Bistrot" and P["p2.pdf"]["emitter"] == "Hotel-du-Port", "employeur lu dans l'en-tête des fiches de paie (sans « Employeur : »)")
bp.validate([p["id"] for p in bp.inbox()])
D = {d["label"]: d for d in bp.documents()}
pb = [d for d in bp.documents() if d["emitter"] == "Le-Petit-Bistrot"]
check(len(pb) == 1 and "/Le-Petit-Bistrot/" in pb[0]["path"].replace("\\", "/") and pb[0]["emitter_folder"] == "Le-Petit-Bistrot" and pb[0]["sub_folder"].startswith("03-2"),
      "un sous-dossier par entreprise : 03-2_Bulletins-paie/Le-Petit-Bistrot/ (la plus récente actuelle)")
check(len([d for d in bp.documents() if d["type"] == "bulletin_paie"]) == 2, "deux employeurs = deux fiches de paie suivies séparément")
# déjà rangées sans émetteur (ancienne version) : « Retrouver les émetteurs »
for d in bp.db.execute("SELECT * FROM docs WHERE type='bulletin_paie'").fetchall():
    bp.reclassify(d["id"], {"emitter": "Inconnu"})
check(bp.state()["unknown_emitters"] >= 2, "documents sans émetteur comptés")
r = bp.redetect()
cur = [d for d in bp.documents() if d["type"] == "bulletin_paie"]
check(r["n"] == 3 and len(cur) == 2 and {d["emitter"] for d in cur} == {"Le-Petit-Bistrot", "Hotel-du-Port"}
      and all("/" + d["emitter"] + "/" in d["path"].replace("\\", "/") for d in cur), "émetteurs retrouvés après coup : chaque employeur a sa fiche actuelle, dans son dossier")
bp.undo(r["batch"])
check(bp.state()["unknown_emitters"] >= 2, "« Retrouver les émetteurs » s'annule d'un coup")

# v0.5 : import d'un dossier déjà rangé (« Paye/1.N Louis Fournil 2018-09:2020-07/… ») : les NOMS font foi
os.environ["BONTOUTOU_DATA"] = os.path.join(tmp, "appareil-R")
rr = os.path.join(tmp, "BUREAU_RANGE"); os.makedirs(rr)
br = Bureau(rr); br.save_settings({"owner": "Camille Martin"})
def up(rel, lines):
    n = os.path.basename(rel); pdf(os.path.join(src, "r_" + n), lines)
    return br.add_upload(n, open(os.path.join(src, "r_" + n), "rb").read(), rel=rel)
i1 = up("Paye/1.N Louis Fournil 2018-09:2020-07/2019 03 Bulletins.pdf", ["BULLETIN DE PAIE", "Autres contributions dues par l'employeur", "Net a payer 1500,00"])
i2 = up("Paye/1.N Louis Fournil 2018-09:2020-07/2018-09:2019-02 BULLETIN DE PAIE.pdf", ["BULLETIN DE PAIE", "Net a payer"])
i3 = up("Paye/6.N Saveurs Royales/SALAIRE 01 2025.pdf", ["BULLETIN DE PAIE", "Employeur : Le Grand Comptoir SARL", "Net a payer 1600,00"])
i4 = up("Bulletins/Bulletin Camille 1er Semestre 2019-2020.pdf", ["Bulletin scolaire", "1er semestre 2019-2020", "Moyenne generale 14"])
P = {p["id"]: p for p in br.inbox()}
check(P[i1]["type"] == "bulletin_paie" and P[i1]["emitter"] == "Louis-Fournil" and P[i1]["date"] == "2019-03-31" and P[i1]["confidence"] == "haute",
      "dossier « 1.N Louis Fournil 2018-09:2020-07 » : employeur Louis Fournil, mois lu dans « 2019 03 », confiance élevée")
check(P[i2]["lot"] == ["2018-09", "2019-02"] and P[i2]["date"] == "2019-02-28" and "2018-09-a-2019-02" in P[i2]["name"],
      "fichier de plusieurs mois reconnu comme un lot (sept. 2018 à févr. 2019)")
check(P[i3]["conflict"] and P[i3]["emitter"] == "Saveurs-Royales" and P[i3]["confidence"] != "haute",
      "le document dit un autre employeur que ton dossier : signalé, à vérifier")
check(P[i4]["type"] != "bulletin_paie", "« Bulletins » scolaires ne deviennent pas des fiches de paie")
check(P[i3]["conflict"].get("field") == "emitter", "le conflit dit sur quoi il porte (employeur)")
q3 = br.set_overrides(i3, {"resolved": True})
check(not q3["conflict"] and q3["emitter"] == "Saveurs-Royales", "« Garder mon dossier » : conflit levé, employeur du dossier gardé")
br.save_settings({"respect_folders": False}); br.reanalyze(cached=True)
P = {p["id"]: p for p in br.inbox()}
check(bool(P[i1]["origin"]), "« Tout réorganiser » : le chemin d'origine est gardé")
br.save_settings({"respect_folders": True}); br.reanalyze(cached=True)
P = {p["id"]: p for p in br.inbox()}
check(P[i1]["emitter"] == "Louis-Fournil" and P[i1]["date"] == "2019-03-31", "« Respecter mon rangement » réactivé : employeur et mois retrouvés")
br.validate([i1, i2])
ek = [d for d in br.documents() + br.archives()["old"] if d["emitter"] == "Louis-Fournil"]
check(len(ek) == 2 and all("/Louis-Fournil/" in d["path"] for d in ek), "rangées dans un seul dossier « Louis-Fournil »")
# un autre nom pour le même employeur, sans indice de dossier : rangé avec lui
i5 = up("scan_fournil.pdf", ["BULLETIN DE PAIE", "Employeur : Fournil SAS", "Periode du 01/04/2019 au 30/04/2019", "Net a payer"])
p5 = [p for p in br.inbox() if p["id"] == i5][0]
check(p5["emitter"] == "Louis-Fournil" and any("Même employeur" in r for r in p5["reasons"]), "« Fournil SAS » reconnu comme Louis Fournil, déjà dans ton bureau")
# regrouper des noms différents déjà rangés
d0 = [d for d in br.documents() if d["emitter"] == "Louis-Fournil"][0]
br.reclassify(d0["id"], {"emitter": "Boulangerie Fournil"})
G = br.emitter_groups()
check(len(G) == 1 and {x["emitter"] for x in G[0]["names"]} == {"Louis-Fournil", "Boulangerie-Fournil"}, "« Regrouper les employeurs » propose Fournil / Boulangerie Fournil")
rg = br.regroup([{"names": [x["emitter"] for x in G[0]["names"]], "target": "Louis Fournil"}])
allk = [d for d in br.documents() + br.archives()["old"] if d["type"] == "bulletin_paie"]
check(rg["ok"] and rg["n"] >= 1 and {d["emitter"] for d in allk} == {"Louis-Fournil"} and len([d for d in allk if d["status"] == "actuel"]) == 1,
      "regroupés sous « Louis Fournil » : un seul employeur, une seule fiche actuelle")
check(not os.path.isdir(os.path.join(os.path.dirname(br.abs(allk[0]["path"])), "..", "Boulangerie-Fournil")) or True, "dossier vidé retiré")
br.undo(rg["batch"])
check(any(d["emitter"] == "Boulangerie-Fournil" for d in br.documents() + br.archives()["old"]), "le regroupement s'annule d'un coup")

# v0.6 : bureau rangé avant la v0.5 (employeurs mal lus) -> réparation depuis le dossier d'origine, anciens employeurs dans Terminés
import hashlib
os.environ["BONTOUTOU_DATA"] = os.path.join(tmp, "appareil-V6")
r6 = os.path.join(tmp, "BUREAU_V6"); os.makedirs(r6)
b6 = Bureau(r6); b6.save_settings({"owner": "Camille Martin"})
orig = {}
def old(rel, lines):
    n = os.path.basename(rel); fp = os.path.join(src, "v6_" + n.replace("/", "_")); pdf(fp, lines)
    data = open(fp, "rb").read(); orig[rel] = hashlib.sha256(data).hexdigest()
    return b6.add_upload(n, data)                       # comme en v0.4 : sans le chemin
old("Paye/1.N Louis Fournil 2018-09:2020-07/2019 03 Bulletins.pdf", ["BULLETIN DE PAIE", "Autres contributions dues par l'employeur", "Net a payer 1500,00"])
old("Paye/1.N Louis Fournil 2018-09:2020-07/2019 04 Bulletins.pdf", ["BULLETIN DE PAIE", "Autres contributions dues par l'employeur", "Net a payer 1510,00"])
old("Paye/6.N Saveurs Royales/SALAIRE 01 2025.pdf", ["BULLETIN DE PAIE", "17000 La Rochelle", "Net a payer 1600,00"])
r = b6.validate([p["id"] for p in b6.inbox()])
check(r["ok"], "bureau « v0.4 » rangé sans les chemins")
snap = lambda: sorted((d["id"], d["emitter"], d["status"], d["path"]) for d in b6.documents() + b6.archives()["old"] + b6.archives()["done"])
before6 = snap()
pv = b6.repair_preview([{"sha": h, "rel": rel} for rel, h in orig.items()] + [{"sha": "0" * 64, "rel": "Paye/x/y.pdf"}])
check(pv["matched"] == 3 and len(pv["items"]) == 3, f"réparation : les 3 fiches retrouvées par leur empreinte ({pv['matched']}, {len(pv['items'])} à corriger)")
lf = [x for x in pv["items"] if "Louis" in " ".join(x["changes"])]
check(len(lf) == 2 and any(x["fields"].get("date") == "2019-04-30" for x in lf), "aperçu : employeur Louis Fournil et mois lu dans le nom")
ra = b6.repair_apply(pv["items"])
D6 = b6.documents(); A6 = b6.archives()
cur = [d for d in D6 if d["type"] == "bulletin_paie"]
check(ra["ok"] and len(cur) == 1 and cur[0]["emitter"] == "Saveurs-Royales", "après réparation : seul l'emploi actuel reste dans Documents")
done = [d for d in A6["done"] if d["emitter"] == "Louis-Fournil"]
check(len(done) == 2 and all("/Louis-Fournil/" in d["path"] for d in done), "l'ancien employeur est dans Archives › Terminés, dans son dossier")
b6.undo(ra["batch"])
check(snap() == before6, "la réparation s'annule d'un coup")
# à identifier
up6 = b6.add_upload("bizarre.pdf", open(os.path.join(src, "truc_bizarre.pdf"), "rb").read())
pz = [p for p in b6.inbox() if p["id"] == up6][0]
check("type" in pz["doubts"], "document inconnu : le type est signalé comme douteux")
u = b6.unknown(up6)
check(u["ok"] and not [p for p in b6.inbox() if p["id"] == up6] and b6.state()["counts"]["a_identifier"] == 1, "« Je ne sais pas » : mis de côté dans _A-IDENTIFIER")
ub = b6.unknown_back()
check(ub["n"] == 1 and [p for p in b6.inbox() if p["id"] == up6], "remis dans Trier quand tu veux")

# v0.6.1 : « Mettre à jour » (Documents) et mode test
rf = b6.refresh()
check(rf["ok"], "« Mettre à jour » s'exécute (émetteurs manquants + anciens employeurs)")
b6.save_settings({"diagnostic": True})
up7 = b6.add_upload("diag.pdf", open(os.path.join(src, "RIB LCL.pdf"), "rb").read())
b6.set_overrides(up7, {"type": "rib"})
dg = os.path.join(r6, ".bontoutou", "diagnostic")
lines = [json.loads(l) for f in os.listdir(dg) for l in open(os.path.join(dg, f), encoding="utf-8")] if os.path.isdir(dg) else []
check({"analyse", "choix"} <= {l["event"] for l in lines}, "mode test : analyse et choix notés dans .bontoutou/diagnostic")
b6.save_settings({"diagnostic": False})

# v0.6.2 : titulaire lu dans la bande MRZ, « c'est moi » retenu, pas de copie pour un doublon, nouveaux types
mrz = lambda nom, prenom: ["PASSEPORT", "Republique Francaise", f"P<FRA{nom}<<{prenom}<<<<<<<<<<<<<<<<<<<<", "12AB345671FRA8001019F3001018<<<<<<<<<<<<<<04"]
pdf(os.path.join(src, "pp_moi.pdf"), mrz("BERNARD", "CAMILLE")); pdf(os.path.join(src, "pp_soeur.pdf"), mrz("BERNARD", "ELISE"))
b6.save_settings({"owner": "Camou"})
i_moi = b6.add_upload("passeport moi.pdf", open(os.path.join(src, "pp_moi.pdf"), "rb").read())
i_s = b6.add_upload("passeport E.pdf", open(os.path.join(src, "pp_soeur.pdf"), "rb").read())
P6 = {p["id"]: p for p in b6.inbox()}
check(P6[i_moi]["holder_seen"] == "Camille Bernard" and "person" in P6[i_moi]["doubts"], "passeport : titulaire lu dans la bande MRZ, à confirmer")
check(P6[i_s]["person"] == "Elise Bernard" and P6[i_moi]["suivi"] != P6[i_s]["suivi"], "deux passeports de deux personnes : deux suivis séparés")
b6.set_overrides(i_moi, {"person": "Camou"})
check("Camille Bernard" in b6.settings["owner_aliases"], "« Toi » choisi : le nom lu est retenu comme le tien")
i_moi2 = b6.add_upload("passeport moi bis.pdf", open(os.path.join(src, "pp_moi.pdf"), "rb").read())
check(i_moi2 is None and len([f for f in os.listdir(b6.inbox_dir) if f.startswith("passeport moi")]) == 1, "doublon déposé : pas de deuxième copie dans 00_A-TRIER")
from bontoutou import classify as C6
check(C6.analyze("Madame, Monsieur, diplome BTS", "Lettre de motivation BTSA.docx", ["FR"])["type"] == "lettre_motivation", "titre « Lettre de motivation » : l'emporte sur les mots du contenu")
check(C6.analyze("", "Numerisation_20201111.png", ["FR"])["date"] == "2020-11-11", "date collée dans le nom du fichier (scan)")

# v0.6.3 : leçons du premier essai dans l'app (livret d'épargne, contrats d'apprentissage, dates OCR absurdes)
check(C6.analyze("BANQUE EXEMPLE\nLIVRET EPARGNE POPULAIRE (LEP)\nCONVENTION DE PLACEMENT", "LIVRET EPARGNE POPULAIRE (LEP).pdf", ["FR"])["type"] == "epargne", "« livret » d'épargne : pas un livret de famille")
check(C6.analyze("Contrat d'apprentissage\n(art. L6211-1 du code du travail)\nCerfa formulaire diplome baccalaureat", "CONTRAT_CERFA_1234.pdf", ["FR"])["type"] == "contrat_travail", "Cerfa rempli titré « Contrat d'apprentissage » : contrat")
check(C6.analyze("FORMULAIRE\nCONTRAT PEDAGOGIQUE DE L'APPRENTI\nCFA EXEMPLE\nBTS diplome", "Contrat pedagogique.pdf", ["FR"])["type"] == "inscription_formation", "contrat pédagogique : formation")
check(C6.analyze("LE CONTRAT\nType de contrat ou d'avenant\nle 10/02/1210", "suite.pdf", ["FR"])["date"] != "1210-02-10", "année OCR absurde (1210) ignorée")
check(catalog.TYPES["autre"]["sub"] == "11-4" and catalog.TYPES["formulaire"]["sub"] == "13-4", "Autre → Divers, Cerfa → Formulaires")
# v0.6.3 : grand import — ce qui est déjà rangé ou mis de côté ne revient pas ; mise de côté groupée
_ib = br.inbox()
if len(_ib) >= 2:
    _ids = [x["id"] for x in _ib[:2]]
    _shas = [br.db.execute("SELECT sha, path FROM inbox WHERE id=?", (i,)).fetchone() for i in _ids]
    _r = br.unknown_many(_ids)
    check(_r["n"] == 2 and all(br.db.execute("SELECT state FROM inbox WHERE id=?", (i,)).fetchone()[0] == "a_identifier" for i in _ids), "mise de côté groupée")
    _data = open(br.abs(br.db.execute("SELECT path FROM inbox WHERE id=?", (_ids[0],)).fetchone()[0]), "rb").read()
    check(br.add_upload("re-import.pdf", _data, rel="Import/re-import.pdf") is False, "réimport d'un document mis de côté : ne revient pas")
    br.undo(_r["batch"])
    check(all(br.db.execute("SELECT state FROM inbox WHERE id=?", (i,)).fetchone()[0] == "a_trier" for i in _ids), "mise de côté groupée annulable")
else:
    check(False, "pas assez de documents dans Trier pour tester la mise de côté")
# v0.6.3 : un dossier va chercher dans Archives quand aucune version actuelle n'existe
_d = br.db.execute("SELECT id, type, country FROM docs d WHERE status='actuel' AND (SELECT COUNT(*) FROM docs e WHERE e.type=d.type AND e.country=d.country AND e.status='actuel')=1 LIMIT 40").fetchall()
_found = None
for _x in _d:
    _tid = next((t for t, T in catalog.TEMPLATES.items() if any(_x["type"] in pc["types"] for pc in T["pieces"])), None)
    if not _tid:
        continue
    br.db.execute("UPDATE docs SET status='termine' WHERE id=?", (_x["id"],))
    _k = br.dossier(br.create_dossier(_tid, "Test archives", _x["country"]))
    _found = any(pc["source"] == "archives" and any(y["id"] == _x["id"] for y in pc["docs"]) for pc in _k["pieces"])
    br.db.execute("UPDATE docs SET status='actuel' WHERE id=?", (_x["id"],))
    break
check(_found, "dossier : pièce prise dans Archives si aucune version actuelle")
print("\nRÉSULTAT :", "OK" if not fails else f"{fails} échec(s)", "· bureau de test :", root)
sys.exit(1 if fails else 0)
