# Journal des versions

Les mises à jour ne sont jamais obligatoires. Une nouvelle version lit toujours les données des anciennes.

## 0.6.3 — Leçons du premier essai dans l'app
- **Inconnu · plus tard** (touche I) remplace « Ignorer » et « Je ne sais pas ce que c'est » : le document quitte la file et attend dans 00_A-TRIER/_A-IDENTIFIER (« Les revoir » le ramène).
- **Dossiers** : quand une pièce n'a aucune version actuelle (ancien bulletin, ancien avis d'impôt…), Bon toutou va la chercher dans Archives, la plus récente d'abord, avec la mention « pris dans Archives ».
- **Grand import** : un document déjà rangé, ignoré ou mis de côté n'est plus réimporté (il revenait en boucle). Bouton temporaire « Mettre de côté les N inconnus » (type non reconnu ou confiance faible), un seul Annuler.
- **Écrire pendant que l'IA locale lit** : le rafraîchissement automatique (toutes les 4 s) n'efface plus ce que tu tapes ni le choix en cours. C'était la cause de « je ne peux pas modifier le nom » et de « rien n'est enregistré ».
- **« Dis-le avec tes mots »** cherche aussi dans les mots-clés des types et ignore les petits mots : « contrat d'apprentissage » trouve « Contrat de travail », « livret épargne » trouve « Livret / épargne ».
- **Nouveaux types** : Livret / épargne (LEP, Livret A, LDDS, PEL, assurance vie → 10 Patrimoine › Placements) ; Inscription / convention de formation (contrat pédagogique, convention de stage, certificat de scolarité → 12 École › Inscriptions-conventions).
- Un « livret » n'est plus pris pour un livret de famille sans le mot « famille ».
- Un Cerfa rempli qui porte son titre (« Contrat d'apprentissage ») est rangé comme un contrat, plus comme un formulaire.
- Rangement : « Autre document » → 11 Contrats › **Divers** ; Cerfa vierges → 13 Juridique › **Formulaires** (plus « Procurations »). Les fichiers déjà rangés ne bougent pas.
- Les dates absurdes lues par l'OCR (« 1210 ») sont ignorées.

## 0.6.2 — Leçons du premier banc d'essai (38 vrais papiers)
- **Titre du document** : « Lettre de motivation », « Livret de famille », « Permis de conduire »… lu dans le nom du fichier ou en haut de la page l'emporte sur les mots du contenu (une lettre de motivation qui parle de diplôme n'est plus un diplôme). Les noms collés (« MotivationOwwnerPMB ») sont compris.
- **Nouveaux types** : livret de famille (01 Identité › État civil), lettre de démission (03 Travail › Contrats), courrier de réclamation / mise en demeure (13 Juridique › Litiges).
- **Titulaire des passeports et cartes d'identité** lu dans la bande du bas (MRZ) : les papiers de tes proches ne deviennent plus des « anciennes versions » des tiens. Si le nom lu est le tien, choisis « Toi » une fois : Bon toutou s'en souvient.
- **Word, OpenDocument et Pages** : le texte des .docx, .odt, .doc, .rtf et .pages (aperçu intégré) est lu.
- Date collée dans le nom d'un scan (« Numérisation_20201111 ») reconnue.
- Pas de « qui ? » demandé pour tes propres lettres et ton CV.
- Un fichier déjà dans Trier, déposé une deuxième fois, ne laisse plus de copie dans 00_A-TRIER.
- Banc d'essai : liste des copies exactes, note « à anonymiser » (natures des données sensibles, jamais les valeurs).

