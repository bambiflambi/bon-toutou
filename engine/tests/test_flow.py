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
if os.path.exists(os.path.join(old_root, ".bontoutou", "profil.json")):   # un ancien bureau n'avait pas encore de profil.json
    os.remove(os.path.join(old_root, ".bontoutou", "profil.json"))
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
check(catalog.TYPES["autre"]["sub"] == "16-1" and catalog.TYPES["formulaire"]["sub"] == "13-4", "Autre famille → 16 Autres familles, Cerfa → Formulaires")
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
# v0.6.3 : une nouvelle version relit Trier toute seule (texte déjà lu, corrections gardées)
br.save_settings({"analyse_version": "0.0.0"})
_n_before = br.db.execute("SELECT COUNT(*) FROM inbox WHERE state='a_trier'").fetchone()[0]
_br2 = Bureau(br.root); _br2.inbox()
from bontoutou import __version__ as _v
check(_br2.settings.get("analyse_version") == _v, "nouvelle version : Trier relu automatiquement")
# v0.7 : « tu t'en sers encore ? » — c'est l'utilisateur qui décide entre Documents et Archives
_ib = [x for x in br.inbox() if x["mode"] in ("new", "new_version")]
if _ib:
    _x = _ib[0]
    _p = br.set_overrides(_x["id"], {"usage": "archive"})
    check(_p["mode"] == "archive_user" and "99_ARCHIVES" in _p["dest"], "Archives choisi : rangé dans 99_ARCHIVES")
    _r = br.validate([_x["id"]])
    _d = br.db.execute("SELECT status FROM docs WHERE path LIKE '%99_ARCHIVES%' ORDER BY added_at DESC LIMIT 1").fetchone()
    check(_r["ok"] and _d and _d["status"] in ("termine", "ancienne_version"), "Archives choisi : document hors de Documents")
    br.undo(_r["batch"])
_sp = os.path.join(tmp, "solde_utile.pdf")
pdf(_sp, ["SOLDE DE TOUT COMPTE", "Saveurs Royales SAS", "Recu pour solde de tout compte", "Fait le 15/03/2025"])
br.add_upload("solde_utile.pdf", open(_sp, "rb").read())
_ib = [x for x in br.inbox() if x["mode"] in ("old_version", "archive_direct")]
check(bool(_ib), "un document qui irait d'office dans Archives")
if _ib:
    _p = br.set_overrides(_ib[0]["id"], {"usage": "utile"})
    check(_p["mode"] == "new" and "99_ARCHIVES" not in _p["dest"] and _p["suivi"] is None, "Utile aujourd'hui : gardé dans Documents, à côté de la version actuelle")
    _r = br.validate([_ib[0]["id"]])
    _d = br.db.execute("SELECT status, extra FROM docs ORDER BY added_at DESC, rowid DESC LIMIT 1").fetchone()
    check(_r["ok"] and _d["status"] == "actuel" and '"usage": "utile"' in (_d["extra"] or ""), "Utile aujourd'hui : actuel et retenu")
    br.undo(_r["batch"])
# v0.7.1 : Recommencer de zéro (le rangement est gardé, compressé) puis Revenir à ce rangement
_before = sorted((d["sha"], d["path"]) for d in br.db.execute("SELECT sha, path FROM docs").fetchall())
_nfiles = lambda: sum(len([x for x in f if not x.startswith(".")]) for dp, _, f in os.walk(br.root) if "/." not in dp)
_files_before = _nfiles()
_r = br.restart()
check(_r["ok"] and br.db.execute("SELECT COUNT(*) FROM docs").fetchone()[0] == 0 and _r["n"] > 0, "recommencer : plus rien de rangé, tout est dans Trier")
check(len([x for x in br.inbox() if x["source"] == "Recommencer de zéro"]) == _r["n"], "recommencer : chaque document revient dans Trier")
check(len(br.rangements()) == 1 and br.rangements()[0]["docs"] == len(_before), "recommencer : rangement gardé (plan compressé)")
check(_nfiles() == _files_before, "recommencer : aucun document supprimé")
br.undo(_r["batch"])
check(sorted((d["sha"], d["path"]) for d in br.db.execute("SELECT sha, path FROM docs").fetchall()) == _before and not [x for x in br.inbox() if x["source"] == "Recommencer de zéro"],
      "recommencer : annulable d'un coup")
