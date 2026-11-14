// Oberfläche: Home, Schwierigkeit (Waben), dann drei Spalten (Teile, Rakete, Status), dann Start und Ergebnis
import { facts } from './data/facts.js';
import { nasaSources, otherSources } from './data/sources.js';
import { missions, instruments, buses, panels, rockets, starship, contracts, LEVELS, CAMPAIGN_START } from './data/parts.js';
import { settleContract, isBankrupt, cheapestMission, moduleBus } from './src/campaign.js';
import { budgetLeft, deltaV, missionResult, launchOutcome } from './src/logic.js';
import { t, tr, getLang, setLang } from './src/i18n.js';
import { startSpace } from './src/space.js';
import { setMusic, isPlaying, wantsMusic } from './src/audio.js';
import { pointsForMission, ownRocketCost, ownRocketReliability } from './src/research.js';

// ---------- Forschung: Stand über alle Missionen im Browser gespeichert ----------
// Eigene Rakete: zwei Stufen, ausgelegt mit der Raketengleichung (etwa 1,6 t in 800 km)
const OWN_STAGES = [{ dryMass: 6000, propMass: 60000, isp: 295 }, { dryMass: 900, propMass: 9500, isp: 340 }];
const PROJECTS = [
  { id: 'own-rocket', rp: 15, seconds: 40, name: 'projOwn', info: 'projOwnInfo' },
  { id: 'reuse', rp: 30, seconds: 60, name: 'projReuse', info: 'projReuseInfo', needs: 'own-rocket' },
  { id: 'quality', rp: 25, seconds: 50, name: 'projQuality', info: 'projQualityInfo', needs: 'own-rocket' },
];
const SKIP_RP = 5;
let research = { rp: 0, done: {}, flights: 0, active: null };
try { research = { ...research, ...JSON.parse(localStorage.getItem('research') || '{}') }; } catch { /* Neustart */ }
const saveResearch = () => { try { localStorage.setItem('research', JSON.stringify(research)); } catch { /* ohne Speicher */ } };

function ownRocket() {
  return {
    id: 'own', name: research.name || t('ownRocketName'), info: t('ownRocketInfo', { n: research.flights }),
    reliability: ownRocketReliability(research.flights, !!research.done.quality),
    cost: ownRocketCost(research.flights, !!research.done.reuse), stages: OWN_STAGES,
  };
}
// ---------- Kampagne: Stand im Browser ----------
const freshCompany = () => ({ cash: CAMPAIGN_START, index: 0, over: false });
let company = freshCompany();
try { company = { ...company, ...JSON.parse(localStorage.getItem('company') || '{}') }; } catch { /* Neustart */ }
const saveCompany = () => { try { localStorage.setItem('company', JSON.stringify(company)); } catch { /* ohne Speicher */ } };
const bestCompany = () => { try { return Number(localStorage.getItem('best-company')) || 0; } catch { return 0; } };

// Auftrag als Mission: Teile der Basis-Mission, Budget = Firmengeld
function contractMission(c) {
  if (c.module) {
    return { id: `campaign-${c.id}`, level: 'Intermediate', name: tr(c, 'client'), goal: tr(c, 'goal'), budget: company.cash,
      minScience: 0, requiredDv: 9500, allowed: ['pegasus', 'falcon9', 'own', 'starship'], module: c.module, contract: c, de: null };
  }
  const base = missions.find((m) => m.id === c.base);
  return { ...base, id: `campaign-${c.id}`, name: tr(c, 'client'), goal: tr(c, 'goal'), budget: company.cash, minScience: c.minScience, contract: c, de: null };
}

// Starship gibt es nur in der Kampagne, ab dem zweiten Auftrag
const campaignRockets = (index) => [...rockets, ...(research.done['own-rocket'] ? [ownRocket()] : []), ...(index >= 1 ? [starship] : [])];
const rocketList = () => (state.mission && state.mission.contract ? campaignRockets(company.index)
  : [...rockets, ...(research.done['own-rocket'] ? [ownRocket()] : [])]);

// Forschung läuft im Hintergrund weiter, solange das Spiel offen ist
setInterval(() => {
  const a = research.active;
  if (!a) return;
  const project = PROJECTS.find((x) => x.id === a.id);
  a.progress = Math.min(1, a.progress + (0.25 / project.seconds) * (a.fast ? 2 : 1));
  if (a.progress >= 1) { research.done[a.id] = true; research.active = null; }
  saveResearch();
  if (state.phase === 'research') render();
}, 250);

// Phasen: home, start (Waben), build, launch, result
const state = { phase: 'home', build: 0, mission: null, instruments: [], bus: null, panel: null, rocket: null, result: null, info: null };

const $ = (id) => document.getElementById(id);
// Geld: unter 1 Mio. in Tausend, Minus vor dem Dollarzeichen
const money = (m) => {
  const a = Math.abs(m), sign = m < 0 ? '-' : '';
  return a < 1 ? `${sign}$${Math.round(a * 1000)}k` : `${sign}$${a.toFixed(1)}M`;
};
const kg = (m) => (m < 10 ? `${m.toFixed(1)} kg` : `${Math.round(m).toLocaleString('en-US')} kg`);
const budgetText = (m, v) => (m.free ? t('noLimit') : money(v));
const SVG = 'http://www.w3.org/2000/svg';

// Kleiner Helfer für DOM-Elemente
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c !== null && c !== '' && c !== undefined) node.append(c);
  return node;
}
function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}
const press = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

const instMass = () => state.instruments.reduce((m, i) => m + i.mass, 0);
const instPower = () => state.instruments.reduce((p, i) => p + i.power, 0);
const science = () => state.instruments.reduce((s, i) => s + i.science, 0);
const payload = () => (state.bus ? state.bus.mass : 0) + instMass() + (state.panel ? state.panel.mass : 0);
const powerAvailable = () => (state.bus ? state.bus.power : 0) + (state.panel ? state.panel.power : 0);
// Versicherung: 8 % des Raketenpreises, auf 1.000 $ genau (bei 0,1 Mio. $ wurde der Mitflug-Preis zu 0 und wirkte nicht)
const insurancePrice = (rocket) => Math.round(rocket.cost * 0.08 * 1000) / 1000;
const insuranceCost = () => (state.insured && state.rocket && !state.rocket.uninsurable ? insurancePrice(state.rocket) : 0);
const chosen = () => [...state.instruments, state.bus, state.panel, state.rocket, insuranceCost() ? { cost: insuranceCost() } : null].filter(Boolean);
// Teile, die die aktuelle Mission anbietet
const offered = (items) => (state.mission && state.mission.allowed ? items.filter((x) => state.mission.allowed.includes(x.id)) : items);

// ---------- Home und Waben ----------

// Satellit nach der Skizze: Körper, zwei Solarflügel, eigenes Abzeichen statt NASA-Schriftzug
function satelliteSvg() {
  const s = svg('svg', { viewBox: '0 0 600 260' });
  const panel = (x) => {
    const g = svg('g');
    g.append(svg('rect', { x, y: 70, width: 200, height: 120, rx: 4, fill: '#2b3a6b', stroke: '#F5EFE6', 'stroke-width': 3 }));
    for (let i = 1; i < 5; i++) g.append(svg('line', { x1: x + i * 40, y1: 70, x2: x + i * 40, y2: 190, stroke: '#9fb3e8', 'stroke-width': 1.5 }));
    for (let j = 1; j < 3; j++) g.append(svg('line', { x1: x, y1: 70 + j * 40, x2: x + 200, y2: 70 + j * 40, stroke: '#9fb3e8', 'stroke-width': 1.5 }));
    return g;
  };
  s.append(panel(10), panel(390));
  s.append(svg('rect', { x: 210, y: 122, width: 40, height: 16, fill: '#B8AFA6' }));
  s.append(svg('rect', { x: 350, y: 122, width: 40, height: 16, fill: '#B8AFA6' }));
  s.append(svg('rect', { x: 245, y: 60, width: 110, height: 140, rx: 50, fill: '#d9d2c7', stroke: '#F5EFE6', 'stroke-width': 3 }));
  s.append(svg('circle', { cx: 300, cy: 130, r: 30, fill: '#745F9A' }));
  s.append(svg('text', { x: 300, y: 137, 'text-anchor': 'middle', fill: '#fff', 'font-size': 20, 'font-weight': 700, 'font-family': 'sans-serif' }, 'OoB'));
  s.append(svg('line', { x1: 300, y1: 60, x2: 300, y2: 20, stroke: '#F5EFE6', 'stroke-width': 3 }));
  s.append(svg('circle', { cx: 300, cy: 16, r: 6, fill: '#ff9a3c' }));
  return s;
}

const LEVEL_CLASS = { Easy: 'h-easy', Intermediate: 'h-intermediate', Hard: 'h-hard', Unrestricted: 'h-unrestricted' };

function renderHome() {
  const choosing = state.phase === 'start';
  $('home').classList.add('show');
  $('home').classList.toggle('choosing', choosing);
  $('lang').replaceChildren(el('span', { 'aria-hidden': 'true' }, '🌐'), getLang().toUpperCase());
  $('lang').setAttribute('aria-label', t('languageToggle'));
  $('credits-btn').textContent = t('credits');
  $('version').textContent = t('version');
  if (!$('sat').firstChild) $('sat').append(satelliteSvg());

  $('side-buttons').replaceChildren(...(choosing
    ? [el('button', { class: 'hexbtn', type: 'button', onclick: () => { state.returnTo = 'start'; go('research'); } }, `${t('research')} · ${research.rp} ${t('rpShort')}`),
      el('button', { class: 'hexbtn ghost', type: 'button', onclick: openSettings }, t('settings')),
      el('button', { class: 'hexbtn ghost', type: 'button', onclick: () => go('home') }, t('menu'))]
    : [el('button', { class: 'hexbtn', type: 'button', onclick: () => go('start') }, t('play')),
      el('button', { class: 'hexbtn', type: 'button', onclick: () => go('company') }, t('campaign')),
      el('button', { class: 'hexbtn ghost', type: 'button', onclick: openSettings }, t('settings'))]));

  $('hexes').replaceChildren(el('h2', { class: 'hex-title' }, t('chooseDifficulty')), ...missions.map((m) => {
    const best = loadBest(m);
    return el('button', { class: `hex ${LEVEL_CLASS[m.level]}`, type: 'button', onclick: () => startMission(m), title: tr(m, 'goal') },
      !m.free && best ? el('span', { class: 'done', 'aria-label': t('completed') }, '✓') : '',
      el('span', { class: 'lvl' }, t(`lvl${m.level}`)),
      el('span', { class: 'meta' }, m.free ? t('noLimit') : `${t('budget')} ${money(m.budget)}`),
      !m.free && best ? el('span', { class: 'meta' }, `${t('best')}: ${best.toFixed(1)}`) : '');
  }));
}

