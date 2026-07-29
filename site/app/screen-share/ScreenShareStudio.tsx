"use client";

import Link from "next/link";
import Script from "next/script";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./screen-share.module.css";

const MEDIA_ROOT = "https://api.adoptan.ai/screen-media/screen/lucia";
const PUBLISHER_SCRIPT = `${MEDIA_ROOT}/publisher.js`;
const VIEWER_BASE = "https://adoptan.ai/screen-share/live";
const SETTINGS_STORAGE_KEY = "adoptan-screen-share-settings-v1";
const TOKEN_STORAGE_KEY = "adoptan-screen-share-key-v1";

type Status = "idle" | "permission" | "connecting" | "live" | "reconnecting" | "error";
type ScaleMode = "contain" | "cover" | "stretch";
type ContentHint = "detail" | "text" | "motion";
type ViewerTransport = "webrtc" | "hls";

type ScreenSettings = {
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number;
  videoCodec: "h264/90000" | "vp8/90000" | "vp9/90000";
  strictResolution: boolean;
  sourceFit: ScaleMode;
  canvasBackground: string;
  contentHint: ContentHint;
  cursor: "always" | "motion" | "never";
  displaySurface: "monitor" | "window" | "browser";
  preferCurrentTab: boolean;
  allowSurfaceSwitching: boolean;
  excludeCurrentTab: boolean;
  includeMonitorSurfaces: boolean;
  degradationPreference: "maintain-resolution" | "balanced" | "maintain-framerate";
  systemAudio: boolean;
  microphone: boolean;
  microphoneDeviceId: string;
  systemGain: number;
  microphoneGain: number;
  audioBitrate: number;
  optimizeVoice: boolean;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  viewerTransport: ViewerTransport;
  viewerFit: "contain" | "cover" | "fill";
  viewerBackground: string;
  viewerAudio: boolean;
  viewerMirror: boolean;
  viewerRotation: 0 | 90 | 180 | 270;
  showOfflineLabel: boolean;
  offlineLabel: string;
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

declare global {
  interface Window {
    MediaMTXWebRTCPublisher?: new (options: PublisherOptions) => PublisherInstance;
  }
}

type ActiveResources = {
  displayStream: MediaStream;
  microphoneStream: MediaStream | null;
  outputStream: MediaStream;
  audioContext: AudioContext | null;
  stopScaler: (() => void) | null;
};

type StreamStats = {
  bitrateMbps: number;
  fps: number;
  width: number;
  height: number;
  rttMs: number;
  packetsLost: number;
};

const DEFAULT_SETTINGS: ScreenSettings = {
  width: 1920,
  height: 1080,
  frameRate: 30,
  videoBitrate: 8000,
  videoCodec: "h264/90000",
  strictResolution: true,
  sourceFit: "contain",
  canvasBackground: "#05030a",
  contentHint: "detail",
  cursor: "always",
  displaySurface: "monitor",
  preferCurrentTab: false,
  allowSurfaceSwitching: true,
  excludeCurrentTab: true,
  includeMonitorSurfaces: true,
  degradationPreference: "maintain-resolution",
  systemAudio: true,
  microphone: false,
  microphoneDeviceId: "",
  systemGain: 100,
  microphoneGain: 100,
  audioBitrate: 128,
  optimizeVoice: false,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  viewerTransport: "webrtc",
  viewerFit: "contain",
  viewerBackground: "transparent",
  viewerAudio: true,
  viewerMirror: false,
  viewerRotation: 0,
  showOfflineLabel: false,
  offlineLabel: "Écran en attente…"
};

const PRESETS = [
  { label: "Full HD · 30 fps", width: 1920, height: 1080, frameRate: 30, bitrate: 8000 },
  { label: "Full HD · 60 fps", width: 1920, height: 1080, frameRate: 60, bitrate: 12000 },
  { label: "HD · 30 fps", width: 1280, height: 720, frameRate: 30, bitrate: 4500 },
  { label: "HD · 60 fps", width: 1280, height: 720, frameRate: 60, bitrate: 7000 },
  { label: "QHD · 30 fps", width: 2560, height: 1440, frameRate: 30, bitrate: 14000 },
  { label: "Vertical · 30 fps", width: 1080, height: 1920, frameRate: 30, bitrate: 8000 }
] as const;

const STATUS_COPY: Record<Status, string> = {
  idle: "Prêt",
  permission: "Choisis l’écran macOS",
  connecting: "Connexion au relais",
  live: "En direct",
  reconnecting: "Reconnexion",
  error: "À vérifier"
};

export default function ScreenShareStudio() {
  const [settings, setSettings] = useState<ScreenSettings>(DEFAULT_SETTINGS);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState(
    "Configure ton image, puis lance le partage. L’URL Moblin reste toujours la même."
  );
  const [libraryReady, setLibraryReady] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [copied, setCopied] = useState("");
  const [actual, setActual] = useState({ width: 0, height: 0, frameRate: 0, audio: false });
  const [stats, setStats] = useState<StreamStats>({
    bitrateMbps: 0,
    fps: 0,
    width: 0,
    height: 0,
    rttMs: 0,
    packetsLost: 0
  });

  const previewRef = useRef<HTMLVideoElement>(null);
  const publisherRef = useRef<PublisherInstance | null>(null);
  const resourcesRef = useRef<ActiveResources | null>(null);
  const statsTimerRef = useRef<number | null>(null);
  const previousStatsRef = useRef({ bytes: 0, timestamp: 0 });

  const isBusy = status === "permission" || status === "connecting";
  const isBroadcasting = status === "live" || status === "reconnecting";

  useEffect(() => {
    const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        setSettings((current) => ({ ...current, ...JSON.parse(savedSettings) }));
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
      const cleaned = `${window.location.pathname}${query.size ? `?${query.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", cleaned);
    } else if (savedToken) {
      setToken(savedToken);
    }

    void refreshDevices(setDevices);

    return () => {
      stopStatsTimer(statsTimerRef);
      closeActiveBroadcast(publisherRef, resourcesRef, previewRef);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const viewerUrl = useMemo(() => buildViewerUrl(settings), [settings]);

  const updateSetting = <K extends keyof ScreenSettings>(key: K, value: ScreenSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const applyPreset = (event: ChangeEvent<HTMLSelectElement>) => {
    const preset = PRESETS[Number(event.target.value)];
    if (!preset) return;
    setSettings((current) => ({
      ...current,
      width: preset.width,
      height: preset.height,
      frameRate: preset.frameRate,
      videoBitrate: preset.bitrate
    }));
  };

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setMessage("Copie impossible automatiquement : sélectionne l’URL puis copie-la.");
    }
  };

  const stopBroadcast = () => {
    stopStatsTimer(statsTimerRef);
    closeActiveBroadcast(publisherRef, resourcesRef, previewRef);
    previousStatsRef.current = { bytes: 0, timestamp: 0 };
    setActual({ width: 0, height: 0, frameRate: 0, audio: false });
    setStats({ bitrateMbps: 0, fps: 0, width: 0, height: 0, rttMs: 0, packetsLost: 0 });
    setStatus("idle");
    setMessage("Diffusion arrêtée. L’URL Moblin est prête pour le prochain partage.");
  };

  const startBroadcast = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) {
      setStatus("error");
      setMessage("Le partage d’écran exige Safari ou Chrome récent, ouvert en HTTPS.");
      return;
    }
    if (!libraryReady || !window.MediaMTXWebRTCPublisher) {
      setStatus("error");
      setMessage("Le relais vidéo charge encore. Recharge la page dans quelques secondes.");
      return;
    }
    if (!token.trim()) {
      setStatus("error");
      setMessage("Ajoute d’abord la clé privée de diffusion fournie pour ce Mac.");
      return;
    }

    closeActiveBroadcast(publisherRef, resourcesRef, previewRef);
    stopStatsTimer(statsTimerRef);
    setStatus("permission");
    setMessage("Dans la fenêtre macOS, choisis l’écran ou la fenêtre à montrer.");

    let displayStream: MediaStream | null = null;
    let microphoneStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let stopScaler: (() => void) | null = null;

    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia(
        buildDisplayMediaOptions(settings) as DisplayMediaStreamOptions
      );

      const sourceVideoTrack = displayStream.getVideoTracks()[0];
      if (!sourceVideoTrack) {
        throw new Error("Aucune piste vidéo n’a été sélectionnée.");
      }

      try {
        await sourceVideoTrack.applyConstraints({
          width: { ideal: settings.width, max: settings.width },
          height: { ideal: settings.height, max: settings.height },
          frameRate: { ideal: settings.frameRate, max: settings.frameRate }
        });
      } catch {
        // Safari can ignore post-capture constraints; strict canvas scaling remains available.
      }

      if (settings.microphone) {
        microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: settings.microphoneDeviceId
              ? { exact: settings.microphoneDeviceId }
              : undefined,
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl
          },
          video: false
        });
      }

      let outputVideoTrack = sourceVideoTrack;
      if (settings.strictResolution) {
        const scaler = await createScaledVideoTrack(sourceVideoTrack, settings);
        outputVideoTrack = scaler.track;
        stopScaler = scaler.stop;
      }
      setTrackContentHint(outputVideoTrack, settings.contentHint);

      const mixedAudio = await createMixedAudioTrack({
        screenTracks: displayStream.getAudioTracks(),
        microphoneTracks: microphoneStream?.getAudioTracks() || [],
        systemGain: settings.systemGain,
        microphoneGain: settings.microphoneGain
      });
      audioContext = mixedAudio.context;

      const outputTracks = [outputVideoTrack];
      if (mixedAudio.track) outputTracks.push(mixedAudio.track);
      const outputStream = new MediaStream(outputTracks);

      resourcesRef.current = {
        displayStream,
        microphoneStream,
        outputStream,
        audioContext,
        stopScaler
      };

      sourceVideoTrack.addEventListener("ended", stopBroadcast, { once: true });
      const trackSettings = outputVideoTrack.getSettings();
      setActual({
        width: Number(trackSettings.width || settings.width),
        height: Number(trackSettings.height || settings.height),
        frameRate: Number(trackSettings.frameRate || settings.frameRate),
        audio: Boolean(mixedAudio.track)
      });

      if (previewRef.current) {
        previewRef.current.srcObject = outputStream;
        previewRef.current.muted = true;
        await previewRef.current.play().catch(() => undefined);
      }

      setStatus("connecting");
      setMessage("Le Mac envoie maintenant l’image au relais WebRTC adoptan.ai…");
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());

      const Publisher = window.MediaMTXWebRTCPublisher;
      const publisher = new Publisher({
        url: `${MEDIA_ROOT}/whip`,
        token: token.trim(),
        stream: outputStream,
        videoCodec: settings.videoCodec,
        videoBitrate: settings.videoBitrate,
        audioCodec: "opus/48000",
        audioBitrate: settings.audioBitrate,
        audioVoice: settings.optimizeVoice,
        onError: (error) => {
          setStatus("reconnecting");
          setMessage(friendlyPublisherError(error));
        },
        onConnected: () => {
          setStatus("live");
          setMessage("Diffusion active. Moblin reçoit l’écran via l’URL source navigateur.");
          applySenderPreferences(publisher.pc, settings);
        }
      });
      publisherRef.current = publisher;
      startStatsTimer(publisherRef, statsTimerRef, previousStatsRef, setStats);
      await refreshDevices(setDevices);
    } catch (error) {
      if (displayStream) stopStream(displayStream);
      if (microphoneStream) stopStream(microphoneStream);
      if (audioContext) void audioContext.close();
      if (stopScaler) stopScaler();
      resourcesRef.current = null;
      setStatus("error");
      setMessage(friendlyCaptureError(error));
    }
  };

  return (
    <>
      <Script
        src={PUBLISHER_SCRIPT}
        strategy="afterInteractive"
        onLoad={() => setLibraryReady(true)}
        onError={() => {
          setLibraryReady(false);
          setMessage("Le module vidéo du relais est momentanément indisponible.");
        }}
      />

      <main className={styles.page}>
        <div className={styles.ambientOne} />
        <div className={styles.ambientTwo} />

        <nav className={styles.nav}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>a</span>
            <span>adoptan.ai</span>
          </Link>
          <div className={styles.navMeta}>
            <span className={styles.securePill}>Relais chiffré</span>
            <span>Mac → Moblin</span>
          </div>
        </nav>

        <header className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>Live screen studio</div>
            <h1>
              Ton écran Mac,
              <br />
              <span>directement dans le live.</span>
            </h1>
          </div>
          <p>
            Une source navigateur stable pour Moblin, avec WebRTC faible latence, résolution
            contrôlée, audio optionnel et aperçu exact avant diffusion.
          </p>
        </header>

        <section className={styles.studioGrid}>
          <aside className={styles.controls}>
            <section className={styles.controlCard}>
              <div className={styles.cardHeading}>
                <span>01</span>
                <div>
                  <h2>Qualité vidéo</h2>
                  <p>Le réglage Full HD 30 fps est le plus sûr pour commencer.</p>
                </div>
              </div>

              <Field label="Préréglage">
                <select onChange={applyPreset} defaultValue="0" disabled={isBusy || isBroadcasting}>
                  {PRESETS.map((preset, index) => (
                    <option value={index} key={preset.label}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className={styles.twoColumns}>
                <NumberField
                  label="Largeur"
                  value={settings.width}
                  min={640}
                  max={3840}
                  step={2}
                  suffix="px"
                  disabled={isBusy || isBroadcasting}
                  onChange={(value) => updateSetting("width", value)}
                />
                <NumberField
                  label="Hauteur"
                  value={settings.height}
                  min={360}
                  max={2160}
                  step={2}
                  suffix="px"
                  disabled={isBusy || isBroadcasting}
                  onChange={(value) => updateSetting("height", value)}
                />
              </div>

              <div className={styles.twoColumns}>
                <NumberField
                  label="Images/seconde"
                  value={settings.frameRate}
                  min={5}
                  max={60}
                  suffix="fps"
                  disabled={isBusy || isBroadcasting}
                  onChange={(value) => updateSetting("frameRate", value)}
                />
                <Field label="Codec">
                  <select
                    value={settings.videoCodec}
                    disabled={isBusy || isBroadcasting}
                    onChange={(event) =>
                      updateSetting("videoCodec", event.target.value as ScreenSettings["videoCodec"])
                    }
                  >
                    <option value="h264/90000">H.264 · recommandé Moblin</option>
                    <option value="vp8/90000">VP8 · compatible</option>
                    <option value="vp9/90000">VP9 · expérimental</option>
                  </select>
                </Field>
              </div>

              <RangeField
                label="Débit vidéo"
                value={settings.videoBitrate}
                min={800}
                max={20000}
                step={100}
                display={`${(settings.videoBitrate / 1000).toFixed(1)} Mb/s`}
                disabled={isBusy || isBroadcasting}
                onChange={(value) => updateSetting("videoBitrate", value)}
              />

              <Toggle
                label="Résolution de sortie stricte"
                description="Redimensionne réellement l’image au format choisi, même si macOS partage un écran Retina."
                checked={settings.strictResolution}
                disabled={isBusy || isBroadcasting}
                onChange={(checked) => updateSetting("strictResolution", checked)}
              />

              {settings.strictResolution && (
                <div className={styles.twoColumns}>
                  <Field label="Ajustement de la source">
                    <select
                      value={settings.sourceFit}
                      disabled={isBusy || isBroadcasting}
                      onChange={(event) => updateSetting("sourceFit", event.target.value as ScaleMode)}
                    >
                      <option value="contain">Entière · bandes possibles</option>
                      <option value="cover">Remplir · recadrage possible</option>
                      <option value="stretch">Étirer au format</option>
                    </select>
                  </Field>
                  <ColorField
                    label="Fond des bandes"
                    value={settings.canvasBackground}
                    disabled={isBusy || isBroadcasting}
                    onChange={(value) => updateSetting("canvasBackground", value)}
                  />
                </div>
              )}
            </section>

            <section className={styles.controlCard}>
              <div className={styles.cardHeading}>
                <span>02</span>
                <div>
                  <h2>Capture & mouvement</h2>
                  <p>Adapte l’encodage au type de contenu partagé.</p>
                </div>
              </div>

              <div className={styles.twoColumns}>
                <Field label="Optimisation">
                  <select
                    value={settings.contentHint}
                    disabled={isBusy || isBroadcasting}
                    onChange={(event) =>
                      updateSetting("contentHint", event.target.value as ContentHint)
                    }
                  >
                    <option value="detail">Détails / interface</option>
                    <option value="text">Texte très net</option>
                    <option value="motion">Vidéo / mouvement</option>
                  </select>
                </Field>
                <Field label="Priorité réseau">
                  <select
                    value={settings.degradationPreference}
                    disabled={isBusy || isBroadcasting}
                    onChange={(event) =>
                      updateSetting(
                        "degradationPreference",
                        event.target.value as ScreenSettings["degradationPreference"]
                      )
                    }
                  >
                    <option value="maintain-resolution">Garder la netteté</option>
                    <option value="balanced">Équilibré</option>
                    <option value="maintain-framerate">Garder les fps</option>
                  </select>
                </Field>
              </div>

              <div className={styles.twoColumns}>
                <Field label="Curseur">
                  <select
                    value={settings.cursor}
                    disabled={isBusy || isBroadcasting}
                    onChange={(event) =>
                      updateSetting("cursor", event.target.value as ScreenSettings["cursor"])
                    }
                  >
                    <option value="always">Toujours visible</option>
                    <option value="motion">Seulement en mouvement</option>
                    <option value="never">Masqué</option>
                  </select>
                </Field>
                <Field label="Source préférée">
                  <select
                    value={settings.displaySurface}
                    disabled={isBusy || isBroadcasting}
                    onChange={(event) =>
                      updateSetting(
                        "displaySurface",
                        event.target.value as ScreenSettings["displaySurface"]
                      )
                    }
                  >
                    <option value="monitor">Écran complet</option>
                    <option value="window">Fenêtre</option>
                    <option value="browser">Onglet navigateur</option>
                  </select>
                </Field>
              </div>

              <details className={styles.advanced}>
                <summary>Options avancées de sélection macOS</summary>
                <Toggle
                  label="Autoriser le changement de fenêtre"
                  description="Chrome peut proposer de changer de source sans couper le direct."
                  checked={settings.allowSurfaceSwitching}
                  disabled={isBusy || isBroadcasting}
                  onChange={(checked) => updateSetting("allowSurfaceSwitching", checked)}
                />
                <Toggle
                  label="Exclure cet onglet adoptan.ai"
                  description="Réduit l’effet miroir infini dans le sélecteur de partage."
                  checked={settings.excludeCurrentTab}
                  disabled={isBusy || isBroadcasting}
                  onChange={(checked) => updateSetting("excludeCurrentTab", checked)}
                />
                <Toggle
                  label="Afficher les écrans complets"
                  description="Autorise les moniteurs dans le sélecteur, en plus des fenêtres."
                  checked={settings.includeMonitorSurfaces}
                  disabled={isBusy || isBroadcasting}
                  onChange={(checked) => updateSetting("includeMonitorSurfaces", checked)}
                />
                <Toggle
                  label="Préférer l’onglet courant"
                  description="Utile pour partager rapidement une page web."
                  checked={settings.preferCurrentTab}
                  disabled={isBusy || isBroadcasting}
                  onChange={(checked) => updateSetting("preferCurrentTab", checked)}
                />
              </details>
            </section>

            <section className={styles.controlCard}>
              <div className={styles.cardHeading}>
                <span>03</span>
                <div>
                  <h2>Audio</h2>
                  <p>L’audio système dépend du choix proposé par Chrome ou Safari sur macOS.</p>
                </div>
              </div>

              <Toggle
                label="Audio de l’écran / de l’onglet"
                description="Si macOS le permet, l’audio rejoint la même source Moblin."
                checked={settings.systemAudio}
                disabled={isBusy || isBroadcasting}
                onChange={(checked) => updateSetting("systemAudio", checked)}
              />
              <Toggle
                label="Ajouter le microphone"
                description="Mixe le micro du Mac avec l’éventuel audio système."
                checked={settings.microphone}
                disabled={isBusy || isBroadcasting}
                onChange={(checked) => updateSetting("microphone", checked)}
              />

              {settings.microphone && (
                <>
                  <Field label="Microphone">
                    <select
                      value={settings.microphoneDeviceId}
                      disabled={isBusy || isBroadcasting}
                      onChange={(event) => updateSetting("microphoneDeviceId", event.target.value)}
                    >
                      <option value="">Microphone par défaut</option>
                      {devices
                        .filter((device) => device.kind === "audioinput")
                        .map((device, index) => (
                          <option value={device.deviceId} key={device.deviceId || index}>
                            {device.label || `Microphone ${index + 1}`}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <div className={styles.twoColumns}>
                    <RangeField
                      label="Volume écran"
                      value={settings.systemGain}
                      min={0}
                      max={200}
                      step={5}
                      display={`${settings.systemGain}%`}
                      disabled={isBusy || isBroadcasting}
                      onChange={(value) => updateSetting("systemGain", value)}
                    />
                    <RangeField
                      label="Volume micro"
                      value={settings.microphoneGain}
                      min={0}
                      max={200}
                      step={5}
                      display={`${settings.microphoneGain}%`}
                      disabled={isBusy || isBroadcasting}
                      onChange={(value) => updateSetting("microphoneGain", value)}
                    />
                  </div>
                  <div className={styles.checkGrid}>
                    <MiniCheck
                      label="Anti-écho"
                      checked={settings.echoCancellation}
                      disabled={isBusy || isBroadcasting}
                      onChange={(checked) => updateSetting("echoCancellation", checked)}
                    />
                    <MiniCheck
                      label="Réduction bruit"
                      checked={settings.noiseSuppression}
                      disabled={isBusy || isBroadcasting}
                      onChange={(checked) => updateSetting("noiseSuppression", checked)}
                    />
                    <MiniCheck
                      label="Gain auto"
                      checked={settings.autoGainControl}
                      disabled={isBusy || isBroadcasting}
                      onChange={(checked) => updateSetting("autoGainControl", checked)}
                    />
                  </div>
                </>
              )}

              <div className={styles.twoColumns}>
                <NumberField
                  label="Débit audio"
                  value={settings.audioBitrate}
                  min={32}
                  max={256}
                  step={16}
                  suffix="kb/s"
                  disabled={isBusy || isBroadcasting}
                  onChange={(value) => updateSetting("audioBitrate", value)}
                />
                <Toggle
                  compact
                  label="Optimiser la voix"
                  description="Mono + correction de pertes."
                  checked={settings.optimizeVoice}
                  disabled={isBusy || isBroadcasting}
                  onChange={(checked) => updateSetting("optimizeVoice", checked)}
                />
              </div>
            </section>
          </aside>

          <div className={styles.stageColumn}>
            <section className={styles.stageCard}>
              <div className={styles.stageTop}>
                <div>
                  <div className={styles.liveHeading}>
                    <span className={`${styles.statusDot} ${styles[status]}`} />
                    <strong>{STATUS_COPY[status]}</strong>
                  </div>
                  <p>{message}</p>
                </div>
                <div className={styles.relayState}>
                  <span className={libraryReady ? styles.ok : ""} />
                  relais {libraryReady ? "disponible" : "chargement"}
                </div>
              </div>

              <div
                className={styles.previewFrame}
                style={{ aspectRatio: `${settings.width} / ${settings.height}` }}
              >
                <video ref={previewRef} autoPlay muted playsInline />
                {!isBroadcasting && !isBusy && (
                  <div className={styles.previewEmpty}>
                    <div className={styles.previewIcon}>
                      <span />
                      <span />
                      <span />
                    </div>
                    <strong>Aperçu de la sortie</strong>
                    <p>
                      {settings.width} × {settings.height} · {settings.frameRate} fps
                    </p>
                  </div>
                )}
                {isBusy && (
                  <div className={styles.previewEmpty}>
                    <div className={styles.spinner} />
                    <strong>{STATUS_COPY[status]}</strong>
                  </div>
                )}
                {isBroadcasting && <div className={styles.liveFlag}>LIVE</div>}
              </div>

              <div className={styles.metrics}>
                <Metric
                  label="Sortie"
                  value={
                    actual.width
                      ? `${actual.width}×${actual.height}`
                      : `${settings.width}×${settings.height}`
                  }
                />
                <Metric
                  label="Fluidité"
                  value={`${stats.fps || actual.frameRate || settings.frameRate} fps`}
                />
                <Metric
                  label="Débit réel"
                  value={stats.bitrateMbps ? `${stats.bitrateMbps.toFixed(1)} Mb/s` : "—"}
                />
                <Metric label="Latence réseau" value={stats.rttMs ? `${stats.rttMs} ms` : "—"} />
                <Metric label="Audio" value={actual.audio ? "Actif" : "Silencieux"} />
              </div>

              <div className={styles.actions}>
                {!isBroadcasting ? (
                  <button
                    className={styles.startButton}
                    type="button"
                    onClick={startBroadcast}
                    disabled={isBusy}
                  >
                    <span className={styles.broadcastGlyph} />
                    {isBusy ? "Connexion…" : "Partager mon écran"}
                  </button>
                ) : (
                  <button className={styles.stopButton} type="button" onClick={stopBroadcast}>
                    <span />
                    Arrêter la diffusion
                  </button>
                )}
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => previewRef.current?.requestFullscreen().catch(() => undefined)}
                  disabled={!isBroadcasting}
                >
                  Plein écran
                </button>
              </div>

              <label className={styles.privateKey}>
                <span>
                  Clé privée de diffusion
                  <small>Enregistrée uniquement dans ce navigateur</small>
                </span>
                <input
                  type="password"
                  value={token}
                  autoComplete="off"
                  placeholder="Colle la clé privée"
                  disabled={isBusy || isBroadcasting}
                  onChange={(event) => setToken(event.target.value)}
                />
              </label>
            </section>

            <section className={styles.moblinCard}>
              <div className={styles.cardHeading}>
                <span>04</span>
                <div>
                  <h2>Source navigateur Moblin</h2>
                  <p>Copie cette URL dans un widget Browser / source navigateur.</p>
                </div>
              </div>

              <div className={styles.moblinUrl}>
                <code>{viewerUrl}</code>
                <button type="button" onClick={() => copyValue(viewerUrl, "url")}>
                  {copied === "url" ? "Copiée ✓" : "Copier l’URL"}
                </button>
              </div>

              <div className={styles.moblinRecommendation}>
                <div>
                  <span>Largeur Moblin</span>
                  <strong>{settings.width}</strong>
                </div>
                <div>
                  <span>Hauteur Moblin</span>
                  <strong>{settings.height}</strong>
                </div>
                <div>
                  <span>Transport</span>
                  <strong>{settings.viewerTransport === "webrtc" ? "WebRTC" : "HLS secours"}</strong>
                </div>
              </div>

              <details className={styles.viewerSettings} open>
                <summary>Personnaliser le rendu dans Moblin</summary>
                <div className={styles.twoColumns}>
                  <Field label="Transport">
                    <select
                      value={settings.viewerTransport}
                      onChange={(event) =>
                        updateSetting("viewerTransport", event.target.value as ViewerTransport)
                      }
                    >
                      <option value="webrtc">WebRTC · temps réel</option>
                      <option value="hls">HLS · mode secours</option>
                    </select>
                  </Field>
                  <Field label="Ajustement">
                    <select
                      value={settings.viewerFit}
                      onChange={(event) =>
                        updateSetting(
                          "viewerFit",
                          event.target.value as ScreenSettings["viewerFit"]
                        )
                      }
                    >
                      <option value="contain">Image entière</option>
                      <option value="cover">Remplir et recadrer</option>
                      <option value="fill">Étirer</option>
                    </select>
                  </Field>
                  <Field label="Fond">
                    <div className={styles.backgroundChoice}>
                      <select
                        value={
                          settings.viewerBackground === "transparent"
                            ? "transparent"
                            : settings.viewerBackground === "#000000"
                              ? "#000000"
                              : "custom"
                        }
                        onChange={(event) => {
                          const value = event.target.value;
                          updateSetting(
                            "viewerBackground",
                            value === "custom" ? "#12071f" : value
                          );
                        }}
                      >
                        <option value="transparent">Transparent</option>
                        <option value="#000000">Noir</option>
                        <option value="custom">Couleur</option>
                      </select>
                      {settings.viewerBackground !== "transparent" &&
                        settings.viewerBackground !== "#000000" && (
                          <input
                            type="color"
                            value={settings.viewerBackground}
                            onChange={(event) =>
                              updateSetting("viewerBackground", event.target.value)
                            }
                          />
                        )}
                    </div>
                  </Field>
                  <Field label="Rotation">
                    <select
                      value={settings.viewerRotation}
                      onChange={(event) =>
                        updateSetting(
                          "viewerRotation",
                          Number(event.target.value) as ScreenSettings["viewerRotation"]
                        )
                      }
                    >
                      <option value={0}>0°</option>
                      <option value={90}>90°</option>
                      <option value={180}>180°</option>
                      <option value={270}>270°</option>
                    </select>
                  </Field>
                </div>

                <div className={styles.checkGrid}>
                  <MiniCheck
                    label="Audio dans Moblin"
                    checked={settings.viewerAudio}
                    onChange={(checked) => updateSetting("viewerAudio", checked)}
                  />
                  <MiniCheck
                    label="Image miroir"
                    checked={settings.viewerMirror}
                    onChange={(checked) => updateSetting("viewerMirror", checked)}
                  />
                  <MiniCheck
                    label="Message hors ligne"
                    checked={settings.showOfflineLabel}
                    onChange={(checked) => updateSetting("showOfflineLabel", checked)}
                  />
                </div>

                {settings.showOfflineLabel && (
                  <Field label="Texte quand le Mac ne diffuse pas">
                    <input
                      type="text"
                      maxLength={80}
                      value={settings.offlineLabel}
                      onChange={(event) => updateSetting("offlineLabel", event.target.value)}
                    />
                  </Field>
                )}
              </details>

              <div className={styles.moblinActions}>
                <a href={viewerUrl} target="_blank" rel="noreferrer">
                  Tester la source
                </a>
                <button
                  type="button"
                  onClick={() =>
                    copyValue(`${settings.width} × ${settings.height}`, "resolution")
                  }
                >
                  {copied === "resolution" ? "Copiée ✓" : "Copier la résolution"}
                </button>
              </div>
            </section>

            <section className={styles.stepsCard}>
              <h2>Dans Moblin</h2>
              <ol>
                <li>
                  <span>1</span>
                  <p>Ajoute un widget <strong>Browser</strong> / source navigateur.</p>
                </li>
                <li>
                  <span>2</span>
                  <p>Colle l’URL ci-dessus et saisis la largeur / hauteur recommandées.</p>
                </li>
                <li>
                  <span>3</span>
                  <p>Laisse cette page ouverte sur le Mac pendant le live.</p>
                </li>
              </ol>
            </section>
          </div>
        </section>
      </main>
    </>
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

function NumberField({
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
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.numberInput}>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        />
        <small>{suffix}</small>
      </div>
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.rangeField}>
      <span>
        {label}
        <strong>{display}</strong>
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

function ColorField({
  label,
  value,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.colorInput}>
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <code>{value}</code>
      </div>
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  compact,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  compact?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`${styles.toggle} ${compact ? styles.toggleCompact : ""}`}>
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

function MiniCheck({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.miniCheck}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
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

function buildViewerUrl(settings: ScreenSettings) {
  const query = new URLSearchParams();
  query.set("transport", settings.viewerTransport);
  query.set("fit", settings.viewerFit);
  query.set("bg", settings.viewerBackground);
  query.set("audio", settings.viewerAudio ? "1" : "0");
  if (settings.viewerMirror) query.set("mirror", "1");
  if (settings.viewerRotation) query.set("rotate", String(settings.viewerRotation));
  if (settings.showOfflineLabel) {
    query.set("offline", "1");
    query.set("label", settings.offlineLabel.trim() || DEFAULT_SETTINGS.offlineLabel);
  }
  return `${VIEWER_BASE}?${query.toString()}`;
}

function buildDisplayMediaOptions(settings: ScreenSettings) {
  return {
    video: {
      width: { ideal: settings.width },
      height: { ideal: settings.height },
      frameRate: { ideal: settings.frameRate, max: settings.frameRate },
      cursor: settings.cursor,
      displaySurface: settings.displaySurface
    },
    audio: settings.systemAudio
      ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      : false,
    preferCurrentTab: settings.preferCurrentTab,
    surfaceSwitching: settings.allowSurfaceSwitching ? "include" : "exclude",
    selfBrowserSurface: settings.excludeCurrentTab ? "exclude" : "include",
    monitorTypeSurfaces: settings.includeMonitorSurfaces ? "include" : "exclude",
    systemAudio: settings.systemAudio ? "include" : "exclude"
  };
}

async function createScaledVideoTrack(sourceTrack: MediaStreamTrack, settings: ScreenSettings) {
  const sourceVideo = document.createElement("video");
  sourceVideo.muted = true;
  sourceVideo.playsInline = true;
  sourceVideo.srcObject = new MediaStream([sourceTrack]);
  await sourceVideo.play();
  if (!sourceVideo.videoWidth) {
    await new Promise<void>((resolve) => {
      sourceVideo.addEventListener("loadedmetadata", () => resolve(), { once: true });
      window.setTimeout(resolve, 1200);
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = settings.width;
  canvas.height = settings.height;
  const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
  if (!context) throw new Error("Le redimensionnement vidéo n’est pas disponible.");

  let stopped = false;
  let animationFrame = 0;
  let lastDraw = 0;
  const interval = 1000 / settings.frameRate;

  const draw = (timestamp: number) => {
    if (stopped) return;
    if (timestamp - lastDraw >= interval - 1) {
      drawScaledFrame(context, sourceVideo, canvas, settings.sourceFit, settings.canvasBackground);
      lastDraw = timestamp;
    }
    animationFrame = window.requestAnimationFrame(draw);
  };
  animationFrame = window.requestAnimationFrame(draw);

  const canvasStream = canvas.captureStream(settings.frameRate);
  const track = canvasStream.getVideoTracks()[0];
  return {
    track,
    stop: () => {
      stopped = true;
      window.cancelAnimationFrame(animationFrame);
      sourceVideo.pause();
      sourceVideo.srcObject = null;
      stopStream(canvasStream);
    }
  };
}

function drawScaledFrame(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  mode: ScaleMode,
  background: string
) {
  const sourceWidth = video.videoWidth || canvas.width;
  const sourceHeight = video.videoHeight || canvas.height;
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (mode === "stretch") {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return;
  }

  const scale =
    mode === "cover"
      ? Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight)
      : Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
}

async function createMixedAudioTrack({
  screenTracks,
  microphoneTracks,
  systemGain,
  microphoneGain
}: {
  screenTracks: MediaStreamTrack[];
  microphoneTracks: MediaStreamTrack[];
  systemGain: number;
  microphoneGain: number;
}) {
  const sources = [
    ...screenTracks.map((track) => ({ track, gain: systemGain / 100 })),
    ...microphoneTracks.map((track) => ({ track, gain: microphoneGain / 100 }))
  ];
  if (!sources.length) return { track: null, context: null };

  const context = new AudioContext();
  await context.resume();
  const destination = context.createMediaStreamDestination();
  for (const source of sources) {
    const node = context.createMediaStreamSource(new MediaStream([source.track]));
    const gain = context.createGain();
    gain.gain.value = source.gain;
    node.connect(gain).connect(destination);
  }
  return { track: destination.stream.getAudioTracks()[0] || null, context };
}

function applySenderPreferences(pc: RTCPeerConnection | null, settings: ScreenSettings) {
  if (!pc) return;
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "video") continue;
    const parameters = sender.getParameters();
    if (!parameters.encodings?.length) parameters.encodings = [{}];
    parameters.encodings[0].maxBitrate = settings.videoBitrate * 1000;
    parameters.encodings[0].maxFramerate = settings.frameRate;
    const writable = parameters as RTCRtpSendParameters & {
      degradationPreference?: ScreenSettings["degradationPreference"];
    };
    writable.degradationPreference = settings.degradationPreference;
    void sender.setParameters(parameters).catch(() => undefined);
  }
}

function setTrackContentHint(track: MediaStreamTrack, hint: ContentHint) {
  try {
    track.contentHint = hint;
  } catch {
    // Some Safari versions expose contentHint as read-only.
  }
}

function closeActiveBroadcast(
  publisherRef: React.MutableRefObject<PublisherInstance | null>,
  resourcesRef: React.MutableRefObject<ActiveResources | null>,
  previewRef: React.RefObject<HTMLVideoElement>
) {
  publisherRef.current?.close();
  publisherRef.current = null;
  const resources = resourcesRef.current;
  if (resources) {
    resources.stopScaler?.();
    stopStream(resources.outputStream);
    stopStream(resources.displayStream);
    if (resources.microphoneStream) stopStream(resources.microphoneStream);
    if (resources.audioContext) void resources.audioContext.close();
  }
  resourcesRef.current = null;
  if (previewRef.current) previewRef.current.srcObject = null;
}

function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

function startStatsTimer(
  publisherRef: React.MutableRefObject<PublisherInstance | null>,
  timerRef: React.MutableRefObject<number | null>,
  previousRef: React.MutableRefObject<{ bytes: number; timestamp: number }>,
  setStats: React.Dispatch<React.SetStateAction<StreamStats>>
) {
  stopStatsTimer(timerRef);
  timerRef.current = window.setInterval(async () => {
    const pc = publisherRef.current?.pc;
    if (!pc) return;
    try {
      const reports = await pc.getStats();
      let next: StreamStats = {
        bitrateMbps: 0,
        fps: 0,
        width: 0,
        height: 0,
        rttMs: 0,
        packetsLost: 0
      };
      reports.forEach((report) => {
        if (report.type === "outbound-rtp" && report.kind === "video") {
          const elapsed = Number(report.timestamp) - previousRef.current.timestamp;
          const bytes = Number(report.bytesSent || 0);
          if (elapsed > 0 && previousRef.current.timestamp) {
            next.bitrateMbps = ((bytes - previousRef.current.bytes) * 8) / elapsed / 1000;
          }
          previousRef.current = { bytes, timestamp: Number(report.timestamp) };
          next.fps = Math.round(Number(report.framesPerSecond || 0));
          next.width = Number(report.frameWidth || 0);
          next.height = Number(report.frameHeight || 0);
          next.packetsLost = Number(report.packetsLost || 0);
        }
        if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
          next.rttMs = Math.round(Number(report.currentRoundTripTime || 0) * 1000);
        }
      });
      setStats((current) => ({
        bitrateMbps: next.bitrateMbps || current.bitrateMbps,
        fps: next.fps || current.fps,
        width: next.width || current.width,
        height: next.height || current.height,
        rttMs: next.rttMs || current.rttMs,
        packetsLost: next.packetsLost
      }));
    } catch {
      // A retry replaces the peer connection; the next interval will pick it up.
    }
  }, 1500);
}

function stopStatsTimer(timerRef: React.MutableRefObject<number | null>) {
  if (timerRef.current !== null) {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

async function refreshDevices(setDevices: (devices: MediaDeviceInfo[]) => void) {
  try {
    setDevices(await navigator.mediaDevices.enumerateDevices());
  } catch {
    setDevices([]);
  }
}

function friendlyCaptureError(error: unknown) {
  const value = error instanceof Error ? error : new Error(String(error));
  if (value.name === "NotAllowedError") {
    return "Partage annulé ou permission macOS refusée. Clique à nouveau quand tu es prête.";
  }
  if (value.name === "NotFoundError") {
    return "Aucun écran partageable n’a été trouvé par le navigateur.";
  }
  if (value.name === "NotReadableError") {
    return "macOS bloque la capture. Vérifie Réglages Système → Confidentialité → Enregistrement de l’écran.";
  }
  return value.message || "La capture n’a pas pu démarrer.";
}

function friendlyPublisherError(error: string) {
  if (/401|403|unauthorized|bad status code/i.test(error)) {
    return "Clé privée invalide. La diffusion réessaie automatiquement ; arrête-la pour corriger la clé.";
  }
  return "Connexion au relais interrompue, reconnexion automatique en cours…";
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