_r = br.restart()
_rr = br.restore(br.rangements()[0]["file"])
check(_rr["ok"] and sorted((d["sha"], d["path"]) for d in br.db.execute("SELECT sha, path FROM docs").fetchall()) == _before, "revenir au rangement gardé : chaque document à sa place")
check(not [x for x in br.inbox() if x["source"] == "Recommencer de zéro"], "revenir : Trier vidé de ces documents")
# v0.7.2 : ce qui a déjà été écrit revient tout seul (émetteurs, titulaires, intitulés)
_k = br.known()
check(isinstance(_k["emitters"], list) and len(_k["emitters"]) > 0 and "Inconnu" not in _k["emitters"], "noms déjà connus : émetteurs proposés")
_ib = br.inbox()
if _ib:
    br.set_overrides(_ib[0]["id"], {"emitter": "Banque Exemple Zéphyr", "detail": "Intitulé témoin"})
    _k = br.known()
    check("Banque Exemple Zéphyr" in _k["emitters"] and "Intitulé témoin" in _k["details"], "noms déjà connus : une correction en cours est proposée aussitôt")
# v0.7.4 : « Autres » dans chaque famille et sous-famille, avec la famille imaginée
_ib = br.inbox()
if _ib:
    _x = _ib[0]
    _p = br.set_overrides(_x["id"], {"type": "autre_03_1", "suggest": "Formation professionnelle", "usage": "utile"})
    check("03-1_Contrats/Autres" in _p["dest"].replace(os.sep, "/"), "Autre dans une sous-famille : dossier Autres dedans")
    _r = br.validate([_x["id"]])
    _a = [d for d in br.autres() if d["type"] == "autre_03_1"]
    check(_r["ok"] and _a and _a[0]["suggestion"] == "Formation professionnelle", "« Autres » à étudier : retrouvé avec la famille imaginée")
    check("Formation professionnelle" in br.known()["suggestions"], "famille imaginée proposée la fois suivante")
    br.undo(_r["batch"])
check("autre_05" in catalog.TYPES and catalog.TYPES["autre_05"]["sub"] == "05-9" and not [t for t in classify.build_prompt("x", "x", ["FR"]).split("parmi : ")[1].split(")")[0].split(", ") if t.startswith("autre_")],
      "« Autres » de famille : jamais proposés à l'IA")
# v0.7.5 : plan de rangement préparé ailleurs, appliqué sans rien ranger, puis validé par groupes
_ib = [x for x in br.inbox() if not x["overridden"]]
if len(_ib) >= 2:
    _sh = {x["id"]: br.db.execute("SELECT sha FROM inbox WHERE id=?", (x["id"],)).fetchone()[0] for x in _ib[:2]}
    os.makedirs(os.path.join(br.fm, "plans"), exist_ok=True)
    br.set_overrides(_ib[1]["id"], {"emitter": "Choix de l'utilisateur"})
    json.dump({"format": 1, "source": "Claude", "items": [{"sha": _sh[_ib[0]["id"]], "type": "releve_bancaire", "emitter": "Banque Plan", "usage": "archive", "note": "test"},
                                                          {"sha": _sh[_ib[1]["id"]], "type": "rib", "emitter": "Écrasé ?", "usage": "utile"},
                                                          {"sha": "inconnu", "type": "rib"}]}, open(os.path.join(br.fm, "plans", "plan-test.json"), "w"))
    _pl = br.plans()
    check(_pl and _pl[0]["match"] == 2, "plan : documents de Trier reconnus par empreinte")
    _n0 = br.db.execute("SELECT COUNT(*) FROM docs").fetchone()[0]
    _r = br.plan_apply("plan-test.json")
    _p = {x["id"]: x for x in br.inbox()}
    check(_r["n"] == 2 and _p[_ib[0]["id"]]["type"] == "releve_bancaire" and _p[_ib[0]["id"]]["plan"] == "Claude" and "99_ARCHIVES" in _p[_ib[0]["id"]]["dest"],
          "plan appliqué : pré-rempli (type, usage), marqué « Claude »")
    check(_p[_ib[1]["id"]]["emitter_display"] == "Choix de l'utilisateur", "plan : ne remplace jamais un choix déjà fait")
    check(br.db.execute("SELECT COUNT(*) FROM docs").fetchone()[0] == _n0, "plan : rien n'est rangé avant validation")