function go(phase) {
  state.phase = phase;
  if (phase === 'home') state.mission = null;
  render();
}

function startMission(m) {
  leftStep = null; // neue Mission: links oben anfangen
  state.rocketView = null;
  Object.assign(state, { mission: m, phase: 'build', build: 0, instruments: [], bus: null, panel: null, rocket: null, insured: false, info: null });
  if (m.module) Object.assign(state, { build: 1, bus: { ...moduleBus(m.module), name: m.module.name, de: m.module.de } });
  state.rocket = offered(rocketList())[0] || null; // vorne im Karussell = gewählt
  render();
}

// ---------- Einstellungen und Credits ----------

function seg(options, current, onPick) {
  return el('div', { class: 'seg' }, options.map(([value, label]) =>
    el('button', { type: 'button', 'aria-pressed': String(value === current), onclick: () => onPick(value) }, label)));
}

function openSettings() {
  const panel = $('panel');
  const draw = (note = '') => panel.replaceChildren(
    el('h2', {}, t('settings')),
    el('div', { class: 'row' }, el('span', {}, t('music')),
      seg([[true, t('on')], [false, t('off')]], isPlaying(), (v) => { setMusic(v); updateSound(); draw(); })),
    el('div', { class: 'row' }, el('span', {}, t('language')),
      seg([['en', 'English'], ['de', 'Deutsch']], getLang(), (v) => { setLang(v); render(); draw(); })),
    el('div', { class: 'row' }, el('button', { class: 'danger', type: 'button', onclick: () => { resetBest(); render(); draw(t('bestReset')); } }, t('resetBest'))),
    note ? el('p', {}, note) : '',
    el('div', { class: 'actions' }, el('button', { type: 'button', onclick: () => panel.close() }, t('close'))));
  draw();
  panel.showModal();
}

function openCredits() {
  const panel = $('panel');
  panel.replaceChildren(
    el('h2', {}, t('credits')),
    ...['creditsIdea', 'creditsTeam', 'creditsCode', 'creditsEvent'].map((k) => el('p', {}, t(k))),
    el('div', { class: 'actions' },
      el('button', { type: 'button', onclick: openSources }, t('sources')),
      el('button', { type: 'button', onclick: () => panel.close() }, t('close'))));
  if (!panel.open) panel.showModal();
}

// Quellen mit Links (Jury: Validität), aus den Credits erreichbar. NASA-Daten zuerst, dann weitere, dann Spiel-Annahmen.
function openSources() {
  const panel = $('panel');
  panel.replaceChildren(
    el('h2', {}, t('sources')),
    ...[['srcNasa', nasaSources], ['srcOther', otherSources]].flatMap(([head, list]) => [
      el('h3', {}, t(head)),
      el('ul', { class: 'sources' }, list.map((x) => el('li', {}, el('a', { href: x.url, target: '_blank', rel: 'noopener' }, x[getLang()]))))]),
    el('h3', {}, t('srcAssumed')),
    el('p', { class: 'hint' }, t('srcAssumedText')),
    el('div', { class: 'actions' },
      el('button', { type: 'button', onclick: openCredits }, t('back')),
      el('button', { type: 'button', onclick: () => panel.close() }, t('close'))));
}

function updateSound() {
  $('sound').textContent = isPlaying() ? '🔊' : '🔈';
  $('sound').setAttribute('aria-label', t('musicToggle'));
  $('sound').setAttribute('aria-pressed', String(isPlaying()));
}

// ---------- Bauen: Teile, Rakete, Status ----------

function choose(kind, item) {
  if (kind === 'instrument') {
    state.instruments = state.instruments.includes(item)
      ? state.instruments.filter((x) => x !== item) : [...state.instruments, item];
  } else state[kind] = state[kind] && state[kind].id === item.id ? null : item;
  state.info = item;
  render();
}

const catalogs = [
  { kind: 'instrument', items: instruments, hint: 'hintInstrument',
    rows: (i) => [[t('science'), i.science], [t('mass'), kg(i.mass)], [t('power'), `${i.power} W`]], picked: (i) => state.instruments.includes(i) },
  { kind: 'bus', items: buses, hint: 'hintBus', group: 'groupBus',
    rows: (b) => [[t('carries'), kg(b.capacity)], [t('ownMass'), kg(b.mass)]], picked: (b) => state.bus === b },
  { kind: 'panel', items: panels, group: 'groupPanel',
    rows: (pn) => [[t('power'), `${pn.power} W`], [t('mass'), kg(pn.mass)]], picked: (pn) => state.panel === pn },
  { kind: 'rocket', get items() { return rocketList(); }, hint: 'hintRocket',
    rows: (r) => [...(r.maxPayload !== undefined
      ? [[t('carriesToOrbit'), kg(r.maxPayload)], [t('yourSatellite'), kg(payload())]]
      : [[t('dvWithSat'), `${Math.round(deltaV(r.stages, payload()))} m/s`]]),
    [t('successRate'), `${(r.reliability * 100).toFixed(r.reliability > 0.99 ? 1 : 0)} %`],
    ...(r.claim ? [[t('dataSource'), t('spacexClaim')]] : [])], picked: (r) => !!state.rocket && state.rocket.id === r.id },
];

// Bilder auf den Karten (Linus 14.11.): jedes Teil räumlich gezeichnet wie die Raketen, dreht sich langsam.
// Kleine Iso-Helfer mit Maßstab 22 px pro Einheit, Ursprung in der Bildmitte.
const pIso = (x, y) => [(x - y) * 22, (x + y) * 11];
function pBox(cx, cy, w, d, h, [top, left, right], lines = 0) {
  const g = svg('g');
  const at = (x, y) => { const [a, b] = pIso(x, y); return [a + cx, b + cy]; };
  const a = at(-w / 2, -d / 2), b = at(w / 2, -d / 2), c = at(w / 2, d / 2), e = at(-w / 2, d / 2);
  const up = ([x, y], k = h) => [x, y - k];
  g.append(svg('polygon', { points: pts([e, c, up(c), up(e)]), fill: left }));
  g.append(svg('polygon', { points: pts([c, b, up(b), up(c)]), fill: right }));
  g.append(svg('polygon', { points: pts([up(a), up(b), up(c), up(e)]), fill: top }));
  // Fugen zwischen CubeSat-Einheiten oder Falten der Folie
  for (let i = 1; i < lines; i++) {
    const k = (h * i) / lines;
    g.append(svg('path', { d: `M${up(e, k).join(' ')} L${up(c, k).join(' ')} L${up(b, k).join(' ')}`, stroke: 'rgba(0,0,0,0.35)', 'stroke-width': 0.8, fill: 'none' }));
  }
  return g;
}

// Solarflügel als schräge Fläche entlang der x-Richtung, mit Zellen
function pWing(cx, cy, x0, len, y0, y1) {
  const g = svg('g');
  const at = (x) => { const [a, b] = pIso(x, 0); return [a + cx, b + cy]; };
  const p0 = at(x0), p1 = at(x0 + len);
  g.append(svg('polygon', { points: pts([[p0[0], p0[1] - y0], [p1[0], p1[1] - y0], [p1[0], p1[1] - y1], [p0[0], p0[1] - y1]]), fill: '#2b3a6b', stroke: '#9fb3e8', 'stroke-width': 0.8 }));
  const cells = Math.max(2, Math.round(Math.abs(len) * 3));
  for (let i = 1; i < cells; i++) {
    const q = at(x0 + (len * i) / cells);
    g.append(svg('line', { x1: q[0], y1: q[1] - y0, x2: q[0], y2: q[1] - y1, stroke: '#9fb3e8', 'stroke-width': 0.5 }));
  }
  const m0 = (y0 + y1) / 2;
  g.append(svg('line', { x1: p0[0], y1: p0[1] - m0, x2: p1[0], y2: p1[1] - m0, stroke: '#9fb3e8', 'stroke-width': 0.5 }));
  return g;
}

const GOLD = ['#e8cc7a', '#9a7a30', '#b8963e'];
const ALU = ['#e4ded4', '#8a857c', '#b8b0a4'];
const CELL = ['#3d5196', '#1f2b52', '#2b3a6b'];

function partPicture(kind, item) {
  const s = svg('svg', { viewBox: '-55 -58 110 98', class: 'part-pic', 'aria-hidden': 'true' });
  s.append(svg('ellipse', { cx: 0, cy: 34, rx: 34, ry: 8, fill: 'rgba(0,0,0,0.35)' })); // Schatten
  const id = item.id;
  if (kind === 'bus') {
    if (id.startsWith('cube-')) {
      const n = parseInt(id.slice(5), 10);                         // 1, 3, 6, 12 Einheiten
      const [w, d, h, lines] = { 1: [0.8, 0.8, 22, 1], 3: [0.8, 0.8, 54, 3], 6: [1.5, 0.8, 54, 3], 12: [1.5, 1.5, 54, 3] }[n];
      s.append(pBox(0, 30, w, d, h, ALU, lines));
    } else {
      const k = { 'bus-s': 0.8, 'bus-m': 1.1, 'bus-l': 1.45 }[id] || 1;
      s.append(pBox(0, 30, k * 1.2, k * 1.2, k * 36, GOLD, 3));
      if (id !== 'bus-s') {                                        // Antenne auf größeren Bussen
        const top = 30 - k * 36;
        s.append(svg('line', { x1: 0, y1: top, x2: 0, y2: top - 10, stroke: '#d9d2c7', 'stroke-width': 1.5 }));
        s.append(svg('path', { d: `M-9 ${top - 14} Q0 ${top - 4} 9 ${top - 14} Z`, fill: '#F5EFE6' }));
      }
    }
  } else if (kind === 'panel') {
    if (id === 'panel-body') {
      s.append(pBox(0, 30, 0.9, 0.9, 30, CELL, 0));               // Zellen direkt auf dem Gehäuse
    } else {
      const cube = id === 'panel-deploy';
      const bw = cube ? 0.6 : 0.8, bh = cube ? 26 : 30;
      const len = { 'panel-deploy': 0.9, 'panel-s': 1.3, 'panel-m': 1.3, 'panel-l': 1.9 }[id];
      const two = id !== 'panel-s';
      const y0 = bh * 0.25, y1 = bh * (id === 'panel-l' ? 0.95 : 0.8);
      if (two) s.append(pWing(0, 30, -bw / 2, -len, y0, y1));       // hinterer Flügel zuerst
      s.append(pBox(0, 30, bw, bw, bh, cube ? ALU : GOLD, cube ? 1 : 2));
      s.append(pWing(0, 30, bw / 2, len, y0, y1));
    }
  } else {
    const g = svg('g', { transform: 'translate(0 30) scale(52)' });
    for (const p of instrumentShape(id)) g.append(p);
    s.append(g);
  }
  return s;
}

