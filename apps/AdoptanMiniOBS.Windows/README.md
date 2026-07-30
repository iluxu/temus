# Adoptan Mini OBS pour Windows

Mini régie native WPF pour Windows 10/11 (64 bits) :

- caméra et microphone de l’iPhone envoyés par WebRTC via adoptan.ai ;
- capture de l’écran Windows entier ;
- aperçu exact du programme composé ;
- scènes écran + caméra, caméra + écran, caméra seule, écran seul et duo ;
- position et taille de l’incrustation, miroir et rotation 180° ;
- microphone Windows et Stereo Mix optionnels ;
- diffusion RTMPS directe vers Kick, Twitch ou une destination personnalisée ;
- profil stable H.264/AAC 720p30.

## Utilisation

1. Lancer `AdoptanMiniOBS.exe`.
2. Coller la clé privée adoptan.ai dans **Liaison iPhone**.
3. Scanner le QR avec l’iPhone et ouvrir la page dans Safari.
4. Appuyer sur **Connecter la caméra** sur l’iPhone.
5. Revenir sur Windows et appuyer sur **Démarrer l’aperçu**.
6. Choisir la scène, la qualité et les sources audio.
7. Coller la clé Kick/Twitch puis lancer le direct.

Safari doit rester ouvert au premier plan. Il est recommandé de brancher
l’iPhone et de démarrer avec le profil 720p30 à 3 500 kb/s.

## Audio Windows

Le microphone de l’iPhone est toujours reçu avec la vidéo. Les périphériques
audio DirectShow du PC peuvent être ajoutés. Pour le son du système, activer
`Stereo Mix` dans les paramètres audio Windows si le pilote le propose.

## Distribution

La release contient :

- `AdoptanMiniOBS.exe`, application .NET 8 autonome en fichier unique ;
- `ffmpeg.exe`, moteur de capture et d’encodage ;
- les notices de licences.

FFmpeg est exécuté comme programme séparé. La build Windows GPL provient de
[`BtbN/FFmpeg-Builds`](https://github.com/BtbN/FFmpeg-Builds), à partir du
code source officiel de [FFmpeg](https://ffmpeg.org/download.html).
