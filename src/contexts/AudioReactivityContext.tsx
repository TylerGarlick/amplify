"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AudioAnalyzer } from "@/lib/audio/AudioAnalyzer";
import type { BeatData } from "@/types/ar";

/**
 * Audio source attachment modes.
 * - "element": connect to an <audio> element's src= URL
 * - "stream": connect to a MediaStream (microphone, screen capture, etc.)
 * - "manual": caller will push samples manually via pushSample()
 */
export type AudioSourceMode = "element" | "stream" | "manual";

export interface AudioReactivityOptions {
  sourceMode?: AudioSourceMode;
  audioElement?: HTMLAudioElement | null;
  mediaStream?: MediaStream | null;
  analyzerConfig?: Partial<import("@/lib/audio/AudioAnalyzer").AnalyzerConfig>;
  onBeat?: (beat: boolean) => void;
  onBpmChange?: (bpm: number) => void;
}

/**
 * Live audio data produced by AudioReactivityProvider.
 */
export interface AudioReactivityData {
  /** Normalized 0-1 bass energy */
  bass: number;
  /** Normalized 0-1 mid-range energy */
  mid: number;
  /** Normalized 0-1 treble energy */
  treble: number;
  /** True for exactly one frame on each detected beat */
  beat: boolean;
  /** Overall RMS volume 0-1 */
  rms: number;
  /** Raw waveform Float32Array (time-domain), or null */
  waveform: Float32Array | null;
  /** Live BPM estimate */
  bpm: number;
  /** Smoothed energy 0-1 */
  energy: number;
}

interface AudioReactivityContextValue {
  /** Live audio data, updated every animation frame */
  data: AudioReactivityData;
  /** Whether the audio context is running */
  isActive: boolean;
  /** Whether initialization has completed */
  isReady: boolean;
  /** Resume / start the audio context (needed after user gesture) */
  resume: () => Promise<void>;
  /** Pause the audio context */
  pause: () => void;
  /** Attach to a new audio element */
  attachElement: (el: HTMLAudioElement | null) => void;
  /** Attach to a new media stream */
  attachStream: (stream: MediaStream | null) => void;
  /** Manually push a time-domain sample buffer (Float32Array, mono) */
  pushSample: (buffer: Float32Array) => void;
}

const AudioReactivityContext = createContext<AudioReactivityContextValue | null>(null);

const DEFAULT_DATA: AudioReactivityData = {
  bass: 0,
  mid: 0,
  treble: 0,
  beat: false,
  rms: 0,
  waveform: null,
  bpm: 128,
  energy: 0,
};

const DEFAULT_CONFIG = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  bassRange: [20, 150] as [number, number],
  midRange: [150, 2000] as [number, number],
  trebleRange: [2000, 16000] as [number, number],
  beatThreshold: 0.55,
  beatCooldown: 120,
};

/**
 * AudioReactivityProvider
 *
 * Attach it high in the tree (above any visualization components) and call
 * `useAudioReactivity()` anywhere below to receive live frequency data.
 *
 * @example
 * ```tsx
 * <AudioReactivityProvider audioElement={audioRef.current}>
 *   <VisualizationScene />
 * </AudioReactivityProvider>
 * ```
 */
