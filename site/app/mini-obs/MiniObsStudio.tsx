"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./mini-obs.module.css";

const API_ROOT = "https://api.adoptan.ai/mini-obs";
const STUDIO_MEDIA_ROOT = "https://api.adoptan.ai/screen-media/studio/lucia";
const SCREEN_MEDIA_ROOT = "https://api.adoptan.ai/screen-media/screen/lucia";
const TOKEN_STORAGE_KEY = "adoptan-mini-obs-key-v1";
const SETTINGS_STORAGE_KEY = "adoptan-mini-obs-settings-v1";

type StudioStatus = "idle" | "permission" | "connecting" | "ready" | "live" | "error";
type SceneMode = "camera" | "screen-camera" | "camera-screen" | "split";
type PipPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type Platform = "twitch" | "youtube" | "kick" | "custom";

type StudioSettings = {
  scene: SceneMode;
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number;
  facingMode: "user" | "environment";
  mirrorFrontCamera: boolean;
  cameraFit: "cover" | "contain";
  screenFit: "cover" | "contain";
  pipPosition: PipPosition;
  pipSize: number;
  pipRadius: number;
  showBrand: boolean;
  showLowerThird: boolean;
  title: string;
  subtitle: string;
  microphoneGain: number;
  screenAudio: boolean;
  screenGain: number;
};

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

type ReaderOptions = {
  url: string;
  onError: (error: string) => void;
  onTrack: (event: RTCTrackEvent) => void;
  onDataChannel: (event: RTCDataChannelEvent) => void;
};

type ReaderInstance = { close: () => void };

type LiveStatus = {
  configured: boolean;
  platform: Platform;
  destinationHost: string;
  running: boolean;
  startedAt: string;
  lastError: string;
};

type ActiveStudio = {
  outputStream: MediaStream;
  audioContext: AudioContext | null;
  stopRenderer: () => void;
  wakeLock: WakeLockSentinel | null;
};

declare global {
  interface Window {
    MediaMTXWebRTCPublisher?: new (options: PublisherOptions) => PublisherInstance;
    MediaMTXWebRTCReader?: new (options: ReaderOptions) => ReaderInstance;
  }
}

const DEFAULT_SETTINGS: StudioSettings = {
  scene: "screen-camera",
  width: 1280,
  height: 720,
  frameRate: 30,
  videoBitrate: 5000,
  facingMode: "user",
  mirrorFrontCamera: true,
  cameraFit: "cover",
  screenFit: "contain",
  pipPosition: "bottom-right",
  pipSize: 28,
  pipRadius: 26,
  showBrand: true,
  showLowerThird: true,
  title: "Lucia Muccia",
  subtitle: "live depuis adoptan.ai",
  microphoneGain: 100,
  screenAudio: false,
  screenGain: 70
};

const PLATFORM_DEFAULTS: Record<Platform, string> = {
  twitch: "rtmp://live.twitch.tv/app",
  youtube: "rtmp://a.rtmp.youtube.com/live2",
  kick: "rtmps://fa723fc1b171.global-contribute.live-video.net/app",
  custom: ""
};

const SCENES: Array<{ id: SceneMode; label: string; description: string }> = [
  { id: "screen-camera", label: "Écran + caméra", description: "Mac principal, caméra en bulle" },
  { id: "camera-screen", label: "Caméra + écran", description: "Caméra principale, Mac en bulle" },
  { id: "camera", label: "Caméra seule", description: "Plan iPhone plein écran" },
  { id: "split", label: "Duo", description: "Caméra et Mac côte à côte" }
];