function card(cat, item) {
  const node = el('div', {
    class: 'card', role: 'button', tabindex: '0', draggable: 'true', 'aria-pressed': String(cat.picked(item)),
    onclick: () => choose(cat.kind, item),
    onkeydown: press(() => choose(cat.kind, item)),
    onmouseenter: () => showInfo(item), onfocus: () => showInfo(item),
    ondragstart: (e) => { e.dataTransfer.setData('text/plain', `${cat.kind}:${item.id}`); node.classList.add('dragging'); },
    ondragend: () => node.classList.remove('dragging'),
  },
  partPicture(cat.kind, item),
  el('div', { class: 'card-body' },
    el('h2', {}, el('span', {}, tr(item, 'name')), el('span', { class: 'price' }, money(item.cost))),
    el('dl', {}, cat.rows(item).map(([k, v]) => [el('dt', {}, k), el('dd', {}, String(v))]))));
  node.classList.add('with-pic');
  return node;
}

// Schritte: Instrumente, Satellit (Bus und Solarpanel), Rakete
// Die Rakete wählt man im Karussell in der Mitte, darum nur zwei Schritte
const STEP_CATS = [['instrument'], ['bus', 'panel']];

// Raketen als Karussell in der Mitte (Skizze Josias NASA.pdf, Linus 14.11.).
// Die Rakete vorne ist die gewählte und trägt den Satelliten sichtbar in der Spitze.
let gradSeq = 0;
const ROCKET_LOOK = {
  rideshare: { H: 170, w: 16, body: ['#ece6dc', '#b8b0a4'] },
  pegasus: { H: 165, w: 16, body: ['#f5efe6', '#bdb5a9'] },
  own: { H: 230, w: 20, body: ['#c9b6ec', '#7d68a6'] },
  falcon9: { H: 285, w: 20, body: ['#ffffff', '#c9c2b8'] },
  starship: { H: 305, w: 32, body: ['#d6dbe1', '#8d949c'] },
};

// Satellit in der Spitze: Körper, eingeklappte Solarflügel, Instrumente obendrauf (Klick entfernt sie)
function payloadIn(g, cx, bottom, maxW, maxH) {
  if (!state.bus && !state.instruments.length) {
    g.append(svg('text', { x: cx, y: bottom - maxH / 2, 'text-anchor': 'middle', class: 'svg-muted', 'font-size': 6 }, t('satelliteBus')));
    return;
  }
  const bw = state.bus ? Math.min(maxW - 10, 12 + Math.sqrt(state.bus.capacity) * 1.1) : 0;
  const bh = state.bus ? Math.min(maxH * 0.45, bw * 0.8) : 0;
  const top = bottom - 2 - bh;
  if (state.bus) {
    if (state.panel) for (const x of [cx - bw / 2 - 4, cx + bw / 2 + 1]) g.append(svg('rect', { x, y: top, width: 3, height: bh, fill: '#2b3a6b', stroke: '#9fb3e8', 'stroke-width': 0.4 }));
    g.append(svg('rect', { x: cx - bw / 2, y: top, width: bw, height: bh, rx: 1, fill: '#b08d3c', stroke: '#e0c070', 'stroke-width': 0.5 }));
  }
  const n = state.instruments.length;
  state.instruments.forEach((inst, i) => {
    const size = Math.min(12, (maxW - 6) / Math.min(3, n) - 1.5);
    const row = Math.floor(i / 3), inRow = Math.min(3, n - row * 3), col = i % 3;
    const x = cx + (col - (inRow - 1) / 2) * (size + 1.5);
    const y = (state.bus ? top : bottom - 2) - 0.5 - row * (size + 1);
    const name = tr(inst, 'name');
    const chip = svg('g', { class: 'chip', tabindex: '0', role: 'button', 'aria-label': `${t('remove')} ${name}`, transform: `translate(${x} ${y}) scale(${size})` });
    chip.append(svg('title', {}, name));
    for (const p of instrumentShape(inst.id)) chip.append(p);
    chip.addEventListener('click', (e) => { e.stopPropagation(); choose('instrument', inst); });
    chip.addEventListener('keydown', press(() => choose('instrument', inst)));
    g.append(chip);
  });
}

// Startturm aus Stahl (Linus 14.11.): steht fest in der Mitte, dreht im Karussell nicht mit.
// Gleicher Ausschnitt wie die Raketen-Bilder, darum liegt er genau neben der vorderen Rakete.
function towerPicture(r) {
  const look = ROCKET_LOOK[r.id] || ROCKET_LOOK.own;
  const ground = 312, t1 = 14, t2 = 23, tt = ground - 250, bodyX = 50 - look.w / 2;
  const s = svg('svg', { viewBox: '8 0 84 320', class: 'tower-pic', 'aria-hidden': 'true' });
  s.append(svg('path', { d: `M${t1} ${ground} L${t1} ${tt} M${t2} ${ground} L${t2} ${tt}`, stroke: '#8a8f96', 'stroke-width': 1.4 }));
  let lattice = '';
  for (let y = ground; y > tt + 12; y -= 12) lattice += `M${t1} ${y} L${t2} ${y - 12} M${t1} ${y - 12} L${t2} ${y} `;
  s.append(svg('path', { d: lattice, stroke: '#6f747b', 'stroke-width': 0.7 }));
  for (const ay of [ground - 120, ground - 220]) s.append(svg('rect', { x: t2, y: ay, width: bodyX - t2, height: 2, fill: '#8a8f96' }));
  s.append(svg('rect', { x: t1 - 3, y: ground, width: 2 * (50 - t1) + 6, height: 4, fill: '#5a564f' })); // Rampe
  return s;
}

function rocketPicture(r, withPayload = false) {
  const look = ROCKET_LOOK[r.id] || ROCKET_LOOK.own;
  const { H, w } = look;
  const cx = 50, ground = 312, top = ground - H, x = cx - w / 2;
  const id = `rg${++gradSeq}`;
  const s = svg('svg', { viewBox: '8 0 84 320', class: 'rocket-pic', role: 'img', 'aria-label': tr(r, 'name') });
  const defs = svg('defs');
  const grad = svg('linearGradient', { id, x1: '0', x2: '1', y1: '0', y2: '0' });
  grad.append(svg('stop', { offset: '0', 'stop-color': look.body[0] }), svg('stop', { offset: '0.55', 'stop-color': look.body[0] }), svg('stop', { offset: '1', 'stop-color': look.body[1] }));
  defs.append(grad); s.append(defs);
  const fill = `url(#${id})`;
  const starship = r.id === 'starship';
  const fh = starship ? 50 : 84;                       // Höhe der Spitze
  const fw = starship ? w : withPayload ? Math.max(w + 22, 46) : Math.max(w + 10, 30); // vorne breiter, damit der Satellit gut zu sehen ist
  const bodyTop = top + fh;

  // Triebwerk und Körper
  s.append(svg('path', { d: `M${cx - w * 0.35} ${ground - 8} L${cx - w * 0.5} ${ground} L${cx + w * 0.5} ${ground} L${cx + w * 0.35} ${ground - 8} Z`, fill: '#4a4550' }));
  s.append(svg('rect', { x, y: bodyTop, width: w, height: ground - 8 - bodyTop, fill }));
  if (r.id === 'falcon9') {
    s.append(svg('rect', { x, y: bodyTop + (ground - bodyTop) * 0.24, width: w, height: 5, fill: '#1c1918' }));
    for (const sx of [-1, 1]) s.append(svg('line', { x1: cx + sx * w * 0.42, y1: ground - 60, x2: cx + sx * w * 0.42, y2: ground - 10, stroke: '#3a3540', 'stroke-width': 1.2 }));
  }
  if (r.id === 'pegasus') {
    s.append(svg('path', { d: `M${x} ${ground - 70} L${x - 22} ${ground - 50} L${x + w + 22} ${ground - 50} L${x + w} ${ground - 70} Z`, fill: '#bdb5a9' }));
  }
  if (starship) {
    for (const sy of [bodyTop + 6, ground - 40]) {
      const fl = sy > bodyTop + 10 ? 9 : 6;
      s.append(svg('path', { d: `M${x} ${sy} L${x - fl} ${sy + fl * 1.6} L${x} ${sy + fl * 2.4} Z M${x + w} ${sy} L${x + w + fl} ${sy + fl * 1.6} L${x + w} ${sy + fl * 2.4} Z`, fill: '#6f767e' }));
    }
  } else if (r.id !== 'falcon9') {
    s.append(svg('path', { d: `M${x} ${ground - 28} L${x - 9} ${ground - 4} L${x} ${ground - 8} Z M${x + w} ${ground - 28} L${x + w + 9} ${ground - 4} L${x + w} ${ground - 8} Z`, fill: '#745F9A' }));
  }
  if (r.id === 'own' || r.rideshare) s.append(svg('rect', { x, y: bodyTop + 30, width: w, height: 4, fill: '#745F9A' }));

  // Spitze: bei der Rakete vorne durchsichtig, mit dem Satelliten darin
  const nose = `M${cx - fw / 2} ${bodyTop} L${cx - fw / 2} ${top + fh * 0.45} Q${cx - fw / 2} ${top} ${cx} ${top - 4} Q${cx + fw / 2} ${top} ${cx + fw / 2} ${top + fh * 0.45} L${cx + fw / 2} ${bodyTop} Z`;
  if (withPayload) {
    s.append(svg('path', { d: nose, fill: 'rgba(245,239,230,0.08)', stroke: 'rgba(245,239,230,0.7)', 'stroke-width': 0.8, 'stroke-dasharray': '2 1.5' }));
    payloadIn(s, cx, bodyTop, fw, fh * 0.75);
  } else {
    s.append(svg('path', { d: nose, fill }));
  }
  return s;
}

// Welche Rakete vorne steht. Vorne = gewählt.
function rocketView(items) {
  if (state.rocketView == null) state.rocketView = Math.max(0, state.rocket ? items.findIndex((x) => x.id === state.rocket.id) : 0);
  return Math.min(Math.max(0, state.rocketView), items.length - 1);
}
function moveRocket(items, d) {
  const i = rocketView(items);
  state.rocketView = (i + d + items.length) % items.length;
  state.rocket = items[state.rocketView];
  state.info = state.rocket;
  state.slide = d;
  render();
}