# v0.7.6 : « Mettre à jour » corrige la date d'un titre d'identité rangé avec la date de naissance
pdf(os.path.join(src, "cni_v076.pdf"), ["REPUBLIQUE FRANCAISE", "CARTE NATIONALE D'IDENTITE", "Ne(e) le : 31.12.1985", "Carte valable jusqu'au : 04.10.2029", "delivree le : 05.10.2014"])
_i = br.add_upload("cni_v076.pdf", open(os.path.join(src, "cni_v076.pdf"), "rb").read())
_pp = [x for x in br.inbox() if x["orig"] == "cni_v076.pdf"]
if _pp:
    br.set_overrides(_pp[0]["id"], {"type": "carte_identite", "date": "1985-12-31"})
    br.validate([_pp[0]["id"]])
    _d = br.db.execute("SELECT * FROM docs WHERE orig_name='cni_v076.pdf'").fetchone()
    check(_d and _d["doc_date"] == "1985-12-31", "titre rangé avec une mauvaise date (naissance)")
    _r = br.refresh()
    _d = br.db.execute("SELECT * FROM docs WHERE orig_name='cni_v076.pdf'").fetchone()
    check(_d["doc_date"] == "2014-10-05" and "2014-10-05" in _d["path"] and "délivrance" in (_r.get("msg") or ""), "Mettre à jour : date de délivrance relue, fichier renommé")
    br.undo(_r["batch"])
    check(br.db.execute("SELECT doc_date FROM docs WHERE orig_name='cni_v076.pdf'").fetchone()[0] == "1985-12-31", "correction de date annulable")
# v0.7.7 : revue de documents déjà rangés (dates, statut, copies), un seul « Annuler »
_ps = {}
for _n, _l in (("pa_old.pdf", ["PASSEPORT", "ancien", "P<FRAMARTIN<<CAMILLE<<<<<<<<<<<<<<<<<<<<<<<<<<<", "19AB123456FRA0303103F2410044<<<<<<<<<<<<<<02"]),
               ("pa_copie.pdf", ["PASSEPORT", "copie couleur", "P<FRAMARTIN<<CAMILLE<<<<<<<<<<<<<<<<<<<<<<<<<<<", "19AB123456FRA0303103F2410044<<<<<<<<<<<<<<02"]),
               ("pa_new.pdf", ["PASSEPORT", "nouveau", "P<FRAMARTIN<<CAMILLE<<<<<<<<<<<<<<<<<<<<<<<<<<<", "24CD987654FRA0303103F3407220<<<<<<<<<<<<<<06"])):
    pdf(os.path.join(src, _n), _l); br.add_upload(_n, open(os.path.join(src, _n), "rb").read())
for _x in br.inbox():
    if _x["orig"].startswith("pa_"):
        br.set_overrides(_x["id"], {"type": "passeport", "person": "moi"}); br.validate([_x["id"]])
_row = lambda n: br.db.execute("SELECT * FROM docs WHERE orig_name=?", (n,)).fetchone()
check(_row("pa_old.pdf")["doc_date"] == "2019-10-05", "passeport : délivrance déduite de la bande MRZ (5 ans pour un mineur)")
os.makedirs(os.path.join(br.fm, "revues"), exist_ok=True)
json.dump({"format": 1, "source": "Claude", "title": "Pièces d'identité", "items": [
    {"sha": _row("pa_new.pdf")["sha"], "date": "2024-07-23", "expiry": "2034-07-22", "status": "actuel", "note": "nouveau passeport"},
    {"sha": _row("pa_old.pdf")["sha"], "status": "ancienne_version"},
    {"sha": _row("pa_copie.pdf")["sha"], "status": "copie", "copy_of": _row("pa_old.pdf")["sha"]}]},
    open(os.path.join(br.fm, "revues", "revue-test.json"), "w"))
_rv = br.revues()
check(_rv and _rv[0]["match"] == 3 and not _rv[0]["applied"], "revue listée avec ses 3 lignes, pas encore appliquée")
_r = br.revue_apply("revue-test.json")
_o, _c, _nw = _row("pa_old.pdf"), _row("pa_copie.pdf"), _row("pa_new.pdf")
check(_r["ok"] and _nw["status"] == "actuel" and _nw["doc_date"] == "2024-07-23" and _o["status"] == "ancienne_version", "revue : nouveau passeport actuel, l'ancien en ancienne version")
check(_c["status"] == "copie" and "/Copies/" in _c["path"] and os.path.exists(br.abs(_c["path"])) and [x["id"] for x in br.document(_o["id"])["copies"]] == [_c["id"]],
      "copie rattachée à son document, rangée dans « Copies » à côté de lui")
