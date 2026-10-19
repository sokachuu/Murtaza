export type Mood = 'idle' | 'thinking' | 'happy' | 'love' | 'eating' | 'sleep' | 'sad' | 'dance'

declare module 'claude-code' {
  interface PluginState {
    murtaza: { frame: number; mood: Mood; isHidden: boolean; say: string }
  }
}
