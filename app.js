// Oberfläche: ein Bildschirm pro Schritt, Logik kommt aus src/logic.js
import { missions, instruments, buses, rockets } from './data/parts.js';
import { budgetLeft, deltaV, missionResult } from './src/logic.js';

const STEPS = ['Mission', 'Instruments', 'Satellite', 'Rocket', 'Launch', 'Result'];
const state = { step: 0, mission: missions[0], instruments: [], bus: null, rocket: null, result: null };

const $ = (id) => document.getElementById(id);
const money = (m) => `$${m.toFixed(1)}M`;

// Kleiner Helfer für DOM-Elemente
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) node.append(c);
  return node;
}

function chosenParts() {
  return [...state.instruments, state.bus, state.rocket].filter(Boolean);
}

function instMass() { return state.instruments.reduce((m, i) => m + i.mass, 0); }
function instPower() { return state.instruments.reduce((p, i) => p + i.power, 0); }

// Kopfzeile: Schritt und Budget
function renderHeader() {
  $('step').textContent = `Step ${state.step + 1} of ${STEPS.length}: ${STEPS[state.step]}`;
  const left = budgetLeft(state.mission.budget, chosenParts());
  $('budget').textContent = `Budget ${money(left)} of ${money(state.mission.budget)}`;
  $('budget').classList.toggle('low', left < 0);
}

