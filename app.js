// Oberfläche: Start mit Schwierigkeit, dann drei Spalten (Teile, Rakete, Status), dann Start und Ergebnis
import { missions, instruments, buses, rockets } from './data/parts.js';
import { budgetLeft, deltaV, missionResult } from './src/logic.js';

const BUILD = ['Instruments', 'Satellite', 'Rocket'];
// Phasen: start, build, launch, result
const state = { phase: 'start', build: 0, mission: null, instruments: [], bus: null, rocket: null, result: null, info: null };

const $ = (id) => document.getElementById(id);
const money = (m) => (m < 1 ? `$${Math.round(m * 1000)}k` : `$${m.toFixed(1)}M`);
const kg = (m) => (m < 10 ? `${m.toFixed(1)} kg` : `${Math.round(m)} kg`);
const SVG = 'http://www.w3.org/2000/svg';

// Kleiner Helfer für DOM-Elemente
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c !== null && c !== '') node.append(c);
  return node;
}
function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}

const instMass = () => state.instruments.reduce((m, i) => m + i.mass, 0);
const instPower = () => state.instruments.reduce((p, i) => p + i.power, 0);
const science = () => state.instruments.reduce((s, i) => s + i.science, 0);
const payload = () => (state.bus ? state.bus.mass : 0) + instMass();
const chosen = () => [...state.instruments, state.bus, state.rocket].filter(Boolean);

// Teil wählen: Instrumente an/aus, Bus und Rakete ersetzen
function choose(kind, item) {
  if (kind === 'instrument') {
    state.instruments = state.instruments.includes(item)
      ? state.instruments.filter((x) => x !== item) : [...state.instruments, item];
  } else state[kind] = state[kind] === item ? null : item;
  state.info = item;
  render();
}

const catalogs = [
  { kind: 'instrument', items: instruments, hint: 'Drag instruments onto the rocket, or press Enter. Each one adds science, mass, power draw and cost.',
    rows: (i) => [['Science', i.science], ['Mass', kg(i.mass)], ['Power', `${i.power} W`]], picked: (i) => state.instruments.includes(i) },
  { kind: 'bus', items: buses, hint: 'The bus carries your instruments and gives them power. Drag one onto the rocket.',
    rows: (b) => [['Carries', kg(b.capacity)], ['Power', `${b.power} W`], ['Own mass', kg(b.mass)]], picked: (b) => state.bus === b },
  { kind: 'rocket', items: rockets, hint: 'Book a launch. A rocket needs enough delta-v. A rideshare only takes small CubeSats.',
    rows: (r) => (r.rideshare
      ? [['Max satellite', kg(r.maxPayload)]]
      : [['Delta-v with your satellite', `${Math.round(deltaV(r.stages, payload()))} m/s`]]), picked: (r) => state.rocket === r },
];

// Karte im Katalog: ziehbar, per Klick oder Enter wählbar
function card(cat, item) {
  const node = el('div', {
    class: 'card', role: 'button', tabindex: '0', draggable: 'true', 'aria-pressed': String(cat.picked(item)),
    onclick: () => choose(cat.kind, item),
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(cat.kind, item); } },
    onmouseenter: () => showInfo(item), onfocus: () => showInfo(item),
    ondragstart: (e) => { e.dataTransfer.setData('text/plain', `${cat.kind}:${item.id}`); node.classList.add('dragging'); },
    ondragend: () => node.classList.remove('dragging'),
  },
  el('h2', {}, el('span', {}, item.name), el('span', { class: 'price' }, money(item.cost))),
  el('dl', {}, cat.rows(item).map(([k, v]) => [el('dt', {}, k), el('dd', {}, String(v))])));
  return node;
}

function renderLeft() {
  const cat = catalogs[state.build];
  $('left').replaceChildren(
    el('nav', { class: 'steps', 'aria-label': 'Build steps' }, BUILD.map((name, i) => el('button', {
      type: 'button', 'aria-current': i === state.build ? 'step' : 'false',
      onclick: () => { state.build = i; render(); },
    }, name))),
    el('p', { class: 'hint' }, cat.hint),
    el('div', { class: 'catalog enter' }, cat.items.map((item) => card(cat, item))));
}

// Rechte Spalte: Zahlen der Mission und Erklärung zum Teil
function meter(label, value, max, text) {
  const fill = el('span');
  fill.style.width = `${Math.min(100, max ? (value / max) * 100 : 0)}%`; // CSSOM, erlaubt unter style-src 'self'
  return el('div', {},
    el('div', { class: 'meter-label' }, el('span', {}, label), el('span', {}, text)),
    el('div', { class: `bar${value > max ? ' over' : ''}` }, fill));
}

function showInfo(item) {
  state.info = item;
  const box = document.querySelector('.info');
  if (box) box.replaceChildren(el('strong', {}, item.name), item.info || '');
}

