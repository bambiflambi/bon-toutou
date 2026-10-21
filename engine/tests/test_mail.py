"""Adresse admin : liste des pièces jointes, copie dans Trier, sans doublon, sans jamais modifier la boîte.
    python3 -m tests.test_mail        (depuis le dossier engine)
Aucune connexion réelle : sortie.imap_open est remplacé par une fausse messagerie.
"""
import base64, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
tmp = tempfile.mkdtemp(prefix="bt_mail_")
os.environ["BONTOUTOU_DATA"] = os.path.join(tmp, "appareil")
from bontoutou import mail, sortie, trousseau
from bontoutou.core import Bureau
from tests.make_samples import SAMPLES, pdf

fails = 0
def check(cond, msg):
    global fails
    print(("  ✓ " if cond else "  ✗ ") + msg); fails += 0 if cond else 1

# ---------- 1. fournisseurs
check(mail.provider_for("camille@gmail.com")[1] == "imap.gmail.com", "Gmail reconnu")
check(mail.provider_for("camille@ik.me")[0] == "Infomaniak", "Infomaniak reconnu")
check(mail.provider_for("camille@proton.me")[4], "Proton : non pris en charge, avec explication")
check(mail.provider_for("camille@outlook.com")[4], "Outlook : prévu plus tard")
check(mail.provider_for("camille@exemple.fr", "mail.exemple.fr")[1] == "mail.exemple.fr", "serveur personnalisé")

# ---------- 2. une fausse messagerie IMAP
src = os.path.join(tmp, "src"); os.makedirs(src)
pdf(os.path.join(src, "paie.pdf"), SAMPLES["scan_paie_juillet.pdf"])
PAIE = open(os.path.join(src, "paie.pdf"), "rb").read()
B64 = base64.encodebytes(PAIE)

BS1 = (b'(("TEXT" "PLAIN" ("CHARSET" "utf-8") NIL NIL "7BIT" 20 1 NIL NIL NIL NIL)'
       b'("IMAGE" "PNG" ("NAME" "logo.png") "<logo>" NIL "BASE64" 3000 NIL ("INLINE" ("FILENAME" "logo.png")) NIL NIL)'
       b'("APPLICATION" "PDF" ("NAME" "=?utf-8?q?Bulletin_juillet_=C3=A9t=C3=A9.pdf?=") NIL NIL "BASE64" ' + str(len(B64)).encode() +
       b' NIL ("ATTACHMENT" ("FILENAME" "=?utf-8?q?Bulletin_juillet_=C3=A9t=C3=A9.pdf?=")) NIL NIL) "MIXED" ("BOUNDARY" "x") NIL NIL NIL)')
BS2 = b'("TEXT" "PLAIN" ("CHARSET" "utf-8") NIL NIL "7BIT" 20 1 NIL NIL NIL NIL)'
H1 = b"From: Camille Martin Paie <paie@exemple.fr>\r\nSubject: Votre bulletin\r\nDate: Mon, 3 Aug 2026 09:00:00 +0200\r\nMessage-ID: <m1@exemple.fr>\r\n\r\n"
H2 = b"From: Ami <ami@exemple.fr>\r\nSubject: Coucou\r\nDate: Tue, 4 Aug 2026 09:00:00 +0200\r\nMessage-ID: <m2@exemple.fr>\r\n\r\n"
CALLS = []

class FakeIMAP:
    def select(self, box, readonly=False):
        CALLS.append(("select", box, readonly)); return "OK", [b"2"]
    def uid(self, cmd, *args):
        CALLS.append(("uid", cmd) + args)
        if cmd == "SEARCH":
            return "OK", [b"1 2"]
        if cmd == "FETCH" and "BODYSTRUCTURE" in args[1]:
            return "OK", [(b"1 (UID 1 BODYSTRUCTURE " + BS1 + b" BODY[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)] {%d}" % len(H1), H1), b")",
                          (b"2 (UID 2 BODYSTRUCTURE " + BS2 + b" BODY[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)] {%d}" % len(H2), H2), b")"]
        if cmd == "FETCH" and args[1] == "(BODY.PEEK[3])":
            return "OK", [(b"1 (UID 1 BODY[3] {%d}" % len(B64), B64), b")"]
        return "NO", []
    def logout(self):
        CALLS.append(("logout",))
    def __getattr__(self, name):  # store, expunge, copy, move, append… : interdits
        raise AssertionError("commande interdite : " + name)

