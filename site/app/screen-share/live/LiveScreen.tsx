"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import styles from "./live.module.css";

const MEDIA_ROOT = "https://api.adoptan.ai/screen-media/screen/lucia";
const HLS_ROOT = "https://api.adoptan.ai/screen-hls/screen/lucia/index.m3u8";
const READER_SCRIPT = `${MEDIA_ROOT}/reader.js`;

type ReaderInstance = { close: () => void };
type ReaderOptions = {
  url: string;
  onError: (error: string) => void;
  onTrack: (event: RTCTrackEvent) => void;
  onDataChannel: (event: RTCDataChannelEvent) => void;
};

declare global {
  interface Window {
    MediaMTXWebRTCReader?: new (options: ReaderOptions) => ReaderInstance;
  }
}

type ViewerOptions = {
  transport: "webrtc" | "hls";
  fit: "contain" | "cover" | "fill";
  background: string;
  audio: boolean;
  mirror: boolean;
  rotation: 0 | 90 | 180 | 270;
  showOffline: boolean;
  label: string;
};

const DEFAULT_OPTIONS: ViewerOptions = {
  transport: "webrtc",
  fit: "contain",
  background: "transparent",
  audio: true,
  mirror: false,
  rotation: 0,
  showOffline: false,
  label: "Écran en attente…"
};

export default function LiveScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<ReaderInstance | null>(null);
  const hlsRetryRef = useRef<number | null>(null);
  const [options, setOptions] = useState<ViewerOptions>(DEFAULT_OPTIONS);
  const [readerReady, setReaderReady] = useState(false);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const parsed = parseViewerOptions();
    setOptions(parsed);
    document.documentElement.style.background = parsed.background;
    document.body.style.background = parsed.background;
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";

    return () => {
      readerRef.current?.close();
      if (hlsRetryRef.current !== null) window.clearTimeout(hlsRetryRef.current);
    };
  }, []);

  useEffect(() => {
    if (options.transport === "hls") {
      return startHls(videoRef, options, setOnline, hlsRetryRef);
    }
    if (!readerReady || !window.MediaMTXWebRTCReader) return;

    readerRef.current?.close();
    const Reader = window.MediaMTXWebRTCReader;
    readerRef.current = new Reader({
      url: `${MEDIA_ROOT}/whep`,
      onError: () => setOnline(false),
      onTrack: (event) => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = event.streams[0] || new MediaStream([event.track]);
        video.muted = !options.audio;
        setOnline(true);
        void video.play().catch(() => {
          video.muted = true;
          void video.play().catch(() => undefined);
        });
      },
      onDataChannel: () => undefined
    });

    return () => {
      readerRef.current?.close();
      readerRef.current = null;
    };
  }, [options, readerReady]);

  const rotated = options.rotation === 90 || options.rotation === 270;
  const transform = `translate(-50%, -50%) rotate(${options.rotation}deg) scaleX(${options.mirror ? -1 : 1})`;

  return (
    <>
      {options.transport === "webrtc" && (
        <Script
          src={READER_SCRIPT}
          strategy="afterInteractive"
          onLoad={() => setReaderReady(true)}
        />
      )}
      <main className={styles.live} style={{ background: options.background }}>
        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          playsInline
          muted={!options.audio}
          disablePictureInPicture
          style={{
            objectFit: options.fit,
            width: rotated ? "100vh" : "100vw",
            height: rotated ? "100vw" : "100vh",
            transform
          }}
        />
        {!online && options.showOffline && (
          <div className={styles.offline}>
            <span />
            <strong>{options.label}</strong>
          </div>
        )}
      </main>
    </>
  );
}

function parseViewerOptions(): ViewerOptions {
  const query = new URLSearchParams(window.location.search);
  const transport = query.get("transport") === "hls" ? "hls" : "webrtc";
  const fitValue = query.get("fit");
  const fit = fitValue === "cover" || fitValue === "fill" ? fitValue : "contain";
  const background = sanitizeBackground(query.get("bg"));
  const rotationValue = Number(query.get("rotate"));
  const rotation =
    rotationValue === 90 || rotationValue === 180 || rotationValue === 270 ? rotationValue : 0;
  return {
    transport,
    fit,
    background,
    audio: query.get("audio") !== "0",
    mirror: query.get("mirror") === "1",
    rotation,
    showOffline: query.get("offline") === "1",
    label: (query.get("label") || DEFAULT_OPTIONS.label).slice(0, 80)
  };
}

function sanitizeBackground(value: string | null) {
  if (!value || value === "transparent") return "transparent";
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

function startHls(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: ViewerOptions,
  setOnline: (online: boolean) => void,
  retryRef: React.MutableRefObject<number | null>
) {
  const video = videoRef.current;
  if (!video) return;
  video.srcObject = null;
  video.muted = !options.audio;

  const load = () => {
    video.src = `${HLS_ROOT}?v=${Date.now()}`;
    video.load();
    void video.play().catch(() => undefined);
  };
  const onPlaying = () => setOnline(true);
  const onError = () => {
    setOnline(false);
    retryRef.current = window.setTimeout(load, 2500);
  };
  video.addEventListener("playing", onPlaying);
  video.addEventListener("error", onError);
  video.addEventListener("stalled", onError);
  load();

  return () => {
    video.removeEventListener("playing", onPlaying);
    video.removeEventListener("error", onError);
    video.removeEventListener("stalled", onError);
    if (retryRef.current !== null) window.clearTimeout(retryRef.current);
  };
}
