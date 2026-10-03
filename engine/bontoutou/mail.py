"""Adresse admin : relever les pièces jointes administratives d'une boîte mail (IMAP), depuis cet ordinateur.

Ce module ne se connecte à rien lui-même : la connexion est ouverte par sortie.imap_open (accord + journal).
Ici : la liste des messageries connues, la lecture de la « structure » d'un message (BODYSTRUCTURE : noms et
types des pièces jointes, sans télécharger le message), et le décodage d'une pièce jointe choisie.
Jamais : envoyer, supprimer, déplacer, marquer comme lu (boîte ouverte en lecture seule, BODY.PEEK).
"""
import base64
import datetime as dt
import email.header
import email.parser
import email.utils
import quopri
import re

# domaine -> (nom, serveur IMAP, port, page pour créer un mot de passe d'application)
PROVIDERS = {
    "gmail.com": ("Gmail", "imap.gmail.com", 993, "https://myaccount.google.com/apppasswords"),
    "googlemail.com": ("Gmail", "imap.gmail.com", 993, "https://myaccount.google.com/apppasswords"),
    "icloud.com": ("iCloud", "imap.mail.me.com", 993, "https://account.apple.com/"),
    "me.com": ("iCloud", "imap.mail.me.com", 993, "https://account.apple.com/"),
    "mac.com": ("iCloud", "imap.mail.me.com", 993, "https://account.apple.com/"),
    "ik.me": ("Infomaniak", "mail.infomaniak.com", 993, "https://manager.infomaniak.com/"),
    "etik.com": ("Infomaniak", "mail.infomaniak.com", 993, "https://manager.infomaniak.com/"),
    "ikmail.com": ("Infomaniak", "mail.infomaniak.com", 993, "https://manager.infomaniak.com/"),
    "orange.fr": ("Orange", "imap.orange.fr", 993, ""),
    "wanadoo.fr": ("Orange", "imap.orange.fr", 993, ""),
    "free.fr": ("Free", "imap.free.fr", 993, ""),
    "sfr.fr": ("SFR", "imap.sfr.fr", 993, ""),
    "neuf.fr": ("SFR", "imap.sfr.fr", 993, ""),
    "laposte.net": ("La Poste", "imap.laposte.net", 993, ""),
    "yahoo.com": ("Yahoo", "imap.mail.yahoo.com", 993, "https://login.yahoo.com/account/security"),
    "yahoo.fr": ("Yahoo", "imap.mail.yahoo.com", 993, "https://login.yahoo.com/account/security"),
}
NOT_YET = {
    "outlook.com": "Outlook / Hotmail : Microsoft n'accepte plus les mots de passe pour ça. Prévu dans une prochaine version.",
    "hotmail.com": "Outlook / Hotmail : Microsoft n'accepte plus les mots de passe pour ça. Prévu dans une prochaine version.",
    "hotmail.fr": "Outlook / Hotmail : Microsoft n'accepte plus les mots de passe pour ça. Prévu dans une prochaine version.",
    "live.fr": "Outlook / Hotmail : Microsoft n'accepte plus les mots de passe pour ça. Prévu dans une prochaine version.",
    "live.com": "Outlook / Hotmail : Microsoft n'accepte plus les mots de passe pour ça. Prévu dans une prochaine version.",
    "proton.me": "Proton Mail ne laisse pas une autre app relever les mails (sauf avec leur logiciel Proton Bridge).",
    "protonmail.com": "Proton Mail ne laisse pas une autre app relever les mails (sauf avec leur logiciel Proton Bridge).",
    "tuta.com": "Tuta ne laisse pas une autre app relever les mails.",
    "tutanota.com": "Tuta ne laisse pas une autre app relever les mails.",
}
WANTED = re.compile(r"\.(pdf|jpe?g|png|heic|heif|tiff?)$", re.I)
SERVICE = "Bon toutou — adresse admin"
EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def provider_for(address, host=None, port=None):
    """(nom, serveur, port, aide, message si non pris en charge)."""
    dom = (address or "").rsplit("@", 1)[-1].lower().strip()
    if dom in NOT_YET:
        return None, None, None, "", NOT_YET[dom]
    if host:
        return PROVIDERS.get(dom, ("Ta messagerie",))[0], host.strip().lower(), int(port or 993), "", None
    if dom in PROVIDERS:
        n, h, p, u = PROVIDERS[dom]
        return n, h, p, u, None
    return "Ta messagerie", "imap." + dom if dom else None, 993, "", None


