# Brief pour Claude Code — Bon toutou

Lis d'abord `docs/DECISIONS.md` (le modèle). Le moteur et l'interface sont dans `engine/`, l'app de bureau dans `desktop/`, la fabrication dans `.github/workflows/fabrication.yml`.

## Ce que c'est
Une app locale qui range les papiers administratifs dans un vrai dossier (choisi à l'installation), avec :
- des documents suivis (version actuelle + historique) ;
- des dossiers (pièces résolues automatiquement) ;
- des preuves d'envoi figées (SHA-256).

## Architecture (étape A de l'architecture scalable, oct. 2026 — voir le doc projet « bon_toutou_architecture »)
- **Dans le dossier (synchronisable)** : les documents, une fiche par document `.bontoutou/meta/docs/<id>.json` et par dossier `.bontoutou/meta/dossiers/<id>.json`, un journal par appareil `.bontoutou/journal/<appareil>.jsonl`, `profil.json` (nom, pays, confidentialité), `sorties.jsonl`, `mes-regles.json`, `packs/` (packs importés).
- **Sur l'appareil (local, reconstructible)** : `index.db` et `reglages-appareil.json` dans `~/Library/Application Support/Bon toutou/bureaux/<bureau>-<hash>/` (ou `$BONTOUTOU_DATA`). Au démarrage, l'index récupère les fiches changées par un autre appareil (estampille `updated_at|updated_by`).
- **Format versionné** : `format: 1` partout ; on garde les champs inconnus, on ne casse jamais ce qu'une autre version a écrit.
- `bontoutou/catalog.py` : **chargeur de packs JSON** (`bontoutou/packs/` officiels → packs importés → `mes-regles.json`). Données seulement, jamais de code ; motifs trop complexes refusés hors packs officiels. Chaque type, émetteur et règle garde son origine, affichée dans « Pourquoi ? ».
- `bontoutou/sortie.py` : **la seule porte vers le réseau**. Local (127.0.0.1) autorisé ; sinon motif connu + accord + niveau de la catégorie (document non trié = 🔒), noté dans `sorties.jsonl` AVANT l'envoi. `tests/test_sortie.py` vérifie qu'aucun autre fichier n'ouvre de connexion.

- **Étape B** : `bontoutou/regles.py` (règles « contient X → champ », types perso, export / import de packs non signés, proposition avec repérage du personnel), `sortie.mask()` (masquage des numéros), confidentialité par catégorie (profil), titulaires proches et premier tri guidé (`static/guide.js`). Interface des règles : `static/regles.js`. Le texte lu est mis en cache dans l'index local (table `texts`) : pas de nouvel OCR pour appliquer une règle.

- **Étape C** : `bontoutou/ia.py` = prise unique pour l'IA locale (Ollama en API native ; LM Studio, Jan, llama.cpp serveur en format compatible OpenAI), détection de la machine et niveau conseillé, liste vérifiée `packs/modeles.json` (Mistral AI conseillé, Qwen en alternative, Apache 2.0), installation via Ollama avec accord + journal. `classify.refine_with_ai` vérifie chaque réponse (type connu, date réelle et passée, pays connu). Moteur intégré (llama.cpp en bibliothèque) et empreintes GGUF : étape D.

- **Étape D (app)** : `desktop/` (Tauri 2) choisit un port libre sur 127.0.0.1, lance le moteur embarqué `bontoutou-engine` (PyInstaller, `engine/entry.py`) avec `--port N --app --watch-pid <app>` et l'affiche ; le moteur s'arrête quand l'app se ferme. Sans dossier configuré, le moteur démarre en mode installation (`maj.setup_state`, `static/setup.js`). Mises à jour : `maj.check` (une requête vers GitHub Releases, accord + journal) ; rapport de bug sans document (`maj.bug_report`). Moteur IA intégré : `llama_cpp` (compilé en CI), modèles GGUF dont l'empreinte est fixée par `tools/pin_models.py` à la fabrication, téléchargés par `sortie.download` qui refuse toute empreinte fausse.

- **v0.5** : `classify.path_hints` / `apply_hints` (les noms des dossiers importés font foi : employeur, période, lot de plusieurs mois ; conflits signalés), `same_emitter` (alias d'employeurs) et `Bureau.regroup`. Adresse admin : `bontoutou/mail.py` (lecture de BODYSTRUCTURE, sans réseau), `sortie.imap_open` (IMAP SSL 993, accord + journal), `bontoutou/trousseau.py` (mot de passe dans le trousseau du système, jamais sur disque). Interface : `static/cartes.js` (Trier en cartes, rangement compris, regroupement) et `static/adresse.js`.

- **v0.6** : `Bureau.repair_preview / repair_apply` (empreintes SHA-256 calculées dans l'interface à partir du dossier d'origine, jamais recopié), `close_old_employers` (seul l'emploi actuel reste « actuel »), `unknown / unknown_back` (_A-IDENTIFIER). Analyse : `doubts`, `candidates`, `emitter_candidates`. Interface : phrase à trous dans `static/cartes.js`, archives groupées et réparation dans `static/rangement.js`, PDF page par page (pdf.js embarqué dans `static/vendor/pdfjs`).

- **v0.7** : tri en étapes dans `static/etapes.js` (remplace la phrase à trous et la liste des types) : `usage` (« utile » / « archive », toujours choisi par l'utilisateur ; `proposal` → modes `archive_user` et document gardé à part avec `suivi=None`, `extra.usage = "utile"` respecté par `close_old_employers`), sélecteur de type en tuiles réutilisable (`tpOpen` / `tpHTML`, cartes, liste, « Corriger le classement »). Les dossiers vont chercher une pièce dans Archives s'il n'y a pas de version actuelle (`resolve`, source « archives »). Après une mise à jour, Trier est relu (`_new_version_reread`).

- **v0.7.1** : `Bureau.restart` (plan compressé `.bontoutou/rangements/rangement-*.zip` : plan.json + meta + règles + profil, puis documents remis dans 00_A-TRIER, ops `delete_doc` / `inbox_new` annulables) et `Bureau.restore` (remet en place par empreinte ce qui est encore dans Trier). Signature : « Mange papiers. »

- **v0.7.2** : cartes en étapes à droite (`etSteps` : usage → chemin → emetteur → nom ; `data-et-enter` = Entrée) ; `Bureau.known()` + `/api/known` (émetteurs, titulaires, intitulés déjà écrits) et `static/autocomplete.js` (tout champ `data-ac="emitters|persons|details"`).

- **v0.7.3** : carte épurée (`etOptions`), arborescence `pathTree`, réglage profil `propositions` (faux par défaut : pas de valeur proposée, l'utilisateur choisit), `render` qui garde le nœud d'aperçu du même document, `pdfDraw` qui ne redessine pas une page déjà affichée, poll de l'IA sans rendu si rien n'a changé.

- **v0.7.4** : types génériques créés par `catalog.load` : `autre_<cat>` (sous-dossier `<cat>-9_Autres`) et `autre_<cat>_<n>` (dossier `Autres` dans la sous-famille, clé `inner`), `generic: True` = jamais proposés (exclus du prompt IA, du score, des tuiles normales) ; « autre » → catégorie 16 Autres familles. Override `suggest` → `extra.suggestion`. `Bureau.autres()` / `/api/autres`, Réglages › Les « Autres » à étudier.

- **v0.7.5** : `Bureau.plans()` / `plan_apply()` (`.bontoutou/plans/*.json` : items par `sha` avec usage, type, émetteur, titulaire, intitulé, suggestion, note ; overrides sans écraser ceux de l'utilisateur, `ov.plan` = source) ; `static/groupes.js` (Trier › Groupes : par destination, rangement d'un groupe, « Corriger » → cartes avec `S.focusId`). IA locale coupée quand `propositions` est faux ; le worker lit le texte en cache (`text_of`).

- **v0.7.6** : `static/navigation.js` (chargé en dernier) : Documents et Archives en étapes (`drill` : pays → famille → sous-famille → liste, état `S.dn[docs|archives]`, fil `dnCrumbs`), recherche groupée (`dnSearch`), retour à l'origine (`go` mémorise `S.from`, `navBack`), fiche avec bouton « i » (`S.info`, annexes : fichier, nom reçu, `extra.origin`, sorties, confidentialité, empreinte). Dates : `classify._pick_dates` écarte les dates de naissance (`BIRTH_HINTS`), prend la délivrance (`ISSUE_HINTS`, ou expiration − 5/10/15 ans) ; `Bureau._redate` dans `refresh()`.

- **v0.7.7** : `Bureau.revues()` / `revue_apply()` (`.bontoutou/revues/*.json` : items par `sha` avec type, pays, émetteur, date, expiration, titulaire, intitulé, `status` actuel | ancienne_version | termine | copie, `copy_of` = sha du document principal, `note` = pourquoi ; ordre : copies sorties du suivi → champs (`reclassify`) → statuts → copies déplacées dans `<dossier du principal>/Copies`, `extra.copy_of`, statut `copie` jamais listé dans Documents ni Archives ; un seul lot annulable). `document()` renvoie `copies`. `static/revue.js` (carte en haut de Documents, copies derrière « i »). `classify.mrz()` (OACI 9303, clés de contrôle), `_issue_from_expiry`, dates `JJMMAAAA` après un libellé ; Personnes : `classify.same_person` (nom de famille commun, premier prénom concordant en entier ou en initiales, MRZ comprise), `Bureau._is_owner` / `_match_person` / `_canon_person` / `holder()` (une seule écriture : le nom des Réglages pour toi), `canon_emitter` et `reclassify` (émetteur = toi → ton nom), `_canon_people` (dans `refresh()` et après une revue avec bloc `profile` {owner, owner_aliases}, op `settings` annulable), `set_owner` (route `/api/settings` quand le nom change).

- **v0.7.8** : fiche : versions séparées par lieu (`vrow`, « dans Archives » / « dans Documents », clic = fiche de la version) ; `whoOf` / `.whoname` (titulaire ≠ toi affiché dans les titres : `docRow`, `suiviRows`, fiche) ; `emDisp` (émetteur affiché depuis `extra.emitter_display`) ; intertitres de `dnList` (sous-famille / Autres / émetteur). `refresh()` : `_redate` généralisé (naissance ou date du rangement remplacées par une vraie date lue), `_dup_revue` (texte identique → `.bontoutou/revues/revue-doublons-<date>.json`, une seule en attente). `classify._last_hint` : la naissance ne vaut que jusqu'à la date précédente.

- **v0.7.9** : `holderName(d)` (app.js : titulaire toujours affiché, ton nom des Réglages pour toi) ; `dnList` groupe par titulaire (`.holderhead`, toi en premier) puis `dnListOne` (intertitres dossier / émetteur) ; `classify.LAW_HINTS` (dates de textes de loi cités ignorées dans `_pick_dates` et `approx_date`), années < 1900 ignorées en « mois année ».

## Architecture (détail)
- `bontoutou/server.py` : serveur HTTP de la bibliothèque standard, **127.0.0.1 uniquement**, API JSON + fichiers statiques.
- `bontoutou/core.py` : classe `Bureau`, qui gère les chemins, l'index SQLite, le journal (annuler), le tri (`register` / `proposal` / `validate`), les documents, les dossiers (`resolve` / `finalize` / `mark_sent`), les archives et `rebuild_index`.
- `bontoutou/classify.py` : règles (type, pays, émetteur, dates, expiration) + IA locale optionnelle (Ollama).
- `bontoutou/reader.py` : extraction du texte (pypdf, puis pdftotext, puis OCR tesseract), le tout optionnel.
- `bontoutou/packs/*.json` : pays, catégories, types de documents, organismes, règles d'intitulé, démarches.
- `static/` : interface en HTML/CSS/JS pur, sans build.
- `tests/test_flow.py` : test de bout en bout (`python3 -m tests.test_flow`). `tests/make_samples.py` fabrique de faux PDF.

## Règles non négociables
1. **Ne jamais supprimer un fichier de l'utilisateur.** Déplacer, copier, archiver seulement. Tout déplacement passe par `_move()` pour être journalisé et annulable.
2. **Aucun appel réseau hors de `sortie.py`.** Le moteur passe par `Bureau.sortir()` (niveau de la catégorie + accord + journal). Jamais d'import réseau ailleurs.
3. **Python 3.9 compatible, zéro dépendance obligatoire** (le Python par défaut de macOS). `pypdf` et tesseract sont des bonus détectés à l'exécution.
4. Le dossier Finder reste lisible sans l'app. Le nommage suit `AAAA-MM-JJ_PAYS_CAT_Emetteur_Objet.ext`.
5. Interface en français. Dire « document suivi » (pas « document maître »). Confiance en mots, jamais en pourcentage. Toujours un « Pourquoi ? ».
6. Avant chaque livraison : `cd engine && for t in flow sortie regles ia app mail; do python3 -m tests.test_$t; done`.
7. Licence AGPL-3.0. Aucune télémétrie, jamais.

## Prochaines étapes
Voir le document de projet « bon_toutou_architecture » (plan A → E).