export default function MiniObsStudio() {
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<StudioStatus>("idle");
  const [message, setMessage] = useState(
    "Active la régie, vérifie l’image, puis démarre le live quand tout est prêt."
  );
  const [publisherReady, setPublisherReady] = useState(false);
  const [readerReady, setReaderReady] = useState(false);
  const [screenOnline, setScreenOnline] = useState(false);
  const [cameraOnline, setCameraOnline] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>({
    configured: false,
    platform: "twitch",
    destinationHost: "",
    running: false,
    startedAt: "",
    lastError: ""
  });
  const [platform, setPlatform] = useState<Platform>("twitch");
  const [serverUrl, setServerUrl] = useState(PLATFORM_DEFAULTS.twitch);
  const [streamKey, setStreamKey] = useState("");
  const [showDestination, setShowDestination] = useState(false);
  const [stats, setStats] = useState({ bitrate: 0, fps: 0, rtt: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const publisherRef = useRef<PublisherInstance | null>(null);
  const readerRef = useRef<ReaderInstance | null>(null);
  const activeRef = useRef<ActiveStudio | null>(null);
  const statsTimerRef = useRef<number | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const previousBytesRef = useRef({ bytes: 0, timestamp: 0 });

  const stageActive = status === "connecting" || status === "ready" || status === "live";
  const busy = status === "permission" || status === "connecting";

  useEffect(() => {
    settingsRef.current = settings;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        setSettings((current) => ({ ...current, ...JSON.parse(saved) }));
      } catch {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
    }

    const query = new URLSearchParams(window.location.search);
    const queryToken = query.get("key")?.trim() || "";
    const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    if (queryToken) {
      setToken(queryToken);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, queryToken);
      query.delete("key");
      const cleaned = `${window.location.pathname}${query.size ? `?${query.toString()}` : ""}`;
      window.history.replaceState({}, "", cleaned);
    } else if (savedToken) {
      setToken(savedToken);
    }

    return () => {
      stopTimers(statsTimerRef, statusTimerRef);
      closeStudio(publisherRef, activeRef, cameraStreamRef, cameraVideoRef, canvasRef);
      readerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    void refreshLiveStatus(token, setLiveStatus);
    statusTimerRef.current = window.setInterval(
      () => void refreshLiveStatus(token, setLiveStatus),
      3000
    );
    return () => {
      if (statusTimerRef.current !== null) window.clearInterval(statusTimerRef.current);
    };
  }, [token]);

  useEffect(() => {
    if (!readerReady || !window.MediaMTXWebRTCReader) return;
    readerRef.current?.close();
    const Reader = window.MediaMTXWebRTCReader;
    readerRef.current = new Reader({
      url: `${SCREEN_MEDIA_ROOT}/whep`,
      onError: () => setScreenOnline(false),
      onTrack: (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        screenStreamRef.current = stream;
        if (event.track.kind === "video" && screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          screenVideoRef.current.muted = true;
          void screenVideoRef.current.play().catch(() => undefined);
          setScreenOnline(true);
        }
      },
      onDataChannel: () => undefined
    });
    return () => {
      readerRef.current?.close();
      readerRef.current = null;
    };
  }, [readerReady]);

  useEffect(() => {
    if (liveStatus.running) {
      setStatus("live");
      setMessage("Tu es en direct. La sortie serveur est active.");
    } else if (status === "live") {
      setStatus(publisherRef.current ? "ready" : "idle");
      setMessage("La sortie publique est arrêtée. La régie peut rester prête.");
    }
  }, [liveStatus.running]);

  const qualityLabel = useMemo(
    () => `${settings.width}×${settings.height} · ${settings.frameRate} fps`,
    [settings.width, settings.height, settings.frameRate]
  );

  const updateSetting = <K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K]
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const startStudio = async () => {
    if (!token.trim()) {
      setStatus("error");
      setMessage("La clé privée manque. Ouvre le lien privé Mini OBS fourni.");
      return;
    }
    if (!publisherReady || !window.MediaMTXWebRTCPublisher) {
      setStatus("error");
      setMessage("Le module WebRTC charge encore. Réessaie dans quelques secondes.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Ouvre cette page dans Safari ou Chrome avec HTTPS.");
      return;
    }

    stopTimers(statsTimerRef);
    closeStudio(publisherRef, activeRef, cameraStreamRef, cameraVideoRef, canvasRef);
    setStatus("permission");
    setMessage("Autorise maintenant la caméra et le microphone de l’iPhone.");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: settings.facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: settings.frameRate, max: settings.frameRate }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2
        }
      });
      cameraStreamRef.current = stream;
      setCameraOnline(true);

      const cameraVideo = cameraVideoRef.current;
      const canvas = canvasRef.current;
      if (!cameraVideo || !canvas) throw new Error("La prévisualisation n’est pas disponible.");
      cameraVideo.srcObject = stream;
      cameraVideo.muted = true;
      await cameraVideo.play();

      canvas.width = settings.width;
      canvas.height = settings.height;
      const renderer = startSceneRenderer({
        canvas,
        cameraVideo,
        screenVideo: screenVideoRef.current,
        settingsRef
      });
      const canvasStream = canvas.captureStream(settings.frameRate);
      const outputVideoTrack = canvasStream.getVideoTracks()[0];
      if (!outputVideoTrack) throw new Error("Safari n’a pas créé la sortie vidéo.");
      try {
        outputVideoTrack.contentHint = "motion";
      } catch {
        // Safari can expose contentHint as read-only.
      }

      const audioMixer = await createAudioMixer({
        microphoneTracks: stream.getAudioTracks(),
        screenTracks: settings.screenAudio
          ? screenStreamRef.current?.getAudioTracks() || []
          : [],
        microphoneGain: settings.microphoneGain,
        screenGain: settings.screenGain
      });
      const tracks: MediaStreamTrack[] = [outputVideoTrack];
      if (audioMixer.track) tracks.push(audioMixer.track);
      const outputStream = new MediaStream(tracks);
      const wakeLock = await requestWakeLock();

      activeRef.current = {
        outputStream,
        audioContext: audioMixer.context,
        stopRenderer: () => {
          renderer.stop();
          canvasStream.getTracks().forEach((track) => track.stop());
        },
        wakeLock
      };

      setStatus("connecting");
      setMessage("Connexion sécurisée de l’iPhone au relais adoptan.ai…");
      const Publisher = window.MediaMTXWebRTCPublisher;
      const publisher = new Publisher({
        url: `${STUDIO_MEDIA_ROOT}/whip`,
        token: token.trim(),
        stream: outputStream,
        videoCodec: "h264/90000",
        videoBitrate: settings.videoBitrate,
        audioCodec: "opus/48000",
        audioBitrate: 160,
        audioVoice: true,
        onError: () => {
          setStatus("error");
          setMessage("Connexion WebRTC interrompue. Arrête puis relance la régie.");
        },
        onConnected: () => {
          setStatus("ready");
          setMessage("Régie prête. Vérifie l’aperçu puis appuie sur Démarrer le live.");
          applySenderSettings(publisher.pc, settingsRef.current);
        }
      });
      publisherRef.current = publisher;
      startStats(publisherRef, statsTimerRef, previousBytesRef, setStats);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
    } catch (error) {
      closeStudio(publisherRef, activeRef, cameraStreamRef, cameraVideoRef, canvasRef);
      setCameraOnline(false);
      setStatus("error");
      setMessage(friendlyCameraError(error));
    }
  };

  const stopStudio = async () => {
    if (liveStatus.running) {
      setMessage("Arrête d’abord le live public avant de couper la régie.");
      return;
    }
    stopTimers(statsTimerRef);
    closeStudio(publisherRef, activeRef, cameraStreamRef, cameraVideoRef, canvasRef);
    setCameraOnline(false);
    setStatus("idle");
    setStats({ bitrate: 0, fps: 0, rtt: 0 });
    setMessage("Régie arrêtée. Rien n’est diffusé.");
  };

  const switchCamera = async () => {
    const facingMode = settings.facingMode === "user" ? "environment" : "user";
    if (!stageActive) {
      updateSetting("facingMode", facingMode);
      return;
    }

    try {
      setMessage("Changement de caméra…");
      const nextVideo = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: settings.frameRate, max: settings.frameRate }
        },
        audio: false
      });
      const current = cameraStreamRef.current;
      const audioTracks = current?.getAudioTracks() || [];
      current?.getVideoTracks().forEach((track) => track.stop());
      const combined = new MediaStream([...nextVideo.getVideoTracks(), ...audioTracks]);
      cameraStreamRef.current = combined;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = combined;
        await cameraVideoRef.current.play();
      }
      updateSetting("facingMode", facingMode);
      setMessage(
        liveStatus.running
          ? "Caméra changée pendant le direct."
          : "Caméra changée. La régie reste prête."
      );
    } catch (error) {
      setMessage(friendlyCameraError(error));
    }
  };

  const saveDestination = async () => {
    if (!streamKey.trim()) {
      setMessage("Colle la clé de stream avant d’enregistrer la destination.");
      return;
    }
    try {
      const next = await apiRequest<LiveStatus>(token, "/config", {
        platform,
        serverUrl,
        streamKey
      });
      setLiveStatus(next);
      setStreamKey("");
      setShowDestination(false);
      setMessage("Destination enregistrée en sécurité sur le serveur.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Destination invalide.");
    }
  };

  const startLive = async () => {
    if (status !== "ready") {
      setMessage("Active d’abord la régie et attends le statut « Prête ».");
      return;
    }
    if (!liveStatus.configured) {
      setShowDestination(true);
      setMessage("Configure d’abord la destination du live.");
      return;
    }
    try {
      const next = await apiRequest<LiveStatus>(token, "/live/start", {});
      setLiveStatus(next);
      setStatus("live");
      setMessage("LIVE démarré. Le serveur envoie maintenant le programme final.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le live n’a pas démarré.");
    }
  };

  const stopLive = async () => {
    try {
      await apiRequest<LiveStatus>(token, "/live/stop", {});
      window.setTimeout(() => void refreshLiveStatus(token, setLiveStatus), 900);
      setStatus("ready");
      setMessage("Arrêt du live demandé. La régie reste prête.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’arrêter le live.");
    }
  };

  return (
    <>
      <Script
        src={`${STUDIO_MEDIA_ROOT}/publisher.js`}
        strategy="afterInteractive"
        onLoad={() => setPublisherReady(true)}
      />
      <Script
        src={`${SCREEN_MEDIA_ROOT}/reader.js`}
        strategy="afterInteractive"
        onLoad={() => setReaderReady(true)}
      />

      <main className={styles.page}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.brand}>
            <span>a</span>
            adoptan.ai
          </Link>
          <div className={styles.navBadges}>
            <StatusPill label="iPhone" active={cameraOnline} />
            <StatusPill label="Mac" active={screenOnline} />
            <StatusPill label="Relais" active={publisherReady} />
          </div>
        </nav>

        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Mini OBS · régie privée</span>
            <h1>Ta caméra. Ton écran. Ton live.</h1>
          </div>
          <p>
            L’iPhone devient la caméra et l’encodeur. Le Mac arrive sans fil. Le serveur envoie
            directement le programme final, sans Moblin.
          </p>
        </header>

        <section className={styles.workspace}>
          <div className={styles.programColumn}>
            <section className={styles.programCard}>
              <div className={styles.programTop}>
                <div>
                  <span className={`${styles.statusDot} ${styles[status]}`} />
                  <strong>
                    {status === "live"
                      ? "EN DIRECT"
                      : status === "ready"
                        ? "RÉGIE PRÊTE"
                        : status === "connecting"
                          ? "CONNEXION"
                          : "HORS ANTENNE"}
                  </strong>
                </div>
                <span>{qualityLabel}</span>
              </div>

              <div className={styles.preview}>
                <canvas ref={canvasRef} />
                {!stageActive && !busy && (
                  <div className={styles.previewEmpty}>
                    <span className={styles.lens} />
                    <strong>Aperçu programme</strong>
                    <p>La caméra reste privée jusqu’à l’activation de la régie.</p>
                  </div>
                )}
                {busy && (
                  <div className={styles.previewEmpty}>
                    <span className={styles.spinner} />
                    <strong>{status === "permission" ? "Autorisation iPhone" : "Connexion"}</strong>
                  </div>
                )}
                {status === "live" && <span className={styles.liveFlag}>LIVE</span>}
              </div>

              <video ref={cameraVideoRef} className={styles.hiddenMedia} playsInline muted />
              <video ref={screenVideoRef} className={styles.hiddenMedia} playsInline muted />

              <div className={styles.telemetry}>
                <Metric label="Débit" value={stats.bitrate ? `${stats.bitrate.toFixed(1)} Mb/s` : "—"} />
                <Metric label="FPS" value={stats.fps ? String(stats.fps) : String(settings.frameRate)} />
                <Metric label="Latence" value={stats.rtt ? `${stats.rtt} ms` : "—"} />
                <Metric
                  label="Sortie"
                  value={liveStatus.running ? liveStatus.destinationHost || "Active" : "Coupée"}
                />
              </div>

              <p className={styles.message}>{message}</p>

              <div className={styles.mainActions}>
                {!stageActive ? (
                  <button
                    type="button"
                    className={styles.prepareButton}
                    onClick={() => void startStudio()}
                    disabled={busy}
                  >
                    <span />
                    {busy ? "Préparation…" : "Activer la régie"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.neutralButton}
                    onClick={() => void stopStudio()}
                    disabled={liveStatus.running}
                  >
                    Couper la régie
                  </button>
                )}

                {liveStatus.running ? (
                  <button type="button" className={styles.stopLiveButton} onClick={() => void stopLive()}>
                    <span />
                    Arrêter le live
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.goLiveButton}
                    onClick={() => void startLive()}
                    disabled={status !== "ready"}
                  >
                    Démarrer le live
                  </button>
                )}
              </div>
            </section>

            <section className={styles.sceneCard}>
              <div className={styles.sectionHeading}>
                <span>01</span>
                <div>
                  <h2>Scènes</h2>
                  <p>Change de composition en direct, sans couper le flux.</p>
                </div>
              </div>
              <div className={styles.sceneGrid}>
                {SCENES.map((scene) => (
                  <button
                    type="button"
                    key={scene.id}
                    className={settings.scene === scene.id ? styles.selectedScene : ""}
                    onClick={() => updateSetting("scene", scene.id)}
                  >
                    <SceneIcon mode={scene.id} />
                    <strong>{scene.label}</strong>
                    <small>{scene.description}</small>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.controls}>
            <section className={styles.controlCard}>
              <div className={styles.sectionHeading}>
                <span>02</span>
                <div>
                  <h2>Caméra iPhone</h2>
                  <p>Safari doit rester ouvert et l’écran déverrouillé.</p>
                </div>
              </div>

              <button type="button" className={styles.switchCamera} onClick={() => void switchCamera()}>
                <span>↻</span>
                {settings.facingMode === "user" ? "Caméra avant" : "Caméra arrière"}
              </button>

              <Toggle
                label="Miroir caméra avant"
                description="Naturel pour les mouvements face caméra."
                checked={settings.mirrorFrontCamera}
                onChange={(value) => updateSetting("mirrorFrontCamera", value)}
              />

              <Range
                label="Taille de l’incrustation"
                value={settings.pipSize}
                min={16}
                max={48}
                suffix="%"
                onChange={(value) => updateSetting("pipSize", value)}
              />

              <div className={styles.twoColumns}>
                <Field label="Position bulle">
                  <select
                    value={settings.pipPosition}
                    onChange={(event) =>
                      updateSetting("pipPosition", event.target.value as PipPosition)
                    }
                  >
                    <option value="top-left">Haut gauche</option>
                    <option value="top-right">Haut droite</option>
                    <option value="bottom-left">Bas gauche</option>
                    <option value="bottom-right">Bas droite</option>
                  </select>
                </Field>
                <Field label="Coins">
                  <input
                    type="number"
                    value={settings.pipRadius}
                    min={0}
                    max={80}
                    onChange={(event) =>
                      updateSetting("pipRadius", clamp(Number(event.target.value), 0, 80))
                    }
                  />
                </Field>
              </div>
            </section>

            <section className={styles.controlCard}>
              <div className={styles.sectionHeading}>
                <span>03</span>
                <div>
                  <h2>Habillage</h2>
                  <p>Les changements apparaissent immédiatement.</p>
                </div>
              </div>
              <Toggle
                label="Signature adoptan.ai"
                description="Petit cartouche discret en haut."
                checked={settings.showBrand}
                onChange={(value) => updateSetting("showBrand", value)}
              />
              <Toggle
                label="Nom à l’écran"
                description="Affiche le lower third de Lucia."
                checked={settings.showLowerThird}
                onChange={(value) => updateSetting("showLowerThird", value)}
              />
              {settings.showLowerThird && (
                <div className={styles.textFields}>
                  <Field label="Nom">
                    <input
                      value={settings.title}
                      maxLength={40}
                      onChange={(event) => updateSetting("title", event.target.value)}
                    />
                  </Field>
                  <Field label="Sous-titre">
                    <input
                      value={settings.subtitle}
                      maxLength={60}
                      onChange={(event) => updateSetting("subtitle", event.target.value)}
                    />
                  </Field>
                </div>
              )}
            </section>

            <section className={styles.controlCard}>
              <div className={styles.sectionHeading}>
                <span>04</span>
                <div>
                  <h2>Qualité & son</h2>
                  <p>720p30 est le mode mobile le plus stable.</p>
                </div>
              </div>
              <div className={styles.twoColumns}>
                <Field label="Résolution">
                  <select
                    value={`${settings.width}x${settings.height}`}
                    disabled={stageActive}
                    onChange={(event) => {
                      const [width, height] = event.target.value.split("x").map(Number);
                      setSettings((current) => ({ ...current, width, height }));
                    }}
                  >
                    <option value="1280x720">720p</option>
                    <option value="1920x1080">1080p</option>
                    <option value="1080x1920">Vertical</option>
                  </select>
                </Field>
                <Field label="Images/seconde">
                  <select
                    value={settings.frameRate}
                    disabled={stageActive}
                    onChange={(event) => updateSetting("frameRate", Number(event.target.value))}
                  >
                    <option value={24}>24 fps</option>
                    <option value={30}>30 fps</option>
                    <option value={60}>60 fps</option>
                  </select>
                </Field>
              </div>
              <Range
                label="Débit vidéo"
                value={settings.videoBitrate}
                min={1800}
                max={10000}
                step={100}
                suffix=" kb/s"
                disabled={stageActive}
                onChange={(value) => updateSetting("videoBitrate", value)}
              />
              <Range
                label="Gain microphone"
                value={settings.microphoneGain}
                min={0}
                max={160}
                suffix="%"
                disabled={stageActive}
                onChange={(value) => updateSetting("microphoneGain", value)}
              />
              <Toggle
                label="Audio du Mac"
                description="Mixe l’audio reçu avec le microphone au prochain démarrage."
                checked={settings.screenAudio}
                disabled={stageActive}
                onChange={(value) => updateSetting("screenAudio", value)}
              />
            </section>

            <section className={styles.destinationCard}>
              <button
                type="button"
                className={styles.destinationSummary}
                onClick={() => setShowDestination((value) => !value)}
              >
                <span>
                  <small>Destination</small>
                  <strong>
                    {liveStatus.configured
                      ? `${liveStatus.platform} · ${liveStatus.destinationHost}`
                      : "À configurer"}
                  </strong>
                </span>
                <b>{showDestination ? "−" : "+"}</b>
              </button>
              {showDestination && (
                <div className={styles.destinationForm}>
                  <Field label="Plateforme">
                    <select
                      value={platform}
                      onChange={(event) => {
                        const value = event.target.value as Platform;
                        setPlatform(value);
                        if (value !== "custom") setServerUrl(PLATFORM_DEFAULTS[value]);
                      }}
                    >
                      <option value="twitch">Twitch</option>
                      <option value="youtube">YouTube</option>
                      <option value="kick">Kick</option>
                      <option value="custom">RTMP personnalisé</option>
                    </select>
                  </Field>
                  <Field label="Serveur RTMP">
                    <input
                      value={serverUrl}
                      inputMode="url"
                      onChange={(event) => setServerUrl(event.target.value)}
                    />
                  </Field>
                  <Field label="Clé de stream">
                    <input
                      type="password"
                      value={streamKey}
                      autoComplete="off"
                      placeholder="Elle sera stockée uniquement sur le serveur"
                      onChange={(event) => setStreamKey(event.target.value)}
                    />
                  </Field>
                  <button type="button" className={styles.saveDestination} onClick={() => void saveDestination()}>
                    Enregistrer en sécurité
                  </button>
                </div>
              )}
            </section>

            <label className={styles.privateKey}>
              <span>Clé privée Mini OBS</span>
              <input
                type="password"
                value={token}
                autoComplete="off"
                disabled={stageActive}
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
          </aside>
        </section>
      </main>
    </>
  );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={active ? styles.activePill : ""}>
      <i />
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i />
    </label>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.range}>
      <span>
        <strong>{label}</strong>
        <b>
          {value}
          {suffix}
        </b>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function SceneIcon({ mode }: { mode: SceneMode }) {
  return (
    <span className={`${styles.sceneIcon} ${styles[mode]}`}>
      <i />
      {mode !== "camera" && <b />}
    </span>
  );
}

