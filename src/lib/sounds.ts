"use client";

// Web Audio API Synthesizers for Codenames

let audioCtx: AudioContext | null = null;

const getAudioCtx = () => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

// Play a single oscillator beep
const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const SFX = {
  correct: () => {
    playTone(523.25, 'sine', 0.1, 0.2); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.2, 0.2), 100); // E5
  },
  neutral: () => {
    playTone(150, 'triangle', 0.2, 0.3); 
  },
  assassin: () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    
    // Simulate explosion blast using white noise-like saw + lowpass
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.5);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  },
  win: () => {
    // Triumphant Fanfare: C5 -> E5 -> G5 -> C6
    playTone(523.25, 'triangle', 0.2, 0.15); // C5
    setTimeout(() => playTone(659.25, 'triangle', 0.2, 0.15), 150); // E5
    setTimeout(() => playTone(783.99, 'triangle', 0.2, 0.15), 300); // G5
    setTimeout(() => playTone(1046.50, 'triangle', 0.4, 0.15), 450); // C6
  }
};
