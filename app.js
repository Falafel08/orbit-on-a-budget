// Oberfläche: Home, Schwierigkeit (Waben), dann drei Spalten (Teile, Rakete, Status), dann Start und Ergebnis
import { facts } from './data/facts.js';
import { missions, instruments, buses, panels, rockets, starship, contracts, CAMPAIGN_START } from './data/parts.js';
import { settleContract, isBankrupt, cheapestMission } from './src/campaign.js';
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
    ...['creditsIdea', 'creditsTeam', 'creditsCode', 'creditsData', 'creditsEvent'].map((k) => el('p', {}, t(k))),
    el('div', { class: 'actions' }, el('button', { type: 'button', onclick: () => panel.close() }, t('close'))));
  panel.showModal();
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

function card(cat, item) {
  const node = el('div', {
    class: 'card', role: 'button', tabindex: '0', draggable: 'true', 'aria-pressed': String(cat.picked(item)),
    onclick: () => choose(cat.kind, item),
    onkeydown: press(() => choose(cat.kind, item)),
    onmouseenter: () => showInfo(item), onfocus: () => showInfo(item),
    ondragstart: (e) => { e.dataTransfer.setData('text/plain', `${cat.kind}:${item.id}`); node.classList.add('dragging'); },
    ondragend: () => node.classList.remove('dragging'),
  },
  el('h2', {}, el('span', {}, tr(item, 'name')), el('span', { class: 'price' }, money(item.cost))),
  el('dl', {}, cat.rows(item).map(([k, v]) => [el('dt', {}, k), el('dd', {}, String(v))])));
  return node;
}

// Schritte: Instrumente, Satellit (Bus und Solarpanel), Rakete
const STEP_CATS = [['instrument'], ['bus', 'panel'], ['rocket']];

// Raketen als Karussell mit Pfeilen (Skizze Josias NASA.pdf, Linus 14.11.)
// Bild-Höhe nach Nutzlast, damit große Raketen größer aussehen
function rocketPicture(r) {
  const cap = r.maxPayload ?? 1600; // eigene Rakete: etwa 1,6 t in den Orbit
  const h = 80 + Math.min(1, Math.log10(Math.max(cap, 10)) / 5) * 120;
  const w = r.id === 'starship' ? 34 : r.id === 'pegasus' || r.rideshare ? 16 : 22;
  const body = { falcon9: '#F5EFE6', starship: '#b8bec6', pegasus: '#F5EFE6', own: '#A88FD6' }[r.id] || '#d9d2c7';
  const x = 60 - w / 2, top = 210 - h;
  const s = svg('svg', { viewBox: '25 0 70 220', class: 'rocket-pic', role: 'img', 'aria-label': tr(r, 'name') });
  s.append(svg('path', { d: `M${x} ${top + w} Q60 ${top - w * 0.6} ${x + w} ${top + w} Z`, fill: body }));
  s.append(svg('rect', { x, y: top + w, width: w, height: h - w, fill: body }));
  s.append(svg('path', { d: `M${x} 210 L${x - 10} 214 L${x} ${190} Z M${x + w} 210 L${x + w + 10} 214 L${x + w} 190 Z`, fill: '#745F9A' }));
  if (r.id === 'pegasus') s.append(svg('path', { d: `M${x} ${top + h * 0.55} L${x - 22} ${top + h * 0.7} L${x} ${top + h * 0.68} Z M${x + w} ${top + h * 0.55} L${x + w + 22} ${top + h * 0.7} L${x + w} ${top + h * 0.68} Z`, fill: '#B8AFA6' }));
  if (r.id === 'falcon9') s.append(svg('rect', { x, y: top + h * 0.35, width: w, height: 6, fill: '#0b0a12' }));
  if (r.rideshare) for (let i = 0; i < 3; i++) s.append(svg('rect', { x: 60 - 4, y: top + w + 6 + i * 10, width: 8, height: 7, fill: '#745F9A' }));
  return s;
}

