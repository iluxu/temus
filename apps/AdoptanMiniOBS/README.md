# Adoptan Mini OBS pour macOS

Application native SwiftUI universelle pour les Mac Intel et Apple Silicon qui
transforme un Mac, notamment un Mac Scaleway, en mini studio de direct :

- caméra distante de l’iPhone par **SRT depuis Moblin**, activée par défaut
  pour les Mac Scaleway, avec récupération des paquets perdus ;
- QR Moblin qui crée automatiquement le profil iPhone en 720p30 H.264 ;
- ancien parcours Safari avec lecture HLS conservé comme mode de secours ;
- Caméra de continuité conservée pour un Mac physiquement proche de l’iPhone ;
- capture d’un **écran entier** avec ScreenCaptureKit ;
- mixage du microphone et du son du Mac ;
- scènes écran/caméra, incrustation redimensionnable et positionnable ;
- diffusion RTMPS directe vers Kick, Twitch ou un serveur personnalisé ;
- H.264 matériel, CBR, AAC 48 kHz et image-clé toutes les 2 secondes ;
- clé de stream stockée dans le Trousseau macOS.

## Configuration conseillée

Le bouton **Profil stable 720p30** applique :

- 1280 × 720 ;
- 30 images/s ;
- vidéo à 3 500 kb/s ;
- audio AAC à 160 kb/s.

C’est le meilleur point de départ pour éviter les freezes. Le 1080p30 à
5 500 kb/s est disponible si la connexion montante reste stable.

## Installation

1. Télécharger l’archive `Adoptan-Mini-OBS-macOS.zip` de la dernière release.
2. Décompresser puis glisser l’app dans `Applications`.
3. Au premier lancement, faire clic droit sur l’app puis **Ouvrir**.
4. Autoriser Caméra, Microphone et Enregistrement de l’écran.
5. Si macOS le demande, fermer puis relancer l’app après l’autorisation écran.

La version 0.5.2 fonctionne nativement sur Intel (`x86_64`) et Apple Silicon
(`arm64`). Elle vise notamment le Mac Scaleway distant. Dans le mode recommandé,
l’iPhone publie sa caméra depuis Moblin en SRT et l’app la décode nativement. Le QR crée
le profil « Adoptan iPhone SRT » avec les réglages stables : H.264, 1280 × 720,
30 i/s, 2 500 kb/s, intervalle d’image-clé de 2 secondes, latence SRT de 700 ms
et débit adaptatif. Aucune clé privée n’est nécessaire pour cette liaison.

Le mode Safari/HLS reste proposé comme secours.

La capture d’écran conserve le chemin de la version 1 : ScreenCaptureKit envoie
directement l’écran sur la piste vidéo principale. Les files vidéo et audio sont
séparées, seules les images complètes sont traitées et une ancienne image est
abandonnée si le mixeur est occupé. Cela évite l’accumulation de retard qui
finissait par figer l’aperçu sur un Mac distant.

Le micro de l’iPhone distant arrive sur une piste audio séparée dans le mode
SRT recommandé. Le secours Safari transmet uniquement l’image et utilise le
micro du Mac. Une autorisation micro refusée sur l’iPhone ne bloque jamais la
vidéo. Le micro du Mac et le son système restent réglables indépendamment.

La build publique est signée localement de façon ad hoc. Une signature Apple
Developer ID et la notarisation nécessitent le certificat Apple du propriétaire.

## Développement

Prérequis : macOS 13+, Xcode 16.4 et Swift 6.

```bash
cd apps/AdoptanMiniOBS
swift build -c release
```

Le workflow GitHub assemble automatiquement le binaire Apple Silicon en bundle
`.app`, le signe ad hoc et publie une archive ZIP lors de la création d’un tag
`adoptan-mini-obs-v*`.