function startSceneRenderer({
  canvas,
  cameraVideo,
  screenVideo,
  settingsRef
}: {
  canvas: HTMLCanvasElement;
  cameraVideo: HTMLVideoElement;
  screenVideo: HTMLVideoElement | null;
  settingsRef: React.MutableRefObject<StudioSettings>;
}) {
  const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
  if (!context) throw new Error("Le compositeur vidéo n’est pas disponible.");
  let stopped = false;
  let frame = 0;
  let lastDraw = 0;

  const draw = (timestamp: number) => {
    if (stopped) return;
    const settings = settingsRef.current;
    const interval = 1000 / settings.frameRate;
    if (timestamp - lastDraw >= interval - 1) {
      drawScene(context, canvas, cameraVideo, screenVideo, settings);
      lastDraw = timestamp;
    }
    frame = window.requestAnimationFrame(draw);
  };
  frame = window.requestAnimationFrame(draw);
  return {
    stop: () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
    }
  };
}

function drawScene(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  camera: HTMLVideoElement,
  screen: HTMLVideoElement | null,
  settings: StudioSettings
) {
  const width = canvas.width;
  const height = canvas.height;
  context.fillStyle = "#08070b";
  context.fillRect(0, 0, width, height);

  if (settings.scene === "camera") {
    drawVideo(context, camera, { x: 0, y: 0, width, height }, settings.cameraFit, {
      mirror: settings.facingMode === "user" && settings.mirrorFrontCamera
    });
  } else if (settings.scene === "screen-camera") {
    drawScreenOrPlaceholder(context, screen, { x: 0, y: 0, width, height }, settings.screenFit);
    drawPip(context, camera, canvas, settings, true);
  } else if (settings.scene === "camera-screen") {
    drawVideo(context, camera, { x: 0, y: 0, width, height }, settings.cameraFit, {
      mirror: settings.facingMode === "user" && settings.mirrorFrontCamera
    });
    drawPip(context, screen, canvas, settings, false);
  } else {
    const gap = Math.round(width * 0.012);
    const leftWidth = Math.round((width - gap) * 0.43);
    drawVideo(
      context,
      camera,
      { x: 0, y: 0, width: leftWidth, height },
      "cover",
      { mirror: settings.facingMode === "user" && settings.mirrorFrontCamera }
    );
    drawScreenOrPlaceholder(
      context,
      screen,
      { x: leftWidth + gap, y: 0, width: width - leftWidth - gap, height },
      settings.screenFit
    );
  }

  if (settings.showBrand) drawBrand(context, canvas);
  if (settings.showLowerThird) drawLowerThird(context, canvas, settings);
}

