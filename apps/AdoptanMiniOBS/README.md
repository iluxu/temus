# Adoptan Mini OBS pour macOS

Application native SwiftUI universelle (Apple Silicon et Intel) qui transforme
un Mac en mini studio de direct :

- caméra de l’iPhone par **Caméra de continuité**, activée par défaut ;
- mode QR + Safari conservé uniquement comme solution de secours ;
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

La version 0.3.0 remet Caméra de continuité au premier plan. AVFoundation reçoit
directement l’iPhone et ScreenCaptureKit reçoit l’écran entier du Mac. Un
compositeur Core Image interne fabrique ensuite une seule image finale : le
moteur RTMP ne doit donc plus arbitrer entre deux pistes vidéo concurrentes.
Chaque source possède son propre témoin d’images reçues en continu.

Le mode QR reste disponible dans le sélecteur comme secours. Il n’est plus
sélectionné automatiquement et n’est pas nécessaire au fonctionnement normal.

Le microphone du Mac est prioritaire et reste dans une session séparée. Si le
microphone de l’iPhone devient indisponible, la caméra et l’écran continuent de
fonctionner et l’app retente avec un microphone local.

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