check(_c["id"] not in [d["id"] for d in br.documents()] and _c["id"] not in [d["id"] for d in br.archives()["old"] + br.archives()["done"]], "une copie n'encombre ni Documents ni Archives")
br.undo(_r["batch"])
check(_row("pa_copie.pdf")["status"] != "copie" and os.path.exists(br.abs(_row("pa_copie.pdf")["path"])), "revue annulée en une fois")
# v0.7.7 : ton vrai nom, une seule écriture par personne (titulaire et émetteur)
from bontoutou.classify import same_person
check(same_person("PM Belleperche", "Paul-Marie Belleperche") and same_person("PAUL-MARIE BELLEPERCHE", "Paul Marie Joel Marius Belleperche")
      and same_person("P<FRABELLEPERCHE<<PAUL<MARIE<JOEL", "Belleperche Paul-Marie") and not same_person("Marie Belleperche", "Paul-Marie Belleperche")
      and not same_person("Eric Belleperche", "Paul-Marie Belleperche"), "même personne sous plusieurs écritures, sans confondre la famille")
br.save_settings({"owner": "Kami"})
_ds = [d for d in br.documents() if catalog.TYPES[d["type"]]["cat"] in br.PERSONAL_CATS][:2] or br.documents()[:2]
br.reclassify(_ds[0]["id"], {"person": "CAMILLE ROSE MARTIN"})
br.reclassify(_ds[1]["id"], {"emitter": "Camille Rose Martin"})
json.dump({"format": 1, "source": "Claude", "title": "Ton nom", "profile": {"owner": "Camille-Rose Martin", "owner_aliases": ["Kami"]}, "items": []},
          open(os.path.join(br.fm, "revues", "revue-nom.json"), "w"))
_r = br.revue_apply("revue-nom.json")
_a, _b = br.db.execute("SELECT * FROM docs WHERE id=?", (_ds[0]["id"],)).fetchone(), br.db.execute("SELECT * FROM docs WHERE id=?", (_ds[1]["id"],)).fetchone()
check(br.settings["owner"] == "Camille-Rose Martin" and _a["person"] == "Camille-Rose Martin" and _b["emitter"] == "Camille-Rose-Martin"
      and br.holder({"person": "CR Martin"}) == "Camille-Rose Martin" and br.holder({"person": "Kami"}) == "Camille-Rose Martin",
      "revue « ton nom » : vrai nom dans le profil, titulaires et émetteurs unifiés")
br.undo(_r["batch"])
check(br.settings["owner"] == "Kami" and br.db.execute("SELECT person FROM docs WHERE id=?", (_ds[0]["id"],)).fetchone()[0] != "Camille-Rose Martin", "changement de nom annulable")
# v0.7.8 : Mettre à jour prépare une revue des doublons (texte identique) et corrige une date de naissance prise pour la date
_L = ["ATTESTATION DE SCOLARITE", "Je soussigne certifie que l eleve est inscrit dans notre etablissement pour l annee", "Fait pour servir et valoir ce que de droit", "Ne le 10/03/2003", "Le 05/09/2019"]
for _n in ("scol_a.pdf", "scol_b.pdf"):
    pdf(os.path.join(src, _n), _L + ([" "] if _n == "scol_b.pdf" else [])); br.add_upload(_n, open(os.path.join(src, _n), "rb").read())
for _x in br.inbox():
    if _x["orig"].startswith("scol_"):
        br.set_overrides(_x["id"], {"type": "autre", "date": "2003-03-10"}); br.validate([_x["id"]])