## 0.6.1 — Plus simple
- **Documents** : les encarts « Retrouver les émetteurs » et « Réparer depuis mon dossier » disparaissent. Un seul bouton **Mettre à jour**, à droite du titre : il retrouve les émetteurs manquants et range les anciens employeurs, en une fois (un seul « Annuler »).
- **Archives** : l'onglet « Terminés » est supprimé. Tout ce qui n'est plus actuel (versions remplacées, ancien employeur, bail fini…) est dans **Anciennes versions**, rangé par catégories comme Documents.
- **Corriger** : quand tu choisis un mot dans la phrase, il passe au vert et un message confirme l'enregistrement ; le nom et le dossier proposés se mettent à jour. Un employeur ou un mois lus dans le nom de ton dossier ne sont plus signalés comme des doutes.
- **Mode test** (Réglages › Version et mises à jour, désactivé par défaut) : le détail de chaque analyse (texte lu, proposition des règles, réponse et durée de l'IA locale, tes choix, rangement final) est noté dans `.bontoutou/diagnostic`, dans ton bureau, sur ton ordinateur.
- `tools/banc_essai.py` : passe tout un dossier dans le moteur sur un bureau de test et écrit un rapport (rapport.md, arborescence), sans toucher au vrai bureau.

## 0.6.0 — Fiches de paie réparées, archives lisibles, corriger en une phrase
- **Réparer depuis mon dossier d'origine** (Documents) : tu choisis le dossier où tu gardais tes fiches (ex. Administration › Paye). Bon toutou reconnaît chaque fiche déjà rangée par son empreinte, sans rien recopier, lit l'employeur, le mois et les lots dans les noms de tes dossiers, te montre les corrections, puis les applique en une fois. Un seul « Annuler ».
- **Seul ton emploi actuel reste dans Documents** : quand les fiches d'un employeur s'arrêtent depuis plus de 2 mois alors qu'un autre continue, cet ancien employeur passe dans Archives › Terminés, dans son dossier. Deux emplois en même temps restent tous les deux. Bouton « Ranger dans Terminés » pour un bureau rangé avant.
- **Archives présentées comme Documents** : pays › catégorie › sous-dossier › employeur, une ligne par document avec « 6 anciennes versions » à déplier (date, Ouvrir). Plus de longs chemins de fichier. Terminés est groupé de la même façon.
- **Corriger en complétant une phrase** (Trier) : « C'est une fiche de paie de …, pour toi, daté du … ». Seuls les doutes sont soulignés en pointillés ; tu touches un mot et choisis parmi des propositions tirées du document (ex. le nom lu en haut de la page), ou tu l'écris avec tes mots. « Tous les champs » reste disponible.
- **« Je ne sais pas ce que c'est »** : le document est mis de côté dans 00_A-TRIER/_A-IDENTIFIER ; « Les revoir » le remet dans Trier.
- Corrigé : l'aperçu de Trier (v0.5) déformait le cadre du pays dans Documents.

## 0.5.1 — Feuilleter les PDF dans Trier
- Dans la carte de Trier, un PDF de plusieurs pages se feuillette depuis l'aperçu : flèches ‹ › sous la page (ou touches Page préc. / Page suiv.). La page entière est affichée, et elle reste la même quand tu ouvres « Corriger ».
- L'affichage utilise pdf.js (Mozilla, Apache-2.0), embarqué dans l'app : rien n'est chargé depuis internet.

## 0.5.0 — Trier vite, sans rien casser
- **Trier en mode cartes** : un document à la fois, l'aperçu à gauche, la proposition à droite (type, émetteur, date, titulaire, dossier, nom, suivi, « Pourquoi ? »). **← Plus tard · ↓ Corriger · → Ranger · Z Annuler**, au clavier ou à la souris. **Ranger les sûrs d'un coup** pour les documents en confiance élevée. Le mode Liste reste disponible (bouton Cartes / Liste).
- **Bon toutou respecte ton rangement** : en important un dossier, le chemin de chaque fichier est envoyé et les noms des dossiers font foi. `1.N Louis Fournil 2018-09:2020-07` donne l'employeur Louis Fournil et sa période ; le numéro et la lettre devant sont ignorés. Le mois est lu dans le nom du fichier (`2019 03`), un fichier de plusieurs mois (`2018-09:2019-02`) devient un lot. Ton nom, une ville ou une ligne du bulletin (« Autres… », « Salarié… ») ne sont plus pris pour un employeur. Les bulletins scolaires ne deviennent plus des fiches de paie.
- **Ce que Bon toutou a compris** de ton rangement s'affiche après l'import, avec le choix **Respecter mon rangement / Tout réorganiser**. Quand le dossier et le document ne disent pas la même chose, la carte le montre et tu choisis (garder ton dossier ou prendre le document).
- **Un employeur, un dossier** : Fournil, Boulangerie-Fournil et Louis Fournil sont reconnus comme le même employeur. **Regrouper par employeur** (Documents) range tout sous le nom que tu choisis, en une seule action annulable.
- **Adresse admin reliée** (IMAP, depuis ton ordinateur) : Gmail, iCloud, Infomaniak, Orange, Free, SFR, La Poste, Yahoo et la plupart des autres ; Outlook plus tard ; Proton et Tuta non (ils ne le permettent pas). Mot de passe d'application rangé dans le **trousseau du système** (Trousseau d'accès sur Mac), jamais dans un fichier. Test de connexion, liste des pièces jointes (noms seulement), copie dans Trier sur ton accord, sans doublon. Relève à l'ouverture en option (désactivée par défaut). Bon toutou **lit seulement** : il n'envoie, ne supprime, ne déplace et ne marque rien comme lu. Chaque connexion est notée dans le journal des sorties.
- **Organismes** : bouton **Prévenir 30 organismes d'un coup** vers le service officiel « Je change de coordonnées » de service-public.gouv.fr (adresse, e-mail, téléphone : impôts, Assurance maladie, CAF, France Travail, France Titres, caisses de retraite, certains fournisseurs d'énergie). Une fois fait, les organismes couverts se cochent d'un clic ; la checklist garde les autres.
- **Contacts** : « Bientôt disponible ».
- « Mauvais papiers. » sous le nom, et sur Aujourd'hui : « L'administration est absurde. Bon toutou, lui, est dressé pour ça. »
- Sécurité : un fichier reçu (HTML, SVG…) affiché dans l'app ne peut exécuter aucun script.
- Fabrication : actions GitHub passées à Node 24 (checkout v5, setup-python v6, setup-node v5, upload-artifact v6).