function renderRight() {
  const m = state.mission;
  const left = budgetLeft(m.budget, chosen());
  const meters = [meter('Science', science(), m.minScience, `${science()} / ${m.minScience} needed`)];
  if (state.bus) {
    meters.push(meter('Instrument mass', instMass(), state.bus.capacity, `${kg(instMass())} / ${kg(state.bus.capacity)}`));
    meters.push(meter('Power draw', instPower(), state.bus.power, `${instPower()} / ${state.bus.power} W`));
  }
  if (state.rocket && state.bus) {
    if (state.rocket.rideshare) meters.push(meter('Satellite mass', payload(), state.rocket.maxPayload, `${kg(payload())} / ${kg(state.rocket.maxPayload)}`));
    else {
      const dv = deltaV(state.rocket.stages, payload());
      // Balken zeigt Bedarf gegen Vorhandenes: voll und grün, wenn genug da ist
      meters.push(meter('Delta-v', m.requiredDv, dv, `${Math.round(dv)} / ${m.requiredDv} m/s needed`));
    }
  }
  $('right').replaceChildren(
    el('h2', {}, 'Budget left'),
    el('p', { class: 'big-number' }, money(left)),
    el('div', { class: 'meters' }, meters),
    el('div', { class: 'info' }, state.info ? [el('strong', {}, state.info.name), state.info.info || ''] : 'Point at a part to learn what it does.'));
}

// Mitte: Rakete als Umriss, zeigt die gewählten Teile und nimmt gezogene Teile an
function rocketSvg() {
  const s = svg('svg', { viewBox: '0 0 260 620', role: 'img', 'aria-label': 'Your rocket' });
  const stroke = 'rgba(245,239,230,0.55)';
  // Spitze mit Nutzlastraum
  s.append(svg('path', { d: 'M130 20 C 175 70 190 140 190 230 L 70 230 C 70 140 85 70 130 20 Z', fill: '#221f2b', stroke, 'stroke-width': 2 }));
  if (state.bus) {
    s.append(svg('rect', { x: 88, y: 150, width: 84, height: 70, rx: 6, fill: '#3a3245', stroke: '#A88FD6' }));
    s.append(svg('text', { x: 130, y: 212, 'text-anchor': 'middle', class: 'svg-muted' }, state.bus.name));
  } else {
    s.append(svg('text', { x: 130, y: 200, 'text-anchor': 'middle', class: 'svg-muted' }, 'Satellite bus'));
  }
  // Instrumente als Chips im Nutzlastraum, Klick entfernt
  state.instruments.forEach((inst, n) => {
    const y = 86 + n * 15;
    const g = svg('g', { class: 'chip', tabindex: '0', role: 'button', 'aria-label': `Remove ${inst.name}` });
    g.append(svg('rect', { x: 80, y: y - 10, width: 100, height: 13, rx: 4, fill: '#745F9A' }));
    g.append(svg('text', { x: 130, y: y, 'text-anchor': 'middle', class: 'svg-label', 'font-size': 9 }, inst.name.replace('CubeSat ', '')));
    g.addEventListener('click', () => choose('instrument', inst));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter') choose('instrument', inst); });
    s.append(g);
  });
  // Körper der Rakete mit Stufen
  const r = state.rocket;
  const dash = r ? {} : { 'stroke-dasharray': '6 6' };
  s.append(svg('rect', { x: 70, y: 230, width: 120, height: 150, fill: r ? '#2b2733' : 'none', stroke, 'stroke-width': 2, ...dash }));
  s.append(svg('rect', { x: 70, y: 380, width: 120, height: 180, fill: r ? '#2b2733' : 'none', stroke, 'stroke-width': 2, ...dash }));
  s.append(svg('path', { d: 'M70 500 L 40 570 L 70 560 Z M190 500 L 220 570 L 190 560 Z', fill: r ? '#3a3245' : 'none', stroke, ...dash }));
  s.append(svg('path', { d: 'M100 560 L 92 590 L 168 590 L 160 560 Z', fill: r ? '#3a3245' : 'none', stroke, ...dash }));
  s.append(svg('text', { x: 130, y: 310, 'text-anchor': 'middle', class: r ? 'svg-label' : 'svg-muted' }, r ? r.name : 'Rocket'));
  if (r && r.rideshare) s.append(svg('text', { x: 130, y: 330, 'text-anchor': 'middle', class: 'svg-muted' }, 'shared with others'));
  return s;
}

function renderBuild() {
  const zone = el('div', { class: 'dropzone' }, rocketSvg());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('over');
    const [kind, id] = e.dataTransfer.getData('text/plain').split(':');
    const cat = catalogs.find((c) => c.kind === kind);
    const item = cat && cat.items.find((x) => x.id === id);
    if (item && !cat.picked(item)) choose(kind, item);
  });
  return zone;
}

