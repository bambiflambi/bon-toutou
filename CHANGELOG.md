# Journal des versions

Les mises à jour ne sont jamais obligatoires. Une nouvelle version lit toujours les données des anciennes.

## 0.10.0 — Brancher : adresse admin, IA locale, liens
**Adresse admin, accompagnée de bout en bout (Réglages › Adresse admin)**
- Un guide en 5 étapes pour créer une adresse gratuite chez **Infomaniak** (entreprise suisse, mails hébergés en Suisse) : inscription my kSuite (@ik.me, @etik.com, @ikmail.com), puis création d'un mot de passe rien que pour Bon toutou (« Ajouter un appareil » → onglet IMAP / SMTP), à coller, autoriser et tester.
- Ce qu'il faut prévoir est dit d'avance : un numéro de portable européen pour l'inscription, résidence dans un pays de l'OCDE, mot de passe affiché une seule fois par Infomaniak.
- Une fois reliée : carte « Lecture des pièces reçues » (règles seules ou IA locale, avec le résultat du banc d'essai) et raccourci vers « Prévenir mes organismes ». Bon toutou ne lit que les pièces jointes, jamais le texte des mails ; rien ne part vers une IA en ligne.
- « Tu as déjà une adresse ailleurs » masque le guide.

**IA locale : un guide et un banc d'essai sur tes papiers (Réglages › IA locale)**
- Guide en 4 étapes : installer Ollama, installer le modèle conseillé pour ton ordinateur, le mettre à l'épreuve, l'activer.
- **Banc d'essai** : 6 de tes documents déjà rangés (un par type), nom de fichier caché ; le modèle dit ce qu'il y voit, Bon toutou compare à ton classement (type, date, organisme) et donne un avis en mots : « fiable », « utile avec vérification » ou « pas assez fiable », avec le temps par document. Rien n'est modifié, tout reste sur l'ordinateur ; résultat gardé pour cet appareil.

**Liens et rappels (prévus pour la 0.9.5, livrés ici)**
- **Les sites officiels s'ouvrent enfin** (Ameli, impots.gouv, ANTS, casier judiciaire, consulats…) : c'est maintenant Bon toutou qui demande à ton ordinateur d'ouvrir le lien, comme un double-clic. Avant, l'app bloquait les adresses qui n'étaient pas dans sa courte liste.
- **Tu choisis ton navigateur** : à la première ouverture, Bon toutou te montre les navigateurs installés (Safari, Chrome, Firefox, Brave, Arc, Edge…) et retient ton choix si tu coches « Toujours utiliser ce choix ». Modifiable dans Réglages › Navigateur. Réglage propre à cet ordinateur.
- **Sécurité** : seules les adresses https des sites cités par les packs officiels (et les pages de compte des messageries) sont ouvertes ; toute autre adresse est refusée. Bon toutou n'envoie rien : c'est ton navigateur qui se connecte.
- **Aujourd'hui : un seul bloc « Renouveler »** dès qu'il y a plus de 2 choses à renouveler. Il montre la plus importante (un papier expiré d'abord) et « et 3 autres à renouveler » ; un clic déplie les autres. Le titre compte tout ce qui t'attend.
- Un rappel qui a un site ouvre directement ce site (icône globe) ; « voir le document » reste à côté.

## 0.9.4 — Composer : une situation, un dossier
- **L'onglet Dossiers devient « Situations »**, 25 situations de la vie en tout, classées par thème :
  - **les 5 démarches déjà présentes** : louer un logement, candidater, ouvrir un compte, déclarer ses revenus, vendre un véhicule ;
  - **20 nouvelles**, dont :
    - demander un crédit ;
    - refaire sa carte d'identité ou son passeport ;
    - se marier ou se pacser ;
    - demander une aide CAF ;
    - rendre un logement et récupérer le dépôt ;
    - vendre un bien ;
    - préparer sa retraite ;
    - partir vivre à l'étranger ;
    - visa de long séjour (cas le plus exigeant) ;
    - prouver l'origine de ses fonds ;
    - prouver une vie commune ;
    - demander une nationalité ;
    - **8 visas par pays** : Nouvelle-Zélande, Canada, Australie, Portugal, Espagne, Japon, Thaïlande, Émirats.
- Pour chaque situation : les pièces trouvées dans tes documents (les tiennes d'abord), ce qui manque, ce qui est expiré ou trop ancien (compté depuis la date d'émission), le passeport qui n'a pas 6 mois de validité, et où obtenir chaque pièce. Les pièces « si besoin » ne bloquent pas.
- **Composer le dossier** en un clic : choisis le destinataire, remplace une pièce si tu veux, finalise. Bon toutou copie les pièces dans un dossier et un ZIP, avec une preuve d'envoi. Tes originaux ne bougent jamais.
- **Journal de résidence** (en bas de Situations) : où tu as vécu et quand, tiré de tes baux, quittances, justificatifs et papiers de séjour, et les **casiers judiciaires à prévoir**.
- **Archives s'ouvre sur « Pourquoi tu cherches ? »** : préparer ma retraite, contrôle fiscal, vendre un bien, fin de bail et dépôt, garantie ou litige, sinistre, succession, titre de séjour ou nationalité. Chaque raison rassemble les bons papiers (Archives et Documents), le plus récent en haut.
- **Les numéros devant les familles disparaissent de l'écran** (« Identité » au lieu de « 01 Identité »). Ils restent dans les dossiers du Finder pour garder l'ordre.

## 0.9.3 — Retrouver tout, avoir l'essentiel prêt
- **Essentiels** en haut de Documents : passeport, carte d'identité, acte de naissance, justificatif de domicile, RIB, relevés, avis d'impôt, attestation santé, casier judiciaire, CV, diplôme… et, selon ce que tu as, paie, bail, quittances, véhicule, visa, entreprise.
  - Un voyant par pièce : **prêt**, **bientôt**, **à renouveler** (trop ancien ou expiré), **à ajouter**.
  - **Renouveler / Obtenir** ouvre le site de l'organisme (Ameli, impots.gouv, ANTS, casier judiciaire, Info-retraite…) dans ton navigateur, ou te dit à qui le demander.
- **Aujourd'hui** te rappelle ce qu'il faut aller chercher : un justificatif devenu trop vieux, l'avis d'impôt publié fin juillet…
- **Recherche dans tout** : le texte de chaque document (même un numéro de contrat), les synonymes (IBAN trouve le RIB, électricité trouve EDF), les intitulés, les organismes, les collections. L'extrait cité masque les mots de passe et les longs numéros.
- **Fiche complétée** (bouton « Compléter la fiche », rien n'est renommé ni déplacé) : période couverte, date d'émission, forme (original, copie, apostillé, légalisé, traduit et langue), genre de bien (logement, véhicule, compte, entreprise). « Lieu » devient **Bien concerné**.
- **Ce qu'il prouve** dans chaque fiche : « justificatif de domicile jusqu'au… », « pièce d'identité », « 3 derniers bulletins »…, en vert ou en rouge selon la date.
- **Mes collections** : ajoute un document à « Préparer mon déménagement » ou à n'importe quel nom ; elles s'affichent sous les Essentiels. Les fichiers ne bougent pas.
- **Mon profil** (menu Plus) : tes numéros retrouvés dans tes documents (IBAN, numéro fiscal, sécurité sociale, passeport, carte d'identité, CAF, France Travail, SIREN, IRD), masqués par défaut, chacun relié au document où il est écrit ; et ce que tu veux compléter toi-même. Calculé sur ton ordinateur, jamais envoyé à une IA.
- **Doublons élargis** dans la revue « Doublons » : même type, même date, même organisme et même taille ; même numéro dans la bande MRZ ; même nom de fichier une fois retirés « copie », « (2) », « filigrane », « signed ». Toujours à vérifier avant d'appliquer, rien n'est supprimé.

## 0.9.2 — De la place pour chaque papier, ici et ailleurs
- **Nouvelle famille 18 « Immigration & séjours »**, rangée sous chaque pays : visas et titres de séjour, autorisations de voyage (ESTA, eTA, NZeTA…), demandes et décisions (refus compris, biométrie, taxes), parrainages et invitations (COE, CoS…), résidence sur place (enregistrement d'adresse, attestation de résidence). Les titres de séjour rangés dans Identité y rejoignent leur pays au prochain « Mettre à jour ».
- **Nouvelles sous-familles** : Santé › Santé voyage · Famille › Vie commune et tiers · École & formation › Reconnaissance à l'étranger · Juridique › Casiers judiciaires · Activités & entreprises › Clients et factures.
- **80 nouveaux types de documents**, pour qu'un papier ait sa place précise au lieu de finir dans « Autres » :
  - identité et état civil : photo d'identité, certificat de nationalité, changement de nom, inscription consulaire, permis international, traduction du permis ;
  - famille : acte de mariage, PACS, non-PACS, capacité à mariage, divorce, contrat de mariage, autorisation parentale, preuves de vie commune, pièces d'un garant ;
  - travail et retraite : certificat de travail, relevé de carrière, pension, certificat de vie, attestation France Travail ;
  - impôts et banque : certificat de résidence fiscale, formulaire 3916, numéro fiscal (y compris étranger), avis fiscal étranger, attestation bancaire, lettre de référence ;
  - santé et assurances : carnet de vaccination international, CEAM, examen médical de visa, assurance santé internationale, relevé d'information auto ;
  - formation : relevé de notes, évaluation de diplôme, test de langue, lettre d'admission, certificat de scolarité ;
  - juridique : casier judiciaire (France et étranger), procuration, déclaration sur l'honneur ;
  - entreprise : attestation de vigilance, factures émises, contrats clients, business plan, radiation.
- **Dates** : « Né à Troyes (10000), le … » est reconnu comme une naissance, et « signé le » n'est plus confondu avec « né le ».

## 0.9.1 — Des cases partout, deux portes pour le logement
- **La règle des cases**, dans Documents comme dans Archives : à chaque étage qui a au moins deux groupes, des cases ; un clic ouvre une nouvelle page. Un étage à un seul groupe est sauté. Plus jamais de listes empilées sous des intertitres.
  - Ordre des étages : sous-famille → titulaire (toi en premier) → lieu → organisme → nature du document → année.
  - Organisme et nature à partir de 7 documents, années au-delà de 12 : la liste finale reste courte, la plus récente en haut.
  - Le fil (Documents › Logement › …) remonte d'un clic ; Échap remonte d'une étape.
- **Logement s'ouvre sur deux portes** : « Là où j'habite » (locataire, propriétaire occupant, hébergé) et « Ce que je mets en location » (propriétaire bailleur). Un papier sans rôle suit son lieu.
- **Patrimoine › Immobilier** se range par lieu : tous les papiers d'un même bien ensemble.
- **Nouvelle famille 17 « Activités & entreprises »** : Création et statuts (SIRENE, Kbis, statuts, pouvoirs), Comptabilité (bilans, plaquettes, comptes annuels — elle quitte Patrimoine), Déclarations et impôts pro (CFE, TVA, liasse), Banque pro.
- **Flèches ← →** en haut, comme dans un navigateur (aussi ⌘[ et ⌘], ou les boutons latéraux de la souris).
- **Fiche d'un document** : le format en clair (PDF, Image, Excel, Word…) et le poids du fichier, et un **aperçu** comme dans Trier (PDF page par page, images ; pour Excel et Word, un bouton Ouvrir). Le format apparaît aussi sous chaque document dans les listes.

## 0.9.0 — Une base propre : chaque papier rangé selon ce qu'il est
- **Nouvelle règle de rangement** : `Pays / Famille / Sous-famille / Organisme / AAAA-MM-JJ_…_Lieu.ext`.
  - **Un dossier par organisme** dans chaque sous-famille (LCL, EDF, ton employeur…), comme les fiches de paie par employeur. Organisme inconnu ou toi-même : à la racine de la sous-famille, jamais de dossier « Inconnu ».
  - **Le lieu devient une étiquette** (« Paris - Rue de Plaisance », « Paris - Rue Poussin »…), écrite dans la fiche et à la fin du nom du fichier. Plus de dossiers par bien ou par logement.
  - **Le rôle** : locataire, propriétaire occupant, propriétaire bailleur, hébergé.
- **Nouvelles sous-familles** : Identité › Service national ; Logement › Baux et états des lieux, Quittances et avis d'échéance (reçus ou émis), Copropriété, Gestion locative ; Impôts › Taxes locales ; Banque › Crédits ; Assurances › Emprunteur ; Patrimoine › Comptabilité locative. « Mes logements » et « Biens loués » (v0.8.1) disparaissent.
- **Nouveaux types** : taxe foncière, assurance emprunteur, service national.
- **Corriger le classement** : champs Lieu (avec les lieux déjà écrits proposés) et Rôle. La fiche affiche Lieu et Rôle ; les listes montrent le lieu sous chaque document.
- **Revue · Migration** : remet tout ton bureau dans la nouvelle structure en une fois (un seul « Annuler »), retire les dossiers vides de l'ancienne organisation, et remplace la revue Logement.
- **Mettre à jour** garde le bureau rangé : un fichier mal placé rejoint le dossier de son organisme ; un fichier déjà bien nommé ne bouge plus.
- Les revenus locatifs (Dossiers) suivent les lieux et les rôles.

## 0.8.3 — Préparer les revenus locatifs d'une année
- **Dossiers › Revenus locatifs d'un bien** : choisis un bien et une année, Bon toutou va chercher dans le dossier du bien :
  - les **recettes** (quittances émises) ;
  - les **charges** (copropriété, énergie, assurance propriétaire, taxe foncière, travaux, gestion) ;
  - le **financement** (prêt, tableau d'amortissement, assurance emprunteur, toutes années) ;
  - la **comptabilité** de l'année et de l'année d'avant ;
  - les pièces de la location (baux, locataires, états des lieux).
- **Montants lus dans chaque pièce**, toujours marqués « à vérifier » : tu les corriges directement dans la liste. Totaux recettes, charges et différence.
- **« Créer le dossier »** : un dossier propre dans Démarches (1_Recettes, 2_Charges, 3_Financement…), une copie de chaque pièce, et `recapitulatif.csv` (ouvrable dans Excel ou Numbers) avec tes montants vérifiés. Tes originaux ne bougent pas.
- Ce n'est pas un conseil fiscal : c'est ton dossier, prêt pour toi ou ton comptable.

## 0.8.2 — Chaque papier dans le dossier qu'il concerne
- **Règle simple** : un papier va là où on le cherchera. S'il concerne un bien (le prêt pour l'acheter, l'assurance de ce prêt, la taxe foncière, les comptes annuels de la location), il va dans le dossier du bien, **quel que soit l'expéditeur** (banque, notaire, comptable, syndic). L'expéditeur reste écrit dans le nom du fichier et sert à la recherche. S'il te concerne toi en général (compte courant, impôt sur le revenu, inscription de ton entreprise), il reste dans sa famille.
- **Nouvelle étape « Financement »** dans Patrimoine › Immobilier : prêt, tableau d'amortissement, assurance emprunteur. Les étapes d'un bien : Achat, Financement, Copropriété, Charges et travaux, Comptabilité, Vente.
- **Noms avec des majuscules** : « 2020 Paris Rue Poussin », « Saint-Jean-d'Angély », « Maison de la Plage » (petits mots en minuscule, sigles gardés).
- Les biens et logements s'affichent dans l'ordre de la vie : le plus ancien d'abord.
- Les « Autres » de Mes logements et Biens loués se rangent aussi dans le dossier du logement ou du bien.

## 0.8.1 — Logement : là où j'habite, et ce que je loue
- **Logement se sépare en deux** :
  - **Mes logements** (là où tu habites ou as habité, locataire ou chez toi) : un dossier par logement, nommé par année d'arrivée (« 2020 Paris rue Poussin », « 2025 La Rochelle »), puis Bail, Quittances, Énergie et internet, Assurance, États des lieux, Justificatifs.
  - **Biens loués** (ce que tu loues à d'autres) : un dossier par bien, puis Baux, Locataires, Quittances émises, États des lieux, Gestion locative, et un dossier Modèles.
- **Patrimoine › Immobilier** garde la propriété du bien : Achat, Copropriété, Charges et travaux, Comptabilité, Vente.
- **Suivi dans le temps** : chaque bien ou logement affiche une ligne (« acheté en 2022 · vendu en 2025 », « loué de 2023 à 2025 », « depuis 2025 »). Les dossiers commencent par l'année : le Finder les range dans l'ordre chronologique.
- **« Inconnu » ne s'écrit plus dans le nom des fichiers** : un émetteur non trouvé est simplement omis. « Mettre à jour » renomme les fichiers déjà rangés.
- **Numéros de version** : le 2e chiffre change à chaque grand chantier (0.8 = Revues et Logement), le 3e à chaque petite mise à jour (0.8.1, 0.8.2…).

## 0.8.0 — Un dossier par bien, des dossiers envoyés reconstitués
- **Patrimoine › Immobilier : un dossier par bien** (appartement, maison, projet), puis par étape : Achat, Copropriété, Location (baux, locataires, quittances émises, états des lieux, gestion), Charges et travaux, Comptabilité, Vente. Plus un dossier Modèles (bail, état des lieux, grille de vétusté) pour tous tes biens. La même structure vaut pour n'importe quel bien, dans n'importe quel pays.
- Dans l'app, la sous-famille Immobilier montre un bloc par bien, puis ses étapes.
- **Dossier envoyé reconstitué** : une revue peut regrouper des pièces déjà envoyées (par exemple un dossier de location en copies filigranées) en un vrai dossier dans Archives › Dossiers envoyés, avec sa preuve (PREUVE.txt). Les pièces ne sont plus listées ailleurs. Un seul « Annuler ».
- 13 nouveaux types dans Immobilier (achat, copropriété, appel de fonds, bail signé avec un locataire, dossier d'un locataire, quittance émise, état des lieux, gestion locative, charges, travaux, comptabilité, vente, modèle).

## 0.7.9 — Chaque papier à son titulaire
- **Le titulaire toujours affiché**, pour toi comme pour les autres : « Passeport — Paul-Marie Belleperche », « Passeport — Éric … ». Dans Documents, Archives, la recherche et la fiche.
- **Regroupé par titulaire** : dans une sous-famille où plusieurs personnes ont des papiers, la liste est séparée par personne, toi en premier (marqué « toi »), puis chaque proche.
- **Dates des textes de loi ignorées** : « Constitution du 4 octobre 1958 », « loi du … », « instruction n° … du … » ne sont plus prises pour la date du document (le verso d'un certificat JDC était daté de 1958).

## 0.7.8 — Chaque version à sa place, chaque papier à son nom
- **Fiche d'un document** : depuis Documents, tu vois ses anciennes versions marquées « dans Archives » ; depuis Archives, la version qui l'a remplacé, marquée « dans Documents ». Chaque ligne ouvre la fiche de cette version (plus de fichier ouvert par surprise).
- **À qui est ce papier** : dans Documents, Archives, la recherche et la fiche, le nom du titulaire s'affiche à côté de l'intitulé dès que ce n'est pas toi (« Passeport — Éric … »).
- **Émetteur lisible** : « Préfecture de la Charente-Maritime », plus « Prefecture-de-la-Charente-Maritime ».
- **Intertitres justes** : dans une sous-famille, « Pièces d'identité » puis « Autres », plus « Sans émetteur ».
- **Documents › Mettre à jour** :
  - repère les **doublons** (même texte lu deux fois) et prépare une revue « Doublons trouvés » : un document et ses copies, rien n'est déplacé avant que tu l'appliques ;
  - corrige les **dates manifestement fausses** : date de naissance prise pour la date du document, ou date du jour du rangement quand une vraie date est écrite dans le texte.
- Une date qui suit « Né le … » n'est plus prise pour une naissance.

## 0.7.7 — La Revue, et des pièces d'identité lues comme il faut
- **Revue des documents déjà rangés** : une revue préparée pour toi (dans `.bontoutou/revues`, par exemple par Claude après avoir vérifié tes papiers avec toi) apparaît en haut de Documents. « Voir le détail » montre, document par document, ce qui change et pourquoi ; « Appliquer la revue » fait tout d'un coup, avec un seul « Annuler ».
- **Copies** : plusieurs scans d'un même papier (recto, verso, copie couleur…) deviennent **un document et ses copies**. Les copies sont rangées dans un dossier « Copies » à côté de lui, visibles derrière « i », et n'encombrent plus ni Documents ni Archives. Rien n'est supprimé.
- **Bande MRZ** (les 2 ou 3 lignes avec des « < » en bas des passeports et cartes, la même norme dans tous les pays) : Bon toutou y lit la date d'expiration et la date de naissance (écartée), vérifie les clés de contrôle, et en déduit la délivrance (passeport : 10 ans, 5 ans pour un mineur ; carte : 10 ans), toujours marquée « à vérifier ». Les anciennes cartes françaises donnent l'année et le mois de délivrance.
- **Dates écrites sans séparateur** après un libellé (« Date d'expir. 22072034 ») : lues.
- **Ton vrai nom, une seule écriture.** « PM Belleperche », « PAUL-MARIE BELLEPERCHE », « Belleperche Paul-Marie », « Paul Marie Joël Marius Belleperche » ou un pseudonyme confirmé : c'est toi, et tes documents sont tous rangés sous le nom écrit dans Réglages › Profil, comme titulaire comme émetteur (CV, lettres). Un proche n'est jamais confondu avec toi (« Marie Belleperche » ≠ « Paul-Marie Belleperche » : le premier prénom doit concorder).
- **Changer ton nom** dans Réglages renomme tes documents d'un coup (annulable) ; l'ancien nom reste reconnu comme toi. Une revue peut aussi le proposer.
- **Les autres personnes aussi** : un même proche écrit de deux façons garde l'écriture déjà la plus utilisée. « Documents › Mettre à jour » unifie ce qui est déjà rangé.

## 0.7.6 — Chercher en petites étapes
- **Documents et Archives s'ouvrent sur les familles.** Une famille montre ses sous-familles, une sous-famille montre ses documents (avec un intertitre par émetteur). Un fil « Documents › Famille › Sous-famille » permet de remonter d'un clic ; Échap remonte d'une étape. Plus de longues listes d'un coup. Un filtre par pays apparaît quand tu en as plusieurs.
- **On reste dans Archives.** Ouvrir un document depuis Archives (ou depuis une recherche) puis revenir ramène dans Archives, à la même recherche et au même endroit. L'onglet du haut reste sur Archives. Archives s'ouvre sur les anciens documents.
- **Recherche** : une liste courte, groupée par famille › sous-famille, pour savoir où est chaque document.
- **Bouton « i »** sur la fiche d'un document : l'essentiel reste visible (date, expiration, titulaire, émetteur) ; le chemin du fichier, le nom reçu, l'endroit où il a été trouvé, les sorties, la confidentialité et l'empreinte sont derrière « i ».
- **Titres d'identité : la bonne date.** Carte d'identité, passeport, permis, titre de séjour prennent la date de délivrance, jamais la date de naissance ni la date du jour. Quand le scan est un tableau mal lu, la délivrance est retrouvée 5, 10 ou 15 ans avant l'expiration. « 04 OCT 2029 » n'est plus lu aussi comme « fin octobre 2029 ».
- **Documents › Mettre à jour** corrige aussi la date des titres d'identité déjà rangés (relue dans le texte déjà lu, fichier renommé, annulable).

## 0.7.5 — Un plan de rangement, validé par groupes
- **Plan de rangement** : un fichier préparé pour toi (dans `.bontoutou/plans`, par exemple par Claude à ta demande) propose pour chaque document de Trier son usage, son type, son émetteur, son titulaire et une note. « Appliquer le plan » pré-remplit les documents, **sans rien ranger**, et sans jamais écraser un choix que tu as déjà fait.
- **Trier › Groupes** : les documents regroupés par dossier de destination (ex. « France › Archives › Travail & revenus › Bulletins de paie › Kayser · 10 documents »). Tu décoches les exceptions, tu ranges le groupe d'un clic (un seul « Annuler »). « Corriger » ouvre ce document en cartes.
- **Plus rapide pendant le tri** : quand les propositions sont masquées, l'IA locale ne tourne plus en arrière-plan (elle occupait l'ordinateur pour rien), et elle ne relit plus les scans déjà lus.

## 0.7.4 — Un « Autres » partout, pour étudier les cas particuliers
- **Chaque famille a son « Autres »** (ex. Travail & revenus › Autres) et **chaque sous-famille aussi** (ex. Travail & revenus › Contrats › Autres). Dans le choix en tuiles : une tuile « Autres » dans chaque famille, une tuile « Autre » dans chaque sous-famille, et « Autre famille » quand aucune ne convient (dossier 16 Autres familles › À étudier).
- **Quelle famille imagines-tu ?** Quand un document va dans un « Autres », tu peux écrire la famille que tu verrais pour lui (facultatif, avec les idées déjà écrites proposées dès 2 lettres). Elle est gardée dans sa fiche.
- **Réglages › Les « Autres » à étudier** : tous les cas particuliers, groupés par endroit, et le décompte des familles imaginées. On décide des nouvelles familles après les avoir étudiés, pas avant.
- Les « Autres » ne sont jamais proposés par les règles ni par l'IA : seulement choisis par toi.
- « Autre document » (sans famille) va maintenant dans 16 Autres familles › À étudier, plus dans Contrats › Divers. Les fichiers déjà rangés ne bougent pas.

## 0.7.3 — Trier épuré
- **Une question, un geste.** La carte ne montre plus que l'avancement, les étapes faites et la question en cours. Confiance, confidentialité, nom reçu, « Pourquoi ? », Annuler, mettre de côté, relire : tout est dans **Options**, en bas à droite. « ← Plus tard » reste en bas à gauche.
- **Le chemin comme dans le Finder** : un dossier par ligne (France › Banque › Comptes et relevés…), le nom du fichier au bout. Noms de sous-dossiers écrits en français correct (accents, « et »).
- **L'aperçu ne se recharge plus** quand l'écran se met à jour (IA locale en train de lire, enregistrement d'un champ) : l'image ou la page du PDF reste affichée.
- **Propositions de Bon toutou masquées par défaut** : tu choisis toi-même l'usage, le type (tuiles) et l'émetteur (avec les noms déjà connus). Bon toutou continue d'analyser en silence pour apprendre de tes choix. Options › « Afficher les propositions de Bon toutou » les remet. « Ranger les sûrs d'un coup » n'apparaît que si elles sont affichées.

## 0.7.2 — De petites étapes rapides, et les noms déjà connus reviennent tout seuls
- **Trier (Cartes) : une question à la fois, en grand, à droite.** 1. Tu t'en sers encore ? 2. Où le ranger (le chemin en gros : France › Banque › Relevés…) 3. Qui l'a émis ? 4. Le nom du fichier → Ranger. À chaque étape, la proposition de Bon toutou (ou de l'IA locale) : **Entrée** pour la garder, ou **Changer**. Les étapes faites restent visibles au-dessus, chacune modifiable d'un clic. L'aperçu du document occupe toute la gauche.
- **Les noms déjà connus reviennent tout seuls** : dans Émetteur, Titulaire et Intitulé (Trier, mode Liste, Corriger le classement), dès 2 lettres, Bon toutou propose ce que tu as déjà écrit dans ton bureau, du plus utilisé au plus rare. ↓ ↑ pour choisir, Entrée ou Tab pour prendre. Une correction en cours compte aussi : écrite une fois, proposée pour le document suivant.

## 0.7.1 — Mange papiers, et recommencer de zéro
- Nouvelle signature sous le nom : **« Mange papiers. »**
- **Réglages › Recommencer de zéro** : tous les documents rangés (Documents et Archives) reviennent dans Trier sous leur nom d'origine, pour un nouveau tri. Avant, le rangement actuel est **gardé, compressé** dans `.bontoutou/rangements` (le plan : où était chaque document, son type, son émetteur, sa date, ses fiches ; les documents ne sont pas copiés). Confirmation en écrivant RECOMMENCER ; un seul « Annuler » juste après.
- **Revenir à ce rangement** : chaque document encore dans Trier retrouve sa place, son nom et sa fiche. Ce que tu as rangé autrement depuis ne bouge pas.
- Rien n'est supprimé : réglages, règles, dossiers et preuves d'envoi ne changent pas.

## 0.7.0 — Trier en étapes
- **Tu t'en sers encore ?** Chaque document commence par ce choix, en haut à gauche : **Utile aujourd'hui** (dans Documents) ou **Archives** (rangé à part, toujours retrouvable). C'est toujours ta décision : Bon toutou donne seulement son avis. « Ranger » attend ta réponse (touches U / A).
  - Utile aujourd'hui pour une ancienne version ou un papier d'une situation finie : il reste dans Documents, à côté de la version actuelle, et n'est jamais rangé dans Archives automatiquement (anciens employeurs compris).
  - Archives pour un document récent : rangé dans 99_ARCHIVES, la version actuelle ne change pas.
- **Famille › sous-famille › type en tuiles** (touches 1 à 9), à la place de la phrase à trous et de la longue liste déroulante. La proposition de Bon toutou est déjà choisie ; un fil en haut de la carte rouvre n'importe quelle étape. Recherche par mots (« contrat d'apprentissage », « livret »).
- **La fiche** : émetteur, date, titulaire, intitulé, pays, expiration, avec le nom et le dossier mis à jour en direct.
- Les mêmes tuiles en mode Liste et dans « Corriger le classement » d'un document déjà rangé.

## 0.6.4 — Trier profite tout de suite des nouvelles règles
- Après une mise à jour, les documents qui attendaient dans Trier sont **relus automatiquement** avec les nouvelles règles (texte déjà lu, pas de nouvel OCR, tes corrections gardées). Avant, ils gardaient l'analyse faite à leur arrivée.
- Bouton **Relancer l'analyse** aussi en mode Cartes.
- Correction : après une relecture rapide, « IA locale en train de lire… » pouvait rester affiché sans fin.

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
