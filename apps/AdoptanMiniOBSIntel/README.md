# Adoptan Mini OBS Intel Clean

Application indépendante destinée au MacBook Pro Intel. Elle ne dépend ni de
HaishinKit, ni de Moblin, ni de Caméra de continuité.

Pipeline 1.1 :

1. Safari sur l’iPhone capture la caméra et publie en WebRTC/WHIP ;
2. MediaMTX transforme ce flux en RTSP/TCP et FFmpeg le reçoit directement ;
3. ScreenCaptureKit capture l’écran du Mac avec le chemin natif de la V1 ;
4. FFmpeg compose les deux sources et encode avec VideoToolbox ;
5. la sortie est envoyée à Kick, Twitch ou un serveur RTMP personnalisé.

Cette liaison ne dépend ni de Caméra de continuité, ni de Moblin, ni de la
présence physique de l’iPhone près du Mac. Le QR ouvre simplement
`https://adoptan.ai/iphone-camera` dans Safari.

Depuis la 1.0.2, aucun format de pixels AVFoundation n’est forcé pour l’écran.
ScreenCaptureKit fournit des images BGRA dimensionnées exactement, et l’aperçu
utilise lui aussi des images brutes cadrées plutôt qu’un flux MJPEG.

La nouvelle identité `ai.adoptan.miniobs.intel.clean` force une autorisation
d’enregistrement d’écran propre, indépendante des anciennes versions.