function drawPip(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement,
  settings: StudioSettings,
  isCamera: boolean
) {
  const margin = Math.round(canvas.width * 0.025);
  const pipWidth = Math.round((canvas.width * settings.pipSize) / 100);
  const pipHeight = Math.round(pipWidth * 0.5625);
  const x = settings.pipPosition.endsWith("right")
    ? canvas.width - pipWidth - margin
    : margin;
  const y = settings.pipPosition.startsWith("bottom")
    ? canvas.height - pipHeight - margin
    : margin;
  context.save();
  context.shadowColor = "rgba(0,0,0,.48)";
  context.shadowBlur = Math.round(canvas.width * 0.018);
  context.shadowOffsetY = Math.round(canvas.width * 0.006);
  roundedRect(context, x, y, pipWidth, pipHeight, settings.pipRadius);
  context.clip();
  context.fillStyle = "#09080d";
  context.fillRect(x, y, pipWidth, pipHeight);
  if (video && video.readyState >= 2) {
    drawVideo(
      context,
      video,
      { x, y, width: pipWidth, height: pipHeight },
      isCamera ? settings.cameraFit : settings.screenFit,
      {
        mirror:
          isCamera && settings.facingMode === "user" && settings.mirrorFrontCamera
      }
    );
  } else {
    drawPlaceholder(context, { x, y, width: pipWidth, height: pipHeight }, "ÉCRAN MAC");
  }
  context.restore();

  context.save();
  roundedRect(context, x, y, pipWidth, pipHeight, settings.pipRadius);
  context.strokeStyle = "rgba(255,255,255,.75)";
  context.lineWidth = Math.max(2, canvas.width * 0.002);
  context.stroke();
  context.restore();
}