function stats(rows) {
  return el('dl', {}, rows.map(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
}

function card({ title, rows, pressed, onclick }) {
  return el('button', { class: 'card', type: 'button', 'aria-pressed': String(pressed), onclick },
    el('h2', {}, title), stats(rows));
}

function meter(label, value, max, unit) {
  const pct = Math.min(100, max ? (value / max) * 100 : 100);
  const fill = el('span');
  fill.style.width = `${pct}%`; // über CSSOM, erlaubt unter style-src 'self'
  return el('div', { class: 'meter' },
    el('div', { class: 'meter-label' }, el('span', {}, label), el('span', {}, `${Math.round(value)} / ${Math.round(max)} ${unit}`)),
    el('div', { class: `bar${value > max ? ' over' : ''}` }, fill));
}

// Bildschirme
const screens = [
  () => el('section', {},
    el('h1', {}, state.mission.name),
    el('p', { class: 'lead' }, 'Your mission for this round.'),
    el('div', { class: 'mission' },
      el('p', {}, state.mission.goal),
      el('p', {}, `Budget: ${money(state.mission.budget)}`),
      el('p', {}, 'Reach orbit and spend as little as you can. Your best score is saved.'))),

  () => el('section', {},
    el('h1', {}, 'Choose instruments'),
    el('p', { class: 'lead' }, 'Each instrument adds science. It also adds mass, power draw and cost.'),
    el('div', { class: 'grid' }, instruments.map((i) => card({
      title: i.name,
      rows: [['Science', i.science], ['Mass', `${i.mass} kg`], ['Power', `${i.power} W`], ['Cost', money(i.cost)]],
      pressed: state.instruments.includes(i),
      onclick: () => {
        state.instruments = state.instruments.includes(i)
          ? state.instruments.filter((x) => x !== i) : [...state.instruments, i];
        render();
      },
    })))),

  () => el('section', {},
    el('h1', {}, 'Choose a satellite bus'),
    el('p', { class: 'lead' }, 'The bus carries your instruments and gives them power.'),
    el('div', { class: 'grid' }, buses.map((b) => card({
      title: b.name,
      rows: [['Carries', `${b.capacity} kg`], ['Power', `${b.power} W`], ['Own mass', `${b.mass} kg`], ['Cost', money(b.cost)]],
      pressed: state.bus === b,
      onclick: () => { state.bus = b; render(); },
    }))),
    state.bus ? el('div', { class: 'meters' },
      meter('Instrument mass', instMass(), state.bus.capacity, 'kg'),
      meter('Power draw', instPower(), state.bus.power, 'W')) : ''),

  () => {
    const payload = (state.bus ? state.bus.mass : 0) + instMass();
    return el('section', {},
      el('h1', {}, 'Book a rocket'),
      el('p', { class: 'lead' }, `Your satellite weighs ${payload} kg. The rocket needs enough delta-v to reach orbit.`),
      el('div', { class: 'grid' }, rockets.map((r) => card({
        title: r.name,
        rows: [['Delta-v with your satellite', `${Math.round(deltaV(r.stages, payload))} m/s`],
          ['Needed', `${state.mission.requiredDv} m/s`], ['Cost', money(r.cost)]],
        pressed: state.rocket === r,
        onclick: () => { state.rocket = r; render(); },
      }))));
  },

  () => {
    const canvas = el('canvas', { width: '860', height: '420', 'aria-label': 'Launch animation' });
    requestAnimationFrame(() => launch(canvas, state.result.reachedOrbit));
    return el('section', {}, el('h1', {}, 'Launch'), canvas);
  },

  () => {
    const r = state.result;
    const best = loadBest();
    const reasons = {
      budget: 'You spent more than your budget.',
      power: 'Your instruments need more power than the bus gives.',
      capacity: 'Your instruments are too heavy for the bus.',
      'delta-v': 'The rocket does not have enough delta-v for this satellite.',
    };
    return el('section', { class: 'result' },
      el('p', { class: `big ${r.reachedOrbit ? 'ok' : 'fail'}` }, r.reachedOrbit ? 'Orbit reached' : 'Mission failed'),
      r.problems.length ? el('ul', {}, r.problems.map((p) => el('li', {}, reasons[p]))) : '',
      stats([
        ['Spent', money(r.spent)],
        ['Budget left', money(r.budgetLeft)],
        ['Science', r.science],
        ['Science per $1M', r.sciencePerMillion.toFixed(2)],
        ['Your best', best ? `${best.toFixed(2)} science per $1M` : 'none yet'],
      ]));
  },
];

// Start-Animation: Rakete steigt, Flamme flackert, Bahn biegt in den Orbit oder bricht ab
function launch(canvas, success) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const stars = Array.from({ length: 90 }, () => [Math.random() * W, Math.random() * H, Math.random()]);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduce ? 1 : 4200;
  const start = performance.now();

  function pos(t) {
    // Bahn: erst senkrecht, dann Kurve nach rechts
    const x = 120 + Math.pow(t, 1.6) * (W - 240);
    const y = H - 40 - Math.sin(Math.min(t, 1) * Math.PI / 2) * (H - 120);
    return [x, y];
  }

  function frame(now) {
    let t = Math.min(1, (now - start) / duration);
    const failAt = 0.55;
    ctx.fillStyle = '#0b0a12';
    ctx.fillRect(0, 0, W, H);
    for (const [x, y, b] of stars) { ctx.fillStyle = `rgba(245,239,230,${0.3 + b * 0.7})`; ctx.fillRect(x, y, 2, 2); }
    // Erde unten
    ctx.fillStyle = '#1d3b5c';
    ctx.beginPath(); ctx.ellipse(W / 2, H + 260, W, 300, 0, 0, Math.PI * 2); ctx.fill();
    // Orbit-Linie
    ctx.strokeStyle = 'rgba(168,143,214,0.5)'; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(0, 80); ctx.lineTo(W, 80); ctx.stroke(); ctx.setLineDash([]);

    const tt = success ? t : Math.min(t, failAt);
    // Flugbahn
    ctx.strokeStyle = 'rgba(245,239,230,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let s = 0; s <= tt; s += 0.01) { const [x, y] = pos(s); s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();

    let [x, y] = pos(tt);
    if (!success && t > failAt) y += Math.pow((t - failAt) * 4, 2) * 120; // fällt zurück
    const [nx, ny] = pos(Math.min(1, tt + 0.01));
    const angle = Math.atan2(ny - y, nx - x) + Math.PI / 2;

    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    // Flamme, flackert
    if (success || t < failAt) {
      const f = 18 + Math.random() * 14;
      const grad = ctx.createLinearGradient(0, 14, 0, 14 + f);
      grad.addColorStop(0, '#fff3b0'); grad.addColorStop(0.5, '#ff9a3c'); grad.addColorStop(1, 'rgba(224,96,90,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-5, 14); ctx.lineTo(5, 14); ctx.lineTo(0, 14 + f); ctx.fill();
    }
    // Rakete
    ctx.fillStyle = '#F5EFE6'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(6, -6); ctx.lineTo(6, 14); ctx.lineTo(-6, 14); ctx.lineTo(-6, -6); ctx.fill();
    ctx.fillStyle = '#A88FD6'; ctx.fillRect(-6, 4, 12, 4);
    ctx.restore();

    if (t < 1) requestAnimationFrame(frame);
    else { $('next').disabled = false; }
  }
  $('next').disabled = true;
  requestAnimationFrame(frame);
}

// Bestwert im Browser speichern, ohne Login
function loadBest() {
  try { return Number(localStorage.getItem(`best-${state.mission.id}`)) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { if (v > loadBest()) localStorage.setItem(`best-${state.mission.id}`, String(v)); } catch { /* ohne Speicher spielbar */ }
}

// Weiter-Knopf: Text und ob er aktiv ist, je Schritt
function canGoNext() {
  if (state.step === 1) return state.instruments.length > 0;
  if (state.step === 2) return !!state.bus;
  if (state.step === 3) return !!state.rocket;
  return true;
}

const nextLabels = ['Start mission', 'Next', 'Next', 'Launch', 'See result', 'Try again cheaper'];

function render() {
  renderHeader();
  $('screen').replaceChildren(screens[state.step]());
  $('next').textContent = nextLabels[state.step];
  $('next').disabled = !canGoNext();
  $('back').classList.toggle('hidden', state.step === 0 || state.step >= 4);
  window.scrollTo(0, 0);
}

$('next').addEventListener('click', () => {
  if (state.step === 3) {
    state.result = missionResult(state);
    if (state.result.reachedOrbit) saveBest(state.result.sciencePerMillion);
  }
  if (state.step === 5) {
    Object.assign(state, { step: 0, instruments: [], bus: null, rocket: null, result: null });
  } else {
    state.step += 1;
  }
  render();
});

$('back').addEventListener('click', () => { state.step = Math.max(0, state.step - 1); render(); });

render();