function rocketCarouselCenter() {
  const cat = catalogs.find((c) => c.kind === 'rocket');
  const items = offered(cat.items);
  const n = items.length;
  if (!n) return el('div');
  const i = rocketView(items);
  if (!state.rocket || state.rocket.id !== items[i].id) state.rocket = items[i];
  const slide = state.slide; state.slide = null;
  const slot = (k, role) => {
    const r = items[(i + k + n) % n];
    return el('figure', { class: `slot ${role}${k < 0 ? ' prev' : k > 0 ? ' next' : ''}`, onclick: () => (k ? moveRocket(items, k) : null) },
      role === 'mid' ? towerPicture(r) : '',
      rocketPicture(r, role === 'mid'),
      el('figcaption', { class: 'banner' }, tr(r, 'name')));
  };
  const mid = items[i];
  return el('div', {
    class: 'carousel', tabindex: '0', 'aria-label': t('hintRocket'), onkeydown: (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); moveRocket(items, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); moveRocket(items, 1); }
    },
  },
  el('div', { class: 'carousel-stage' },
    n > 1 ? el('button', { class: 'arrow', type: 'button', 'aria-label': t('prevRocket'), onclick: () => moveRocket(items, -1) }, '‹') : el('span'),
    // endlos: ab zwei Raketen stehen immer links und rechts Nachbarn (bei zwei ist es dieselbe)
    el('div', { class: `slots${slide ? (slide > 0 ? ' slide-next' : ' slide-prev') : ''}` }, n > 1 ? slot(-1, 'side') : '', slot(0, 'mid'), n > 1 ? slot(1, 'side') : ''),
    n > 1 ? el('button', { class: 'arrow', type: 'button', 'aria-label': t('nextRocket'), onclick: () => moveRocket(items, 1) }, '›') : el('span')),
  el('dl', { class: 'rocket-facts' }, el('dt', {}, t('price')), el('dd', {}, money(mid.cost)), cat.rows(mid).map(([k, v]) => [el('dt', {}, k), el('dd', {}, String(v))])),
  n > 1 ? el('p', { class: 'dots', 'aria-hidden': 'true' }, items.map((x, k) => el('span', { class: k === i ? 'dot on' : 'dot' }))) : '',
  insuranceBox());
}

// Versicherung unter der gewählten Rakete
function insuranceBox() {
  if (!state.rocket) return '';
  if (state.rocket.uninsurable) return el('p', { class: 'hint' }, t('noInsurance'));
  return el('label', { class: 'insure card' },
    el('input', { type: 'checkbox', ...(state.insured ? { checked: '' } : {}), onchange: (e) => { state.insured = e.target.checked; render(); } }),
    el('span', {}, el('strong', {}, t('insure')), el('br'), t('insureInfo', { c: money(insurancePrice(state.rocket)) })));
}

// Neu zeichnen ohne Springen: Scroll-Position und Fokus bleiben, Einblenden nur beim Schrittwechsel.
// Sonst rutschte z. B. der Versicherungs-Haken nach dem Klick aus dem Bild.
let leftStep = null;
function renderLeft() {
  // Stationsflug: das Modul steht fest, links nur der Hinweis
  const cats = state.mission.module ? [] : STEP_CATS[state.build].map((k) => catalogs.find((c) => c.kind === k));
  const left = $('left');
  const sameStep = leftStep === state.build;
  const scroll = sameStep ? left.scrollTop : 0;
  const focusables = () => [...left.querySelectorAll('.catalog .card, input, .steps button')];
  const focusIndex = sameStep ? focusables().indexOf(document.activeElement) : -1;
  leftStep = state.build;
  left.replaceChildren(...[
    state.mission.module ? el('p', { class: 'hint' }, t('stationFlight', { m: tr(state.mission.module, 'name'), kg: kg(state.mission.module.mass), c: money(state.mission.module.cost) }))
      : el('nav', { class: 'steps', 'aria-label': 'Build steps' }, t('steps').slice(0, 2).map((name, i) => el('button', {
        type: 'button', 'aria-current': i === state.build ? 'step' : 'false',
        onclick: () => { state.build = i; render(); },
      }, name))),
    cats.length ? el('p', { class: 'hint' }, t(cats[0].hint)) : el('p', { class: 'hint' }, t('hintRocket')),
    ...cats.flatMap((cat) => [
      cat.group ? el('h3', { class: 'group' }, t(cat.group)) : null,
      el('div', { class: sameStep ? 'catalog' : 'catalog enter' }, offered(cat.items).map((item) => card(cat, item)))]).filter(Boolean),
  ].filter(Boolean));
  left.scrollTop = scroll;
  if (focusIndex >= 0) focusables()[focusIndex]?.focus({ preventScroll: true });
}

function meter(label, value, max, text, atLeast = false) {
  const fill = el('span');
  fill.style.width = `${Math.min(100, max ? (value / max) * 100 : 0)}%`; // CSSOM, erlaubt unter style-src 'self'
  return el('div', {},
    el('div', { class: 'meter-label' }, el('span', {}, label), el('span', {}, text)),
    el('div', { class: `bar${(atLeast ? value < max : value > max) ? ' over' : ''}` }, fill));
}

function showInfo(item) {
  state.info = item;
  const box = document.querySelector('.info');
  if (box) box.replaceChildren(el('strong', {}, tr(item, 'name')), tr(item, 'info') || '');
}

function renderRight() {
  const m = state.mission;
  const left = budgetLeft(m.budget, chosen());
  const meters = [];
  if (!m.free && !m.module) meters.push(meter(t('science'), science(), m.minScience, `${science()} / ${m.minScience} ${t('needed')}`, true));
  if (state.bus && !m.module) {
    meters.push(meter(t('instMass'), instMass(), state.bus.capacity, `${kg(instMass())} / ${kg(state.bus.capacity)}`));
    meters.push(meter(t('powerDraw'), instPower(), powerAvailable(), `${instPower()} / ${powerAvailable()} W`));
  }
  if (state.rocket && state.bus) {
    if (state.rocket.maxPayload !== undefined) meters.push(meter(t('satMass'), payload(), state.rocket.maxPayload, `${kg(payload())} / ${kg(state.rocket.maxPayload)}`));
    else {
      const dv = deltaV(state.rocket.stages, payload());
      meters.push(meter('Delta-v', m.requiredDv, dv, `${Math.round(dv)} / ${m.requiredDv} m/s ${t('needed')}`));
    }
  }
  $('right').replaceChildren(
    el('h2', {}, t('budgetLeft')),
    el('p', { class: 'big-number' }, m.free ? t('noLimit') : money(left)),
    el('div', { class: 'meters' }, meters),
    el('div', { class: 'info' }, state.info ? [el('strong', {}, tr(state.info, 'name')), tr(state.info, 'info') || ''] : t('pointAt')));
}

// Mitte: Rakete als Umriss, zeigt die gewählten Teile und nimmt gezogene Teile an
// Bild eines Instruments, Ursprung unten in der Mitte, Größe 1 (wird skaliert)
function instrumentShape(id) {
  const line = { 'vector-effect': 'non-scaling-stroke', 'stroke-width': 1.2 };
  const kind = id.replace('cube-', '');
  if (kind === 'camera') return [
    svg('rect', { x: -0.5, y: -0.7, width: 1, height: 0.7, rx: 0.08, fill: '#3a3245', stroke: '#A88FD6', ...line }),
    svg('circle', { cx: 0, cy: -0.35, r: 0.24, fill: '#0b0a12', stroke: '#9fb3e8', ...line })];
  if (kind === 'lightning') return [
    svg('rect', { x: -0.45, y: -0.8, width: 0.9, height: 0.8, rx: 0.08, fill: '#3a3245', stroke: '#A88FD6', ...line }),
    svg('path', { d: 'M0.05 -0.72 L-0.2 -0.36 L0 -0.36 L-0.08 -0.08 L0.2 -0.46 L0 -0.46 Z', fill: '#ffd166' })];
  if (kind === 'radiometer' || kind === 'altimeter') {
    const w = kind === 'altimeter' ? 0.75 : 0.5;
    return [
      svg('rect', { x: -0.06, y: -0.5, width: 0.12, height: 0.5, fill: '#B8AFA6' }),
      svg('path', { d: `M${-w} -0.9 Q0 -0.2 ${w} -0.9 Z`, fill: '#d9d2c7', stroke: '#F5EFE6', ...line })];
  }
  if (kind === 'sounder') return [
    svg('rect', { x: -0.35, y: -0.85, width: 0.7, height: 0.85, fill: '#5a5070', stroke: '#A88FD6', ...line }),
    svg('ellipse', { cx: 0, cy: -0.85, rx: 0.35, ry: 0.12, fill: '#0b0a12', stroke: '#9fb3e8', ...line })];
  return [svg('rect', { x: -0.4, y: -0.6, width: 0.8, height: 0.6, fill: '#745F9A', stroke: '#F5EFE6', ...line })];
}

