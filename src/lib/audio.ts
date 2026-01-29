// Audio manager for exam sounds
class AudioManager {
  private correctSound: HTMLAudioElement | null = null;
  private wrongSound: HTMLAudioElement | null = null;
  private loaded = false;

  async preload() {
    if (this.loaded) return;

    // Create audio elements with mp3 files from public folder
    // Correct sound
    this.correctSound = new Audio('/correct.mp3');
    
    // Wrong sound
    this.wrongSound = new Audio('/wrong.mp3');

    // Set volume
    this.correctSound.volume = 0.5;
    this.wrongSound.volume = 0.4;

    this.loaded = true;
  }

  playCorrect() {
    if (this.correctSound) {
      this.correctSound.currentTime = 0;
      this.correctSound.play().catch(() => {});
    }
  }

  playWrong() {
    if (this.wrongSound) {
      this.wrongSound.currentTime = 0;
      this.wrongSound.play().catch(() => {});
    }
  }
}

export const audioManager = new AudioManager();