function drawScreenOrPlaceholder(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  rect: Rect,
  fit: "cover" | "contain"
) {
  if (video && video.readyState >= 2 && video.videoWidth) {
    drawVideo(context, video, rect, fit);
  } else {
    drawPlaceholder(context, rect, "ÉCRAN MAC EN ATTENTE");
  }
}

type Rect = { x: number; y: number; width: number; height: number };

function drawVideo(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  rect: Rect,
  fit: "cover" | "contain",
  options: { mirror?: boolean } = {}
) {
  if (!video.videoWidth || !video.videoHeight) return;
  const sourceRatio = video.videoWidth / video.videoHeight;
  const targetRatio = rect.width / rect.height;
  let drawWidth = rect.width;
  let drawHeight = rect.height;
  if ((fit === "cover" && sourceRatio > targetRatio) || (fit === "contain" && sourceRatio < targetRatio)) {
    drawHeight = rect.height;
    drawWidth = drawHeight * sourceRatio;
  } else {
    drawWidth = rect.width;
    drawHeight = drawWidth / sourceRatio;
  }
  const x = rect.x + (rect.width - drawWidth) / 2;
  const y = rect.y + (rect.height - drawHeight) / 2;
  context.save();
  context.beginPath();
  context.rect(rect.x, rect.y, rect.width, rect.height);
  context.clip();
  if (options.mirror) {
    context.translate(x + drawWidth, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, y, drawWidth, drawHeight);
  } else {
    context.drawImage(video, x, y, drawWidth, drawHeight);
  }
  context.restore();
}