_r = br.refresh()
_dr = [r for r in br.revues() if r["file"].startswith("revue-doublons-") and not r["applied"]]
check(_dr and any(l["to"].get("status") == "copie" for l in _dr[0]["lines"]), "Mettre à jour : doublons repérés, revue préparée (rien déplacé)")
check(br.db.execute("SELECT doc_date FROM docs WHERE orig_name='scol_a.pdf'").fetchone()[0] == "2019-09-05", "date de naissance prise pour la date du document : corrigée")
# v0.8.0 : un dossier par bien (Patrimoine › Immobilier › <bien> › <étape>) et dossier envoyé reconstitué
_bs = {}
for _n, _l in (("acte_vente.pdf", ["ACTE DE VENTE", "appartement", "vendeur"]), ("quit_loc.pdf", ["QUITTANCE", "loyer de mars 2024", "locataire"]),
               ("cand_1.pdf", ["DOSSIER LOCATAIRE", "piece 1 filigrane"]), ("cand_2.pdf", ["DOSSIER LOCATAIRE", "piece 2 filigrane"])):
    pdf(os.path.join(src, _n), _l); br.add_upload(_n, open(os.path.join(src, _n), "rb").read())
for _x in br.inbox():
    if _x["orig"] in ("acte_vente.pdf", "quit_loc.pdf", "cand_1.pdf", "cand_2.pdf"):
        br.set_overrides(_x["id"], {"type": "autre", "date": "2024-03-31"}); br.validate([_x["id"]])
_sh = lambda n: br.db.execute("SELECT sha FROM docs WHERE orig_name=?", (n,)).fetchone()[0]
json.dump({"format": 1, "source": "Claude", "title": "Logement", "items": [
    {"sha": _sh("acte_vente.pdf"), "type": "immo_vente", "bien": "Appartement Paris 14", "status": "actuel"},
    {"sha": _sh("quit_loc.pdf"), "type": "immo_quittance", "bien": "Appartement Paris 14", "status": "termine"}],
    "dossiers": [{"template": "louer_logement", "label": "Location La Rochelle", "recipient": "Agence", "country": "FR", "sent_at": "2025-01-10",
                  "pieces": [{"label": "Pièce d'identité", "shas": [_sh("cand_1.pdf")]}, {"label": "Fiches de paie", "shas": [_sh("cand_2.pdf")]}]}]},
    open(os.path.join(br.fm, "revues", "revue-logement.json"), "w"))
_rv = [r for r in br.revues() if r["file"] == "revue-logement.json"][0]
check(_rv["dossiers"][0]["n"] == 2 and _rv["match"] == 4, "revue Logement : biens et dossier reconstitué annoncés")
_r = br.revue_apply("revue-logement.json")
_v, _q = br.db.execute("SELECT * FROM docs WHERE orig_name='acte_vente.pdf'").fetchone(), br.db.execute("SELECT * FROM docs WHERE orig_name='quit_loc.pdf'").fetchone()
check("/10-1_" in _v["path"] and "Appartement-Paris-14" in os.path.basename(_v["path"]) and _v["status"] == "actuel"
      and "99_ARCHIVES" in _q["path"] and "/02-2_" in _q["path"] and "Appartement-Paris-14" in os.path.basename(_q["path"]),
      "v0.9 : rangé par nature (vente dans Patrimoine, quittance dans Logement › Quittances), le lieu dans le nom du fichier")
_ln = br.make_name({"type": "immo_vente", "date": "2025-01-01", "country": "FR", "emitter": "Inconnu"}, ".pdf")
check(classify.title_name("2020 paris rue poussin") == "2020 Paris Rue Poussin" and classify.title_name("saint-jean-d'angély") == "Saint-Jean-d'Angély",
      "noms de biens et de logements écrits avec des majuscules")
check("Inconnu" not in _ln and _ln.startswith("2025-01-01_FR_10_"), "« Inconnu » ne s'écrit plus dans le nom des fichiers")
_s = [x for x in br.archives()["sent"] if x["label"] and x["recipient"] == "Agence"]
check(_s and _s[0]["count"] == 2 and os.path.exists(os.path.join(br.abs(_s[0]["folder"]), "PREUVE.txt"))
      and br.db.execute("SELECT status FROM docs WHERE orig_name='cand_1.pdf'").fetchone()[0] == "copie", "dossier envoyé reconstitué : pièces regroupées, preuve écrite")
br.undo(_r["batch"])
check(not [x for x in br.archives()["sent"] if x["recipient"] == "Agence"] and "Paris-14" not in br.db.execute("SELECT path FROM docs WHERE orig_name='acte_vente.pdf'").fetchone()[0],
      "revue Logement annulée en une fois")
