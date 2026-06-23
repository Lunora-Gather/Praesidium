// Shared AudioContext factory — isolates the webkit fallback to one place.

let sharedCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (sharedCtx) return sharedCtx;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  } catch {
    sharedCtx = null;
  }
  return sharedCtx;
}