function rocketSvg() {
  const s = svg('svg', { viewBox: '0 0 260 620', role: 'img', 'aria-label': t('rocket') });
  const stroke = 'rgba(245,239,230,0.55)';
  s.append(svg('path', { d: 'M130 20 C 175 70 190 140 190 230 L 70 230 C 70 140 85 70 130 20 Z', fill: '#221f2b', stroke, 'stroke-width': 2 }));
  // Satellit wächst mit den Teilen (Idee: Josias, Skizze NASA.pdf): Körper je nach Größe,
  // Solarflügel je nach Leistung, jedes Instrument mit eigenem Bild. Klick auf ein Instrument entfernt es.
  const busW = state.bus ? Math.min(92, 26 + Math.sqrt(state.bus.capacity) * 2.2) : 70;
  const busH = Math.max(22, busW * 0.7);
  const busTop = 222 - busH, busX = 130 - busW / 2;
  if (state.bus) {
    if (state.panel) {
      const w = Math.min(46, 14 + Math.sqrt(state.panel.power) * 0.9); // größeres Panel, breitere Flügel
      const wy = busTop + busH / 2 - 13;
      for (const x of [busX - w - 4, busX + busW + 4]) {
        s.append(svg('rect', { x, y: wy, width: w, height: 26, fill: '#2b3a6b', stroke: '#9fb3e8' }));
        for (let i = 1; i < 3; i++) s.append(svg('line', { x1: x + (w * i) / 3, y1: wy, x2: x + (w * i) / 3, y2: wy + 26, stroke: '#9fb3e8', 'stroke-width': 0.8 }));
      }
      s.append(svg('rect', { x: busX - 4, y: wy + 11, width: busW + 8, height: 4, fill: '#B8AFA6' }));
    }
    const body = svg('rect', { x: busX, y: busTop, width: busW, height: busH, rx: 3, fill: '#b08d3c', stroke: '#e0c070', 'stroke-width': 1.5 });
    body.append(svg('title', {}, tr(state.bus, 'name')));
    s.append(body);
    s.append(svg('path', { d: `M${busX + 4} ${busTop + busH * 0.35} L${busX + busW - 4} ${busTop + busH * 0.3} M${busX + 4} ${busTop + busH * 0.7} L${busX + busW - 4} ${busTop + busH * 0.75}`, stroke: '#8a6a28', 'stroke-width': 1, fill: 'none' }));
  } else {
    s.append(svg('rect', { x: busX, y: busTop, width: busW, height: busH, rx: 3, fill: 'none', stroke, 'stroke-dasharray': '5 5' }));
    s.append(svg('text', { x: 130, y: busTop + busH / 2 + 4, 'text-anchor': 'middle', class: 'svg-muted' }, t('satelliteBus')));
  }
  // Instrumente sitzen oben auf dem Körper, höchstens drei pro Reihe
  const n = state.instruments.length;
  state.instruments.forEach((inst, i) => {
    const size = inst.id.startsWith('cube-') ? 16 : 24;
    const row = Math.floor(i / 3), inRow = Math.min(3, n - row * 3), col = i % 3;
    const cx = 130 + (col - (inRow - 1) / 2) * (size + 8);
    const base = busTop - 1 - row * (size + 6);
    const name = tr(inst, 'name');
    const g = svg('g', { class: 'chip', tabindex: '0', role: 'button', 'aria-label': `${t('remove')} ${name}`, transform: `translate(${cx} ${base}) scale(${size})` });
    g.append(svg('title', {}, name));
    for (const part of instrumentShape(inst.id)) g.append(part);
    g.addEventListener('click', () => choose('instrument', inst));
    g.addEventListener('keydown', press(() => choose('instrument', inst)));
    s.append(g);
  });
  const r = state.rocket;
  const dash = r ? {} : { 'stroke-dasharray': '6 6' };
  s.append(svg('rect', { x: 70, y: 230, width: 120, height: 150, fill: r ? '#2b2733' : 'none', stroke, 'stroke-width': 2, ...dash }));
  s.append(svg('rect', { x: 70, y: 380, width: 120, height: 180, fill: r ? '#2b2733' : 'none', stroke, 'stroke-width': 2, ...dash }));
  s.append(svg('path', { d: 'M70 500 L 40 570 L 70 560 Z M190 500 L 220 570 L 190 560 Z', fill: r ? '#3a3245' : 'none', stroke, ...dash }));
  s.append(svg('path', { d: 'M100 560 L 92 590 L 168 590 L 160 560 Z', fill: r ? '#3a3245' : 'none', stroke, ...dash }));
  s.append(svg('text', { x: 130, y: 310, 'text-anchor': 'middle', class: r ? 'svg-label' : 'svg-muted' }, r ? tr(r, 'name') : t('rocket')));
  if (r && r.rideshare) s.append(svg('text', { x: 130, y: 330, 'text-anchor': 'middle', class: 'svg-muted' }, t('shared')));
  return s;
}