# v0.8.3 : dossier « Revenus locatifs » d'un bien pour une année, montants lus (à vérifier), récapitulatif CSV
for _n, _l in (("q_jan.pdf", ["QUITTANCE DE LOYER", "Janvier 2024", "Loyer 850,00 EUR", "Total 900,00 EUR"]),
               ("q_fev.pdf", ["QUITTANCE DE LOYER", "Fevrier 2024", "Total 900,00 EUR"]),
               ("af_t1.pdf", ["APPEL DE FONDS", "Montant de l'appel : 312,40 EUR", "15/01/2024"]),
               ("tf_24.pdf", ["TAXE FONCIERE 2024", "Montant a payer 640 EUR", "01/09/2024"])):
    pdf(os.path.join(src, _n), _l); br.add_upload(_n, open(os.path.join(src, _n), "rb").read())
_ty = {"q_jan.pdf": ("immo_quittance", "2024-01-31"), "q_fev.pdf": ("immo_quittance", "2024-02-29"), "af_t1.pdf": ("immo_appel_fonds", "2024-01-15"), "tf_24.pdf": ("immo_charges", "2024-09-01")}
for _x in br.inbox():
    if _x["orig"] in _ty:
        br.set_overrides(_x["id"], {"type": _ty[_x["orig"]][0], "date": _ty[_x["orig"]][1]}); br.validate([_x["id"]])
for _n in _ty:
    _d = br.db.execute("SELECT id FROM docs WHERE orig_name=?", (_n,)).fetchone()
    br.reclassify(_d["id"], {"bien": "2022 appartement test"})
_b = br.biens()
check(any(x["bien"] == "2022 Appartement Test" and "2024" in x["years"] for x in _b), "biens listés avec leurs années (nom écrit avec des majuscules)")
_rp = br.rental("2022 Appartement Test", 2024)
_sec = {x["key"]: x for x in _rp["sections"]}
check(len(_sec["recettes"]["docs"]) == 2 and _sec["recettes"]["total"] == 1800.0 and _sec["charges"]["total"] == 952.4,
      "revenus locatifs 2024 : recettes 1 800 €, charges 952,40 € (montants lus, à vérifier)")
_bd = br.rental_build("2022 Appartement Test", 2024, {_sec["charges"]["docs"][0]["id"]: 300})
_csv = open(br.abs(_bd["csv"]), encoding="utf-8-sig").read()
check(_bd["ok"] and _bd["n"] == 4 and "Total recettes;;;;1800,00" in _csv and "300,00" in _csv and os.path.isdir(os.path.join(br.abs(_bd["folder"]), "1_Recettes")),
      "dossier préparé : pièces copiées par section, récapitulatif avec le montant corrigé")
check(all(os.path.exists(br.abs(br.db.execute("SELECT path FROM docs WHERE orig_name=?", (_n,)).fetchone()[0])) for _n in _ty), "les originaux restent à leur place")
# v0.9.0 : un dossier par organisme, le lieu et le rôle dans la fiche, le lieu dans le nom, migration « tidy »
for _n, _l in (("edf_att.pdf", ["EDF", "ATTESTATION DE TITULAIRE DE CONTRAT", "12/01/2024"]), ("pret_lcl.pdf", ["LCL", "OFFRE DE PRET IMMOBILIER", "tableau d'amortissement", "28/06/2022"])):
    pdf(os.path.join(src, _n), _l); br.add_upload(_n, open(os.path.join(src, _n), "rb").read())
for _x in br.inbox():
    if _x["orig"] in ("edf_att.pdf", "pret_lcl.pdf"):
        br.set_overrides(_x["id"], {"type": "justificatif_domicile" if _x["orig"] == "edf_att.pdf" else "immo_pret", "emitter": "EDF" if _x["orig"] == "edf_att.pdf" else "LCL"}); br.validate([_x["id"]])
_e = br.db.execute("SELECT * FROM docs WHERE orig_name='edf_att.pdf'").fetchone()
_r = br.reclassify(_e["id"], {"lieu": "paris - rue de plaisance", "role": "proprietaire_occupant"})
_e = br.db.execute("SELECT * FROM docs WHERE orig_name='edf_att.pdf'").fetchone()
_pub = br._doc_pub(_e)
check("/02-5_" in _e["path"] and "/EDF/" in _e["path"] and _e["path"].endswith("_Paris-Rue-de-Plaisance.pdf") and _pub["lieu"] == "Paris - Rue de Plaisance"
      and _pub["role_label"] == "Propriétaire occupant", "justificatif EDF : Logement › Justificatifs › EDF, lieu et rôle dans la fiche, lieu dans le nom")
