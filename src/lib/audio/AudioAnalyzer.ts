/**
 * Audio Analyzer using Web Audio API
 * Extracts beat detection, frequency bands, energy levels, and waveform data
 */

import type { BeatData } from "@/types/ar";

export interface AnalyzerConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  bassRange: [number, number];
  midRange: [number, number];
  trebleRange: [number, number];
  beatThreshold: number;
  beatCooldown: number; // ms between beats
}

export const DEFAULT_CONFIG: AnalyzerConfig = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  bassRange: [20, 150],
  midRange: [150, 2000],
  trebleRange: [2000, 16000],
  beatThreshold: 0.6,
  beatCooldown: 150, // ~400 BPM max
};

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;
  
  private config: AnalyzerConfig;
  private lastBeatTime: number = 0;
  private energyHistory: number[] = [];
  private energyHistorySize: number = 43; // ~1 second at 60fps
  private averageEnergy: number = 0;
  private isInitialized: boolean = false;

  // Beat detection state
  private beatHoldTime: number = 0;
  private lastBeatFrame: number = 0;
  
  // BPM tracking
  private beatTimes: number[] = [];
  private calculatedBPM: number = 128; // default
  private frameCount: number = 0;

  constructor(config: Partial<AnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(audioElement: HTMLAudioElement): Promise<void> {
    if (this.isInitialized) {
      this.dispose();
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);

    this.source = this.audioContext.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);

    this.energyHistory = new Array(this.energyHistorySize).fill(0);
    this.isInitialized = true;
  }

  /**
   * Analyze current audio frame and return beat data
   */
  analyze(currentTime: number = 0): BeatData {
    if (!this.analyser || !this.frequencyData || !this.timeDomainData) {
      return this.getDefaultBeatData();
    }

    // Get frequency and time-domain data
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);

    const frequencyData = this.frequencyData;
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const binCount = this.analyser.frequencyBinCount;
    const binWidth = sampleRate / (this.analyser.fftSize || 2048);

    // Calculate frequency band averages (normalized 0-1)
    const bass = this.getFrequencyAverage(frequencyData, binWidth, this.config.bassRange[0], this.config.bassRange[1]);
    const mid = this.getFrequencyAverage(frequencyData, binWidth, this.config.midRange[0], this.config.midRange[1]);
    const treble = this.getFrequencyAverage(frequencyData, binWidth, this.config.trebleRange[0], this.config.trebleRange[1]);

    // Calculate RMS energy
    let sumSquares = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const normalized = (this.timeDomainData[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / this.timeDomainData.length);

    // Beat detection using energy threshold
    const energy = (bass * 0.7 + mid * 0.2 + treble * 0.1); // Weight bass more
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.energyHistorySize) {
      this.energyHistory.shift();
    }

    // Update running average
    this.averageEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

    // Detect beat
    const isBeat = this.detectBeat(energy, currentTime);
    
    if (isBeat) {
      this.beatTimes.push(currentTime);
      // Keep only last 5 seconds of beats
      const fiveSecondsAgo = currentTime - 5000;
      this.beatTimes = this.beatTimes.filter(t => t > fiveSecondsAgo);
      this.updateBPM();
    }

    this.frameCount++;

    // Convert time-domain to Float32Array for waveform
    const waveform = new Float32Array(this.timeDomainData.length);
    for (let i = 0; i < this.timeDomainData.length; i++) {
      waveform[i] = (this.timeDomainData[i] - 128) / 128;
    }

    return {
      bass,
      mid,
      treble,
      beat: isBeat,
      rms,
      waveform,
    };
  }

  private getFrequencyAverage(
    data: Uint8Array,
    binWidth: number,
    lowFreq: number,
    highFreq: number
  ): number {
    const lowBin = Math.floor(lowFreq / binWidth);
    const highBin = Math.min(Math.floor(highFreq / binWidth), data.length - 1);
    
    if (lowBin >= highBin) return 0;

    let sum = 0;
    let count = 0;
    for (let i = lowBin; i <= highBin; i++) {
      sum += data[i];
      count++;
    }

    return count > 0 ? (sum / count) / 255 : 0;
  }

  private detectBeat(energy: number, currentTime: number): boolean {
    // Must exceed threshold and cooldown
    if (currentTime - this.lastBeatTime < this.config.beatCooldown) {
      return false;
    }

    // Beat occurs when energy spikes above average + threshold
    const threshold = this.averageEnergy + (1 - this.averageEnergy) * this.config.beatThreshold;
    
    if (energy > threshold && energy > 0.2) {
      this.lastBeatTime = currentTime;
      return true;
    }

    return false;
  }

  private updateBPM(): void {
    if (this.beatTimes.length < 4) return;

    const intervals: number[] = [];
    for (let i = 1; i < this.beatTimes.length; i++) {
      intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
    }

    // Calculate median interval for stability
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    
    if (medianInterval > 0) {
      this.calculatedBPM = Math.round(60000 / medianInterval);
      // Clamp to reasonable range
      this.calculatedBPM = Math.max(60, Math.min(200, this.calculatedBPM));
    }
  }

  getBPM(): number {
    return this.calculatedBPM;
  }

  getEnergy(): number {
    return this.averageEnergy;
  }

  private getDefaultBeatData(): BeatData {
    return {
      bass: 0,
      mid: 0,
      treble: 0,
      beat: false,
      rms: 0,
      waveform: null,
    };
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  suspend(): void {
    if (this.audioContext?.state === "running") {
      this.audioContext.suspend();
    }
  }

  dispose(): void {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.gainNode = null;
    this.frequencyData = null;
    this.timeDomainData = null;
    this.isInitialized = false;
  }
}

/**
 * Standalone function to analyze audio from any HTML element
 */
export async function createAudioAnalyzer(audioElement: HTMLAudioElement): Promise<AudioAnalyzer> {
  const analyzer = new AudioAnalyzer();
  await analyzer.initialize(audioElement);
  return analyzer;
}