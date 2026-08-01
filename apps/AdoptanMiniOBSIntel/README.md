# Adoptan Mini OBS Intel Clean

Reconstruction indépendante destinée au MacBook Pro Intel. Elle ne dépend pas
de HaishinKit et ne lit pas Moblin directement en SRT.

Pipeline :

1. Moblin publie la caméra en SRT vers MediaMTX ;
2. FFmpeg lit le relais HLS stable ;
3. ScreenCaptureKit capture l’écran du Mac avec le chemin natif de la V1 ;
4. FFmpeg compose les deux sources et encode avec VideoToolbox ;
5. la sortie est envoyée à Kick, Twitch ou un serveur RTMP personnalisé.

Depuis la 1.0.2, aucun format de pixels AVFoundation n’est forcé pour l’écran.
ScreenCaptureKit fournit des images BGRA dimensionnées exactement, et l’aperçu
utilise lui aussi des images brutes cadrées plutôt qu’un flux MJPEG.

La nouvelle identité `ai.adoptan.miniobs.intel.clean` force une autorisation
d’enregistrement d’écran propre, indépendante des anciennes versions.