def imap_since(days, today=None):
    d = (today or dt.date.today()) - dt.timedelta(days=int(days))
    return f"{d.day:02d}-{EN_MONTHS[d.month - 1]}-{d.year}"


# ---------- lecture de BODYSTRUCTURE (expression entre parenthèses) ----------
_TOK = re.compile(rb'\(|\)|"(?:[^"\\]|\\.)*"|[^\s()"]+')


def _parse(b):
    stack, cur = [], []
    for m in _TOK.finditer(b):
        t = m.group(0)
        if t == b"(":
            stack.append(cur)
            cur = []
        elif t == b")":
            if not stack:
                break
            done, cur = cur, stack.pop()
            cur.append(done)
        elif t.startswith(b'"'):
            cur.append(re.sub(rb"\\(.)", rb"\1", t[1:-1]).decode("utf-8", "replace"))
        elif t.upper() == b"NIL":
            cur.append(None)
        else:
            cur.append(t.decode("utf-8", "replace"))
    return cur


def join_response(data):
    """imaplib découpe les « littéraux » ({12}\\r\\n…) en morceaux : on recolle une réponse par message.
    Un nouveau message commence par « N (… » ; l'ordre des éléments (BODYSTRUCTURE avant ou après l'en-tête) importe peu."""
    msgs, cur = [], b""
    start = re.compile(rb"^\d+ \(")
    for item in data or []:
        if isinstance(item, tuple):
            head, lit = item[0], item[1] or b""
            if start.match(head) and cur:
                msgs.append(cur)
                cur = b""
            head = re.sub(rb"\{\d+\}$", b"", head)
            cur += head + b'"' + lit.replace(b"\\", b"\\\\").replace(b'"', b'\\"') + b'"'
        elif isinstance(item, bytes):
            if start.match(item) and cur:
                msgs.append(cur)
                cur = b""
            cur += item
    if cur:
        msgs.append(cur)
    return msgs


def _decode(s):
    if not s:
        return ""
    try:
        return str(email.header.make_header(email.header.decode_header(s)))
    except Exception:
        return s


def _params(lst):
    out = {}
    if isinstance(lst, list):
        for i in range(0, len(lst) - 1, 2):
            if isinstance(lst[i], str) and isinstance(lst[i + 1], str):
                out[lst[i].lower()] = lst[i + 1]
    return out


def attachments(bs, prefix=""):
    """Parcourt la structure : [{part, filename, mime, size, encoding}] pour chaque PDF ou image jointe."""
    out = []
    if not isinstance(bs, list) or not bs:
        return out
    if isinstance(bs[0], list):  # multipart : enfants, puis le sous-type
        i = 0
        while i < len(bs) and isinstance(bs[i], list):
            out += attachments(bs[i], (prefix + "." if prefix else "") + str(i + 1))
            i += 1
        return out
    part = prefix or "1"
    mtype = f"{(bs[0] or '').lower()}/{(bs[1] or '').lower()}"
    params = _params(bs[2] if len(bs) > 2 else None)
    enc = (bs[5] or "7bit").lower() if len(bs) > 5 and isinstance(bs[5], str) else "7bit"
    try:
        size = int(bs[6]) if len(bs) > 6 else 0
    except (TypeError, ValueError):
        size = 0
    disp, dparams = None, {}
    for x in bs[7:]:
        if isinstance(x, list) and x and isinstance(x[0], str) and x[0].lower() in ("attachment", "inline"):
            disp, dparams = x[0].lower(), _params(x[1] if len(x) > 1 else None)
            break
    name = _decode(dparams.get("filename") or params.get("name") or "")
    if mtype == "message/rfc822" and len(bs) > 8:
        return out + attachments(bs[8], part)
    is_doc = mtype == "application/pdf" or (name and WANTED.search(name)) or (mtype.startswith("image/") and disp == "attachment")
    if is_doc and not (mtype.startswith("image/") and size < 20000 and disp != "attachment"):  # logos et signatures : ignorés
        if not name:
            name = "piece-jointe." + ("pdf" if mtype == "application/pdf" else mtype.split("/")[-1])
        out.append({"part": part, "filename": name, "mime": mtype, "size": size, "encoding": enc})
    return out


