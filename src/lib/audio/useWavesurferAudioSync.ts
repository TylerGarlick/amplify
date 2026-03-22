/**
 * useWavesurferAudioSync
 *
 * Bridges Wavesurfer.js playback with the AudioReactivity system.
 * Bridges an <audio> element to an AnalyserNode so visualizations
 * can read FFT data even when the audio is managed externally.
 *
 * Usage:
 * ```tsx
 * const sync = useWavesurferAudioSync({ audioRef });
 * sync.start();
 * const beatData = sync.computeBeatData(performance.now());
 * ```
 */

import { useRef, useCallback, useEffect } from "react";
import type { BeatData } from "@/types/ar";

interface UseWavesurferAudioSyncOptions {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  fftSize?: number;
}

const DEFAULT_FFT = 2048;

export function useWavesurferAudioSync({
  audioRef,
  fftSize = DEFAULT_FFT,
}: UseWavesurferAudioSyncOptions) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const freqBufRef = useRef<Uint8Array | null>(null);
  const timeBufRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopFnRef = useRef<() => void>(() => {});

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || ctxRef.current) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    freqBufRef.current = new Uint8Array(analyser.frequencyBinCount);
    timeBufRef.current = new Uint8Array(analyser.fftSize);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    stopFnRef.current = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      ctx.close();
      ctxRef.current = null;
      analyserRef.current = null;
    };
  }, [audioRef, fftSize]);

  const stop = useCallback(() => {
    stopFnRef.current();
    ctxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopFnRef.current();
  }, []);

  /**
   * Compute BeatData from the current audio frame.
   * Call this in an animation loop (e.g. inside useFrame in Three.js).
   */
  const computeBeatData = useCallback((): BeatData => {
    if (!analyserRef.current || !freqBufRef.current || !timeBufRef.current) {
      return { bass: 0, mid: 0, treble: 0, beat: false, rms: 0, waveform: null };
    }

    analyserRef.current.getByteFrequencyData(freqBufRef.current as any);
    analyserRef.current.getByteTimeDomainData(timeBufRef.current as any);

    const buf = freqBufRef.current as Uint8Array;
    const sampleRate = ctxRef.current?.sampleRate ?? 44100;
    const binWidth = sampleRate / fftSize;

    const bass = avgBand(buf, binWidth, 20, 150);
    const mid = avgBand(buf, binWidth, 150, 2000);
    const treble = avgBand(buf, binWidth, 2000, 16000);

    let sumSquares = 0;
    const timeBuf = timeBufRef.current as Uint8Array;
    for (let i = 0; i < timeBuf.length; i++) {
      const n = (timeBuf[i] - 128) / 128;
      sumSquares += n * n;
    }
    const rms = Math.sqrt(sumSquares / timeBuf.length);

    const energy = bass * 0.7 + mid * 0.2 + treble * 0.1;
    const beat = energy > 0.35;

    const waveform = new Float32Array(timeBuf.length);
    for (let i = 0; i < timeBuf.length; i++) {
      waveform[i] = (timeBuf[i] - 128) / 128;
    }

    return { bass, mid, treble, beat, rms, waveform };
  }, [fftSize]);

  return { start, stop, computeBeatData };
}

function avgBand(data: Uint8Array, binWidth: number, lowHz: number, highHz: number): number {
  const lo = Math.max(1, Math.floor(lowHz / binWidth));
  const hi = Math.min(data.length - 1, Math.floor(highHz / binWidth));
  if (lo >= hi) return 0;
  let sum = 0;
  for (let i = lo; i <= hi; i++) sum += data[i];
  return (sum / ((hi - lo + 1) * 255));
}
