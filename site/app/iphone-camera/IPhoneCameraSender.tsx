"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import styles from "./iphone-camera.module.css";

const MEDIA_ROOT = "https://api.adoptan.ai/screen-media/studio/lucia";

type PublisherOptions = {
  url: string;
  token: string;
  stream: MediaStream;
  videoCodec: string;
  videoBitrate: number;
  audioCodec: string;
  audioBitrate: number;
  audioVoice: boolean;
  onError: (error: string) => void;
  onConnected: () => void;
};

type PublisherInstance = {
  close: () => void;
  pc: RTCPeerConnection | null;
};

declare global {
  interface Window {
    MediaMTXWebRTCPublisher?: new (options: PublisherOptions) => PublisherInstance;
  }
}

type CameraStatus = "idle" | "permission" | "connecting" | "connected" | "error";

export default function IPhoneCameraSender() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const publisherRef = useRef<PublisherInstance | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [videoOnly, setVideoOnly] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [message, setMessage] = useState(
    "Cette page envoie uniquement la caméra et le micro de l’iPhone à Adoptan Mini OBS."
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setVideoOnly(query.get("videoOnly") === "1");
    window.localStorage.removeItem("adoptan-windows-camera-key-v1");
    if (query.has("key")) {
      query.delete("key");
      const cleaned = `${window.location.pathname}${query.size ? `?${query.toString()}` : ""}`;
      window.history.replaceState({}, "", cleaned);
    }

    return () => stopCamera(streamRef, publisherRef, wakeLockRef, videoRef);
  }, []);

  const connect = async () => {
    if (!libraryReady || !window.MediaMTXWebRTCPublisher) {
      setStatus("error");
      setMessage("Le module vidéo charge encore. Réessaie dans quelques secondes.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Ouvre ce lien dans Safari avec HTTPS.");
      return;
    }

    stopCamera(streamRef, publisherRef, wakeLockRef, videoRef);
    setStatus("permission");
    setMessage("Autorise la caméra de l’iPhone. Le microphone est facultatif.");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      });
      if (!videoOnly) {
        try {
          const microphone = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 2
            }
          });
          const audioTrack = microphone.getAudioTracks()[0];
          if (audioTrack) stream.addTrack(audioTrack);
        } catch {
          // Video is the required source. A denied/unavailable iPhone microphone
          // must never prevent the camera from reaching Mini OBS.
        }
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      setStatus("connecting");
      setMessage("Connexion de l’iPhone à Adoptan Mini OBS…");
      const Publisher = window.MediaMTXWebRTCPublisher;
      publisherRef.current = new Publisher({
        url: `${MEDIA_ROOT}/whip`,
        token: "",
        stream,
        videoCodec: "h264/90000",
        videoBitrate: 3500,
        audioCodec: "opus/48000",
        audioBitrate: 160,
        audioVoice: true,
        onError: () => {
          setStatus("error");
          setMessage("La liaison a été interrompue. Appuie sur Reconnecter.");
        },
        onConnected: () => {
          setStatus("connected");
          setMessage("Caméra connectée. Retourne sur le Mac ou le PC et démarre l’aperçu.");
          configureSender(publisherRef.current?.pc);
        }
      });
      wakeLockRef.current = await requestWakeLock();
    } catch (error) {
      stopCamera(streamRef, publisherRef, wakeLockRef, videoRef);
      setStatus("error");
      setMessage(friendlyError(error));
    }
  };

  const switchCamera = async () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    const publisher = publisherRef.current;
    if (!publisher?.pc) {
      setFacingMode(nextFacing);
      return;
    }

    try {
      const replacement = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      });
      const nextTrack = replacement.getVideoTracks()[0];
      const sender = publisher.pc.getSenders().find((item) => item.track?.kind === "video");
      if (!nextTrack || !sender) throw new Error("Piste vidéo indisponible.");
      await sender.replaceTrack(nextTrack);

      const stream = streamRef.current;
      stream?.getVideoTracks().forEach((track) => track.stop());
      const combined = new MediaStream([
        nextTrack,
        ...(stream?.getAudioTracks() || [])
      ]);
      streamRef.current = combined;
      if (videoRef.current) {
        videoRef.current.srcObject = combined;
        await videoRef.current.play();
      }
      setFacingMode(nextFacing);
      setMessage(nextFacing === "environment" ? "Caméra arrière active." : "Caméra avant active.");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  };

  const connected = status === "connected";
  const busy = status === "permission" || status === "connecting";

  return (
    <>
      <Script
        src={`${MEDIA_ROOT}/publisher.js`}
        strategy="afterInteractive"
        onLoad={() => setLibraryReady(true)}
      />

      <main className={styles.page}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.brand}>
            <span>a</span>
            adoptan.ai
          </Link>
          <div className={`${styles.status} ${styles[status]}`}>
            <i />
            {connected ? "CONNECTÉE" : busy ? "CONNEXION" : "HORS LIGNE"}
          </div>
        </nav>

        <header className={styles.hero}>
          <span>Caméra iPhone · Adoptan Mini OBS</span>
          <h1>L’iPhone devient ta caméra Mac ou Windows.</h1>
          <p>Garde Safari ouvert et l’iPhone branché pendant le direct.</p>
        </header>

        <section className={styles.cameraCard}>
          <div className={styles.preview}>
            <video
              ref={videoRef}
              playsInline
              muted
              className={facingMode === "user" ? styles.mirrored : undefined}
            />
            {!connected && !busy && (
              <div className={styles.placeholder}>
                <span />
                <strong>Caméra privée</strong>
                <p>Elle ne démarre qu’après ton autorisation.</p>
              </div>
            )}
            {busy && (
              <div className={styles.placeholder}>
                <b />
                <strong>{status === "permission" ? "Autorisation…" : "Connexion…"}</strong>
              </div>
            )}
            {connected && <div className={styles.liveBadge}>VERS MINI OBS</div>}
          </div>

          <p className={styles.message}>{message}</p>

          <div className={styles.actions}>
            {!connected ? (
              <button type="button" className={styles.connectButton} onClick={() => void connect()} disabled={busy}>
                {busy ? "Connexion…" : "Connecter la caméra"}
              </button>
            ) : (
              <button
                type="button"
                className={styles.disconnectButton}
                onClick={() => {
                  stopCamera(streamRef, publisherRef, wakeLockRef, videoRef);
                  setStatus("idle");
                  setMessage("Caméra déconnectée.");
                }}
              >
                Déconnecter
              </button>
            )}
            <button type="button" className={styles.switchButton} onClick={() => void switchCamera()}>
              ↻ {facingMode === "environment" ? "Caméra avant" : "Caméra arrière"}
            </button>
          </div>
        </section>

        <section className={styles.steps}>
          <div><span>1</span><p>Scanne le QR depuis Adoptan Mini OBS — aucune clé à saisir.</p></div>
          <div><span>2</span><p>Autorise la caméra dans Safari. Le micro est facultatif.</p></div>
          <div><span>3</span><p>Quand « Connectée » apparaît, retourne sur le Mac ou le PC.</p></div>
        </section>
      </main>
    </>
  );
}