function renderBuild() {
  // Mitte: Raketen-Karussell, die vordere Rakete trägt den Satelliten. Teile lassen sich hineinziehen.
  const zone = el('div', { class: 'dropzone' }, rocketCarouselCenter());
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

// ---------- Start-Animation ----------

// Wie der Start endet (Idee: Josias, Skizze NASA1.pdf): Orbit, Explosion,
// zu schwer (hebt nicht ab) oder zu wenig Geld (stottert, kein Treibstoff)
function launchMode(r) {
  if (r.reachedOrbit) return 'ok';
  if (r.problems.includes('budget')) return 'nofuel';
  if (r.problems.includes('rocket-mass') || r.problems.includes('delta-v')) return 'heavy';
  return 'explode';
}

// Start ohne Bildwechsel (Linus 14.11.): Die Rakete wird im Ständer gebaut und startet von dort.
// Nach „Launch“ gleiten die Seitenleisten weg, Nachbarn und Zahlen blenden aus, die Rakete rückt groß in die Mitte.
// Beim Countdown kippt der Ständer weg, dann Feuer, Rauch, Wackeln, Abheben, die Kamera fliegt mit.
function renderLaunch() {
  const canvas = el('canvas', { 'aria-hidden': 'true' });
  const rocket = rocketPicture(state.rocket, true);
  rocket.classList.add('launch-rocket');
  const wrap = el('div', { class: 'launch-wrap', role: 'img', 'aria-label': t('launch') }, canvas, rocket);
  // die Bau-Ansicht bleibt kurz stehen und blendet aus, nur ohne die vordere Rakete (die übernimmt die Szene)
  const old = $('center').firstElementChild;
  if (old) {
    old.querySelector('.slot.mid .rocket-pic')?.classList.add('gone');
    wrap.prepend(old);
    requestAnimationFrame(() => old.classList.add('fading')); // erst nach dem Einhängen, sonst kein Übergang
    setTimeout(() => old.remove(), 600);
  }
  $('next').disabled = true;
  requestAnimationFrame(() => launch(canvas, rocket, launchMode(state.result), state.launchFrom));
  return wrap;
}

function launch(canvas, rocketEl, mode, from) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = reduce ? 0 : 700, count = reduce ? 600 : 3000, ignite = reduce ? 200 : 1400;
  const look = ROCKET_LOOK[state.rocket.id] || ROCKET_LOOK.own;
  let W = 0, H = 0, stars = [];
  function fit() {
    const r = canvas.getBoundingClientRect();
    if (Math.round(r.width) === Math.round(W) && Math.round(r.height) === Math.round(H)) return;
    W = r.width; H = r.height;
    canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    stars = Array.from({ length: 120 }, () => [Math.random() * W, Math.random() * H, Math.random()]);
  }
  fit();
  // Wo die Rakete im Bau stand (Bildschirm-Koordinaten): Mitte, Boden (Rampe bei y = 312) und Maßstab
  const start0 = from ? (() => {
    const u = Math.min(from.width / 84, from.height / 320);
    return { cx: from.left + from.width / 2, ground: from.top + (from.height - 320 * u) / 2 + 312 * u, unit: u };
  })() : null;
  const smoke = [];
  const flight = mode === 'heavy' ? 3200 : mode === 'nofuel' ? 3600 : 5200;
  function altitude(s) {
    if (mode === 'heavy') return 0;
    if (mode === 'nofuel') {
      if (s < 1.6) return 0.5 * (H * 0.14) * s * s;
      const top = 0.5 * (H * 0.14) * 1.6 * 1.6, f = s - 1.6;
      return Math.max(0, top - 0.5 * H * 0.9 * f * f);
    }
    return 0.5 * H * 0.6 * s * s;
  }
  const burning = (s) => (mode === 'heavy' ? s < 2.2 : mode === 'nofuel' ? s < 1.6 && Math.sin(s * 40) + Math.sin(s * 23) > 0.2 : mode === 'explode' ? s < 2.3 : true);
  const ease = (x) => x * x * (3 - 2 * x);

  function tower(cx, gy, unit, fall) {
    // Ständer aus Stahl, kippt beim Countdown nach links weg und verschwindet
    const left = cx - 36 * unit, right = cx - 27 * unit, top = gy - 250 * unit;
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, fall - 0.6) / 0.4;
    ctx.translate(left, gy); ctx.rotate(-ease(Math.min(1, fall)) * 1.35); ctx.translate(-left, -gy);
    ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = Math.max(1.5, unit * 1.4);
    ctx.beginPath(); ctx.moveTo(left, gy); ctx.lineTo(left, top); ctx.moveTo(right, gy); ctx.lineTo(right, top);
    for (let yy = gy; yy > top + 12 * unit; yy -= 12 * unit) { ctx.moveTo(left, yy); ctx.lineTo(right, yy - 12 * unit); ctx.moveTo(left, yy - 12 * unit); ctx.lineTo(right, yy); }
    ctx.stroke();
    ctx.fillStyle = '#8a8f96';
    for (const ay of [gy - 120 * unit, gy - 220 * unit]) ctx.fillRect(right, ay, (cx - look.w / 2 * unit) - right, Math.max(2, unit * 2));
    ctx.restore();
  }

  function flame(x, y, s, unit) {
    const nozzle = look.w * unit;
    const len = (40 + Math.min(s, 2) * 30) * unit * (0.85 + Math.random() * 0.3);
    const glow = ctx.createRadialGradient(x, y + len * 0.2, 0, x, y + len * 0.2, len);
    glow.addColorStop(0, 'rgba(255,200,120,0.55)'); glow.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y + len * 0.2, len, 0, Math.PI * 2); ctx.fill();
    for (const [k, c1, c2] of [[1, 'rgba(224,96,90,0.85)', 'rgba(224,96,90,0)'], [0.72, '#ff9a3c', 'rgba(255,154,60,0)'], [0.42, '#fff8d8', 'rgba(255,243,176,0)']]) {
      const wN = nozzle * (0.55 + k * 0.5), L = len * k;
      const g = ctx.createLinearGradient(0, y, 0, y + L);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(x - wN / 2, y); ctx.quadraticCurveTo(x - wN * 0.7, y + L * 0.45, x, y + L);
      ctx.quadraticCurveTo(x + wN * 0.7, y + L * 0.45, x + wN / 2, y); ctx.closePath(); ctx.fill();
    }
  }

  function fireball(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,243,176,${a})`); g.addColorStop(0.4, `rgba(255,154,60,${a * 0.9})`); g.addColorStop(1, 'rgba(224,96,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function caption(text) {
    ctx.font = '600 20px sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    const x = Math.min(W * 0.76, W - ctx.measureText(text).width / 2 - 16); // rechts neben der Rakete, nie über den Rand
    ctx.strokeStyle = 'rgba(11,10,18,0.9)'; ctx.lineWidth = 5; ctx.strokeText(text, x, H * 0.3);
    ctx.fillStyle = '#F5EFE6'; ctx.fillText(text, x, H * 0.3); ctx.textAlign = 'start';
  }

  const begin = performance.now();
  let last = begin, boomAt = null;
  function frame(now) {
    fit();
    const wr = canvas.getBoundingClientRect();
    const dt = Math.min(50, now - last); last = now;
    const passed = now - begin;
    // Ziel: Rakete groß in der Mitte. Während des Intros gleitet sie aus der Bau-Position dorthin.
    const target = { cx: W / 2, ground: H - 34, unit: (H * 0.82) / 320 };
    const k = intro ? ease(Math.min(1, passed / intro)) : 1;
    const s0 = start0 ? { cx: start0.cx - wr.left, ground: start0.ground - wr.top, unit: start0.unit } : target;
    const cx = s0.cx + (target.cx - s0.cx) * k, groundY = s0.ground + (target.ground - s0.ground) * k, unit = s0.unit + (target.unit - s0.unit) * k;

    const tc = passed - intro;                                        // Zeit seit Countdown-Beginn
    const s = Math.max(0, (tc - count - ignite) / 1000);              // Sekunden seit dem Abheben
    const igniting = tc >= count;
    const fire = igniting && (tc < count + ignite || burning(s));
    const alt = tc < count + ignite ? 0 : altitude(s);
    const cam = Math.max(0, alt - H * 0.08);
    const shakeAmp = reduce ? 0 : fire ? (alt < H ? 7 : 3) : 0;
    const sx = (Math.random() - 0.5) * shakeAmp, sy = (Math.random() - 0.5) * shakeAmp;

    ctx.clearRect(0, 0, W, H);                                        // Hintergrund bleibt der der Bau-Ansicht
    if (cam > 0) for (const [x, y, b] of stars) {                     // Sterne ziehen vorbei, sobald die Kamera mitfliegt
      ctx.fillStyle = `rgba(245,239,230,${0.25 + b * 0.6})`;
      ctx.fillRect(x, (y + cam * 0.15 * (0.5 + b)) % H, 1.6, 1.6 + Math.min(8, 4 * b));
    }
    ctx.save(); ctx.translate(sx, sy);
    const gy = groundY + cam;
    if (gy < H + 400) {
      ctx.fillStyle = '#5a564f'; ctx.fillRect(cx - 40 * unit, gy, 80 * unit, 4 * unit);   // Rampe wie im Bau
      tower(cx, gy, unit, tc > 0 ? Math.min(1.2, tc / 1300) : 0);
    }
    if (fire && alt < H * 0.8 && !reduce) for (let i = 0; i < 3; i++) smoke.push({ x: (Math.random() - 0.5) * look.w * unit, y: 0, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 0.8, r: 8 + Math.random() * 14, life: 1 });
    for (const p of smoke) {
      p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.r += 0.35 * dt / 16; p.life -= 0.006 * dt / 16;
      if (p.life > 0) { ctx.fillStyle = `rgba(200,195,188,${p.life * 0.45})`; ctx.beginPath(); ctx.arc(cx + p.x, gy - 4 * unit + p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }
    const baseY = groundY - alt + cam;
    if (fire && boomAt === null) flame(cx, baseY, s, unit);
    if (mode === 'explode' && s >= 2.3 && boomAt === null) boomAt = now;
    if (mode === 'nofuel' && s > 1.6 && alt === 0 && boomAt === null) boomAt = now;
    if (boomAt !== null) {
      const b = (now - boomAt) / 1000;
      fireball(cx, baseY - (mode === 'explode' ? 160 * unit : 20 * unit), (mode === 'explode' ? 60 : 30) * unit + b * 220 * unit, Math.max(0, 1 - b * 0.9));
    }
    ctx.restore();

    // Rakete (SVG): Größe und Lage aus Maßstab und Boden, dazu Flug und Wackeln
    rocketEl.style.height = `${320 * unit}px`;
    rocketEl.style.left = `${cx}px`;
    rocketEl.style.top = `${groundY - 312 * unit}px`;
    rocketEl.style.transform = `translate(calc(-50% + ${sx}px), ${-(alt - cam) + sy}px)`;
    rocketEl.style.opacity = mode === 'explode' && boomAt !== null ? '0' : '1';

    if (tc >= 0 && !igniting) {
      ctx.font = '800 96px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#F5EFE6';
      ctx.fillText(String(Math.ceil((count - tc) / 1000)), W * 0.76, H * 0.45); ctx.textAlign = 'start';
    }
    if (mode === 'heavy' && s > 0) caption(t('capHeavy'));
    if (mode === 'nofuel' && s > 0) caption(t('capNoFuel'));
    if (mode === 'explode' && boomAt !== null) caption(t('capExplode'));
    if (mode === 'ok' && s > 3.5) caption(t('capOrbit'));
    if (tc >= count + ignite + flight) { $('next').disabled = false; return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------- Forschung ----------

function researchTeam() {
  // Drei Ingenieure an Pulten, wippen beim Arbeiten (reine Animation)
  const g = svg('svg', { viewBox: '0 0 300 110', class: 'team', 'aria-hidden': 'true' });
  [50, 150, 250].forEach((x, i) => {
    const p = svg('g', { class: `worker w${i}` });
    p.append(svg('circle', { cx: x, cy: 30, r: 12, fill: '#F5EFE6' }));
    p.append(svg('rect', { x: x - 14, y: 44, width: 28, height: 30, rx: 8, fill: '#745F9A' }));
    g.append(p);
    g.append(svg('rect', { x: x - 30, y: 76, width: 60, height: 22, rx: 4, fill: '#3a3245', stroke: '#A88FD6' }));
    g.append(svg('rect', { x: x - 22, y: 81, width: 44, height: 4, fill: '#4CAF6A', class: `blink b${i}` }));
  });
  return g;
}

function renderResearch() {
  const a = research.active;
  return el('section', { class: 'research enter' },
    el('h1', {}, t('research')),
    el('p', { class: 'lead' }, t('researchLead')),
    el('p', { class: 'big-number rp' }, `${research.rp} ${t('rpShort')}`),
    el('div', { class: 'projects' }, PROJECTS.map((pr) => {
      const done = !!research.done[pr.id];
      const locked = pr.needs && !research.done[pr.needs];
      const running = a && a.id === pr.id;
      const canStart = !done && !locked && !a && research.rp >= pr.rp;
      return el('div', { class: `project card${done ? ' done-card' : ''}` },
        el('h2', {}, el('span', {}, t(pr.name)), el('span', { class: 'price' }, done ? `✓ ${t('doneLbl')}` : `${pr.rp} ${t('rpShort')}`)),
        el('p', { class: 'hint' }, t(pr.info)),
        locked ? el('p', { class: 'hint' }, t('needs', { x: t(PROJECTS.find((x) => x.id === pr.needs).name) })) : '',
        done && pr.id === 'own-rocket' ? el('form', { class: 'name-form', onsubmit: (e) => {
          e.preventDefault();
          const v = e.target.elements.rname.value.trim().slice(0, 24);
          research.name = v || null; saveResearch(); render();
        } },
        el('label', { for: 'rname' }, t('nameRocket')),
        el('input', { id: 'rname', name: 'rname', maxlength: '24', value: research.name || '', placeholder: 'Orbiter-1' }),
        el('button', { class: 'secondary', type: 'submit' }, t('saveName'))) : '',
        running ? [
          researchTeam(),
          el('p', { class: 'hint' }, `${t('team')} · ${Math.round(a.progress * 100)} %`),
          meter('', a.progress, 1, ''),
          el('div', { class: 'research-actions' },
            el('button', { class: 'secondary', type: 'button', 'aria-pressed': String(!!a.fast), onclick: () => { a.fast = !a.fast; saveResearch(); render(); } }, t('speed2')),
            el('button', { class: 'secondary', type: 'button', disabled: research.rp < SKIP_RP ? '' : null,
              onclick: () => { if (research.rp < SKIP_RP) return; research.rp -= SKIP_RP; research.done[a.id] = true; research.active = null; saveResearch(); render(); } },
            t('skip', { n: SKIP_RP })))] : '',
        !done && !running && !locked ? el('button', { class: 'primary', type: 'button', disabled: canStart ? null : '',
          onclick: () => { if (!canStart) return; research.rp -= pr.rp; research.active = { id: pr.id, progress: 0, fast: false }; saveResearch(); render(); } },
        research.rp >= pr.rp ? t('startResearch', { n: pr.rp }) : t('notEnoughRp')) : '');
    })));
}

// ---------- Kampagne: Basis von oben (Idee Josias 14.11.) ----------
// Isometrisch gezeichnet: Gitterpunkt (x, y) wird zu Bildschirm (X, Y). Gebäude sind Quader mit drei Seiten.
const iso = (x, y) => [(x - y) * 30, (x + y) * 15];
const pts = (list) => list.map(([x, y]) => `${x},${y}`).join(' ');

function isoBox(gx, gy, w, d, h, [top, left, right]) {
  const g = svg('g');
  const a = iso(gx, gy), b = iso(gx + w, gy), c = iso(gx + w, gy + d), e = iso(gx, gy + d);
  const up = ([x, y]) => [x, y - h];
  g.append(svg('polygon', { points: pts([e, c, up(c), up(e)]), fill: left }));
  g.append(svg('polygon', { points: pts([c, b, up(b), up(c)]), fill: right }));
  g.append(svg('polygon', { points: pts([up(a), up(b), up(c), up(e)]), fill: top }));
  return g;
}

// Klickbares Gebäude mit Namensschild darüber
function building(label, [lx, ly], onSelect, parts) {
  const g = svg('g', { class: 'bldg', tabindex: '0', role: 'button', 'aria-label': label });
  for (const p of parts) g.append(p);
  const w = label.length * 6.4 + 18;
  g.append(svg('rect', { x: lx - w / 2, y: ly - 15, width: w, height: 20, rx: 10, class: 'bldg-tag' }));
  g.append(svg('text', { x: lx, y: ly - 1, 'text-anchor': 'middle', class: 'bldg-label' }, label));
  g.addEventListener('click', onSelect);
  g.addEventListener('keydown', press(onSelect));
  return g;
}

// Leitstand: springt zum Auftrag rechts
const focusContract = () => { const b = document.querySelector('.project .primary') || document.querySelector('.company-panel h1'); b?.scrollIntoView({ block: 'center', behavior: 'smooth' }); b?.focus?.({ preventScroll: true }); };

// Raumstation über der Basis (Level 2): gelieferte Module ausgefüllt, fehlende gestrichelt
function stationSvg(delivered) {
  const g = svg('g', { class: 'station', 'aria-label': t('stationLabel') });
  const cx = 140, cy = -72;
  const part = (k, el2) => { if (k >= delivered) { el2.setAttribute('fill', 'none'); el2.setAttribute('stroke', 'rgba(245,239,230,0.45)'); el2.setAttribute('stroke-dasharray', '3 3'); } g.append(el2); };
  g.append(svg('line', { x1: cx - 70, y1: cy, x2: cx + 70, y2: cy, stroke: delivered ? '#B8AFA6' : 'rgba(245,239,230,0.3)', 'stroke-width': 2 }));
  part(0, svg('rect', { x: cx - 18, y: cy - 8, width: 36, height: 16, rx: 7, fill: '#d9d2c7' }));               // Kern
  part(1, svg('rect', { x: cx - 70, y: cy - 16, width: 30, height: 32, fill: '#2b3a6b', stroke: '#9fb3e8' }));     // Energie links
  part(1, svg('rect', { x: cx + 40, y: cy - 16, width: 30, height: 32, fill: '#2b3a6b', stroke: '#9fb3e8' }));     // Energie rechts
  part(2, svg('rect', { x: cx + 18, y: cy - 6, width: 22, height: 12, rx: 5, fill: '#cfe6ea' }));                  // Labor
  part(3, svg('rect', { x: cx - 40, y: cy - 6, width: 22, height: 12, rx: 5, fill: '#e0c070' }));                  // Wohnen
  part(4, svg('circle', { cx, cy: cy - 14, r: 6, fill: '#A88FD6' }));                                              // Andocken
  g.append(svg('text', { x: cx, y: cy + 32, 'text-anchor': 'middle', class: 'bldg-label' }, `${t('stationLabel')} · ${t('modulesOf', { n: delivered, m: 5 })}`));
  return g;
}

function baseSvg(c, delivered = null) {
  const s = svg('svg', { viewBox: '-270 -110 540 380', class: 'base', role: 'group', 'aria-label': t('baseLabel') });
  // Boden: 8 x 8 Felder, Straße zur Startrampe
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
    s.append(svg('polygon', { points: pts([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)]), fill: (x + y) % 2 ? '#3d4a3a' : '#43513f', stroke: '#2f3a2d', 'stroke-width': 0.5 }));
  }
  s.append(svg('polygon', { points: pts([iso(3.6, 3), iso(4.4, 3), iso(4.4, 5), iso(3.6, 5)]), fill: '#6b675f' }));
  s.append(svg('polygon', { points: pts([iso(3, 2.6), iso(6, 2.6), iso(6, 3.4), iso(3, 3.4)]), fill: '#6b675f' }));

  // Leitstand: Aufträge
  const dishTop = iso(2, 1.5);
  s.append(building(t('bldgControl'), [iso(2, 2)[0], iso(2, 2)[1] - 70], focusContract, [
    isoBox(1, 1, 2, 2, 40, ['#8e7bb5', '#5b4a7c', '#6d5a92']),
    svg('line', { x1: dishTop[0], y1: dishTop[1] - 40, x2: dishTop[0], y2: dishTop[1] - 56, stroke: '#d9d2c7', 'stroke-width': 2 }),
    svg('path', { d: `M${dishTop[0] - 12} ${dishTop[1] - 62} Q${dishTop[0]} ${dishTop[1] - 48} ${dishTop[0] + 12} ${dishTop[1] - 62} Z`, fill: '#F5EFE6' }),
  ]));

  // Forschungslabor mit Kuppel
  const dome = iso(6, 2);
  s.append(building(t('bldgLab'), [dome[0], dome[1] - 66], () => { state.returnTo = 'company'; go('research'); }, [
    isoBox(5, 1, 2, 2, 28, ['#5f9aa0', '#2f5e63', '#3f747a']),
    svg('ellipse', { cx: dome[0], cy: dome[1] - 30, rx: 22, ry: 16, fill: '#cfe6ea', stroke: '#9fc7cd' }),
  ]));

  // Startrampe mit Rakete: startet den aktuellen Auftrag
  const padC = iso(4, 6);
  const canStart = c && !company.over;
  s.append(building(t('bldgPad'), [padC[0], padC[1] - 100], () => { if (canStart) startMission(contractMission(c)); else focusContract(); }, [
    isoBox(3, 5, 2, 2, 6, ['#8a857c', '#5a564f', '#6e6a62']),
    svg('rect', { x: padC[0] + 16, y: padC[1] - 70, width: 5, height: 64, fill: '#B8AFA6' }),
    svg('path', { d: `M${padC[0] - 6} ${padC[1] - 10} L${padC[0] - 6} ${padC[1] - 60} Q${padC[0]} ${padC[1] - 80} ${padC[0] + 6} ${padC[1] - 60} L${padC[0] + 6} ${padC[1] - 10} Z`, fill: '#F5EFE6' }),
    svg('rect', { x: padC[0] - 6, y: padC[1] - 40, width: 12, height: 4, fill: '#A88FD6' }),
  ]));

  if (delivered !== null) s.append(stationSvg(delivered));
  // Tanks und Antenne als Deko
  for (const [gx, gy] of [[6.6, 5.2], [7.2, 5.8]]) {
    const [x, y] = iso(gx, gy);
    s.append(svg('rect', { x: x - 8, y: y - 26, width: 16, height: 26, fill: '#d9d2c7' }));
    s.append(svg('ellipse', { cx: x, cy: y - 26, rx: 8, ry: 4, fill: '#F5EFE6' }));
    s.append(svg('ellipse', { cx: x, cy: y, rx: 8, ry: 4, fill: '#b8b0a4' }));
  }
  return s;
}

// ---------- Kampagne: Firmen-Bildschirm ----------
// Links die Basis von oben, rechts Geld und Auftrag. Gebäude wählen Aufträge und Forschung.
function renderCompany() {
  const done = company.index >= contracts.length;
  const c = contracts[company.index];
  const best = bestCompany();
  const current = done ? LEVELS.filter((l) => !l.soon).length : c.level;
  const view = Math.min(state.levelView || current, current);
  const inLevel = contracts.filter((x) => x.level === view);
  const delivered = contracts.filter((x, i) => x.level === 2 && i < company.index).length;
  return el('section', { class: 'company enter' },
    el('div', { class: 'base-wrap' },
      el('nav', { class: 'levels', 'aria-label': t('level') }, LEVELS.map((l) => el('button', {
        type: 'button', class: l.n === view ? 'level on' : 'level', disabled: l.soon || l.n > current ? '' : null,
        title: l.soon ? t('soon') : (l.n > current ? t('locked') : ''),
        onclick: () => { state.levelView = l.n; render(); },
      }, `${l.n < current ? '✓ ' : ''}${t('level')} ${l.n} · ${tr(l, 'name')}${l.soon ? ` · ${t('soon')}` : ''}`))),
      baseSvg(done ? null : c, current >= 2 ? delivered : null),
      el('p', { class: 'hint' }, t('baseHint'))),
    el('div', { class: 'company-panel' },
      el('h1', {}, t('company')),
      el('p', { class: 'big-number rp' }, `${t('cash')}: ${money(company.cash)}`),
      company.over ? el('p', { class: 'result-msg fail' }, t('bankrupt')) : '',
      done ? el('p', { class: 'result-msg ok' }, t('wonAll', { c: money(company.cash) })) : '',
      !done && !company.over ? el('div', { class: 'project card' },
        el('h2', {}, el('span', {}, t('contractOf', { n: contracts.filter((x) => x.level === c.level).indexOf(c) + 1, m: contracts.filter((x) => x.level === c.level).length })), el('span', { class: 'price' }, `${t('fee')} ${money(c.fee)}`)),
        el('p', {}, el('strong', {}, tr(c, 'client'))),
        el('p', { class: 'hint' }, tr(c, 'goal')),
        c.module ? el('p', { class: 'hint' }, `${kg(c.module.mass)} · ${money(c.module.cost)}`) : el('p', { class: 'hint' }, `${t('scienceNeeded')}: ${c.minScience}`),
        el('button', { class: 'primary', type: 'button', onclick: () => startMission(contractMission(c)) }, t('startContract'))) : '',
      el('ol', { class: 'contracts' }, inLevel.map((x) => {
        const i = contracts.indexOf(x);
        return el('li', { class: i < company.index ? 'is-done' : '' }, `${i < company.index ? '✓ ' : ''}${tr(x, 'client')} · ${money(x.fee)}`);
      })),
      el('div', { class: 'research-actions' },
        el('button', { class: 'secondary', type: 'button', onclick: () => { company = freshCompany(); state.levelView = null; saveCompany(); render(); } }, t('restartCompany'))),
      best ? el('p', { class: 'hint' }, `${t('bestCompany')}: ${money(best)}`) : ''));
}

// ---------- Ergebnis ----------

// Kleine Grafik zum Weltraum-Fakt (Idee Josias 14.11.)
function factIcon(kind) {
  const s = svg('svg', { viewBox: '0 0 64 64', class: 'fact-icon', 'aria-hidden': 'true' });
  const add = (tag, a) => s.append(svg(tag, a));
  if (kind === 'iss') {
    add('rect', { x: 4, y: 22, width: 16, height: 20, fill: '#2b3a6b', stroke: '#9fb3e8' });
    add('rect', { x: 44, y: 22, width: 16, height: 20, fill: '#2b3a6b', stroke: '#9fb3e8' });
    add('line', { x1: 20, y1: 32, x2: 44, y2: 32, stroke: '#B8AFA6', 'stroke-width': 3 });
    add('rect', { x: 26, y: 26, width: 12, height: 12, rx: 4, fill: '#d9d2c7' });
  } else if (kind === 'webb') {
    for (const [x, y] of [[32, 14], [22, 20], [42, 20], [22, 32], [42, 32], [32, 38], [32, 26]]) add('polygon', { points: `${x},${y - 6} ${x + 5},${y - 3} ${x + 5},${y + 3} ${x},${y + 6} ${x - 5},${y + 3} ${x - 5},${y - 3}`, fill: '#e0c070', stroke: '#8a6a28' });
    add('polygon', { points: '8,52 56,52 48,46 16,46', fill: '#A88FD6' });
  } else if (kind === 'moon') {
    add('circle', { cx: 32, cy: 32, r: 22, fill: '#d9d2c7' });
    for (const [x, y, r] of [[24, 26, 4], [38, 36, 6], [30, 42, 3]]) add('circle', { cx: x, cy: y, r, fill: '#b8b0a4' });
  } else if (kind === 'sun') {
    add('circle', { cx: 32, cy: 32, r: 16, fill: '#ffb347' });
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; add('line', { x1: 32 + Math.cos(a) * 21, y1: 32 + Math.sin(a) * 21, x2: 32 + Math.cos(a) * 28, y2: 32 + Math.sin(a) * 28, stroke: '#ffb347', 'stroke-width': 3, 'stroke-linecap': 'round' }); }
  } else if (kind === 'voyager') {
    add('path', { d: 'M14 20 Q32 40 50 20 Z', fill: '#F5EFE6' });
    add('rect', { x: 28, y: 28, width: 8, height: 8, fill: '#e0c070' });
    add('line', { x1: 36, y1: 34, x2: 58, y2: 50, stroke: '#B8AFA6', 'stroke-width': 2 });
    add('line', { x1: 28, y1: 34, x2: 10, y2: 52, stroke: '#B8AFA6', 'stroke-width': 2 });
  } else {
    for (const [x, y, w] of [[10, 14, 6], [40, 10, 4], [24, 34, 8], [48, 40, 5], [14, 48, 4], [34, 52, 6]]) add('rect', { x, y, width: w, height: w * 0.7, fill: '#B8AFA6', transform: `rotate(${x} ${x} ${y})` });
  }
  return s;
}



function renderResult() {
  const r = state.result;
  const reasons = {
    budget: t('rBudget'), power: t('rPower'), capacity: t('rCapacity'), 'delta-v': t('rDv'),
    'rocket-mass': t('rRocketMass'), science: t('rScience', { n: state.mission.minScience }), 'launch-failure': t('rLaunch'),
  };
  const best = loadBest(state.mission);
  const free = state.mission.free;
  return el('section', { class: 'result enter' },
    el('p', { class: `big ${r.success ? 'ok' : 'fail'}` }, r.success ? t('complete') : (r.reachedOrbit ? t('notEnough') : t('failed'))),
    r.problems.length ? el('ul', {}, r.problems.map((p) => el('li', {}, reasons[p]))) : '',
    r.attempts === 2 && r.reachedOrbit ? el('p', { class: 'hint' }, t('secondTry')) : '',
    r.fact ? el('div', { class: 'fact' }, factIcon(r.fact.icon), el('p', {}, el('strong', {}, t('funFact')), ' ', r.fact[getLang()])) : '',
    r.rp ? el('p', { class: 'rp-earned' }, t('rpEarned', { n: r.rp })) : '',
    state.mission.contract && r.fee ? el('p', { class: 'rp-earned' }, t('feeReceived', { c: money(r.fee) })) : '',
    state.mission.contract ? el('p', { class: 'hint' }, t('cashNow', { c: money(company.cash) })) : '',
    r.repeat ? el('p', { class: 'hint' }, t('noRpRepeat')) : '',
    el('dl', {},
      el('dt', {}, t('spent')), el('dd', {}, money(r.spent)),
      free ? '' : [el('dt', {}, t('budgetLeft')), el('dd', {}, money(r.budgetLeft))],
      ...(state.mission.module ? [] : [ // Stationsflug: keine Wissenschaft
        el('dt', {}, t('science')), el('dd', {}, String(r.science)),
        el('dt', {}, t('sciencePerM')), el('dd', {}, r.sciencePerMillion.toFixed(1))]),
      free || state.mission.contract ? '' : [el('dt', {}, t('best')), el('dd', {}, best ? best.toFixed(1) : t('noneYet'))]));
}

// Bestwert im Browser speichern, ohne Login. Freies Spiel zählt nicht.
function loadBest(m) {
  try { return Number(localStorage.getItem(`best-${m.id}`)) || 0; } catch { return 0; }
}
function saveBest(m, v) {
  if (m.free) return;
  try { if (v > loadBest(m)) localStorage.setItem(`best-${m.id}`, String(v)); } catch { /* ohne Speicher spielbar */ }
}
function resetBest() {
  try { for (const m of missions) localStorage.removeItem(`best-${m.id}`); } catch { /* ohne Speicher */ }
}

// ---------- Knöpfe unten und Gesamtaufbau ----------

function footer() {
  const back = $('back'), next = $('next');
  back.classList.toggle('hidden', state.phase === 'launch');
  next.classList.remove('hidden');
  if (state.phase === 'build') {
    back.textContent = state.build === 0 || state.mission.module ? (state.mission.contract ? t('backCompany') : t('changeDifficulty')) : t('back');
    const ready = state.mission.module ? !!state.rocket : [state.instruments.length > 0, state.instruments.length > 0 && !!state.bus && !!state.panel && !!state.rocket][state.build];
    next.textContent = state.build === 1 ? t('launch') : t('next');
    next.disabled = !ready;
  } else if (state.phase === 'launch') {
    next.textContent = t('seeResult');
  } else if (state.phase === 'research' || state.phase === 'company') {
    back.textContent = state.phase === 'company' ? t('menu') : (state.returnTo === 'company' ? t('backCompany') : t('changeDifficulty'));
    next.classList.add('hidden');
  } else if (state.phase === 'result') {
    back.textContent = state.mission.contract ? t('backCompany') : t('changeDifficulty');
    next.textContent = state.mission.contract ? t('backCompany') : t('tryAgain');
    next.disabled = false;
  }
}

function render() {
  const inMenu = state.phase === 'home' || state.phase === 'start';
  $('app').classList.toggle('hidden-app', inMenu);
  document.body.classList.toggle('playing', !inMenu);
  updateSound();
  if (inMenu) { renderHome(); return; }
  $('home').classList.remove('show');

  const stage = $('stage');
  stage.classList.toggle('full', ['result', 'research', 'company'].includes(state.phase));
  stage.classList.toggle('launching', state.phase === 'launch');
  if (state.phase === 'company') {
    $('mission-label').textContent = t('company');
    $('budget').textContent = money(company.cash);
    $('budget').classList.toggle('low', company.over);
    $('center').replaceChildren(renderCompany());
    footer();
    return;
  }
  if (state.phase === 'research') {
    $('mission-label').textContent = t('research');
    $('budget').textContent = `${research.rp} ${t('rpShort')}`;
    $('budget').classList.remove('low');
    $('center').replaceChildren(renderResearch());
    footer();
    return;
  }
  const m = state.mission;
  $('mission-label').textContent = `${t(`lvl${m.level}`)}: ${tr(m, 'name')}`;
  const left = budgetLeft(m.budget, chosen());
  $('budget').textContent = m.free ? t('noLimit') : `${t('budget')} ${money(left)} / ${money(m.budget)}`;
  $('budget').classList.toggle('low', !m.free && left < 0);

  if (state.phase === 'build') { renderLeft(); renderRight(); $('center').replaceChildren(renderBuild()); }
  if (state.phase === 'launch') {
    $('center').replaceChildren(renderLaunch());
  }
  if (state.phase === 'result') $('center').replaceChildren(renderResult());
  if (state.phase === 'research') $('center').replaceChildren(renderResearch());
  footer();
}

$('next').addEventListener('click', () => {
  if (state.phase === 'build') {
    if (state.build < 1) { state.build += 1; render(); return; }
    const r = missionResult({ ...state, insurance: insuranceCost() });
    if (r.reachedOrbit) {
      const out = launchOutcome(state.rocket.reliability ?? 1, !!insuranceCost());
      r.attempts = out.attempts;
      if (!out.launched) {
        Object.assign(r, { reachedOrbit: false, success: false, sciencePerMillion: 0 });
        r.problems = [...r.problems.filter((x) => x !== 'science'), 'launch-failure'];
      }
      if (state.rocket.id === 'own') research.flights += out.attempts;
    }
    const contract = state.mission.contract;
    const previousBest = contract ? 0 : loadBest(state.mission);
    if (r.success && !contract) saveBest(state.mission, r.sciencePerMillion);
    r.rp = pointsForMission(r, state.mission, previousBest);
    if (contract) {
      company.cash = settleContract(company.cash, r, contract.fee);
      if (r.success) { company.index += 1; state.levelView = null; }
      const next = contracts[company.index];
      if (next && isBankrupt(company.cash, cheapestMission(contractMission(next), { instruments, buses, panels }, campaignRockets(company.index)))) company.over = true;
      if (!next) { try { if (company.cash > bestCompany()) localStorage.setItem('best-company', String(company.cash)); } catch { /* ohne Speicher */ } }
      saveCompany();
      r.fee = r.success ? contract.fee : 0;
    }
    r.repeat = r.success && !r.rp && !state.mission.free && !contract;
    research.rp += r.rp;
    saveResearch();
    if (r.reachedOrbit) r.fact = facts[Math.floor(Math.random() * facts.length)]; // beim Start festgelegt, ändert sich beim Neuzeichnen nicht
    state.result = r;
    state.launchFrom = document.querySelector('.slot.mid .rocket-pic')?.getBoundingClientRect() || null; // Startpunkt für den Übergang
    state.phase = 'launch';
  } else if (state.phase === 'launch') state.phase = 'result';
  else if (state.phase === 'result') {
    if (state.mission.contract) state.phase = 'company';
    else { state.phase = 'build'; state.build = 0; }
  }
  render();
});

$('back').addEventListener('click', () => {
  if (state.phase === 'build' && state.build > 0 && !(state.mission && state.mission.module)) state.build -= 1;
  else if (state.phase === 'company') state.phase = 'home';
  else if (state.phase === 'research') state.phase = state.returnTo || 'start';
  else if (state.mission && state.mission.contract && state.phase !== 'research') state.phase = 'company';
  else state.phase = 'start';
  render();
});

// Raketen-Schritt: Pfeiltasten blättern durchs Karussell, ohne es erst anzuklicken
addEventListener('keydown', (e) => {
  if (state.phase !== 'build' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  if (e.target.closest && e.target.closest('input, textarea, select, .carousel')) return; // Karussell hat eigenen Handler
  const items = offered(catalogs.find((c) => c.kind === 'rocket').items);
  if (!items.length) return;
  e.preventDefault();
  moveRocket(items, e.key === 'ArrowLeft' ? -1 : 1);
});

$('lang').addEventListener('click', () => { setLang(getLang() === 'en' ? 'de' : 'en'); render(); });
$('credits-btn').addEventListener('click', openCredits);
$('sound').addEventListener('click', () => { setMusic(!isPlaying()); updateSound(); });
// Musik ist Standard: beim ersten Klick oder Tastendruck starten (Browser erlauben Ton erst danach).
// Der Ton-Knopf selbst zählt nicht, sonst schaltet derselbe Klick die Musik gleich wieder aus.
function firstInput(e) {
  if (e.target.closest && e.target.closest('#sound')) return;
  removeEventListener('pointerdown', firstInput); removeEventListener('keydown', firstInput);
  if (wantsMusic() && !isPlaying()) { setMusic(true); updateSound(); }
}
addEventListener('pointerdown', firstInput); addEventListener('keydown', firstInput);

setLang(getLang(), false);
startSpace($('space'));
render();
