/**
 * Advanced Halal Web Audio Sound Engine for Brain Nafis
 * 100% Procedural & Instrument-Free (Synthesized frequencies and chimes).
 * Zero latency, instant feedback, works on all modern browsers and mobile devices.
 */

class ComprehensiveAudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private correctAudio: HTMLAudioElement | null = null;
  private wrongAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const storedMute = localStorage.getItem("brain_sound_muted");
      if (storedMute !== null) {
        this.isMuted = storedMute === "true";
      }

      // Pre-create mp3 audio fallback elements
      try {
        this.correctAudio = new Audio("/correct.mp3");
        this.wrongAudio = new Audio("/wrong.mp3");
      } catch (e) {
        console.warn("Audio elements creation warning:", e);
      }

      const unlockAudio = () => {
        this.ensureContext();
        window.removeEventListener("click", unlockAudio);
        window.removeEventListener("touchstart", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
      };

      window.addEventListener("click", unlockAudio, { passive: true });
      window.addEventListener("touchstart", unlockAudio, { passive: true });
      window.addEventListener("keydown", unlockAudio, { passive: true });
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } catch (err) {
        console.warn("Web Audio Context not supported:", err);
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    this.isInitialized = true;
    return this.ctx;
  }

  public async preload() {
    this.ensureContext();
    if (this.correctAudio) this.correctAudio.load();
    if (this.wrongAudio) this.wrongAudio.load();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("brain_sound_muted", String(this.isMuted));
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("brain_sound_muted", String(this.isMuted));
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Tactile subtle pop / bubble click sound for buttons and options
   */
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      // Quick pitch drop: 600Hz -> 180Hz
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      // Ignore audio failure
    }
  }

  public playOptionClick() {
    this.playClick();
  }

  public playSubmit() {
    this.playClick();
  }

  /**
   * Crisp, subtle mechanical tick / ratchet sound for wheel spinning or countdowns
   */
  public playTick() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      // Quick snappy tick: 900Hz -> 300Hz in 25ms
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch (e) {
      // Ignore audio failure
    }
  }

  /**
   * Rewarding ascending chime for correct answers.
   * Pitch dynamically increases with combo multiplier!
   */
  public playCorrect(combo: number = 1) {
    if (this.isMuted) return;

    // Also trigger mp3 if available for fuller sound
    if (this.correctAudio && combo <= 1) {
      try {
        this.correctAudio.currentTime = 0;
        this.correctAudio.volume = 0.4;
        this.correctAudio.play().catch(() => {});
      } catch (e) {}
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Base frequencies scaled by combo (from C5 to high celebratory register)
      const baseFreq = Math.min(523.25 * (1 + (combo - 1) * 0.12), 1200);

      // Two-note ascending chime
      const notes = [baseFreq, baseFreq * 1.2599]; // Major third ratio

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch (e) {}
  }

  /**
   * Gentle, soft descending cue for incorrect answers (motivational, not harsh)
   */
  public playWrong() {
    if (this.isMuted) return;

    if (this.wrongAudio) {
      try {
        this.wrongAudio.currentTime = 0;
        this.wrongAudio.volume = 0.35;
        this.wrongAudio.play().catch(() => {});
      } catch (e) {}
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  /**
   * Fiery streak celebration sound when student reaches 3x, 5x, 10x
   */
  public playStreak(streakCount: number = 3) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C E G C

      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.4);
      });
    } catch (e) {}
  }

  /**
   * Magical sparkle shimmer when student activates a Power-Up (50:50, Hint, Shield)
   */
  public playPowerUp() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [659.25, 783.99, 987.77, 1318.51]; // E G B E

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.2, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.3);
      });
    } catch (e) {}
  }

  /**
   * Star reveal sound (crisp crystalline ping)
   */
  public playStar(starIndex: number = 1) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const baseFreq = 880 * Math.pow(1.25, starIndex - 1); // Ascending stars

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  /**
   * Grand victory fanfare upon exam completion
   */
  public playVictory() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const fanfare = [
        { f: 523.25, t: 0.0, d: 0.15 },
        { f: 659.25, t: 0.15, d: 0.15 },
        { f: 783.99, t: 0.30, d: 0.20 },
        { f: 1046.50, t: 0.50, d: 0.55 },
      ];

      fanfare.forEach((item) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(item.f, now + item.t);

        gain.gain.setValueAtTime(0, now + item.t);
        gain.gain.linearRampToValueAtTime(0.3, now + item.t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + item.t + item.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + item.t);
        osc.stop(now + item.t + item.d);
      });
    } catch (e) {}
  }

  public playSuccess() {
    this.playCorrect(1);
  }

  public playFanfare() {
    this.playVictory();
  }

  public isReady(): boolean {
    return this.isInitialized;
  }
}

export const audioManager = new ComprehensiveAudioManager();