function drawPlaceholder(context: CanvasRenderingContext2D, rect: Rect, label: string) {
  const gradient = context.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  gradient.addColorStop(0, "#181123");
  gradient.addColorStop(1, "#08070b");
  context.fillStyle = gradient;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.fillStyle = "rgba(255,255,255,.38)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `800 ${Math.max(12, rect.width * 0.025)}px system-ui`;
  context.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function drawBrand(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const pad = canvas.width * 0.018;
  const height = canvas.height * 0.052;
  const width = canvas.width * 0.14;
  context.save();
  context.fillStyle = "rgba(7,5,10,.72)";
  roundedRect(context, pad, pad, width, height, height / 2);
  context.fill();
  context.fillStyle = "#ff62ad";
  context.beginPath();
  context.arc(pad + height * 0.5, pad + height * 0.5, height * 0.22, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fff";
  context.font = `800 ${height * 0.33}px system-ui`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText("adoptan.ai", pad + height * 0.86, pad + height * 0.52);
  context.restore();
}

function drawLowerThird(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  settings: StudioSettings
) {
  const x = canvas.width * 0.035;
  const height = canvas.height * 0.13;
  const y = canvas.height - height - canvas.height * 0.045;
  const width = Math.min(canvas.width * 0.42, Math.max(canvas.width * 0.24, settings.title.length * 19));
  const gradient = context.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, "rgba(18,10,24,.92)");
  gradient.addColorStop(1, "rgba(18,10,24,.72)");
  context.save();
  context.fillStyle = gradient;
  roundedRect(context, x, y, width, height, height * 0.2);
  context.fill();
  context.fillStyle = "#ff5ca8";
  context.fillRect(x, y, Math.max(5, canvas.width * 0.004), height);
  context.fillStyle = "#fff";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = `900 ${height * 0.34}px system-ui`;
  context.fillText(settings.title || "Lucia", x + height * 0.28, y + height * 0.48);
  context.fillStyle = "rgba(255,255,255,.68)";
  context.font = `650 ${height * 0.18}px system-ui`;
  context.fillText(settings.subtitle || "live", x + height * 0.29, y + height * 0.76);
  context.restore();
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const value = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, value);
}

