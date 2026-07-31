# Adoptan Mini OBS pour macOS

Application native SwiftUI universelle (Apple Silicon et Intel) qui transforme
un Mac en mini studio de direct :

- caméra distante de l’iPhone par **WHIP/WHEP WebRTC**, activée par défaut
  pour les Mac Scaleway ;
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

La version 0.4.0 vise le Mac Scaleway distant. L’iPhone publie sa caméra en WHIP
depuis Safari et l’app la reçoit directement en WHEP/WebRTC, sans passer par le
lecteur HLS qui ajoutait de la latence et se bloquait. Le QR est sélectionné par
défaut.

La capture d’écran reprend le chemin exact de la version 1 : ScreenCaptureKit
envoie directement l’écran sur la piste vidéo principale. La caméra distante
reste la piste d’incrustation. Chaque source possède son propre témoin d’images
reçues en continu.

Le microphone du Mac est prioritaire et reste dans une session séparée. Le son
WebRTC de l’iPhone est volontairement ignoré afin qu’une erreur de microphone
ne puisse jamais arrêter l’image.

La build publique est signée localement de façon ad hoc. Une signature Apple
Developer ID et la notarisation nécessitent le certificat Apple du propriétaire.

## Développement

Prérequis : macOS 13+, Xcode 16.4 et Swift 6.

```bash
cd apps/AdoptanMiniOBS
swift build -c release
```

Le workflow GitHub assemble automatiquement le binaire en bundle `.app`, le
signe ad hoc et publie une archive ZIP lors de la création d’un tag
`adoptan-mini-obs-v*`.
