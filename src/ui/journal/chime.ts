/**
 * The optional chime that can accompany a milestone (roadmap R6). Procedural, so there are no audio files to ship
 * or license; off until the learner turns it on; remembered in this browser only; and kept quiet and short.
 *
 * The score and the preference are plain data and functions, so the rules (default off, junk reads as off, a cap on
 * loudness and length) are checked in Node. Only `playChime` touches the browser.
 */

export const SOUND_STORAGE_KEY = 'agentuto.sound.v1';

/** Loudness is capped well below what a speaker handles, and the whole chime is shorter than this many seconds. */
export const MAX_GAIN = 0.1;
export const MAX_SECONDS = 0.6;

export interface ChimeNote {
  frequency: number; // Hz
  start: number; // s from the first note
  duration: number; // s
  gain: number; // 0..MAX_GAIN
}

/** E5 then A5: a rising fourth, two soft sine tones. */
export const CHIME: readonly ChimeNote[] = [
  { frequency: 659.25, start: 0, duration: 0.2, gain: 0.07 },
  { frequency: 880, start: 0.1, duration: 0.3, gain: 0.07 },
];

interface SoundStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Only the exact word "on" turns sound on: a missing, blocked or odd value means silence. */
export function parseSound(raw: unknown): boolean {
  return raw === 'on';
}

export function loadSound(storage: SoundStorage | null | undefined): boolean {
  try {
    return parseSound(storage?.getItem(SOUND_STORAGE_KEY));
  } catch {
    return false;
  }
}

/** False when the browser refused the write: the choice then lasts until the tab closes. */
export function saveSound(storage: SoundStorage | null | undefined, on: boolean): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SOUND_STORAGE_KEY, on ? 'on' : 'off');
    return true;
  } catch {
    return false;
  }
}

let context: AudioContext | null = null;

/** Plays the chime. Safe to call anywhere: with no Web Audio, or a context the browser will not start, it does nothing. */
export function playChime(): void {
  try {
    const Ctor: typeof AudioContext | undefined =
      typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context = context ?? new Ctor();
    if (context.state === 'suspended') void context.resume();
    const t0 = context.currentTime + 0.02;
    for (const note of CHIME) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0, t0 + note.start);
      gain.gain.linearRampToValueAtTime(note.gain, t0 + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.start + note.duration);
      osc.connect(gain).connect(context.destination);
      osc.start(t0 + note.start);
      osc.stop(t0 + note.start + note.duration + 0.02);
    }
  } catch {
    // No sound is not an error.
  }
}