// Welche Rakete im Karussell gerade vorne steht
function rocketView(items) {
  if (state.rocketView == null && state.rocket) state.rocketView = Math.max(0, items.findIndex((x) => x.id === state.rocket.id));
  return Math.min(Math.max(0, state.rocketView ?? 0), items.length - 1);
}
function moveRocket(items, d) {
  const i = rocketView(items);
  state.rocketView = (i + d + items.length) % items.length;
  state.info = items[state.rocketView];
  render();
  document.querySelector('.carousel')?.focus({ preventScroll: true });
}

// Mitte: Karussell wie in Josias' Skizze. Links und rechts die Nachbarn, vorne groß die aktuelle Rakete,
// darunter Namensband, Schild „Ausgewählt“ und der Knopf.
function rocketCarouselCenter() {
  const cat = catalogs.find((c) => c.kind === 'rocket');
  const items = offered(cat.items);
  const n = items.length;
  const i = rocketView(items);
  const slot = (k, role) => {
    const r = items[(i + k + n) % n];
    const picked = cat.picked(r);
    return el('figure', { class: `slot ${role}${picked ? ' is-picked' : ''}`, onclick: () => (role === 'mid' ? choose('rocket', r) : moveRocket(items, k)) },
      role === 'mid' && picked ? el('span', { class: 'picked-tag' }, t('selected')) : '',
      rocketPicture(r),
      el('figcaption', { class: 'banner' }, tr(r, 'name')));
  };
  const mid = items[i];
  const picked = cat.picked(mid);
  return el('div', {
    class: 'carousel', tabindex: '0', 'aria-label': t('hintRocket'), onkeydown: (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveRocket(items, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveRocket(items, 1); }
    },
  },
  el('div', { class: 'carousel-stage' },
    n > 1 ? el('button', { class: 'arrow', type: 'button', 'aria-label': t('prevRocket'), onclick: () => moveRocket(items, -1) }, '‹') : el('span'),
    el('div', { class: 'slots' }, n > 2 ? slot(-1, 'side') : '', slot(0, 'mid'), n > 1 ? slot(1, 'side') : ''),
    n > 1 ? el('button', { class: 'arrow', type: 'button', 'aria-label': t('nextRocket'), onclick: () => moveRocket(items, 1) }, '›') : el('span')),
  el('button', { class: picked ? 'secondary pick' : 'primary pick', type: 'button', 'aria-pressed': String(picked), onclick: () => choose('rocket', mid) }, picked ? t('selected') : t('select')),
  el('p', { class: 'dots', 'aria-hidden': 'true' }, items.map((x, k) => el('span', { class: k === i ? 'dot on' : 'dot' }))));
}

// Links: Zahlen der Rakete, die im Karussell vorne steht
function rocketDetails(cat) {
  const items = offered(cat.items);
  if (!items.length) return null;
  const r = items[rocketView(items)];
  return el('div', { class: 'card rocket-details' },
    el('h2', {}, el('span', {}, tr(r, 'name')), el('span', { class: 'price' }, money(r.cost))),
    el('dl', {}, cat.rows(r).map(([k, v]) => [el('dt', {}, k), el('dd', {}, String(v))])));
}