opened = []
def fake_open(host, port, user, password, consent=False, log=None, what="", timeout=30):
    if not consent:
        raise sortie.SortieRefusee("accord manquant")
    log({"dest": host, "purpose": "mail", "label": sortie.PURPOSES["mail"], "what": what, "bytes": 0})
    if password != "abcd efgh ijkl mnop":
        raise PermissionError("AUTHENTICATIONFAILED")
    opened.append((host, user))
    return FakeIMAP()
sortie.imap_open = fake_open
trousseau.save = lambda s, a, p: (trousseau._memory.__setitem__((s, a), p), False)[1]   # pas de vrai trousseau en test
trousseau.load = lambda s, a: trousseau._memory.get((s, a))
trousseau.forget = lambda s, a: trousseau._memory.pop((s, a), None)

class FakeIMAPAutreOrdre(FakeIMAP):   # certains serveurs envoient l'en-tête avant la structure
    def uid(self, cmd, *args):
        if cmd == "FETCH" and "BODYSTRUCTURE" in args[1]:
            return "OK", [(b"1 (UID 1 BODY[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)] {%d}" % len(H1), H1), b" BODYSTRUCTURE " + BS1 + b")",
                          (b"2 (UID 2 BODY[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)] {%d}" % len(H2), H2), b" BODYSTRUCTURE " + BS2 + b")"]
        return FakeIMAP.uid(self, cmd, *args)
it2 = mail.scan(FakeIMAPAutreOrdre())
check(len(it2) == 1 and it2[0]["subject"] == "Votre bulletin" and it2[0]["part"] == "3", "réponse dans un autre ordre (en-tête avant la structure) : lue pareil")
CALLS.clear()

root = os.path.join(tmp, "BON_TOUTOU_ADMIN"); os.makedirs(root)
b = Bureau(root)

# ---------- 3. connexion
r = b.mail_connect("camille@gmail.com", "abcd efgh ijkl mnop", consent=False)
check(not r["ok"] and b.sorties() == [], "sans accord : rien ne part, rien n'est noté")
r = b.mail_connect("camille@gmail.com", "mauvais", consent=True)
check(not r["ok"] and "mot de passe d'application" in r["msg"], "mot de passe refusé : conseil du mot de passe d'application")
r = b.mail_connect("camille@proton.me", "x", consent=True)
check(not r["ok"] and "Proton" in r["msg"], "Proton : refus expliqué")
r = b.mail_connect("camille@gmail.com", "abcd efgh ijkl mnop", consent=True)
check(r["ok"] and r["provider"] == "Gmail", "connexion Gmail réussie")
check(b.settings["mail"] == "camille@gmail.com" and b.settings["mail_saved"], "adresse enregistrée, mot de passe rangé")
disk = ""
for d, _, fs in os.walk(tmp):
    for f in fs:
        try:
            disk += open(os.path.join(d, f), "rb").read().decode("utf-8", "ignore")
        except OSError:
            pass
check("abcd efgh" not in disk, "le mot de passe n'est écrit dans aucun fichier")
check(all(s["dest"] == "imap.gmail.com" and s["purpose"] == "mail" for s in b.sorties()) and len(b.sorties()) == 2,
      "chaque connexion est notée dans le journal des sorties")

# ---------- 4. liste et copie
r = b.mail_scan(consent=True)
items = r.get("items", [])
check(r["ok"] and len(items) == 1, "une seule pièce jointe utile (logo et mail sans pièce ignorés)")
check(items and items[0]["filename"] == "Bulletin juillet été.pdf" and items[0]["date"] == "2026-08-03", "nom de fichier décodé, date du mail")
check(items and "Camille Martin Paie" in items[0]["from"], "expéditeur lu")
r = b.mail_import([items[0]["key"]], consent=True)
check(r["ok"] and r["added"] == 1, "pièce jointe copiée dans Trier")
inbox = b.inbox()
check(len(inbox) == 1 and inbox[0]["type"] == "bulletin_paie" and inbox[0]["source"].startswith("Adresse admin"), "analysée comme les autres, source « Adresse admin »")
r = b.mail_scan(consent=True)
check(r["ok"] and r["items"] == [], "déjà copiée : n'apparaît plus")
b.db.execute("DELETE FROM mail_seen"); b.db.commit()
r = b.mail_scan(consent=True); r = b.mail_import([i["key"] for i in r["items"]], consent=True)
check(r["ok"] and r["added"] == 0 and r["dup"] == 1, "même fichier déjà dans Trier : pas de doublon")
check(all(c[0] != "select" or c[2] is True for c in CALLS), "boîte toujours ouverte en lecture seule")
check(all("PEEK" in c[3] for c in CALLS if c[0] == "uid" and c[1] == "FETCH"), "lecture sans marquer comme lu (BODY.PEEK)")

