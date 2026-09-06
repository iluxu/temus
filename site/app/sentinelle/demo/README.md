# Sentinelle — Replay de démo (`/sentinelle/demo`)

Rejeu déterministe d'**un seul cas réel**, de la captation du live à la mesure
des publications. Trois minutes, six étapes, aucune donnée inventée.

## Le cas

| | |
|---|---|
| Live | Twitch `twitch-317634897634`, 3 septembre 2026, 19:33:01 UTC |
| Passage | VOD 00:16:28 → 00:16:50, score 78 (seuil 75) |
| Rendu | `radar-twitch-317634897634-9880-10100-78--lucia-clean-subtitles-v1-tiktok-ae4762e3` |
| Bloc de validation | `block-mtmquybz-510952ca90`, 8 clips, 2 comptes |
| Publications | 8 posts TikTok le 4 septembre 2026, mesurés à 5 min / 1 h / 24 h |

Chaque chiffre affiché vient de `replay-data.ts`, lui-même extrait des journaux
du pipeline. Le manifeste `public/sentinelle-demo/evidence-manifest.json` liste
les fichiers sources et l'empreinte SHA-256 de chaque média servi.

## Garde-fous

- La page est **entièrement statique** : aucun `fetch`, aucun WebSocket, aucun
  `mailto`. Aucune interaction ne peut publier, notifier ou envoyer un message.
- Les seuls liens externes pointent vers des publications TikTok **publiques**.
- Aucun jeton, secret, en-tête d'autorisation ni lien privé d'approbation n'est
  présent dans le code ou les données.
- Le service worker ne met en cache que la coquille de `/sentinelle/demo`, ses
  bundles Next, les icônes et `/sentinelle-demo/*`. `/api/*` est explicitement
  exclu.

## Commandes

```bash
# 1. Régénérer les données depuis le pipeline (nécessite /home/ubuntu/luciamuccia/.data)
npm run demo:evidence

# 2. Construire et servir
npx next build
npm run demo:serve          # http://127.0.0.1:4310/sentinelle/demo

# 3. Vérifier (ordinateur + mobile)
npm i -D playwright && npx playwright install chromium   # une seule fois
npm run demo:test
```

`demo:serve` sert `out/` avec les requêtes de plage (206) que la lecture vidéo
et le service worker exigent, plus les en-têtes `Service-Worker-Allowed` et
`no-store` que Cloudflare applique via `public/_headers` en production.

## Pilotage pendant la présentation

| Touche | Effet |
|---|---|
| `Espace` ou `K` | Lecture / pause |
| `←` `→` | Étape précédente / suivante |
| `Home` ou `R` | Retour au début |
| `M` | Son |

Les six pastilles numérotées en haut permettent aussi d'aller directement à une
étape ; le rejeu reprend proprement à partir de là.

## Régénérer les médias

Les deux vidéos sont les fichiers réels ré-encodés pour le web — aucun
recadrage, aucune coupe, aucun sous-titre ajouté ou retiré :

```bash
SRC=/home/ubuntu/luciamuccia/.data/clip-renders/clips
OUT=public/sentinelle-demo/media
SUF=--lucia-clean-subtitles-v1-tiktok-ae4762e3

ffmpeg -i "$SRC/radar-twitch-317634897634-9880-10100-78/video.mp4" \
  -vf scale=960:-2 -c:v libx264 -crf 30 -preset slow -movflags +faststart \
  -c:a aac -b:a 96k "$OUT/hero-source.mp4"

ffmpeg -i "$SRC/radar-twitch-317634897634-9880-10100-78$SUF/video.mp4" \
  -vf scale=540:960 -c:v libx264 -crf 30 -preset slow -movflags +faststart \
  -c:a aac -b:a 96k "$OUT/hero-vertical.mp4"
```

Puis relancer `npm run demo:evidence` pour rafraîchir les empreintes du
manifeste.