async function createAudioMixer({
  microphoneTracks,
  screenTracks,
  microphoneGain,
  screenGain
}: {
  microphoneTracks: MediaStreamTrack[];
  screenTracks: MediaStreamTrack[];
  microphoneGain: number;
  screenGain: number;
}) {
  const sources = [
    ...microphoneTracks.map((track) => ({ track, gain: microphoneGain / 100 })),
    ...screenTracks.map((track) => ({ track, gain: screenGain / 100 }))
  ];
  if (!sources.length) return { track: null, context: null };
  const context = new AudioContext();
  await context.resume();
  const destination = context.createMediaStreamDestination();
  for (const source of sources) {
    const input = context.createMediaStreamSource(new MediaStream([source.track]));
    const gain = context.createGain();
    gain.gain.value = source.gain;
    input.connect(gain).connect(destination);
  }
  return {
    track: destination.stream.getAudioTracks()[0] || null,
    context
  };
}

function applySenderSettings(pc: RTCPeerConnection | null, settings: StudioSettings) {
  if (!pc) return;
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "video") continue;
    const parameters = sender.getParameters();
    if (!parameters.encodings?.length) parameters.encodings = [{}];
    parameters.encodings[0].maxBitrate = settings.videoBitrate * 1000;
    parameters.encodings[0].maxFramerate = settings.frameRate;
    parameters.encodings[0].scaleResolutionDownBy = 1;
    void sender.setParameters(parameters).catch(() => undefined);
  }
}