function configureSender(pc: RTCPeerConnection | null | undefined) {
  const sender = pc?.getSenders().find((item) => item.track?.kind === "video");
  if (!sender) return;
  const parameters = sender.getParameters();
  if (!parameters.encodings?.length) parameters.encodings = [{}];
  parameters.encodings[0].maxBitrate = 3_500_000;
  parameters.encodings[0].maxFramerate = 30;
  parameters.encodings[0].networkPriority = "high";
  void sender.setParameters(parameters).catch(() => undefined);
}

function stopCamera(
  streamRef: React.MutableRefObject<MediaStream | null>,
  publisherRef: React.MutableRefObject<PublisherInstance | null>,
  wakeLockRef: React.MutableRefObject<WakeLockSentinel | null>,
  videoRef: React.RefObject<HTMLVideoElement>
) {
  publisherRef.current?.close();
  publisherRef.current = null;
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
  if (videoRef.current) videoRef.current.srcObject = null;
  if (wakeLockRef.current) void wakeLockRef.current.release().catch(() => undefined);
  wakeLockRef.current = null;
}

async function requestWakeLock() {
  try {
    return await navigator.wakeLock?.request("screen") || null;
  } catch {
    return null;
  }
}

function friendlyError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return "Caméra ou micro refusé. Autorise-les dans les réglages Safari.";
  if (name === "NotFoundError") return "Aucune caméra n’est disponible sur cet iPhone.";
  return error instanceof Error ? error.message : "Impossible de connecter la caméra.";
}