## 0.4.0 — Freemarket devient Bon toutou
- **Nouveau nom : Bon toutou**, avec une tête de chien provisoire comme icône. Au premier lancement, tout ce que Freemarket avait créé est repris en le **renommant seulement** (rien n'est supprimé) : données de l'appareil, fiches (`.freemarket` → `.bontoutou`), et le bureau `FREEMARKET_ADMIN` → `BON_TOUTOU_ADMIN` (un bureau nommé autrement garde son nom). Ce qui a été fait est noté dans `.bontoutou/migration-bon-toutou.json`.
- **Le bouton « Ouvrir » marche dans l'app** : le document s'ouvre avec l'app habituelle de ton ordinateur (Aperçu…). Même chose pour l'aperçu dans Trier et PREUVE.txt.
- Calendrier, export des règles, proposition : le fichier est enregistré dans ton dossier Téléchargements (l'app ne savait pas « télécharger »), puis ouvert ou montré.
- **Fiches de paie** : l'employeur est retrouvé même sans la mention « Employeur : » (nom en haut du document au-dessus du SIRET, forme juridique SAS / SARL / Ltd…). Ton nom et celui de tes proches ne sont jamais pris pour un employeur.
- **Un sous-dossier par entreprise** pour les fiches de paie, contrats de travail, soldes de tout compte et attestations employeur : `03-2_Bulletins-paie/Le-Petit-Bistrot/`. Chaque employeur a sa propre fiche de paie actuelle.
- **Retrouver les émetteurs** (Documents, ou Réglages › Lecture) : pour les documents déjà rangés sans émetteur, Bon toutou relit leur texte et les range dans le bon dossier. Une seule annulation pour tout.

## 0.3.0 — l'interface de la maquette
- Nouvelle page **Aujourd'hui** : jusqu'à 3 choses à faire (trier, compléter ou finaliser un dossier, renouveler un document), les 6 prochains mois d'échéances, les 4 raccourcis et ce qui reste sur ton ordinateur.
- Nouveau **Calendrier** sur 12 mois : expirations lues dans tes documents et grandes échéances de tes pays (déclaration de revenus, IR3). Export **.ics** avec un rappel 30 jours avant, créé sur ton ordinateur.
- **Contacts** (aperçu) : tes interlocuteurs tirés de tes documents et de tes dossiers, avec ce que tu leur as transmis.
- **Réglages compartimentés** : une page par sujet (Profil, Confidentialité, Apparence, Adresse admin, Calendrier, Contacts, Organismes, IA locale, Lecture, Mes règles, Sauvegarde, Continuité, Synchronisation, Historique, Mises à jour, Signaler un problème) et **Aller plus loin**, la suite de l'accueil pas à pas.
- **Organismes** : checklist avec les liens officiels (impots.gouv.fr, ameli, CAF, myIR…), ouverts dans ton navigateur ; l'app n'autorise que ces liens-là.
- Ce qui arrive bientôt (relève de l'adresse admin, abonnement agenda, sauvegarde, accès d'urgence…) est affiché honnêtement ; « Ça m'intéresse » reste sur ton ordinateur.
- Trois ambiances : Champagne, Graphite, Sauge. Aucune police ni ressource chargée depuis internet.
- Documents par pays avec toutes les catégories (vides comprises), Dossiers en cartes, Trier et Archives restylés.

## 0.2.0 — première version téléchargeable
- App de bureau (Mac Intel et puce Apple, Windows, Linux) : plus de Terminal, plus d'installation manuelle.
- Installation guidée : dossier, nom, pays, IA locale (au choix), et ce qui peut sortir sur internet (rien sans ton accord).
- Fiches synchronisables, index local, catalogue en packs, une seule porte de sortie vers internet.
- Règles personnelles, nouveaux types, partage de packs, confidentialité par catégorie, premier tri guidé.
- IA locale interchangeable (moteur intégré llama.cpp, Ollama, LM Studio, Jan) avec une liste de modèles vérifiés par empreinte.
- Vérification des mises à jour et rapport de bug, toujours à ta demande.
