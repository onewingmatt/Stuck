export type SoundEvent = 'card_play' | 'trick_resolve' | 'round_over' | 'click';

type SoundConfig = {
  url: string;
  volume?: number;
  playbackRate?: number;
  cutOffMs?: number;
};

const SOUND_MAP: Record<SoundEvent, SoundConfig> = {
  card_play: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    volume: 0.9,
    playbackRate: 1.06,
    cutOffMs: 130,
  },
  trick_resolve: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    volume: 0.55,
    playbackRate: 1.18,
    cutOffMs: 220,
  },
  round_over: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
    volume: 0.45,
    playbackRate: 1.15,
    cutOffMs: 260,
  },
  click: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    volume: 0.55,
    playbackRate: 1.0,
    cutOffMs: 90,
  },
};

class SoundManager {
  private enabled: boolean = localStorage.getItem('stuck-sound-enabled') !== 'false';
  private volume: number = parseFloat(localStorage.getItem('stuck-sound-volume') || '0.35');
  private audioCache: Map<SoundEvent, HTMLAudioElement> = new Map();
  private cutTimers: Map<SoundEvent, number> = new Map();

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('stuck-sound-enabled', String(enabled));
  }

  setVolume(volume: number) {
    this.volume = volume;
    localStorage.setItem('stuck-sound-volume', String(volume));
    this.audioCache.forEach((audio, event) => {
      const cfg = SOUND_MAP[event];
      audio.volume = (cfg.volume ?? 1) * this.volume;
    });
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
      audio = new Audio(SOUND_MAP[event].url);
      audio.preload = 'auto';
      this.audioCache.set(event, audio);
    }

    const cfg = SOUND_MAP[event];
    audio.volume = (cfg.volume ?? 1) * this.volume;
    audio.playbackRate = cfg.playbackRate ?? 1;
    audio.currentTime = 0;

    const existing = this.cutTimers.get(event);
    if (existing) window.clearTimeout(existing);
    if (cfg.cutOffMs) {
      const timer = window.setTimeout(() => {
        audio?.pause();
      }, cfg.cutOffMs);
      this.cutTimers.set(event, timer);
    }

    audio.play().catch(e => console.warn('Audio playback failed', e));
  }
}

export const soundManager = new SoundManager();
