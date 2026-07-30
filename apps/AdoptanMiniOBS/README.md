# Adoptan Mini OBS pour macOS

Application native SwiftUI universelle (Apple Silicon et Intel) qui transforme
un Mac en mini studio de direct :

- caméra de l’iPhone par **QR + Safari**, sans Caméra de continuité ;
- mode Caméra de continuité conservé comme solution secondaire ;
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
4. Autoriser Microphone et Enregistrement de l’écran. La permission Caméra
   n’est requise que pour le mode macOS/Continuité secondaire.
5. Si macOS le demande, fermer puis relancer l’app après l’autorisation écran.

La version 0.2.0 utilise par défaut la caméra iPhone réseau. Colle la clé privée
adoptan.ai, scanne le QR avec l’iPhone et touche **Connecter la caméra** dans
Safari. La caméra est reçue depuis le relais HLS ; Caméra de continuité peut
rester désactivée.

L’écran du Mac possède à nouveau la piste vidéo principale, comme dans la
première version. La caméra iPhone réseau est une incrustation indépendante :
une coupure de l’iPhone ne coupe donc jamais le partage d’écran. Chaque source
possède son propre témoin d’images reçues en continu.

Le microphone du Mac est désormais prioritaire. Si le microphone de l’iPhone
devient indisponible, la caméra et l’écran continuent de fonctionner et l’app
retente automatiquement avec un microphone local.

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
