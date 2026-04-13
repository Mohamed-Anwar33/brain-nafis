// Audio manager for exam sounds
class AudioManager {
  private correctSound: HTMLAudioElement | null = null;
  private wrongSound: HTMLAudioElement | null = null;
  private loaded = false;
  private audioContext: AudioContext | null = null;
  private userInteracted = false;

  constructor() {
    // Listen for first user interaction to unlock audio
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.userInteracted = true;
        this.unlockAudioContext();
        console.log("🔊 Audio unlocked by user interaction");
        
        // Remove listeners after first interaction
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      };
      
      document.addEventListener('click', unlockAudio);
      document.addEventListener('touchstart', unlockAudio);
      document.addEventListener('keydown', unlockAudio);
    }
  }

  private unlockAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  async preload() {
    if (this.loaded) return;

    try {
      // Create audio elements with mp3 files from public folder
      this.correctSound = new Audio('/correct.mp3');
      this.wrongSound = new Audio('/wrong.mp3');

      // Set volume
      this.correctSound.volume = 0.5;
      this.wrongSound.volume = 0.4;

      // Preload audio files
      await Promise.all([
        this.correctSound.load(),
        this.wrongSound.load()
      ]);

      // Try to create audio context for better control
      if (typeof window !== 'undefined' && window.AudioContext) {
        this.audioContext = new AudioContext();
      }

      this.loaded = true;
      console.log("✅ Audio files preloaded successfully");
    } catch (err) {
      console.error("❌ Audio preload error:", err);
    }
  }

  private async playAudio(audio: HTMLAudioElement | null) {
    if (!audio) {
      console.warn("⚠️ No audio element available");
      return;
    }

    try {
      // Reset to start
      audio.currentTime = 0;
      
      // Resume audio context if suspended
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Play with error handling
      await audio.play();
      console.log("🔊 Audio playing successfully");
    } catch (err: any) {
      console.error("❌ Audio play failed:", err?.message || err);
      
      // If autoplay blocked, try playing muted first then unmute (workaround)
      if (err?.name === 'NotAllowedError' || err?.message?.includes('user interaction')) {
        console.log("⚠️ Autoplay blocked - waiting for user interaction");
      }
    }
  }

  playCorrect() {
    console.log("▶️ Attempting to play CORRECT sound");
    this.playAudio(this.correctSound);
  }

  playWrong() {
    console.log("▶️ Attempting to play WRONG sound");
    this.playAudio(this.wrongSound);
  }

  playClick() {
    if (this.correctSound) {
      const clone = this.correctSound.cloneNode() as HTMLAudioElement;
      clone.volume = 0.2;
      clone.play().catch(() => { });
    }
  }

  playSuccess() {
    this.playCorrect();
  }

  // Check if audio is ready
  isReady() {
    return this.loaded && this.userInteracted;
  }
}

export const audioManager = new AudioManager();
