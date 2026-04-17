---
name: web-game-audio-integration
description: Implement a lightweight, toggleable sound system for web-based games (React/TypeScript).
---

# Web Game Audio Integration

Adding a sound system to a web game requires balancing low-latency playback, state persistence for the user's preferences (toggle), and handling browser autoplay restrictions.

## Workflow

### 1. Create a Sound Manager Singleton
Don't manage audio state inside React components. Use a singleton class to handle the `Audio` objects and persistence.

```typescript
export type SoundEvent = 'click' | 'play' | 'success' | 'fail';

const SOUND_MAP: Record<SoundEvent, string> = {
  click: 'url_to_click_sound.mp3',
  play: 'url_to_play_sound.mp3',
  // ...
};

class SoundManager {
  private enabled: boolean = localStorage.getItem('game-sound-enabled') !== 'false';
  private volume: number = parseFloat(localStorage.getItem('game-sound-volume') || '0.5');
  private audioCache: Map<SoundEvent, HTMLAudioElement> = new Map();

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('game-sound-enabled', String(enabled));
  }

  setVolume(volume: number) {
    this.volume = volume;
    localStorage.setItem('game-sound-volume', String(volume));
    this.audioCache.forEach(audio => { audio.volume = this.volume; });
  }

  isEnabled() { return this.enabled; }
  getVolume() { return this.volume; }

  play(event: SoundEvent) {
    if (!this.enabled) return;

    let audio = this.audioCache.get(event);
    if (!audio) {
      audio = new Audio(SOUND_MAP[event]);
      audio.volume = this.volume;
      this.audioCache.set(event, audio);
    }

    audio.currentTime = 0;
    audio.play().catch(e => console.warn('Audio playback blocked by browser', e));
  }
}

export const soundManager = new SoundManager();
```

### 2. Implement the UI Toggle & Volume
Place the controls in a settings menu or lobby. Ensure they update both the React state and the `SoundManager` singleton.

```tsx
const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
const [volume, setVolume] = useState(soundManager.getVolume());

<div className="flex flex-col gap-2">
  <label className="flex items-center justify-between">
    <span>Sound Effects</span>
    <input 
      type="checkbox" 
      checked={soundEnabled} 
      onChange={(e) => { 
        const val = e.target.checked; 
        setSoundEnabled(val); 
        soundManager.setEnabled(val); 
        soundManager.play('click');
      }} 
    />
  </label>
  <div className="flex items-center gap-2">
    <span>Vol</span>
    <input 
      type="range" 
      min="0" 
      max="1" 
      step="0.05" 
      value={volume} 
      onChange={(e) => { 
        const val = parseFloat(e.target.value); 
        setVolume(val); 
        soundManager.setVolume(val); 
      }} 
    />
    <span>{Math.round(volume * 100)}%</span>
  </div>
</div>
```

### 3. Triggering Sounds
- **User Interactions**: Call `soundManager.play('event')` directly in `onClick` handlers.
- **State Changes**: Use `useEffect` to trigger sounds based on game state transitions (e.g., round over, trick resolved).

```tsx
useEffect(() => {
  if (state.status === 'game_over') {
    soundManager.play('success');
  }
}, [state.status]);
```

## Pitfalls & Tips

◆ Autoplay Policy
Browsers block audio until the user interacts with the page. The first `soundManager.play()` call may fail silently or throw an error. Always wrap `.play()` in a `.catch()` block.

◆ Audio Latency
Creating a `new Audio()` on every click causes noticeable lag. Always cache the `HTMLAudioElement` after the first load.

◆ Memory Management
For extremely large games, avoid caching every sound. Use a cache for frequent "UI" sounds and load longer ambient tracks via a separate streaming mechanism.

◆ Tooling Tip
When integrating sounds into complex JSX components, `patch` can fail due to non-unique blocks. If a component is small (< 500 lines), `write_file` is often safer for implementing comprehensive UI changes.
