# Sentinelle Factory (`/sentinelle/factory`)

Un prompt. Un worker Codex qui cherche, choisit et écrit. Un montage vertical
monté à la volée. Un bouton qui publie sur TikTok.

```
prompt ──▶ worker Codex ──▶ proposition ──▶ montage viral ──▶ aperçus ──▶ publier
           (cherche,          (JSON validé)    (3 en parallèle)            (API TikTok)
            choisit,
            écrit)
```

## Démarrer

Trois processus, dans cet ordre.

```bash
# 1. Le serveur de rendus, qui expose les clips sur api.adoptan.ai (déjà lancé en prod)
cd /home/ubuntu/luciamuccia && npm start          # src/index.js porte le serveur sur :8611

# 2. Le moteur de la Factory
cd /home/ubuntu/luciamuccia
npm run factory                                    # répétition : rien ne part sur TikTok
npm run factory:live                               # publication réelle

# 3. Le site
cd /home/ubuntu/temus/site
npx next build && npm run demo:serve
```

Puis `http://127.0.0.1:4310/sentinelle/factory`.

Le site relaie `/api/factory/*` vers `127.0.0.1:8626` : la page reste en
same-origin, donc dans la CSP de `/sentinelle/*`, sans configuration CORS.

Depuis une autre machine, ouvre un tunnel plutôt que d'exposer le moteur :

```bash
ssh -L 4310:127.0.0.1:4310 ubuntu@<vps>
```

## Répétition et publication réelle

Le moteur démarre **en répétition**. Le bouton « Publier la sélection »
parcourt toute la chaîne, écrit les mêmes journaux, et s'arrête juste avant
l'appel TikTok. L'interface l'annonce explicitement.

`--live` arme la publication directe : `PUBLIC_TO_EVERYONE`, commentaires
ouverts, duo et stitch fermés, pas de déclaration de contenu IA. Chaque
publication réussie ouvre un relevé de métriques dans
`.data/tiktok-post-analytics/`.

## Ce que fait le worker

Le worker tourne dans `/home/ubuntu/luciamuccia` via `codex exec --json`, en
bac à sable `workspace-write`. Il n'a qu'un outil :

```bash
node scripts/sentinelle-factory-tool.mjs search   --query "…" --limit 30
node scripts/sentinelle-factory-tool.mjs show     --render "<renderId>"
node scripts/sentinelle-factory-tool.mjs propose  --run "<runId>" --file /tmp/<runId>.json
```

`propose` est la seule commande qui écrit, et elle valide : un `renderId`
inconnu, une accroche de plus de six mots ou une caption vide sont refusés. Le
worker ne publie rien et n'appelle aucune API externe — la publication est un
geste séparé, déclenché depuis l'interface.

Son flux d'exécution est relayé en direct dans la page (recherches lancées,
clips lus, proposition déposée).

## Le montage « viral »

`scripts/render-viral-clip.mjs` produit le 1080×1920 :

- **cadrage plein cadre** suivant le visage dominant, détecté par YuNet
  (`assets/models/face_detection_yunet_2023mar.onnx`) et lissé sur toute la
  durée ; repli automatique sur la bande floutée quand le plan est large ou le
  visage instable ;
- **sous-titres cinétiques** en Inter Display Black, trois mots par carton, le
  mot prononcé passe en jaune et grossit à l'instant exact où il sort ;
- **zoom émotionnel** lent et continu, accéléré sur les pics d'énergie vocale
  réellement mesurés dans la piste audio ;
- **accroche** en haut, coupée sur deux lignes équilibrées et redimensionnée
  pour ne jamais déborder du cadre ;
- H.264 `veryfast` CRF 23, 30 i/s, audio normalisé à −14 LUFS.

Comptez ~20 s par clip, les trois en parallèle : environ 60 s de montage, et
80 à 110 s entre le prompt et les trois aperçus jouables.

Le rendu **refuse d'inventer des sous-titres** : sans calage au mot issu de la
transcription du pipeline, il échoue plutôt que de deviner.

## Ce que le badge affiche

Le badge « Fort potentiel / Bon candidat » reprend le **score réel du radar**
(0–100, seuil de candidature 75) écrit au moment de la détection, pas une
probabilité de viralité inventée. La chaleur du chat affichée est celle
mesurée pendant le live.

## Vérifier

```bash
npm run factory:test    # dans site/ — prompt → worker → montage → aperçus
```

Le test ne clique jamais « Publier ».

## Limites connues

- Le moteur est local : sur `adoptan.ai`, la page affiche « Moteur non
  joignable » et explique comment le lancer. Il n'y a pas de backend hébergé.
- Le worker choisit parmi les clips **déjà découpés** de la bibliothèque
  (230 rendus). Il ne redécoupe pas un live à la demande.
- Pas de musique de fond : aucune piste libre de droits vérifiée n'est
  embarquée, et poser une musique non vérifiée sur des publications
  automatiques exposerait les comptes.
- Les hashtags viennent du worker et de la langue du clip, pas d'une API de
  tendances : aucune source de tendance temps réel n'est branchée.