// Neu zeichnen ohne Springen: Scroll-Position und Fokus bleiben, Einblenden nur beim Schrittwechsel.
// Sonst rutschte z. B. der Versicherungs-Haken nach dem Klick aus dem Bild.
let leftStep = null;
function renderLeft() {
  const cats = STEP_CATS[state.build].map((k) => catalogs.find((c) => c.kind === k));
  const left = $('left');
  const sameStep = leftStep === state.build;
  const scroll = sameStep ? left.scrollTop : 0;
  const focusables = () => [...left.querySelectorAll('.catalog .card, input, .steps button')];
  const focusIndex = sameStep ? focusables().indexOf(document.activeElement) : -1;
  leftStep = state.build;
  left.replaceChildren(...[
    el('nav', { class: 'steps', 'aria-label': 'Build steps' }, t('steps').map((name, i) => el('button', {
      type: 'button', 'aria-current': i === state.build ? 'step' : 'false',
      onclick: () => { state.build = i; render(); },
    }, name))),
    el('p', { class: 'hint' }, t(cats[0].hint)),
    ...cats.flatMap((cat) => [
      cat.group ? el('h3', { class: 'group' }, t(cat.group)) : null,
      cat.kind === 'rocket' ? rocketDetails(cat)
        : el('div', { class: sameStep ? 'catalog' : 'catalog enter' }, offered(cat.items).map((item) => card(cat, item)))]).filter(Boolean),
    state.build === 2 && state.rocket && state.rocket.uninsurable ? el('p', { class: 'hint' }, t('noInsurance')) : null,
    state.build === 2 && state.rocket && !state.rocket.uninsurable ? el('label', { class: 'insure card' },
      el('input', { type: 'checkbox', ...(state.insured ? { checked: '' } : {}), onchange: (e) => { state.insured = e.target.checked; render(); } }),
      el('span', {}, el('strong', {}, t('insure')), el('br'), t('insureInfo', { c: money(insurancePrice(state.rocket)) }))) : null].filter(Boolean));
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
  if (!m.free) meters.push(meter(t('science'), science(), m.minScience, `${science()} / ${m.minScience} ${t('needed')}`, true));
  if (state.bus) {
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
  if (state.build === 2) return rocketCarouselCenter();
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

// ---------- Start-Animation ----------

// Wie der Start endet (Idee: Josias, Skizze NASA1.pdf): Orbit, Explosion,
// zu schwer (hebt nicht ab) oder zu wenig Geld (stottert, kein Treibstoff)
function launchMode(r) {
  if (r.reachedOrbit) return 'ok';
  if (r.problems.includes('budget')) return 'nofuel';
  if (r.problems.includes('rocket-mass') || r.problems.includes('delta-v')) return 'heavy';
  return 'explode';
}

// Rakete auf der Rampe, Knopf „Countdown starten“, dann 3, 2, 1 und Start
function renderLaunch() {
  const canvas = el('canvas', { 'aria-label': t('launch') });
  const btn = el('button', { class: 'primary countdown-btn', type: 'button' }, t('startCountdown'));
  $('next').disabled = true;
  let scene = null;
  setTimeout(() => { scene = launch(canvas, launchMode(state.result)); btn.focus(); }, 480);
  btn.addEventListener('click', () => { if (!scene) return; btn.remove(); scene.go(); });
  return el('div', { class: 'launch-wrap enter' }, canvas, btn);
}

function launch(canvas, mode) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const W = rect.width, H = rect.height;
  const stars = Array.from({ length: 140 }, () => [Math.random() * W, Math.random() * H, Math.random()]);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = reduce ? 0 : 3000, ignite = reduce ? 1 : 900, fly = reduce ? 1 : 4200;
  const failAt = 0.5;
  let start = 0;

  const pos = (p) => [W * 0.25 + Math.pow(p, 1.7) * W * 0.6, H - 90 - Math.sin(Math.min(p, 1) * Math.PI / 2) * (H - 190)];

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

  // Himmel bleibt stehen, Planet und Bahn bewegen sich mit der Kamera
  function sky() {
    ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, W, H);
    for (const [x, y, b] of stars) { ctx.fillStyle = `rgba(245,239,230,${0.25 + b * 0.6})`; ctx.fillRect(x, y, 1.6, 1.6); }
  }
  function world() {
    ctx.fillStyle = '#1d3b5c'; ctx.beginPath(); ctx.ellipse(W / 2, H + 380, W * 1.1, 440, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(168,143,214,0.5)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-W, 100); ctx.lineTo(2 * W, 100); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(184,175,166,0.8)'; ctx.font = '13px sans-serif'; ctx.textAlign = 'start'; ctx.fillText(t('orbit'), 12, 92);
  }

  // Kamera (Idee Josias 14.11.): startet nah an der Rampe, rüttelt beim Zünden,
  // folgt der Rakete und zoomt heraus, bis die ganze Bahn zu sehen ist
  const Z0 = reduce ? 1 : 1.8;
  const ease = (x) => x * x * (3 - 2 * x);
  function camera(fx, fy, z, shake) {
    const s = reduce ? 0 : shake;
    ctx.save();
    ctx.translate(W / 2 + (Math.random() - 0.5) * s, H / 2 + (Math.random() - 0.5) * s);
    ctx.scale(z, z);
    ctx.translate(-fx, -fy);
  }

  function caption(text) {
    ctx.font = '600 18px sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(11,10,18,0.9)'; ctx.lineWidth = 5; ctx.strokeText(text, W / 2, H - 28); // dunkler Rand, lesbar auf dem Planeten
    ctx.fillStyle = '#F5EFE6'; ctx.fillText(text, W / 2, H - 28); ctx.textAlign = 'start';
  }

  const [x0, y0] = pos(0);
  const pad = [x0, y0 - 30];

  function frame(now) {
    const passed = now - start;
    sky();
    // Countdown: 3, 2, 1, Kamera nah an der Rampe
    if (passed < count) {
      camera(...pad, Z0, 0); world(); rocketAt(x0, y0, 0, 2.2, false); ctx.restore();
      ctx.font = '700 72px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#F5EFE6';
      ctx.fillText(String(Math.ceil((count - passed) / 1000)), W / 2, H / 2); ctx.textAlign = 'start';
      requestAnimationFrame(frame);
      return;
    }
    const tt = passed - count;
    if (tt < ignite) {
      camera(...pad, Z0, 4 + 8 * (tt / ignite)); world();
      fireball(x0, y0 + 30, 30 + (tt / ignite) * 60, 0.9);
      rocketAt(x0, y0 - Math.random() * 2, 0, 2.2, true);
      ctx.restore();
    } else {
      const p = Math.min(1, (tt - ignite) / fly);
      if (mode === 'heavy') {
        // Zu schwer: bleibt auf der Rampe und zittert, bis die Triebwerke ausgehen
        const burning = p < 0.6;
        camera(...pad, Z0, burning ? 8 : 0); world();
        if (burning) fireball(x0, y0 + 30, 70, 0.7);
        rocketAt(x0 + (burning ? (Math.random() - 0.5) * 4 : 0), y0, 0, 2.2, burning);
        ctx.restore();
        caption(t('capHeavy'));
      } else if (mode === 'nofuel') {
        // Kein Geld für Treibstoff: Flamme stottert, Rakete steigt kurz und fällt zurück
        const h = p < 0.4 ? p / 0.4 : Math.max(0, 1 - (p - 0.4) / 0.3);
        const flame = p < 0.4 && Math.sin(now / 45) + Math.sin(now / 23) > 0.2;
        camera(pad[0], pad[1] - h * 30, Z0, flame ? 5 : 0); world();
        rocketAt(x0, y0 - h * 60, 0, 2.2, flame);
        if (p > 0.7) fireball(x0, y0 + 20, 20 + (p - 0.7) * 120, Math.max(0, 1 - (p - 0.7) * 3));
        ctx.restore();
        caption(t('capNoFuel'));
      } else {
        const success = mode === 'ok';
        const pp = success ? p : Math.min(p, failAt);
        const [x, y] = pos(pp);
        const e = ease(Math.min(1, p / 0.7));
        camera(x + (W / 2 - x) * e, y - 30 + (H / 2 - y + 30) * e, Z0 + (1 - Z0) * e, p < 0.35 ? 12 * (1 - p / 0.35) : 0);
        world();
        if (p < 0.15) fireball(x0, y0 + 30, 90 * (1 - p / 0.15), 0.8);
        ctx.strokeStyle = 'rgba(245,239,230,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
        for (let s = 0; s <= pp; s += 0.01) { const [sx, sy] = pos(s); s === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy); }
        ctx.stroke();
        const [nx, ny] = pos(Math.min(1, pp + 0.01));
        const angle = Math.atan2(ny - y, nx - x) + Math.PI / 2;
        const scale = 2.2 - Math.min(1, pp * 2) * 1.2;
        if (!success && p > failAt) fireball(x, y, 20 + (p - failAt) * 160, Math.max(0, 1 - (p - failAt) * 2));
        else rocketAt(x, y, angle, scale, true);
        ctx.restore();
      }
      if (p >= 1) { $('next').disabled = false; return; }
    }
    requestAnimationFrame(frame);
  }

  // Ruhebild auf der Rampe, bis jemand den Countdown startet
  sky(); camera(...pad, Z0, 0); world(); rocketAt(x0, y0, 0, 2.2, false); ctx.restore();
  return {
    go() {
      start = performance.now();
      requestAnimationFrame(frame);
    },
  };
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

