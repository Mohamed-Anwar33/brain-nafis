/**
 * Halal Procedural Web Audio Engine for Treasure Island Adventure
 * 
 * 100% Instrument-Free / No Musical Instruments.
 * Features:
 * - Real-time coastal ocean surf simulation (procedural filtered pink/white noise wave cycles)
 * - Gentle sea breeze & wind gust simulator
 * - Tactile mechanical & natural sound effects (stone grinding, crystal resonance, key clinks, parchment rustle)
 * - Radar sonar locator clicks for 3D key hunting
 */

class TreasureHalalAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isAmbienceRunning: boolean = false;

  // Ambience Nodes
  private masterGain: GainNode | null = null;
  private oceanGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private oceanSource: AudioBufferSourceNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private lfoOscillator: OscillatorNode | null = null;

  constructor() {
    // Lazy AudioContext initialization on first user gesture
    if (typeof window !== "undefined") {
      const unlock = () => {
        this.initContext();
        window.removeEventListener("click", unlock);
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("keydown", unlock);
      };
      window.addEventListener("click", unlock, { once: true });
      window.addEventListener("touchstart", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
    }
  }

  private initContext() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      return this.ctx;
    } catch (e) {
      console.warn("AudioContext initialization warning:", e);
      return null;
    }
  }

  // Create a looped noise buffer
  private createNoiseBuffer(durationSeconds = 6): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      // Brown/Pink noise filter approximation for natural surf sound
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // boost amplitude
    }
    return buffer;
  }

  /**
   * Continuous background noise disabled per user preference
   */
  public startAmbience() {
    // Completely silenced - no background noise or hiss
    this.isAmbienceRunning = false;
  }

  public stopAmbience() {
    this.isAmbienceRunning = false;
  }

  /**
   * Toggle mute on / off
   */
  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
    if (!muted && !this.isAmbienceRunning) {
      this.startAmbience();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // ==========================================
  // Tactile Halal Sound Effects (Pure Natural/Physics-based Audio)
  // ==========================================

  /**
   * Crisp sound of an ancient parchment or leather map unrolling
   */
  public playParchmentOpen() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const noiseBuffer = this.createNoiseBuffer(0.5);
      if (!noiseBuffer) return;

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(2.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(now);
      source.stop(now + 0.5);
    } catch (e) {}
  }

  /**
   * Cinematic sound of breaking royal wax seal & majestically unrolling an ancient treasure scroll
   */
  public playEpicScrollUnfurl() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Wax seal snap & crack
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = "triangle";
      snapOsc.frequency.setValueAtTime(360, now);
      snapOsc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
      snapGain.gain.setValueAtTime(0.45, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.1);

      // 2. Rich crisp paper/parchment friction sliding sound
      const noiseBuffer = this.createNoiseBuffer(1.2);
      if (noiseBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(800, now + 0.05);
        filter.frequency.exponentialRampToValueAtTime(2800, now + 0.45);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.95);
        filter.Q.setValueAtTime(3.2, now + 0.05);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.42, now + 0.18);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        source.start(now + 0.05);
        source.stop(now + 1.15);
      }

      // 3. Mystical cinematic adventure harmonic chime arpeggio
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + 0.2 + i * 0.09);
        g.gain.setValueAtTime(0.2, now + 0.2 + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 0.2 + i * 0.09 + 1.1);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + 0.2 + i * 0.09);
        osc.stop(now + 0.2 + i * 0.09 + 1.15);
      });
    } catch (e) {
      console.warn("playEpicScrollUnfurl audio warning:", e);
    }
  }

  /**
   * Shimmering crystalline chime and metallic key capture
   */
  public playKeyFound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Natural harmonic glass/crystal ring frequencies
      const freqs = [587.33, 739.99, 880.0, 1174.66, 1760.0];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.06);

        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.06 + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.95);
      });

      // Metallic clink resonance
      const metalOsc = ctx.createOscillator();
      const metalGain = ctx.createGain();
      metalOsc.type = "triangle";
      metalOsc.frequency.setValueAtTime(2400, now);
      metalOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
      metalGain.gain.setValueAtTime(0.22, now);
      metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      metalOsc.connect(metalGain);
      metalGain.connect(ctx.destination);
      metalOsc.start(now);
      metalOsc.stop(now + 0.32);
    } catch (e) {}
  }

  /**
   * Deep monolithic stone gate rumble when breaking a seal
   */
  public playStoneGateRumble() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Low frequency sub rumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.9);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(140, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.15);

      // Stone friction noise
      const noise = this.createNoiseBuffer(1.0);
      if (noise) {
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noise;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(280, now);
        noiseFilter.Q.setValueAtTime(1.5, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.28, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noiseSrc.start(now);
        noiseSrc.stop(now + 1.0);
      }
    } catch (e) {}
  }

  /**
   * Radar / Compass ping pulse as player points camera toward the key
   */
  public playCompassSonarPing(intensity = 0.5) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const baseFreq = 850 + intensity * 450;
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0.08 * Math.max(0.2, intensity), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  /**
   * Elemental crystal runestone activation pulse
   */
  public playCrystalPulse() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch (e) {}
  }

  /**
   * Grand Chest unlatching and gold coins shower
   */
  public playChestVictory() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Heavy latch unlock click
      const latchOsc = ctx.createOscillator();
      const latchGain = ctx.createGain();
      latchOsc.type = "square";
      latchOsc.frequency.setValueAtTime(220, now);
      latchGain.gain.setValueAtTime(0.3, now);
      latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      latchOsc.connect(latchGain);
      latchGain.connect(ctx.destination);
      latchOsc.start(now);
      latchOsc.stop(now + 0.18);

      // 2. Triumphant ascending harmonic crystal bells (natural resonant intervals)
      [440, 554.37, 659.25, 880, 1108.73, 1318.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + 0.15 + idx * 0.1);

        gain.gain.setValueAtTime(0.2, now + 0.15 + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.15 + idx * 0.1 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + 0.15 + idx * 0.1);
        osc.stop(now + 0.15 + idx * 0.1 + 1.25);
      });
    } catch (e) {}
  }
}

export const treasureHalalAudio = new TreasureHalalAudioEngine();
