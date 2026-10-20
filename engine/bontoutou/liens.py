"""Ouvrir un site officiel dans le navigateur choisi par l'utilisateur (v0.9.5).

Le moteur ne se connecte à rien ici : il demande au système d'ouvrir l'adresse dans un navigateur,
comme un double-clic sur un lien. Seules les adresses connues (sites des packs officiels, pages de
compte des messageries, page publique de Bon toutou) et les liens « mailto: » sont acceptés.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))

# hôtes toujours admis (pages de compte des messageries, page publique de Bon toutou)
FIXED = {"github.com", "myaccount.google.com", "account.apple.com", "manager.infomaniak.com", "www.infomaniak.com",
         "login.yahoo.com", "support.apple.com", "support.google.com", "ollama.com", "lmstudio.ai",
         "ksuite.infomaniak.com", "config.infomaniak.com", "faq.infomaniak.com"}

# (identifiant, nom affiché, app macOS, exécutables Windows, commandes Linux)
KNOWN = [
    ("safari", "Safari", "Safari", [], []),
    ("chrome", "Google Chrome", "Google Chrome", [r"Google\Chrome\Application\chrome.exe"], ["google-chrome", "google-chrome-stable"]),
    ("firefox", "Firefox", "Firefox", [r"Mozilla Firefox\firefox.exe"], ["firefox"]),
    ("brave", "Brave", "Brave Browser", [r"BraveSoftware\Brave-Browser\Application\brave.exe"], ["brave-browser", "brave"]),
    ("arc", "Arc", "Arc", [], []),
    ("edge", "Microsoft Edge", "Microsoft Edge", [r"Microsoft\Edge\Application\msedge.exe"], ["microsoft-edge"]),
    ("opera", "Opera", "Opera", [r"Opera\launcher.exe"], ["opera"]),
    ("vivaldi", "Vivaldi", "Vivaldi", [r"Vivaldi\Application\vivaldi.exe"], ["vivaldi"]),
    ("duckduckgo", "DuckDuckGo", "DuckDuckGo", [], []),
    ("chromium", "Chromium", "Chromium", [], ["chromium", "chromium-browser"]),
    ("zen", "Zen", "Zen", [], []),
    ("orion", "Orion", "Orion", [], []),
]
DEFAULT = ("defaut", "Navigateur par défaut de l'ordinateur")

_HOSTS = None


def _walk_urls(o, out):
    if isinstance(o, dict):
        for v in o.values():
            _walk_urls(v, out)
    elif isinstance(o, list):
        for v in o:
            _walk_urls(v, out)
    elif isinstance(o, str):
        for m in re.finditer(r"https://([a-z0-9.-]+\.[a-z]{2,})", o, re.I):
            out.add(m.group(1).lower())


def hosts():
    """Hôtes admis : ceux cités par les packs officiels (renouveler, situations, organismes) + FIXED."""
    global _HOSTS
    if _HOSTS is None:
        out = set(FIXED)
        d = os.path.join(HERE, "packs")
        for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if f.endswith(".json"):
                try:
                    with open(os.path.join(d, f), encoding="utf-8") as fh:
                        _walk_urls(json.load(fh), out)
                except Exception:
                    pass
        _HOSTS = out
    return _HOSTS


def allowed(url):
    """Adresse acceptée ? https vers un hôte connu (ou un sous-domaine de celui-ci, ou le même site sans « www. »), ou mailto:."""
    url = str(url or "").strip()
    if not url or len(url) > 32000 or any(c in url for c in "\r\n\t \"<>`"):
        return False
    if url.lower().startswith("mailto:"):
        return bool(re.match(r"^mailto:[^@\s]+@[a-z0-9.-]+\.[a-z]{2,}(\?.*)?$", url, re.I))
    try:
        u = urllib.parse.urlsplit(url)
    except ValueError:
        return False
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.port not in (None, 443):
        return False
    h = u.hostname.lower()
    H = hosts()
    base = h[4:] if h.startswith("www.") else h
    for k in H:
        kb = k[4:] if k.startswith("www.") else k
        if h == k or base == kb or h.endswith("." + kb):
            return True
    return False


def browsers():
    """Navigateurs installés sur cet ordinateur : [{id, label}], le navigateur par défaut en premier."""
    out = [{"id": DEFAULT[0], "label": DEFAULT[1]}]
    for bid, label, mac, win, lin in KNOWN:
        if _locate(bid):
            out.append({"id": bid, "label": label})
    return out


def _locate(bid):
    """Où lancer ce navigateur : nom d'app (macOS), chemin d'exécutable (Windows), commande (Linux), ou None."""
    row = next((k for k in KNOWN if k[0] == bid), None)
    if not row:
        return None
    _, _, mac, win, lin = row
    if sys.platform == "darwin":
        for root in ("/Applications", os.path.expanduser("~/Applications"), "/System/Applications", "/System/Volumes/Preboot/Cryptexes/App/System/Applications"):
            if os.path.isdir(os.path.join(root, mac + ".app")):
                return mac
        return None
    if os.name == "nt":
        roots = [os.environ.get(k) for k in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA")]
        for r in [x for x in roots if x]:
            for rel in win:
                p = os.path.join(r, rel)
                if os.path.isfile(p):
                    return p
        return None
    for c in lin:
        p = shutil.which(c)
        if p:
            return p
    return None


def open_url(url, browser=None):
    """Ouvre l'adresse dans le navigateur demandé (ou celui par défaut). Rien n'est envoyé par Bon toutou."""
    if not allowed(url):
        return {"ok": False, "msg": "Adresse non reconnue : Bon toutou n'ouvre que les sites officiels qu'il connaît."}
    where = None if (not browser or browser == DEFAULT[0] or url.lower().startswith("mailto:")) else _locate(browser)
    try:
        if sys.platform == "darwin":
            subprocess.Popen(["open", "-a", where, url] if where else ["open", url])
        elif os.name == "nt":
            subprocess.Popen([where, url]) if where else os.startfile(url)  # noqa
        else:
            subprocess.Popen([where, url] if where else ["xdg-open", url])
        return {"ok": True, "browser": browser if where else DEFAULT[0]}
    except Exception as e:
        return {"ok": False, "msg": f"Impossible d'ouvrir le navigateur ({type(e).__name__})"}