// ---------- Kampagne: Firmen-Bildschirm ----------

function renderCompany() {
  const done = company.index >= contracts.length;
  const c = contracts[company.index];
  const best = bestCompany();
  return el('section', { class: 'research enter' },
    el('h1', {}, t('company')),
    el('p', { class: 'lead' }, t('companyLead')),
    el('p', { class: 'big-number rp' }, `${t('cash')}: ${money(company.cash)}`),
    company.over ? el('p', { class: 'result-msg fail' }, t('bankrupt')) : '',
    done ? el('p', { class: 'result-msg ok' }, t('won', { c: money(company.cash) })) : '',
    !done && !company.over ? el('div', { class: 'project card' },
      el('h2', {}, el('span', {}, t('contractOf', { n: company.index + 1, m: contracts.length })), el('span', { class: 'price' }, `${t('fee')} ${money(c.fee)}`)),
      el('p', {}, el('strong', {}, tr(c, 'client'))),
      el('p', { class: 'hint' }, tr(c, 'goal')),
      el('p', { class: 'hint' }, `${t('scienceNeeded')}: ${c.minScience}`),
      el('button', { class: 'primary', type: 'button', onclick: () => startMission(contractMission(c)) }, t('startContract'))) : '',
    el('ol', { class: 'contracts' }, contracts.map((x, i) => el('li', { class: i < company.index ? 'is-done' : '' },
      `${i < company.index ? '✓ ' : ''}${tr(x, 'client')} · ${money(x.fee)}`))),
    el('div', { class: 'research-actions' },
      el('button', { class: 'secondary', type: 'button', onclick: () => { state.returnTo = 'company'; go('research'); } }, `${t('research')} · ${research.rp} ${t('rpShort')}`),
      el('button', { class: 'secondary', type: 'button', onclick: () => { company = freshCompany(); saveCompany(); render(); } }, t('restartCompany'))),
    best ? el('p', { class: 'hint' }, `${t('bestCompany')}: ${money(best)}`) : '');
}