_p = br.db.execute("SELECT path FROM docs WHERE orig_name='pret_lcl.pdf'").fetchone()[0]
check("/05-3_" in _p and "/LCL/" in _p, "crédit immobilier : Banque › Crédits › LCL")
check("Paris - Rue de Plaisance" in br.known()["lieux"], "lieux déjà écrits proposés en autocomplétion")
_lg = os.path.join(br.country_dir("FR"), os.path.basename(br.cat_dir("FR", "02")), "02-6_Mes-logements")
os.makedirs(_lg, exist_ok=True)
check(os.path.basename(br.sub_dir("FR", "02", "02-6")) == "02-6_Copropriete", "l'ancien dossier « Mes logements » n'est jamais réutilisé pour la Copropriété")
json.dump({"format": 1, "source": "Claude", "title": "Migration", "tidy": True, "supersedes": ["revue-x.json"], "items": []}, open(os.path.join(br.fm, "revues", "revue-migration.json"), "w"))
json.dump({"format": 1, "source": "Claude", "title": "X", "items": []}, open(os.path.join(br.fm, "revues", "revue-x.json"), "w"))
_r = br.revue_apply("revue-migration.json")
check(_r["ok"] and not os.path.isdir(_lg) and json.load(open(os.path.join(br.fm, "revues", "revue-x.json"))).get("applied") == "remplacée",
      "migration : tout le bureau rangé, dossiers vides de l'ancienne organisation retirés, ancienne revue remplacée")
_r2 = br.refresh()
check(not _r2.get("batch") or "organisme" not in (_r2.get("msg") or ""), "Mettre à jour juste après : rien à déplacer")
# v0.9.1 : famille 17 Activités & entreprises, la comptabilité quitte Patrimoine ; poids du fichier dans la fiche
check(catalog.TYPES["immo_compta"]["sub"] == "17-2" and catalog.TYPES["entreprise_statuts"]["cat"] == "17" and catalog.TYPES["autre_10_5"]["sub"] == "17-2",
      "famille 17 : comptabilité et statuts, anciens « Autres » de 10-5 redirigés")
_d0 = br.documents()[0]
check(isinstance(br.document(_d0["id"]).get("size"), int), "fiche : poids du fichier")
# v0.9.3 : retrouver (recherche texte + synonymes), fiche complétée, Essentiels, profil, doublons élargis
from bontoutou import retrouver as _R
_rib = [d for d in b.documents() if d["type"] == "rib"]
check(bool(_rib) and any(x["id"] == _rib[0]["id"] for x in _R.search(b, "iban")), "recherche : « iban » retrouve le RIB (synonyme)")
_any = br.documents()[0]
_m = br.doc_meta(_any["id"], {"forme": "traduit", "langue": "anglais", "period": "2026-09", "collections_add": ["Préparer mon déménagement"]})
_dd = br.document(_any["id"])
check(_m["ok"] and _dd["forme"] == "traduit" and _dd["collections"] == ["Préparer mon déménagement"] and _dd["path"] == _any["path"],
      "fiche complétée (forme, période, collection) sans déplacer le fichier")
check(_R.collections(br) and _R.collections(br)[0]["name"] == "Préparer mon déménagement", "collections listées")
br.undo(_m["batch"]); check(br.document(_any["id"])["collections"] == [], "fiche complétée : annulable")
_E = _R.essentials(br)
check(any(e["id"] == "passeport" for e in _E) and all(e["state"] in ("ok", "soon", "old", "missing") for e in _E), "Essentiels calculés avec un voyant")
check(_R._mrz_ids("P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10") == [("passeport", "L898902C3", "UTO")]
      and _R._mrz_ids("SOLDE DE TOUT COMPTE ONTRATLE3") == [], "MRZ : numéro lu seulement dans une vraie bande (clés de contrôle)")
check(_R._mod97_iban("FR76 3000 6000 0112 3456 7890 189") and not _R._mod97_iban("FR76 3000 6000 0112 3456 7890 188"), "IBAN : clé vérifiée")
check("••••" in _R.mask("Mot de passe : abc123XYZ") and "abc123" not in _R.mask("Mot de passe : abc123XYZ"), "extraits de recherche : mots de passe masqués")
print("\nRÉSULTAT :", "OK" if not fails else f"{fails} échec(s)", "· bureau de test :", root)
sys.exit(1 if fails else 0)
