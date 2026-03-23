/**
 * AudioReactivityManager
 *
 * Central singleton that owns the Web Audio graph and streams BeatData to
 * all registered subscribers.  Use this when you need a single audio source
 * (e.g. a global <audio> player) to drive multiple independent visualization
 * components simultaneously.
 *
 * Design principles:
 * - Single AudioContext + AnalyserNode for efficiency
 * - BeatData emitted every animation frame via requestAnimationFrame
 * - BPM estimated from inter-beat intervals (beat detection)
 * - Bass / mid / treble extracted from FFT bins mapped to frequency ranges
 *
 * Usage:
 * ```ts
 * const manager = AudioReactivityManager.getInstance();
 * manager.attach(audioElement);
 * manager.subscribe((data) => { console.log(data.bass); });
 * manager.start();
 * ```
 */

import type { BeatData } from "@/types/ar";

export interface AnalyzerConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  bassRange: [number, number];
  midRange: [number, number];
  trebleRange: [number, number];
  beatThreshold: number;
  beatCooldown: number;
}

const DEFAULT_CONFIG: AnalyzerConfig = {
  fftSize: 2048,
  smoothingTimeConstant: 0.82,
  bassRange: [20, 150],
  midRange: [150, 2000],
  trebleRange: [2000, 16000],
  beatThreshold: 0.55,
  beatCooldown: 120,
};

export type BeatDataCallback = (data: BeatData & { bpm: number; energy: number }) => void;

export class AudioReactivityManager {
  private static _instance: AudioReactivityManager | null = null;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private timeData: Uint8Array<ArrayBuffer> | null = null;

  private config: AnalyzerConfig;
  private rafId: number | null = null;
  private isRunning = false;
  private subscribers = new Set<BeatDataCallback>();

  // Beat detection state
  private lastBeatTime = 0;
  private energyHistory: number[] = [];
  private avgEnergy = 0;
  private beatTimes: number[] = [];
  private calculatedBPM = 128;
  private prevBeat = false;

  private constructor(config: Partial<AnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<AnalyzerConfig>): AudioReactivityManager {
    if (!AudioReactivityManager._instance) {
      AudioReactivityManager._instance = new AudioReactivityManager(config);
    }
    return AudioReactivityManager._instance;
  }

  static resetInstance(): void {
    if (AudioReactivityManager._instance) {
      AudioReactivityManager._instance.dispose();
      AudioReactivityManager._instance = null;
    }
  }

  /**
   * Attach an <audio> element as the audio source.
   * Safe to call even if already attached to a different element.
   */
  async attach(audioElement: HTMLAudioElement): Promise<void> {
    // Tear down existing graph
    this.dispose();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;

    this.source = this.audioContext.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    const binCount = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(binCount);
    this.timeData = new Uint8Array(binCount);

    this.energyHistory = new Array(43).fill(0);
  }

  /**
   * Attach a MediaStream (microphone, screen share, etc.)
   */
  async attachStream(stream: MediaStream): Promise<void> {
    this.dispose();

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;

    const src = this.audioContext.createMediaStreamSource(stream);
    src.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    this.source = src as unknown as MediaElementAudioSourceNode;

    const binCount = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(binCount);
    this.timeData = new Uint8Array(binCount);
    this.energyHistory = new Array(43).fill(0);
  }

  async resume(): Promise<void> {
    await this.audioContext?.resume();
  }

  suspend(): void {
    this.audioContext?.suspend();
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Subscribe to per-frame BeatData updates.
   * Returns an unsubscribe function.
   */
  subscribe(cb: BeatDataCallback): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  /** Start the rAF analysis loop */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tick();
  }

  /** Stop the analysis loop */
  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getBPM(): number {
    return this.calculatedBPM;
  }

  getEnergy(): number {
    return this.avgEnergy;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    this.rafId = requestAnimationFrame(this.tick);
    if (!this.analyser || !this.freqData || !this.timeData) return;

    const now = performance.now();

    this.analyser.getByteFrequencyData(this.freqData as any);
    this.analyser.getByteTimeDomainData(this.timeData as any);

    const sampleRate = this.audioContext?.sampleRate ?? 44100;
    const binWidth = sampleRate / this.config.fftSize;

    const bass = this.avgBand(this.freqData as Uint8Array, binWidth, ...this.config.bassRange);
    const mid = this.avgBand(this.freqData as Uint8Array, binWidth, ...this.config.midRange);
    const treble = this.avgBand(this.freqData as Uint8Array, binWidth, ...this.config.trebleRange);

    let sumSquares = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const n = (this.timeData[i] - 128) / 128;
      sumSquares += n * n;
    }
    const rms = Math.sqrt(sumSquares / this.timeData.length);

    const energy = bass * 0.7 + mid * 0.2 + treble * 0.1;
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 43) this.energyHistory.shift();
    this.avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

    const threshold = this.avgEnergy + (1 - this.avgEnergy) * this.config.beatThreshold;
    const isBeat =
      energy > threshold &&
      energy > 0.2 &&
      now - this.lastBeatTime > this.config.beatCooldown;

    if (isBeat) {
      this.lastBeatTime = now;
      this.beatTimes.push(now);
      const fiveSecAgo = now - 5000;
      this.beatTimes = this.beatTimes.filter((t) => t > fiveSecAgo);
      this.updateBPM();
    }

    const waveform = new Float32Array(this.timeData.length);
    for (let i = 0; i < this.timeData.length; i++) {
      waveform[i] = (this.timeData[i] - 128) / 128;
    }

    const data: BeatData & { bpm: number; energy: number } = {
      bass,
      mid,
      treble,
      beat: isBeat && !this.prevBeat,
      rms,
      waveform,
      bpm: this.calculatedBPM,
      energy: this.avgEnergy,
    };

    this.prevBeat = isBeat;

    this.subscribers.forEach((cb) => cb(data));
  };

  private updateBPM(): void {
    if (this.beatTimes.length < 4) return;
    const intervals: number[] = [];
    for (let i = 1; i < this.beatTimes.length; i++) {
      intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
    }
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    if (median > 0) {
      const bpm = Math.round(60000 / median);
      this.calculatedBPM = Math.max(60, Math.min(200, bpm));
    }
  }

  private avgBand(
    data: Uint8Array,
    binWidth: number,
    lowHz: number,
    highHz: number
  ): number {
    const lo = Math.max(1, Math.floor(lowHz / binWidth));
    const hi = Math.min(data.length - 1, Math.floor(highHz / binWidth));
    if (lo >= hi) return 0;
    let sum = 0;
    for (let i = lo; i <= hi; i++) sum += data[i];
    return (sum / ((hi - lo + 1) * 255));
  }

  dispose(): void {
    this.stop();
    this.subscribers.clear();
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.gainNode?.disconnect();
    this.audioContext?.close();
    this.source = null;
    this.analyser = null;
    this.gainNode = null;
    this.audioContext = null;
    this.freqData = null;
    this.timeData = null;
  }
}