# ---------- 4 bis (v0.10.5). écarter, revoir, rétablir ; période de relève
b.db.execute("DELETE FROM mail_seen"); b.db.commit()
b.save_settings({"mail_since": ""})
check(b.mail_window() == 90 and b.mail_window(365) == 365, "première relève : la période choisie (90 jours par défaut)")
r = b.mail_scan(consent=True); k = r["items"][0]["key"]
check(r["items"][0].get("level") in ("sûr", "probable", "à vérifier"), "pertinence dite en mots (sûr / probable / à vérifier)")
r = b.mail_import([], consent=True, discard=[k])
check(r["ok"] and r["discarded"] == 1, "les pièces non cochées sont écartées")
check(b.mail_scan(consent=True)["items"] == [], "une pièce écartée ne revient plus à la relève")
r = b.mail_scan(consent=True, show_discarded=True)
check(r["items"] and r["items"][0]["group"] == "ecarte" and r["items"][0].get("discarded"), "« Revoir les pièces écartées » les montre")
b.mail_discard([k], back=True)
check(len(b.mail_scan(consent=True)["items"]) == 1, "rétablie : elle revient dans la liste")
check(b.settings.get("mail_since") == __import__("datetime").date.today().isoformat() and b.mail_window() <= 5,
      "ensuite, la relève ne lit que depuis la dernière relève traitée")

# ---------- 5. relève à l'ouverture et oubli
check(b.mail_auto_run().get("skipped"), "relève automatique désactivée par défaut")
b.save_settings({"mail_auto": True}); b.db.execute("DELETE FROM mail_seen"); b.db.commit()
r = b.mail_auto_run()
check(r["ok"] and r["dup"] == 1, "relève automatique : liste + copie, sans doublon")
b.mail_forget()
check(not b.settings["mail_saved"] and not b.settings["mail_auto"] and trousseau.load(mail.SERVICE, "camille@gmail.com") is None, "oublier : mot de passe retiré du trousseau")
r = b.mail_scan(consent=True)
check(not r["ok"] and "mot de passe" in r["msg"].lower(), "après oubli : il faut le redonner")
b.save_settings({"mail": "autre@ik.me"})
check(not b.settings["mail_saved"], "changer d'adresse : il faut la retester")


# v0.10.4 : arbitrage des pièces jointes (tout en local)
_I = [dict(key="1", filename="Grant Notification.pdf", mime="application/pdf", size=60000, from_addr="no.reply@homeaffairs.gov.au", subject="IMMI Grant Notification"),
      dict(key="2", filename="image002.jpg", mime="image/jpeg", size=27000, from_addr="a@banque-privee.com", subject="Lettre", inline=True),
      dict(key="3", filename="Analyse.pdf", mime="application/pdf", size=315000, from_addr="a@banque-privee.com", subject="Vue du marché", bulk=True),
      dict(key="4", filename="DSC_0778.jpg", mime="image/jpeg", size=868000, from_addr="ami.fictif@gmail.com", subject="Photos"),
      dict(key="5", filename="DSC_0778.jpg", mime="image/jpeg", size=868000, from_addr="ami.fictif@gmail.com", subject="Photos"),
      dict(key="6", filename="facture.pdf", mime="application/pdf", size=90000, from_addr="ami.fictif@gmail.com", subject="Facture du loyer"),
      dict(key="7", filename="releve.pdf", mime="application/pdf", size=90000, from_addr="moi.admin@ik.me", subject="Relevé")]
G = {x["key"]: x["group"] for x in mail.triage(_I, own=["moi.admin@ik.me"])}
check(G["1"] == "admin" and G["7"] == "admin", "arbitrage : organisme officiel et pièce envoyée par toi = papiers administratifs")
check(G["2"] == "ecarte" and G["5"] == "ecarte", "arbitrage : signature dans le corps du mail et doublon écartés")
check(G["3"] == "voir" and G["4"] == "voir" and G["6"] == "voir", "arbitrage : lettre d'information, photo et pièce d'un particulier = à toi de voir")
G2 = {x["key"]: x["group"] for x in mail.triage(_I, rules={"ami.fictif@gmail.com": "accepter", "banque-privee.com": "ignorer"})}
check(G2["6"] == "admin" and G2["3"] == "ecarte", "arbitrage : « toujours accepter » (adresse) et « toujours ignorer » (domaine) respectés")
check(all(x["why"] for x in mail.triage(_I)), "arbitrage : chaque pièce a sa raison en mots")
print("\nRÉSULTAT :", "OK" if not fails else f"{fails} échec(s)")
sys.exit(1 if fails else 0)