def header_info(raw):
    h = email.parser.BytesHeaderParser().parsebytes(raw or b"")
    frm = email.utils.parseaddr(_decode(h.get("From", "")))
    try:
        date = email.utils.parsedate_to_datetime(h.get("Date")).date().isoformat()
    except Exception:
        date = ""
    return {"from": frm[0] or frm[1], "from_addr": frm[1], "subject": _decode(h.get("Subject", "")),
            "date": date, "message_id": (h.get("Message-ID") or "").strip()}


def decode_part(data, encoding):
    if encoding == "base64":
        return base64.b64decode(re.sub(rb"\s+", b"", data or b""), validate=False)
    if encoding == "quoted-printable":
        return quopri.decodestring(data or b"")
    return data or b""


def scan(M, days=90, seen=(), limit=300):
    """Pièces jointes des `days` derniers jours, sans rien télécharger. M : connexion ouverte par sortie.imap_open."""
    typ, _ = M.select("INBOX", readonly=True)
    if typ != "OK":
        raise RuntimeError("Boîte de réception introuvable")
    typ, data = M.uid("SEARCH", None, "SINCE", imap_since(days))
    uids = (data[0] or b"").split()[-limit:] if typ == "OK" and data else []
    out = []
    for i in range(0, len(uids), 40):
        chunk = b",".join(uids[i:i + 40]).decode()
        typ, data = M.uid("FETCH", chunk, "(UID BODYSTRUCTURE BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)])")
        if typ != "OK":
            continue
        groups = []   # un groupe d'éléments par message
        for item in data or []:
            head = item[0] if isinstance(item, tuple) else item
            if not groups or (isinstance(head, bytes) and re.match(rb"^\d+ \(", head)):
                groups.append([])
            groups[-1].append(item)
        for g in groups:
            hdr, rest = b"", []
            for it in g:
                if isinstance(it, tuple) and b"HEADER.FIELDS" in it[0].upper():
                    hdr = it[1] or b""
                    rest.append((it[0], b""))
                else:
                    rest.append(it)
            raw = b"".join(join_response(rest))
            m = re.search(rb"UID (\d+)", raw)
            bsm = re.search(rb"BODYSTRUCTURE ", raw)
            if not m or not bsm:
                continue
            uid = m.group(1).decode()
            tree = _parse(raw[bsm.end():])
            info = header_info(hdr)
            for a in attachments(tree[0] if tree else None):
                key = (info["message_id"] or ("uid:" + uid)) + "|" + a["part"] + "|" + a["filename"]
                if key in seen:
                    continue
                out.append(dict(a, uid=uid, key=key, **info))
    out.sort(key=lambda x: x.get("date") or "", reverse=True)
    return out


def fetch(M, uid, part, encoding):
    M.select("INBOX", readonly=True)
    typ, data = M.uid("FETCH", str(uid), f"(BODY.PEEK[{part}])")
    for item in data or []:
        if isinstance(item, tuple):
            return decode_part(item[1], encoding)
    raise RuntimeError("Pièce jointe introuvable")
