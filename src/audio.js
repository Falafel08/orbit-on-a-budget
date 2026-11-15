// Leise Weltraum-Musik, im Browser erzeugt (keine fremde Audiodatei, keine Lizenzfrage).
// Startet erst nach einem Klick, so verlangen es die Browser.
let ctx = null, master = null, playing = false;

function build() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return; // Browser ohne Web Audio: kein Ton, kein Absturz
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  // Weicher Klang aus vier Tönen (A-Moll mit None), langsam schwingender Filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 700;
  filter.connect(master);
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
  lfo.frequency.value = 0.05; lfoGain.gain.value = 300;
  lfo.connect(lfoGain).connect(filter.frequency); lfo.start();
  for (const f of [110, 164.81, 220, 246.94]) {
    for (const detune of [-6, 6]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = detune;
      g.gain.value = 0.025;
      o.connect(g).connect(filter); o.start();
    }
  }
}

export const isPlaying = () => playing;

export function setMusic(on) {
  if (on && !ctx) build();
  if (!ctx) return;
  playing = on;
  if (on) ctx.resume();
  master.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, 0.8);
  try { localStorage.setItem('music', on ? '1' : '0'); } catch { /* ohne Speicher */ }
}

export function wantsMusic() {
  // Standard an (Linus 14.11.), aus nur, wenn jemand sie ausgeschaltet hat
  try { return localStorage.getItem('music') !== '0'; } catch { return true; }
}

// Geräusche für den Start, im Browser erzeugt (Josias 14.11.: Start war nicht hörbar). Folgen der Ton-Einstellung.
let sfx = null;
function sfxCtx() {
  if (!wantsMusic()) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!sfx) sfx = new AC();
  if (sfx.state === 'suspended') sfx.resume();
  return sfx;
}
// kurzer Piepton (Countdown)
export function beep(freq = 660, dur = 0.14) {
  const c = sfxCtx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
// Rauschen, tief gefiltert: klingt wie ein Triebwerk. Gibt eine Funktion zum Abbrechen zurück.
export function rumble(seconds, stutter = false) {
  const c = sfxCtx(); if (!c) return () => {};
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  let lastV = 0;
  for (let i = 0; i < len; i++) { lastV = (lastV + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = lastV * 3.5; } // braunes Rauschen
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
  const g = c.createGain(), t0 = c.currentTime;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.8, t0 + 0.6);
  if (stutter) for (let k = 0.7; k < seconds; k += 0.18) g.gain.setValueAtTime(k * 7 % 2 > 1 ? 0.05 : 0.8, t0 + k); // stottert
  g.gain.setValueAtTime(0.8, t0 + Math.max(0.7, seconds - 0.8)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  src.connect(f).connect(g).connect(c.destination); src.start(t0); src.stop(t0 + seconds + 0.1);
  return () => { try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(0.0001, c.currentTime, 0.05); src.stop(c.currentTime + 0.3); } catch { /* schon gestoppt */ } };
}
// Knall bei einer Explosion
export function boomSound() {
  const c = sfxCtx(); if (!c) return;
  const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  const g = c.createGain(); g.gain.value = 1;
  src.connect(f).connect(g).connect(c.destination); src.start();
}

// Gesprochene Ansagen beim Flug (Linus und Freund 15.11.), Sprachausgabe des Browsers. Leicht tiefer und schneller wie Funk.
export function say(text, lang = 'en') {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'de' ? 'de-DE' : 'en-US'; u.rate = 1.05; u.pitch = 0.9; u.volume = 0.9;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}
export function hush() { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); }
