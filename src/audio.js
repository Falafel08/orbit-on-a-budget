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
