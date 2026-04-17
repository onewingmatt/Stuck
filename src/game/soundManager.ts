export type SoundEvent = 'card_play' | 'trick_resolve' | 'round_over' | 'click';

const SOUND_MAP: Record<SoundEvent, string> = {
  card_play: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  trick_resolve: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  round_over: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
};

class SoundManager {
  private enabled: boolean = localStorage.getItem('stuck-sound-enabled') !== 'false';
  private volume: number = parseFloat(localStorage.getItem('stuck-sound-volume') || '0.5');
  private audioCache: Map<SoundEvent, HTMLAudioElement> = new Map();

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('stuck-sound-enabled', String(enabled));
  }

  setVolume(volume: number) {
    this.volume = volume;
    localStorage.setItem('stuck-sound-volume', String(volume));
    this.audioCache.forEach(audio => { audio.volume = this.volume; });
  }

  isEnabled() {
    return this.enabled;
  }

  getVolume() {
    return this.volume;
  }

  play(event: SoundEvent) {
    if (!this.enabled) return;

    let audio = this.audioCache.get(event);
    if (!audio) {
      audio = new Audio(SOUND_MAP[event]);
      audio.volume = this.volume;
      this.audioCache.set(event, audio);
    }

    audio.currentTime = 0;
    audio.play().catch(e => console.warn('Audio playback failed', e));
  }
}

export const soundManager = new SoundManager();