function startStats(
  publisherRef: React.MutableRefObject<PublisherInstance | null>,
  timerRef: React.MutableRefObject<number | null>,
  previousRef: React.MutableRefObject<{ bytes: number; timestamp: number }>,
  setStats: React.Dispatch<React.SetStateAction<{ bitrate: number; fps: number; rtt: number }>>
) {
  timerRef.current = window.setInterval(async () => {
    const pc = publisherRef.current?.pc;
    if (!pc) return;
    try {
      const reports = await pc.getStats();
      let bitrate = 0;
      let fps = 0;
      let rtt = 0;
      reports.forEach((report) => {
        if (report.type === "outbound-rtp" && report.kind === "video") {
          const elapsed = Number(report.timestamp) - previousRef.current.timestamp;
          const bytes = Number(report.bytesSent || 0);
          if (elapsed > 0 && previousRef.current.timestamp) {
            bitrate = ((bytes - previousRef.current.bytes) * 8) / elapsed / 1000;
          }
          previousRef.current = { bytes, timestamp: Number(report.timestamp) };
          fps = Math.round(Number(report.framesPerSecond || 0));
        }
        if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
          rtt = Math.round(Number(report.currentRoundTripTime || 0) * 1000);
        }
      });
      setStats((current) => ({
        bitrate: bitrate || current.bitrate,
        fps: fps || current.fps,
        rtt: rtt || current.rtt
      }));
    } catch {
      // The next interval retries.
    }
  }, 1500);
}

function closeStudio(
  publisherRef: React.MutableRefObject<PublisherInstance | null>,
  activeRef: React.MutableRefObject<ActiveStudio | null>,
  cameraStreamRef: React.MutableRefObject<MediaStream | null>,
  cameraVideoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>
) {
  publisherRef.current?.close();
  publisherRef.current = null;
  const active = activeRef.current;
  if (active) {
    active.stopRenderer();
    active.outputStream.getTracks().forEach((track) => track.stop());
    if (active.audioContext) void active.audioContext.close();
    if (active.wakeLock) void active.wakeLock.release().catch(() => undefined);
  }
  activeRef.current = null;
  cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  cameraStreamRef.current = null;
  if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
  const canvas = canvasRef.current;
  if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
}

function stopTimers(
  ...refs: Array<React.MutableRefObject<number | null>>
) {
  for (const ref of refs) {
    if (ref.current !== null) {
      window.clearInterval(ref.current);
      ref.current = null;
    }
  }
}

async function requestWakeLock() {
  try {
    return await navigator.wakeLock?.request("screen");
  } catch {
    return null;
  }
}

async function refreshLiveStatus(
  token: string,
  setStatus: (status: LiveStatus) => void
) {
  try {
    setStatus(await apiRequest<LiveStatus>(token, "/status"));
  } catch {
    // Temporary network errors are shown by action buttons when relevant.
  }
}

async function apiRequest<T>(token: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Le serveur Mini OBS a refusé la demande.");
  }
  return payload as T;
}

function friendlyCameraError(error: unknown) {
  const value = error instanceof Error ? error : new Error(String(error));
  if (value.name === "NotAllowedError") {
    return "Caméra ou microphone refusé. Dans Safari, autorise les deux puis réessaie.";
  }
  if (value.name === "NotReadableError") {
    return "La caméra est déjà utilisée par une autre application. Ferme-la puis réessaie.";
  }
  return value.message || "La régie n’a pas pu démarrer.";
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