// Startbildschirm: Schwierigkeit wählen
function renderStart() {
  const best = (m) => loadBest(m);
  return el('section', { class: 'enter' },
    el('h1', {}, 'Choose your difficulty'),
    el('p', { class: 'lead' }, 'Reach orbit, bring enough science and spend as little as you can.'),
    el('div', { class: 'levels' }, missions.map((m) => el('div', {
      class: 'card level', role: 'button', tabindex: '0',
      onclick: () => startMission(m),
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startMission(m); } },
    },
    el('span', { class: 'tag' }, m.level),
    el('h2', {}, m.name),
    el('p', {}, m.goal),
    el('dl', {},
      el('dt', {}, 'Budget'), el('dd', {}, money(m.budget)),
      el('dt', {}, 'Science needed'), el('dd', {}, String(m.minScience)),
      el('dt', {}, 'Your best'), el('dd', {}, best(m) ? `${best(m).toFixed(1)} per $1M` : 'none yet'))))));
}

function startMission(m) {
  Object.assign(state, { mission: m, phase: 'build', build: 0, instruments: [], bus: null, rocket: null, info: null });
  render();
}

// Start-Animation: Zünden mit Feuerball und Wackeln, dann Flug bis in den Orbit oder Absturz
function launch(canvas, success) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const W = rect.width, H = rect.height;
  const stars = Array.from({ length: 140 }, () => [Math.random() * W, Math.random() * H, Math.random()]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ignite = reduce ? 1 : 900, fly = reduce ? 1 : 4200;
  const failAt = 0.5;
  const start = performance.now();
  if (!reduce) { $('center').classList.add('shake'); setTimeout(() => $('center').classList.remove('shake'), 500); }

  const pos = (t) => [W * 0.25 + Math.pow(t, 1.7) * W * 0.6, H - 90 - Math.sin(Math.min(t, 1) * Math.PI / 2) * (H - 190)];

  function fireball(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,243,176,${a})`); g.addColorStop(0.4, `rgba(255,154,60,${a * 0.9})`); g.addColorStop(1, 'rgba(224,96,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function rocketAt(x, y, angle, scale, flame) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    if (flame) {
      const f = 22 + Math.random() * 18;
      const grad = ctx.createLinearGradient(0, 16, 0, 16 + f);
      grad.addColorStop(0, '#fff3b0'); grad.addColorStop(0.5, '#ff9a3c'); grad.addColorStop(1, 'rgba(224,96,90,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(6, 16); ctx.lineTo(0, 16 + f); ctx.fill();
    }
    ctx.fillStyle = '#F5EFE6'; ctx.beginPath();
    ctx.moveTo(0, -22); ctx.lineTo(7, -8); ctx.lineTo(7, 16); ctx.lineTo(-7, 16); ctx.lineTo(-7, -8); ctx.fill();
    ctx.fillStyle = '#A88FD6'; ctx.fillRect(-7, 4, 14, 4);
    ctx.restore();
  }

  function frame(now) {
    const el = now - start;
    ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, W, H);
    for (const [x, y, b] of stars) { ctx.fillStyle = `rgba(245,239,230,${0.25 + b * 0.6})`; ctx.fillRect(x, y, 1.6, 1.6); }
    ctx.fillStyle = '#1d3b5c'; ctx.beginPath(); ctx.ellipse(W / 2, H + 380, W * 1.1, 440, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(168,143,214,0.5)'; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(0, 100); ctx.lineTo(W, 100); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(184,175,166,0.8)'; ctx.font = '13px sans-serif'; ctx.fillText('Orbit', 12, 92);

    const [x0, y0] = pos(0);
    if (el < ignite) {
      // Zünden: Rakete steht, Feuerball unten wächst, Nahaufnahme
      const k = el / ignite;
      fireball(x0, y0 + 30, 30 + k * 60, 0.9);
      rocketAt(x0, y0 - Math.random() * 2, 0, 2.2, true);
    } else {
      const t = Math.min(1, (el - ignite) / fly);
      const tt = success ? t : Math.min(t, failAt);
      if (t < 0.15) fireball(x0, y0 + 30, 90 * (1 - t / 0.15), 0.8);
      ctx.strokeStyle = 'rgba(245,239,230,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let s = 0; s <= tt; s += 0.01) { const [x, y] = pos(s); s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      const [x, y] = pos(tt);
      const [nx, ny] = pos(Math.min(1, tt + 0.01));
      const angle = Math.atan2(ny - y, nx - x) + Math.PI / 2;
      const scale = 2.2 - Math.min(1, tt * 2) * 1.2; // Kamera zoomt heraus
      if (!success && t > failAt) {
        fireball(x, y, 20 + (t - failAt) * 160, Math.max(0, 1 - (t - failAt) * 2));
      } else rocketAt(x, y, angle, scale, true);
      if (t >= 1) { $('next').disabled = false; return; }
    }
    requestAnimationFrame(frame);
  }
  $('next').disabled = true;
  requestAnimationFrame(frame);
}

function renderResult() {
  const r = state.result;
  const reasons = {
    budget: 'You spent more than your budget.',
    power: 'Your instruments need more power than the bus gives.',
    capacity: 'Your instruments are too heavy for the bus.',
    'delta-v': 'The rocket does not have enough delta-v for this satellite.',
    'rideshare-mass': 'Your satellite is too heavy for a CubeSat rideshare.',
    science: `You reached orbit, but the mission needs ${state.mission.minScience} science.`,
  };
  const best = loadBest(state.mission);
  return el('section', { class: 'result enter' },
    el('p', { class: `big ${r.success ? 'ok' : 'fail'}` }, r.success ? 'Mission complete' : (r.reachedOrbit ? 'Not enough science' : 'Mission failed')),
    r.problems.length ? el('ul', {}, r.problems.map((p) => el('li', {}, reasons[p]))) : '',
    el('dl', {},
      el('dt', {}, 'Spent'), el('dd', {}, money(r.spent)),
      el('dt', {}, 'Budget left'), el('dd', {}, money(r.budgetLeft)),
      el('dt', {}, 'Science'), el('dd', {}, String(r.science)),
      el('dt', {}, 'Science per $1M'), el('dd', {}, r.sciencePerMillion.toFixed(1)),
      el('dt', {}, 'Your best'), el('dd', {}, best ? best.toFixed(1) : 'none yet')));
}

// Bestwert im Browser speichern, ohne Login
function loadBest(m) {
  try { return Number(localStorage.getItem(`best-${m.id}`)) || 0; } catch { return 0; }
}
function saveBest(m, v) {
  try { if (v > loadBest(m)) localStorage.setItem(`best-${m.id}`, String(v)); } catch { /* ohne Speicher spielbar */ }
}

// Knöpfe unten je Phase
function footer() {
  const back = $('back'), next = $('next');
  back.classList.toggle('hidden', state.phase === 'start' || state.phase === 'launch');
  next.classList.toggle('hidden', state.phase === 'start');
  if (state.phase === 'build') {
    back.textContent = state.build === 0 ? 'Change difficulty' : 'Back';
    const ready = [state.instruments.length > 0, !!state.bus, !!state.rocket][state.build];
    next.textContent = state.build === 2 ? 'Launch' : 'Next';
    next.disabled = !ready;
  } else if (state.phase === 'launch') {
    next.textContent = 'See result';
  } else if (state.phase === 'result') {
    back.textContent = 'Change difficulty';
    next.textContent = 'Try again cheaper';
    next.disabled = false;
  }
}

function render() {
  const stage = $('stage');
  stage.classList.toggle('full', state.phase === 'start' || state.phase === 'result');
  stage.classList.toggle('launching', state.phase === 'launch');
  const m = state.mission;
  $('mission-label').textContent = m ? `${m.level}: ${m.name}` : '';
  if (m) {
    const left = budgetLeft(m.budget, chosen());
    $('budget').textContent = `Budget ${money(left)} of ${money(m.budget)}`;
    $('budget').classList.toggle('low', left < 0);
  } else $('budget').textContent = '';

  if (state.phase === 'start') $('center').replaceChildren(renderStart());
  if (state.phase === 'build') { renderLeft(); renderRight(); $('center').replaceChildren(renderBuild()); }
  if (state.phase === 'launch') {
    const canvas = el('canvas', { 'aria-label': 'Launch animation' });
    $('center').replaceChildren(el('div', { class: 'launch-wrap enter' }, canvas));
    // erst nach dem Aufziehen des Vorhangs starten, damit die Größe stimmt
    setTimeout(() => launch(canvas, state.result.reachedOrbit), 480);
  }
  if (state.phase === 'result') $('center').replaceChildren(renderResult());
  footer();
}

$('next').addEventListener('click', () => {
  if (state.phase === 'build') {
    if (state.build < 2) { state.build += 1; render(); return; }
    state.result = missionResult(state);
    if (state.result.success) saveBest(state.mission, state.result.sciencePerMillion);
    state.phase = 'launch';
  } else if (state.phase === 'launch') state.phase = 'result';
  else if (state.phase === 'result') { state.phase = 'build'; state.build = 0; }
  render();
});

$('back').addEventListener('click', () => {
  if (state.phase === 'build' && state.build > 0) state.build -= 1;
  else { state.phase = 'start'; state.mission = null; }
  render();
});

render();