export function AudioReactivityProvider({
  children,
  sourceMode = "element",
  audioElement,
  mediaStream,
  analyzerConfig,
  onBeat,
  onBpmChange,
}: AudioReactivityOptions & { children: ReactNode }) {
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const [data, setData] = useState<AudioReactivityData>(DEFAULT_DATA);
  const [isActive, setIsActive] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const prevBeatRef = useRef(false);

  const tick = useCallback(() => {
    if (!analyzerRef.current) return;

    const currentTime = performance.now();
    const beatData = analyzerRef.current.analyze(currentTime);
    const bpm = analyzerRef.current.getBPM();
    const energy = analyzerRef.current.getEnergy();

    // Detect rising edge of beat for callbacks
    if (beatData.beat && !prevBeatRef.current) {
      onBeat?.(true);
      onBpmChange?.(bpm);
    }
    prevBeatRef.current = beatData.beat;

    setData({
      bass: beatData.bass,
      mid: beatData.mid,
      treble: beatData.treble,
      beat: beatData.beat,
      rms: beatData.rms,
      waveform: beatData.waveform,
      bpm,
      energy,
    });

    animationRef.current = requestAnimationFrame(tick);
  }, [onBeat, onBpmChange]);

  // Initialize analyzer
  useEffect(() => {
    const analyzer = new AudioAnalyzer(analyzerConfig ?? DEFAULT_CONFIG);
    analyzerRef.current = analyzer;

    const init = async () => {
      try {
        if (sourceMode === "element" && audioElement) {
          await analyzer.initialize(audioElement);
        } else if (sourceMode === "stream" && mediaStream) {
          // Build a silent audio element + microphone capture path
          const ctx = new AudioContext();
          const analyserNode = ctx.createAnalyser();
          analyserNode.fftSize = analyzer.getFFTSize?.() ?? 2048;
          analyserNode.smoothingTimeConstant = 0.8;
          const source = ctx.createMediaStreamSource(mediaStream);
          source.connect(analyserNode);
          streamSourceRef.current = source as unknown as MediaStreamAudioSourceNode;
          // Manually feed the analyzer's analyser
          (analyzer as any)._ctx = ctx;
          (analyzer as any)._streamAnalyser = analyserNode;
        }
        setIsReady(true);
      } catch (err) {
        console.error("[AudioReactivityProvider] init error:", err);
      }
    };

    init();

    return () => {
      cancelAnimationFrame(animationRef.current!);
      analyzerRef.current?.dispose();
      analyzerRef.current = null;
      streamSourceRef.current?.disconnect();
      streamSourceRef.current = null;
    };
  }, []);

  // Start/stop the tick loop based on isActive
  useEffect(() => {
    if (isActive && isReady) {
      animationRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animationRef.current!);
    }
    return () => {
      cancelAnimationFrame(animationRef.current!);
    };
  }, [isActive, isReady, tick]);

  const resume = useCallback(async () => {
    await analyzerRef.current?.resume();
    setIsActive(true);
  }, []);

  const pause = useCallback(() => {
    analyzerRef.current?.suspend();
    setIsActive(false);
  }, []);

  const attachElement = useCallback(async (el: HTMLAudioElement | null) => {
    if (!el || !analyzerRef.current) return;
    try {
      await analyzerRef.current.initialize(el);
      setIsReady(true);
    } catch (err) {
      console.error("[AudioReactivityProvider] attachElement error:", err);
    }
  }, []);

  const attachStream = useCallback((stream: MediaStream | null) => {
    // Stream attachment requires re-init; handled via sourceMode prop
    console.warn("[AudioReactivityProvider] attachStream must be called before mount with sourceMode='stream'");
  }, []);

  const pushSample = useCallback((buffer: Float32Array) => {
    // Manual sample injection for exotic sources
    analyzerRef.current?.pushSample?.(buffer);
  }, []);

  return (
    <AudioReactivityContext.Provider
      value={{ data, isActive, isReady, resume, pause, attachElement, attachStream, pushSample }}
    >
      {children}
    </AudioReactivityContext.Provider>
  );
}

/**
 * Access live audio reactivity data from any descendant component.
 * Uses the React context pattern — no store subscription needed.
 *
 * @example
 * ```tsx
 * const { data, isActive } = useAudioReactivity();
 * const scale = 1 + data.bass * 0.5;
 * ```
 */
export function useAudioReactivity(): AudioReactivityData & { isActive: boolean; isReady: boolean } {
  const ctx = useContext(AudioReactivityContext);
  if (!ctx) {
    return { ...DEFAULT_DATA, isActive: false, isReady: false };
  }
  // ctx.data is AudioReactivityData, so spread it and add the extras
  return { ...ctx.data, isActive: ctx.isActive, isReady: ctx.isReady };
}
