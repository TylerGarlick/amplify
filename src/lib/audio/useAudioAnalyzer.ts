/**
 * React hook for audio analysis with Web Audio API
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { AudioAnalyzer, type AnalyzerConfig } from "./AudioAnalyzer";
import type { BeatData } from "@/types/ar";

interface UseAudioAnalyzerOptions {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  config?: Partial<AnalyzerConfig>;
  autoPlay?: boolean;
}

interface UseAudioAnalyzerReturn {
  analyzer: AudioAnalyzer | null;
  beatData: BeatData;
  isPlaying: boolean;
  isReady: boolean;
  bpm: number;
  energy: number;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  setVolume: (volume: number) => void;
}

export function useAudioAnalyzer({
  audioRef,
  config,
  autoPlay = false,
}: UseAudioAnalyzerOptions): UseAudioAnalyzerReturn {
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [beatData, setBeatData] = useState<BeatData>({
    bass: 0,
    mid: 0,
    treble: 0,
    beat: false,
    rms: 0,
    waveform: null,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [bpm, setBpm] = useState(128);
  const [energy, setEnergy] = useState(0);

  const analyzeFrame = useCallback(() => {
    if (!analyzerRef.current || !audioRef.current) return;

    const currentTime = audioRef.current.currentTime * 1000; // Convert to ms
    const data = analyzerRef.current.analyze(currentTime);
    
    setBeatData(data);
    setBpm(analyzerRef.current.getBPM());
    setEnergy(analyzerRef.current.getEnergy());

    if (!audioRef.current.paused) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    }
  }, [audioRef]);

  // Initialize analyzer
  useEffect(() => {
    const init = async () => {
      if (!audioRef.current || analyzerRef.current) return;

      const analyzer = new AudioAnalyzer(config);
      try {
        await analyzer.initialize(audioRef.current);
        analyzerRef.current = analyzer;
        setIsReady(true);

        if (autoPlay) {
          await audioRef.current.play();
          setIsPlaying(true);
          animationFrameRef.current = requestAnimationFrame(analyzeFrame);
        }
      } catch (err) {
        console.error("Failed to initialize audio analyzer:", err);
      }
    };

    init();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      analyzerRef.current?.dispose();
      analyzerRef.current = null;
    };
  }, [audioRef, config, autoPlay, analyzeFrame]);

  // Sync playing state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      analyzerRef.current?.resume();
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioRef, analyzeFrame]);

  const play = useCallback(async () => {
    if (!audioRef.current || !analyzerRef.current) return;
    await analyzerRef.current.resume();
    await audioRef.current.play();
  }, [audioRef]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, [audioRef]);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [audioRef]);

  return {
    analyzer: analyzerRef.current,
    beatData,
    isPlaying,
    isReady,
    bpm,
    energy,
    play,
    pause,
    toggle,
    setVolume,
  };
}