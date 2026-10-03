"""Trousseau : le mot de passe de l'adresse admin est rangé dans le coffre du système, jamais dans un fichier.

  * macOS : Trousseau d'accès (commande `security`, le mot de passe passe par l'entrée standard, pas par la ligne de commande).
  * Windows : Gestionnaire d'identification, si le module `keyring` est présent.
  * Linux : `secret-tool` (GNOME Keyring / KWallet), s'il est présent.
  * Sinon : gardé en mémoire le temps de la session seulement (il faudra le redonner au prochain lancement).
L'IA ne voit jamais ce mot de passe ; il ne quitte l'ordinateur que vers le serveur de messagerie (sortie.imap_open).
"""
import shutil
import subprocess
import sys

_memory = {}


def _q(s):
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


def _keyring():
    try:
        import keyring  # optionnel
        return keyring
    except Exception:
        return None


def where():
    """Où le mot de passe sera rangé, en mots simples."""
    if sys.platform == "darwin" and shutil.which("security"):
        return "le Trousseau d'accès de ton Mac"
    if sys.platform.startswith("win") and _keyring():
        return "le Gestionnaire d'identification de Windows"
    if shutil.which("secret-tool"):
        return "le trousseau de ton système"
    return "la mémoire de Bon toutou, jusqu'à sa fermeture"


def save(service, account, password):
    """Range le mot de passe. Retourne True s'il est dans un vrai coffre, False s'il n'est qu'en mémoire."""
    _memory[(service, account)] = password
    try:
        if sys.platform == "darwin" and shutil.which("security"):
            cmd = f"add-generic-password -U -a {_q(account)} -s {_q(service)} -w {_q(password)}\n"
            r = subprocess.run(["security", "-i"], input=cmd.encode("utf-8"), capture_output=True, timeout=20)
            return r.returncode == 0 and b"error" not in (r.stderr or b"").lower()
        kr = _keyring() if sys.platform.startswith("win") else None
        if kr:
            kr.set_password(service, account, password)
            return True
        if shutil.which("secret-tool"):
            r = subprocess.run(["secret-tool", "store", "--label", service, "service", service, "account", account],
                               input=password.encode("utf-8"), capture_output=True, timeout=20)
            return r.returncode == 0
    except Exception:
        pass
    return False


def load(service, account):
    if (service, account) in _memory:
        return _memory[(service, account)]
    try:
        if sys.platform == "darwin" and shutil.which("security"):
            r = subprocess.run(["security", "find-generic-password", "-a", account, "-s", service, "-w"],
                               capture_output=True, timeout=20)
            if r.returncode == 0:
                return r.stdout.decode("utf-8").rstrip("\n")
            return None
        kr = _keyring() if sys.platform.startswith("win") else None
        if kr:
            return kr.get_password(service, account)
        if shutil.which("secret-tool"):
            r = subprocess.run(["secret-tool", "lookup", "service", service, "account", account], capture_output=True, timeout=20)
            return r.stdout.decode("utf-8") if r.returncode == 0 and r.stdout else None
    except Exception:
        pass
    return None


def forget(service, account):
    _memory.pop((service, account), None)
    try:
        if sys.platform == "darwin" and shutil.which("security"):
            subprocess.run(["security", "delete-generic-password", "-a", account, "-s", service], capture_output=True, timeout=20)
            return
        kr = _keyring() if sys.platform.startswith("win") else None
        if kr:
            try:
                kr.delete_password(service, account)
            except Exception:
                pass
            return
        if shutil.which("secret-tool"):
            subprocess.run(["secret-tool", "clear", "service", service, "account", account], capture_output=True, timeout=20)
    except Exception:
        pass