// ---------- Ergebnis ----------

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
    r.fact ? el('p', { class: 'fact' }, el('strong', {}, t('funFact')), ' ', r.fact[getLang()]) : '',
    r.rp ? el('p', { class: 'rp-earned' }, t('rpEarned', { n: r.rp })) : '',
    state.mission.contract && r.fee ? el('p', { class: 'rp-earned' }, t('feeReceived', { c: money(r.fee) })) : '',
    state.mission.contract ? el('p', { class: 'hint' }, t('cashNow', { c: money(company.cash) })) : '',
    r.repeat ? el('p', { class: 'hint' }, t('noRpRepeat')) : '',
    el('dl', {},
      el('dt', {}, t('spent')), el('dd', {}, money(r.spent)),
      free ? '' : [el('dt', {}, t('budgetLeft')), el('dd', {}, money(r.budgetLeft))],
      el('dt', {}, t('science')), el('dd', {}, String(r.science)),
      el('dt', {}, t('sciencePerM')), el('dd', {}, r.sciencePerMillion.toFixed(1)),
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
    back.textContent = state.build === 0 ? (state.mission.contract ? t('backCompany') : t('changeDifficulty')) : t('back');
    const ready = [state.instruments.length > 0, !!state.bus && !!state.panel, !!state.rocket][state.build];
    next.textContent = state.build === 2 ? t('launch') : t('next');
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
    if (state.build < 2) { state.build += 1; render(); return; }
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
      if (r.success) company.index += 1;
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
    state.phase = 'launch';
  } else if (state.phase === 'launch') state.phase = 'result';
  else if (state.phase === 'result') {
    if (state.mission.contract) state.phase = 'company';
    else { state.phase = 'build'; state.build = 0; }
  }
  render();
});

$('back').addEventListener('click', () => {
  if (state.phase === 'build' && state.build > 0) state.build -= 1;
  else if (state.phase === 'company') state.phase = 'home';
  else if (state.phase === 'research') state.phase = state.returnTo || 'start';
  else if (state.mission && state.mission.contract && state.phase !== 'research') state.phase = 'company';
  else state.phase = 'start';
  render();
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
