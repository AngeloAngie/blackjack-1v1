// Alle geluidseffecten worden live gesynthetiseerd met de Web Audio API,
// zodat er geen externe audiobestanden gedownload hoeven te worden.

let ctx: AudioContext | null = null;
let muted = loadMuted();

function loadMuted(): boolean {
  try {
    return localStorage.getItem("blackjack:muted") === "1";
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem("blackjack:muted", value ? "1" : "0");
  } catch {
    // negeren
  }
}

function getContext(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType, gain: number): void {
  const audioCtx = getContext();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = audioCtx.currentTime + startOffset;
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(gain, start + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playDeal(): void {
  tone(520, 0, 0.08, "triangle", 0.15);
}

export function playFlip(): void {
  tone(740, 0, 0.06, "square", 0.08);
}

export function playHit(): void {
  tone(420, 0, 0.1, "triangle", 0.15);
}

export function playChip(): void {
  tone(880, 0, 0.05, "sine", 0.12);
  tone(1180, 0.05, 0.08, "sine", 0.1);
}

export function playWin(): void {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.16));
}

export function playLose(): void {
  [392, 330, 262].forEach((f, i) => tone(f, i * 0.12, 0.3, "sawtooth", 0.1));
}

export function playPush(): void {
  tone(440, 0, 0.2, "sine", 0.12);
  tone(440, 0.15, 0.2, "sine", 0.12);
}
