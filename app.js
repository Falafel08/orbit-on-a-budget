// Oberfläche: Home, Schwierigkeit (Waben), dann drei Spalten (Teile, Rakete, Status), dann Start und Ergebnis
import { facts } from './data/facts.js';
import { SPRITES } from './assets/kenney/sprites.js';
import { nasaSources, otherSources } from './data/sources.js';
import { missions, instruments, buses, panels, rockets, starship, falconHeavy, sls, contracts, LEVELS, CAMPAIGN_START, OWN_STAGES, OWN_STAGES_2 } from './data/parts.js';
import { settleContract, isBankrupt, cheapestMission, moduleBus, rocketsFor, contractLocked, minCostToFinish } from './src/campaign.js';
import { budgetLeft, deltaV, missionResult, launchOutcome } from './src/logic.js';
import { t, tr, getLang, setLang } from './src/i18n.js';
import { startSpace } from './src/space.js';
import { setMusic, isPlaying, wantsMusic, beep, rumble, boomSound } from './src/audio.js';
import { pointsForMission, ownRocketCost, ownRocketReliability, starshipCost } from './src/research.js';

// ---------- Forschung: Stand über alle Missionen im Browser gespeichert ----------
// Eigene Rakete: zwei Stufen, ausgelegt mit der Raketengleichung (etwa 1,6 t in 800 km)
// Forschung je Level und Ort (Linus 14.11.): Erde, Raumstation, Mond, Mars. Jedes Projekt schaltet etwas frei.
// Forschung kostet Geld, Punkte und Zeit (Krisp 13:10, Linus 14.11.). cost in Mio. $.
// Man plant immer fürs nächste Level: Erde -> Station (Orbiter-2, Starship I), Station -> Mond (Betankung, Starship II),
// Mond -> Mars (Mondeis, Starship III). helps = Ziele, denen das Projekt hilft (für die Pleite-Prüfung).
const PROJECTS = [
  { id: 'own-rocket', level: 1, rp: 15, cost: 20, seconds: 40, name: 'projOwn', info: 'projOwnInfo', helps: ['leo'] },
  { id: 'reuse', level: 1, rp: 30, cost: 30, seconds: 60, name: 'projReuse', info: 'projReuseInfo', needs: 'own-rocket', helps: ['leo'] },
  { id: 'quality', level: 1, rp: 25, cost: 25, seconds: 50, name: 'projQuality', info: 'projQualityInfo', needs: 'own-rocket' },
  { id: 'orbiter-2', level: 1, rp: 40, cost: 40, seconds: 70, name: 'projOrbiter2', info: 'projOrbiter2Info', needs: 'own-rocket', helps: ['leo'] },
  { id: 'ss-reuse-1', level: 1, rp: 20, cost: 100, seconds: 50, name: 'projSs1', info: 'projSsInfo', helps: ['leo', 'moon', 'mars'] },
  { id: 'refuel', level: 2, rp: 30, cost: 150, seconds: 60, name: 'projRefuel', info: 'projRefuelInfo', helps: ['moon', 'mars'] },
  { id: 'ss-reuse-2', level: 2, rp: 25, cost: 100, seconds: 50, name: 'projSs2', info: 'projSsInfo', needs: 'ss-reuse-1', helps: ['leo', 'moon', 'mars'] },
  { id: 'lunar-ice', level: 3, rp: 30, cost: 200, seconds: 60, name: 'projIce', info: 'projIceInfo', helps: ['mars'] },
  { id: 'ss-reuse-3', level: 3, rp: 30, cost: 100, seconds: 50, name: 'projSs3', info: 'projSsInfo', needs: 'ss-reuse-2', helps: ['leo', 'moon', 'mars'] },
  { id: 'mars-fuel', level: 4, rp: 25, cost: 300, seconds: 60, name: 'projMarsFuel', info: 'projMarsFuelInfo', helps: ['mars'] },
];
// Höchstes erreichtes Level der Kampagne
const reachedLevel = () => (company.index >= contracts.length ? LEVELS.length : contracts[company.index].level);
const SKIP_RP = 5;
let research = { rp: 0, done: {}, flights: 0, active: null };
try { research = { ...research, ...JSON.parse(localStorage.getItem('research') || '{}') }; } catch { /* Neustart */ }
const saveResearch = () => { try { localStorage.setItem('research', JSON.stringify(research)); } catch { /* ohne Speicher */ } };

function ownRocket() {
  return {
    id: 'own', name: research.name || t('ownRocketName'), info: t('ownRocketInfo', { n: research.flights }),
    reliability: ownRocketReliability(research.flights, !!research.done.quality),
    // Orbiter-2 (Forschung): größere Stufen, trägt Stationsmodule, kostet 60 % mehr
    cost: Math.round(ownRocketCost(research.flights, !!research.done.reuse) * (research.done['orbiter-2'] ? 1.6 : 1) * 10) / 10,
    stages: research.done['orbiter-2'] ? OWN_STAGES_2 : OWN_STAGES,
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
      minScience: 0, requiredDv: 9500, module: c.module, contract: c, dest: c.dest, requires: c.requires, de: null };
  }
  const base = missions.find((m) => m.id === c.base);
  return { ...base, id: `campaign-${c.id}`, name: tr(c, 'client'), goal: tr(c, 'goal'), budget: company.cash, minScience: c.minScience, contract: c, dest: c.dest, de: null };
}

// Mindestgeld für den Auftrag an Stelle index: billigste Kombination aus Forschung und Flug (minCostToFinish).
// Laufende Forschung ist schon bezahlt und zählt als erledigt. Ergebnis gemerkt, die Rechnung probiert viele Wege.
const minCostCache = new Map();
function minCostFor(index, done = research.done) {
  const c = contracts[index];
  if (!c) return 0;
  const d = research.active ? { ...done, [research.active.id]: true } : done;
  const key = `${index}|${research.flights}|${Object.keys(d).filter((k) => d[k]).sort().join(',')}`;
  if (!minCostCache.has(key)) minCostCache.set(key, minCostToFinish(contractMission(c), { instruments, buses, panels }, (x) => campaignRockets(index, x), PROJECTS, d));
  return minCostCache.get(key);
}

// Starship gibt es nur in der Kampagne, ab dem zweiten Auftrag
// Raketen für einen Auftrag: je nach Ziel (Erdorbit, Mond, Mars) und Forschungsstand done,
// damit die Pleite-Prüfung alle Wege kennt (das Geld für Forschung rechnet minCostToFinish dazu).
const campaignRockets = (index, done = research.done) => {
  const dest = (contracts[index] && contracts[index].dest) || 'leo';
  // Modulflüge: kein CubeSat-Mitflug (der trägt nur CubeSats bis 3U)
  const list = [...rockets.filter((r) => !(contracts[index] && contracts[index].module && r.rideshare)), ...(research.done['own-rocket'] && dest === 'leo' ? [ownRocket()] : []),
    ...(index >= 1 ? [{ ...starship, cost: starshipCost(done) }] : []), falconHeavy, sls];
  return rocketsFor(dest, list, done);
};
const rocketList = () => (state.mission && state.mission.contract ? campaignRockets(company.index)
  : [...rockets, ...(research.done['own-rocket'] ? [ownRocket()] : [])]);

// Forschung läuft im Hintergrund weiter, solange das Spiel offen ist
// Fortschritt nach vergangener Zeit (gedrosselte Hintergrund-Tabs zählen mit). Die Seite wird nur am Ende neu gebaut,
// sonst nur Balken und Prozent, damit Eingaben und Fokus erhalten bleiben (Fund Code-Review 14.11.).
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now(), dt = (now - lastTick) / 1000; lastTick = now;
  const a = research.active;
  if (!a) return;
  const project = PROJECTS.find((x) => x.id === a.id);
  if (!project) { research.active = null; saveResearch(); return; } // alter Stand im Speicher
  a.progress = Math.min(1, a.progress + (dt / project.seconds) * (a.fast ? 2 : 1));
  if (a.progress >= 1) { research.done[a.id] = true; research.active = null; }
  saveResearch();
  if (state.phase !== 'research' && state.phase !== 'start') return; // Labor und Level-Auswahl zeigen den Fortschritt
  if (!research.active) { render(); return; }
  const pct = document.querySelector('.research-pct'), bar = document.querySelector('.research-meter .bar span');
  if (pct) pct.textContent = `${t('team')} · ${Math.round(a.progress * 100)} %`;
  if (bar) bar.style.width = `${a.progress * 100}%`;
}, 250);

// Phasen: home, start (Waben), build, launch, result
const state = { phase: 'home', build: 0, mission: null, instruments: [], bus: null, panel: null, rocket: null, result: null, info: null };

const $ = (id) => document.getElementById(id);
// Geld: unter 1 Mio. in Tausend, Minus vor dem Dollarzeichen
const money = (m) => {
  const a = Math.abs(m), k = Math.round(a * 1000), sign = m < 0 && k > 0 ? '-' : '';
  return k < 1000 ? `${sign}$${k}k` : `${sign}$${a.toFixed(1)}M`;
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
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}
// Strich-Icons statt Emoji auf Knöpfen (Linus und Freund 14.11.: weniger Text, mehr Icons)
const ICONS = {
  back: 'M15 5 L8 12 L15 19',
  next: 'M9 5 L16 12 L9 19',
  rocket: 'M12 2.5 C15.2 5.5 16.2 9.5 15.6 14.5 L8.4 14.5 C7.8 9.5 8.8 5.5 12 2.5 Z M8.6 11 L5.5 15.5 L8.4 15.5 M15.4 11 L18.5 15.5 L15.6 15.5 M10 17.5 L12 21.5 L14 17.5 M12 7.5 L12 9',
  flask: 'M9 3 L15 3 M10.2 3 L10.2 9 L5 19 C4.5 20.2 5.2 21 6.3 21 L17.7 21 C18.8 21 19.5 20.2 19 19 L13.8 9 L13.8 3 M7.4 15 L16.6 15',
  info: 'M12 2.8 A9.2 9.2 0 1 0 12.01 2.8 Z M12 11 L12 17 M12 7.4 L12 7.6',
  star: 'M12 3 L14.6 9 L21 9.4 L16 13.5 L17.7 20 L12 16.4 L6.3 20 L8 13.5 L3 9.4 L9.4 9 Z',
  retry: 'M4.5 12 A7.5 7.5 0 1 0 7 6.4 M4 3.5 L4.5 7.5 L8.5 7',
};
function icon(name) {
  const s = svg('svg', { viewBox: '0 0 24 24', class: 'icon', 'aria-hidden': 'true' });
  s.append(svg('path', { d: ICONS[name], fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return s;
}
// Hinweis als Infobox mit Icon statt losem Textblock
const infobox = (text) => el('div', { class: 'infobox' }, icon('info'), el('p', {}, text));
const NEXT = document.getElementById('next'), BACK = document.getElementById('back');
const setBack = (text) => BACK.replaceChildren(el('span', { class: 'round' }, icon('back')), el('span', { class: 'back-label' }, text));
const setNext = (text, ic, after = false) => NEXT.replaceChildren(...(after ? [el('span', {}, text), icon(ic)] : [icon(ic), el('span', {}, text)]));

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
  const cells = grad(s, 'linearGradient', [['0', '#4a62b0'], ['0.45', '#2b3a6b'], ['1', '#18224a']], { x1: '0', y1: '0', x2: '1', y2: '1' });
  const panel = (x) => {
    const g = svg('g');
    g.append(svg('rect', { x, y: 70, width: 200, height: 120, rx: 4, fill: cells, stroke: '#F5EFE6', 'stroke-width': 3 }));
    for (let i = 1; i < 5; i++) g.append(svg('line', { x1: x + i * 40, y1: 70, x2: x + i * 40, y2: 190, stroke: '#9fb3e8', 'stroke-width': 1.5 }));
    for (let j = 1; j < 3; j++) g.append(svg('line', { x1: x, y1: 70 + j * 40, x2: x + 200, y2: 70 + j * 40, stroke: '#9fb3e8', 'stroke-width': 1.5 }));
    return g;
  };
  s.append(panel(10), panel(390));
  s.append(svg('rect', { x: 210, y: 122, width: 40, height: 16, fill: '#B8AFA6' }));
  s.append(svg('rect', { x: 350, y: 122, width: 40, height: 16, fill: '#B8AFA6' }));
  const hull = grad(s, 'radialGradient', [['0', '#ffffff'], ['0.6', '#d9d2c7'], ['1', '#9a9288']], { cx: '0.35', cy: '0.3', r: '0.85' });
  s.append(svg('rect', { x: 245, y: 60, width: 110, height: 140, rx: 50, fill: hull, stroke: '#F5EFE6', 'stroke-width': 3 }));
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
    // gleiche Reihenfolge in beiden Ansichten, Einstellungen immer unten (Fund Josias 14.11.)
    ? [el('button', { class: 'hexbtn ghost', type: 'button', onclick: () => go('home') }, t('menu')),
      el('button', { class: 'hexbtn ghost', type: 'button', onclick: () => startMission(missions.find((m) => m.free)) }, t('freePlay')),
      el('button', { class: 'hexbtn ghost', type: 'button', onclick: () => openFacts(0) }, t('spaceFacts')),
      el('button', { class: 'hexbtn ghost', type: 'button', onclick: openSettings }, t('settings'))]
    : [el('button', { class: 'hexbtn', type: 'button', onclick: () => { state.levelPick = null; go('start'); } }, t('play')),
      el('button', { class: 'hexbtn ghost', type: 'button', onclick: () => startMission(missions.find((m) => m.free)) }, t('freePlay')),
      el('button', { class: 'hexbtn ghost', type: 'button', onclick: () => openFacts(0) }, t('spaceFacts')),
      el('button', { class: 'hexbtn ghost', type: 'button', onclick: openSettings }, t('settings'))]));

  $('hexes').replaceChildren(choosing ? renderLevelSelect() : '');
}

// ---------- Level-Auswahl: Karussell über die vier Orte (Linus 14.11.) ----------
// Gesperrte Level grau mit Schloss. Neu freigeschaltet: Schloss springt auf, einmalig (gemerkt in localStorage).
const LEVEL_DIFF = ['lvlEasy', 'lvlIntermediate', 'lvlHard', 'lvlUltra'];
const seenLevel = () => { try { return Number(localStorage.getItem('seen-level')) || 1; } catch { return 1; } };
const moveLevel = (d) => { state.levelPick = Math.min(LEVELS.length, Math.max(1, (state.levelPick || 1) + d)); state.slideLevel = d; render(); };
function levelProgress(n) {
  const inLevel = contracts.filter((x) => x.level === n);
  return { done: inLevel.filter((x) => contracts.indexOf(x) < company.index).length, total: inLevel.length };
}
function renderLevelSelect() {
  const reached = reachedLevel();
  if (state.levelPick == null) state.levelPick = reached;
  const i = state.levelPick;
  const unlocking = reached > seenLevel() && i === reached && !company.over;
  if (unlocking) setTimeout(() => { try { localStorage.setItem('seen-level', String(reached)); } catch { /* ohne Speicher */ } }, 2500);
  const slide = state.slideLevel; state.slideLevel = null;
  const card = (n, role) => {
    if (n < 1 || n > LEVELS.length) return el('div', { class: `lvl-card ${role} empty` });
    const l = LEVELS[n - 1], open = n <= reached, pr = levelProgress(n);
    return el('figure', { class: `lvl-card ${role}${open ? '' : ' locked'}${role === 'mid' && unlocking ? ' unlocking' : ''}`, onclick: role === 'mid' ? null : () => moveLevel(n - i) },
      el('div', { class: 'lvl-scene', 'aria-hidden': 'true' }, placeSvg(n, null, pr.done)),
      !open || (role === 'mid' && unlocking) ? el('span', { class: 'lock', 'aria-label': t('locked') }, '🔒') : '',
      el('figcaption', {}, el('strong', {}, `${t('level')} ${n} · ${tr(l, 'name')}`), el('span', { class: `diff d${n}` }, t(LEVEL_DIFF[n - 1]))));
  };
  const l = LEVELS[i - 1], open = i <= reached, pr = levelProgress(i);
  const started = company.index > contracts.findIndex((x) => x.level === i);
  // nächster Auftrag in diesem Level (nur im aktuellen Level spielbar)
  const next = contracts[company.index];
  const playable = open && next && next.level === i && !company.over;
  const needs = playable && contractLocked(next, research.done) ? PROJECTS.find((p) => p.id === next.requires) : null;
  const toResearch = () => document.querySelector('.lvl-research')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  let label = [`🔒 ${t('locked')}`];
  if (open && pr.done >= pr.total) label = [t('levelDone')];
  else if (company.over) label = [t('bankrupt')];
  else if (needs) label = [icon('flask'), el('span', {}, t('researchFirst', { x: t(needs.name) }))];
  else if (playable) label = [icon('rocket'), el('span', {}, started ? t('continueLevel') : t('startLevel'))];
  return el('div', { class: 'level-select' },
    el('h2', { class: 'hex-title' }, t('levelSelect')),
    el('div', { class: 'lvl-stage' },
      el('button', { class: 'arrow', type: 'button', 'aria-label': t('prevLevel'), disabled: i <= 1 ? '' : null, onclick: () => moveLevel(-1) }, '‹'),
      el('div', { class: `lvl-cards${slide ? (slide > 0 ? ' slide-next' : ' slide-prev') : ''}` }, card(i - 1, 'side'), card(i, 'mid'), card(i + 1, 'side')),
      el('button', { class: 'arrow', type: 'button', 'aria-label': t('nextLevel'), disabled: i >= LEVELS.length ? '' : null, onclick: () => moveLevel(1) }, '›')),
    unlocking ? el('p', { class: 'unlock-msg' }, t('levelUnlocked', { n: i })) : '',
    el('p', { class: 'lvl-goal' }, t(`levelGoal${i}`)),
    open ? el('p', { class: 'hint' }, `${t('contractsDone', { n: pr.done, m: pr.total })} · ${t('cash')}: ${money(company.cash)}`) : el('p', { class: 'hint' }, t('locked')),
    playable ? el('p', { class: 'hint' }, `${t('contractOf', { n: pr.done + 1, m: pr.total })}: ${tr(next, 'client')} · ${t('fee')} ${money(next.fee)}`) : '',
    el('button', { class: 'primary start-big', type: 'button', disabled: playable ? null : '',
      onclick: () => { if (!playable) return; if (needs) { toResearch(); return; } startMission(contractMission(next)); } }, ...label),
    // Forschung dieses Ortes in der Mitte: man plant fürs nächste Level
    open ? el('section', { class: 'lvl-research' },
      el('h3', {}, `${t('labOf', { x: t(PLACE_NAME[l.place]) })} · ${research.rp} ${t('rpShort')}`),
      el('div', { class: 'projects' }, PROJECTS.filter((p) => p.level === i).map((p) => projectCard(p, reached)))) : '',
    // Neue Firma: braucht man nach Fehlern, darum hier vor der Wahl (Linus 14.11.). Zweiter Klick bestätigt.
    el('button', { class: state.confirmRestart ? 'secondary danger-text new-company' : 'secondary new-company', type: 'button', onclick: () => {
      if (!state.confirmRestart) { state.confirmRestart = true; render(); return; }
      state.confirmRestart = false; company = freshCompany(); saveCompany(); state.levelPick = 1; render();
    } }, state.confirmRestart ? t('confirmRestart') : t('restartCompany')));
}

function go(phase) {
  state.phase = phase;
  state.confirmRestart = false; state.confirmReset = false;
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
  state.confirmReset = false;
  const draw = (note = '') => panel.replaceChildren(
    el('h2', { id: 'panel-title' }, t('settings')),
    el('div', { class: 'row' }, el('span', {}, t('music')),
      seg([[true, t('on')], [false, t('off')]], isPlaying(), (v) => { setMusic(v); updateSound(); draw(); })),
    el('div', { class: 'row' }, el('span', {}, t('language')),
      seg([['en', 'English'], ['de', 'Deutsch']], getLang(), (v) => { setLang(v); render(); draw(); })),
    el('div', { class: 'row' }, el('button', { class: 'danger', type: 'button', onclick: () => {
      if (!state.confirmReset) { state.confirmReset = true; draw(); return; } // zweiter Klick bestätigt
      state.confirmReset = false; resetProgress(); render(); draw(t('progressReset'));
    } }, state.confirmReset ? t('confirmReset') : t('resetProgress'))),
    note ? el('p', {}, note) : '',
    el('div', { class: 'actions' }, el('button', { type: 'button', onclick: () => panel.close() }, t('close'))));
  draw();
  panel.showModal();
}

// Alle Weltraum-Fakten mit Erklärbild zum Durchblättern (Linus und Freund 14.11.). Pfeiltasten blättern.
function openFacts(i, dir = null) {
  const panel = $('panel');
  const n = facts.length, k = (i + n) % n, f = facts[k];
  panel.replaceChildren(
    el('h2', { id: 'panel-title' }, icon('star'), ` ${t('spaceFacts')}`),
    el('div', { class: 'facts-view' },
      el('button', { class: 'arrow', type: 'button', 'aria-label': t('prevFact'), 'data-dir': 'prev', onclick: () => openFacts(k - 1, 'prev') }, icon('back')),
      el('figure', { class: 'fact big-fact' }, factPicture(f), el('figcaption', {}, el('p', {}, f[getLang()]),
        el('a', { class: 'fact-source', href: f.source, target: '_blank', rel: 'noopener' }, t('factSource')))),
      el('button', { class: 'arrow', type: 'button', 'aria-label': t('nextFact'), 'data-dir': 'next', onclick: () => openFacts(k + 1, 'next') }, icon('next'))),
    el('p', { class: 'dots', 'aria-label': t('factOf', { n: k + 1, m: n }) }, facts.map((x, j) => el('span', { class: j === k ? 'dot on' : 'dot' }))),
    el('div', { class: 'actions' }, el('button', { type: 'button', onclick: () => panel.close() }, t('close'))));
  panel.onkeydown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); openFacts(k - 1, 'prev'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); openFacts(k + 1, 'next'); }
  };
  if (!panel.open) { panel.showModal(); panel.addEventListener('close', () => { panel.onkeydown = null; }, { once: true }); }
  if (dir) panel.querySelector(`.facts-view .arrow[data-dir="${dir}"]`).focus({ preventScroll: true }); // Fokus bleibt auf dem Pfeil
}

function openInfo(item) {
  const panel = $('panel');
  panel.replaceChildren(
    el('h2', { id: 'panel-title' }, tr(item, 'name')),
    el('p', {}, tr(item, 'info') || ''),
    item.verified === false ? el('p', { class: 'hint' }, t('assumedValues')) : item.verified === 'mass' ? el('p', { class: 'hint' }, t('massFromNasa')) : '',
    el('div', { class: 'actions' }, el('button', { type: 'button', onclick: () => panel.close() }, t('close'))));
  panel.showModal();
}

function openCredits() {
  const panel = $('panel');
  panel.replaceChildren(
    el('h2', { id: 'panel-title' }, t('credits')),
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
    el('h2', { id: 'panel-title' }, t('sources')),
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
      ? [[t({ moon: 'carriesToMoon', mars: 'carriesToMars' }[state.mission && state.mission.dest] || 'carriesToOrbit'), kg(r.maxPayload)],
        [t(state.mission && state.mission.module ? 'yourPayload' : 'yourSatellite'), kg(payload())]]
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
    el('h2', {}, el('span', {}, tr(item, 'name'), el('button', { class: 'qmark', type: 'button', 'aria-label': `${t('whatIsThis')} ${tr(item, 'name')}`,
      onclick: (e) => { e.stopPropagation(); openInfo(item); }, onkeydown: (e) => e.stopPropagation() }, '?')), el('span', { class: 'price' }, money(item.cost))),
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
  falconHeavy: { H: 285, w: 18, body: ['#ffffff', '#c9c2b8'], boosters: { w: 16, color: ['#ffffff', '#bdb5a9'], h: 0.62 } },
  sls: { H: 305, w: 24, body: ['#f0a052', '#b8642a'], boosters: { w: 9, color: ['#ffffff', '#c9c2b8'], h: 0.72 } },
};

// Satellit in der Spitze: Körper, eingeklappte Solarflügel, Instrumente obendrauf (Klick entfernt sie)
// Bild eines Moduls (Station, Mond, Mars) in der Raketenspitze, je nach Auftrag
function modulePicture(g, id, cx, bottom, maxW, maxH) {
  const w = maxW - 10, h = maxH * 0.8, top = bottom - 2 - h;
  const add = (tag, a) => g.append(svg(tag, a));
  const hull = { fill: '#e8e2d8', stroke: '#9a9288', 'stroke-width': 0.6 };
  if (id === 's2') { add('rect', { x: cx - 5, y: top, width: 10, height: h, rx: 3, ...hull }); for (const sx of [-1, 1]) add('rect', { x: cx + sx * 6 - (sx < 0 ? 4 : 0), y: top + 2, width: 4, height: h - 4, fill: '#2b3a6b', stroke: '#9fb3e8', 'stroke-width': 0.4 }); }
  else if (id === 's5') { add('circle', { cx, cy: bottom - h / 2, r: Math.min(w, h) / 2.4, ...hull }); for (const a of [0, 90, 180, 270]) add('rect', { x: cx - 2, y: bottom - h / 2 - Math.min(w, h) / 2.4 - 2, width: 4, height: 4, fill: '#A88FD6', transform: `rotate(${a} ${cx} ${bottom - h / 2})` }); }
  else if (id.startsWith('s')) { const ww = id === 's3' ? w * 0.6 : id === 's4' ? w * 0.7 : w * 0.55; add('rect', { x: cx - ww / 2, y: top, width: ww, height: h, rx: ww / 3, ...hull }); add('rect', { x: cx - ww / 2, y: top + h * 0.45, width: ww, height: 2, fill: id === 's3' ? '#7fa9b0' : id === 's4' ? '#e0c070' : '#A88FD6' }); }
  else if (id === 'm2') { add('rect', { x: cx - w / 2.6, y: bottom - h * 0.45, width: w / 1.3, height: h * 0.25, rx: 2, ...hull }); for (const dx of [-w / 3.2, 0, w / 3.2]) add('circle', { cx: cx + dx, cy: bottom - h * 0.15, r: 2.4, fill: '#4a4550' }); }
  else if (id === 'm3' || id === 'r2') { add('path', { d: `M${cx - w / 2.2} ${bottom - 2} A${w / 2.2} ${h * 0.8} 0 0 1 ${cx + w / 2.2} ${bottom - 2} Z`, ...hull }); add('rect', { x: cx - 3, y: bottom - 9, width: 6, height: 7, fill: '#1c1918' }); }
  else if (id === 'm4') { add('rect', { x: cx - w / 2.6, y: bottom - h * 0.55, width: w / 2.2, height: h * 0.53, fill: '#c9c2b8', stroke: '#8a857c', 'stroke-width': 0.6 }); add('rect', { x: cx + 2, y: top + 4, width: 6, height: h - 6, rx: 3, fill: '#d9d2c7' }); }
  else if (id === 'r3') { add('path', { d: `M${cx - w / 3} ${bottom - 2} L${cx - w / 5} ${top} L${cx + w / 5} ${top} L${cx + w / 3} ${bottom - 2} Z`, ...hull }); add('circle', { cx, cy: top + h * 0.35, r: 2.5, fill: '#2b3a6b' }); }
  else { // Lander (m1, r1): Körper, Beine, Solarflügel
    add('rect', { x: cx - w / 4, y: top + h * 0.2, width: w / 2, height: h * 0.5, rx: 2, fill: '#b08d3c', stroke: '#e0c070', 'stroke-width': 0.6 });
    add('path', { d: `M${cx - w / 4} ${top + h * 0.7} L${cx - w / 2.4} ${bottom - 2} M${cx + w / 4} ${top + h * 0.7} L${cx + w / 2.4} ${bottom - 2}`, stroke: '#B8AFA6', 'stroke-width': 1.2 });
    if (id === 'm1') add('rect', { x: cx - w / 2.2, y: top, width: w / 1.1, height: 4, fill: '#2b3a6b', stroke: '#9fb3e8', 'stroke-width': 0.4 });
  }
}

function payloadIn(g, cx, bottom, maxW, maxH) {
  if (state.mission && state.mission.module && state.mission.contract) { modulePicture(g, state.mission.contract.id, cx, bottom, maxW, maxH); return; }
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

// Startturm wie bei SpaceX (Linus und Freund 14.11.): massiver Gitterturm, schräg gesehen (Vorder- und Seitenfläche),
// zwei Greifarme halten die Rakete. Der hintere Arm liegt hinter der Rakete, der vordere davor (eigenes Bild über der Rakete).
// Steht fest in der Mitte, dreht im Karussell nicht mit. Gleicher Ausschnitt wie die Raketen-Bilder (viewBox 8 0 84 320).
// Maße in Bild-Einheiten, Ursprung wie im Raketenbild: Mitte x = 50, Rampe y = 312.
const TOWER = { x0: 10, x1: 24, depth: 6, h: 272, catchY: 150 };
const halfWidth = (look) => look.w / 2 + (look.boosters ? look.boosters.w : 0);
const armHeight = (look) => Math.min(TOWER.catchY, (look.H - 84) * 0.75); // unterhalb der Spitze, auch bei kleinen Raketen
// Arm als Pfad: von der Turmkante bis knapp hinter die Rakete. open 0..1 schwenkt ihn weg (vorn nach unten, hinten nach oben).
function armPath(reach, y, open, side) {
  const a = open * 1.25, L = reach - TOWER.x1, ex = TOWER.x1 + L * Math.cos(a), ey = y + side * L * Math.sin(a) * 0.32;
  const pts = [[TOWER.x1, y - 2.5], [ex, ey - 2], [ex, ey + 2], [TOWER.x1, y + 2.5]]; // Arm wird zur Spitze etwas schmaler
  return { pts, d: `M${pts.map((q) => q.join(' ')).join(' L')} Z`, ex, ey };
}
// Fachwerk im Arm: Zickzack zwischen Ober- und Unterkante
function armTruss(a, color) {
  const [[x0, y0], [x1, y1], [, y2], [, y3]] = a.pts;
  let d = '';
  for (let k = 0; k < 6; k++) {
    const u = k / 6, v = (k + 1) / 6, xa = x0 + (x1 - x0) * u, xb = x0 + (x1 - x0) * v;
    const top = (q) => y0 + (y1 - y0) * q, bot = (q) => y3 + (y2 - y3) * q;
    d += `M${xa} ${k % 2 ? top(u) : bot(u)} L${xb} ${k % 2 ? bot(v) : top(v)} `;
  }
  return svg('path', { d, stroke: color, 'stroke-width': 0.6, fill: 'none' });
}
function towerPicture(r, front = false) {
  const look = ROCKET_LOOK[r.id] || ROCKET_LOOK.own;
  const ground = 312, top = ground - TOWER.h, { x0, x1, depth } = TOWER, y = ground - armHeight(look), reach = 50 + halfWidth(look) + 3;
  const s = svg('svg', { viewBox: '8 0 84 320', class: front ? 'tower-pic tower-front' : 'tower-pic', 'aria-hidden': 'true' });
  if (front) { // vorderer Arm mit Greifer, liegt über der Rakete
    const a = armPath(reach, y + 3, 0, 1);
    s.append(svg('path', { d: a.d, fill: '#9aa0a8' }), armTruss(a, '#6f747b'), svg('rect', { x: a.ex - 2, y: a.ey - 7, width: 4, height: 14, rx: 1, fill: '#c9ced4' }));
    return s;
  }
  s.append(svg('polygon', { points: `${x1},${ground} ${x1 + depth},${ground - 4} ${x1 + depth},${top - 4} ${x1},${top}`, fill: '#3f434a' })); // Seite
  s.append(svg('polygon', { points: `${x0},${top} ${x1},${top} ${x1 + depth},${top - 4} ${x0 + depth},${top - 4}`, fill: '#7d838b' }));     // Dach
  s.append(svg('rect', { x: x0, y: top, width: x1 - x0, height: TOWER.h, fill: '#5c6168' }));                                               // Vorderseite
  let lattice = '';
  for (let yy = ground; yy > top + 14; yy -= 14) lattice += `M${x0} ${yy} L${x1} ${yy - 14} M${x0} ${yy - 14} L${x1} ${yy} M${x0} ${yy} L${x1} ${yy} `;
  s.append(svg('path', { d: lattice, stroke: '#8a9098', 'stroke-width': 0.6 }));
  s.append(svg('path', { d: `M${x0 + 3} ${top} L${x0 + 3} ${top - 14}`, stroke: '#8a9098', 'stroke-width': 1 })); // Blitzableiter
  s.append(svg('rect', { x: x0 - 1, y: y - 9, width: x1 - x0 + 2, height: 18, rx: 1, fill: '#474c53' })); // Schlitten, fährt am Turm hoch und runter
  const back = armPath(reach, y - 3, 0, -1);
  s.append(svg('path', { d: back.d, fill: '#555a61' }), armTruss(back, '#3f434a'), svg('rect', { x: back.ex - 2, y: back.ey - 7, width: 4, height: 14, rx: 1, fill: '#6f747b' }));
  s.append(svg('rect', { x: x0 - 3, y: ground, width: 2 * (50 - x0) + 6, height: 4, fill: '#5a564f' })); // Rampe
  return s;
}

// Maße einer Rakete im Bild (viewBox 8 0 84 320, Rampe y = 312): Spitze, Rumpfbeginn, Trennstelle der Stufen
function rocketGeom(r, withPayload) {
  const look = ROCKET_LOOK[r.id] || ROCKET_LOOK.own, starship = r.id === 'starship';
  const top = 312 - look.H, fh = starship ? 50 : 84, bodyTop = top + fh;
  const fw = starship ? look.w : withPayload ? Math.max(look.w + 22, 46) : Math.max(look.w + 10, 30); // vorne breiter, damit der Satellit gut zu sehen ist
  return { top, fh, fw, bodyTop, splitY: bodyTop + (304 - bodyTop) * 0.32 }; // Oberstufe = oberes Drittel des Rumpfs
}

function rocketPicture(r, withPayload = false) {
  const look = ROCKET_LOOK[r.id] || ROCKET_LOOK.own;
  const { H, w } = look;
  const cx = 50, ground = 312, top = ground - H, x = cx - w / 2;
  const id = `rg${++gradSeq}`;
  // mit Nutzlast enthält das Bild klickbare Instrumente, dann ist es eine Gruppe und kein reines Bild
  const s = svg('svg', { viewBox: '8 0 84 320', class: 'rocket-pic', role: withPayload ? 'group' : 'img', 'aria-label': tr(r, 'name') });
  const defs = svg('defs');
  const grad = svg('linearGradient', { id, x1: '0', x2: '1', y1: '0', y2: '0' });
  grad.append(svg('stop', { offset: '0', 'stop-color': look.body[0] }), svg('stop', { offset: '0.55', 'stop-color': look.body[0] }), svg('stop', { offset: '1', 'stop-color': look.body[1] }));
  defs.append(grad); s.append(defs);
  const fill = `url(#${id})`;
  const starship = r.id === 'starship';
  const { fh, fw, bodyTop } = rocketGeom(r, withPayload);

  // Seitliche Booster (Falcon Heavy: zwei Falcon-9-Stufen, SLS: zwei Feststoff-Booster)
  if (look.boosters) {
    const b = look.boosters, bh = (ground - 8 - top) * b.h, btop = ground - 8 - bh;
    const bid = `${id}b`;
    const bg = svg('linearGradient', { id: bid, x1: '0', x2: '1', y1: '0', y2: '0' });
    bg.append(svg('stop', { offset: '0', 'stop-color': b.color[0] }), svg('stop', { offset: '0.55', 'stop-color': b.color[0] }), svg('stop', { offset: '1', 'stop-color': b.color[1] }));
    defs.append(bg);
    for (const bx of [x - b.w, x + w]) {
      s.append(svg('rect', { x: bx, y: btop, width: b.w, height: bh, fill: `url(#${bid})`, class: 'side-booster' }));
      s.append(svg('path', { d: `M${bx} ${btop} Q${bx + b.w / 2} ${btop - b.w * 1.6} ${bx + b.w} ${btop} Z`, fill: `url(#${bid})`, class: 'side-booster' }));
      s.append(svg('path', { d: `M${bx + b.w * 0.15} ${ground - 8} L${bx} ${ground} L${bx + b.w} ${ground} L${bx + b.w * 0.85} ${ground - 8} Z`, fill: '#4a4550', class: 'side-booster' }));
    }
  }
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
  if (r.id === 'own') s.append(svg('text', { x: cx, y: bodyTop + 80, class: 'rocket-name', transform: `rotate(-90 ${cx} ${bodyTop + 80})`, 'text-anchor': 'end', 'dominant-baseline': 'middle' }, String(r.name).slice(0, 18)));

  // Spitze: bei der Rakete vorne durchsichtig, mit dem Satelliten darin
  const nose = `M${cx - fw / 2} ${bodyTop} L${cx - fw / 2} ${top + fh * 0.45} Q${cx - fw / 2} ${top} ${cx} ${top - 4} Q${cx + fw / 2} ${top} ${cx + fw / 2} ${top + fh * 0.45} L${cx + fw / 2} ${bodyTop} Z`;
  if (withPayload) {
    s.append(svg('path', { d: nose, fill: 'rgba(245,239,230,0.08)', stroke: 'rgba(245,239,230,0.7)', 'stroke-width': 0.8, 'stroke-dasharray': '2 1.5', class: 'nose-outline' }));
    const pg = svg('g', { class: 'payload' }); s.append(pg); // eigene Gruppe: wird im All ausgesetzt
    payloadIn(pg, cx, bodyTop, fw, fh * 0.75);
    // Hitzeschild: zwei Hälften, die sich beim Countdown schließen (CSS-Klasse .closed)
    const half = (side) => `M${cx + side * fw / 2} ${bodyTop} L${cx + side * fw / 2} ${top + fh * 0.45} Q${cx + side * fw / 2} ${top} ${cx} ${top - 4} L${cx} ${bodyTop} Z`;
    s.append(svg('path', { d: half(-1), fill, class: 'shield shield-l' }), svg('path', { d: half(1), fill, class: 'shield shield-r' }));
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
  state.rocket = items[i]; // immer das aktuelle Objekt, sonst bleiben alte Preise hängen (eigene Rakete)
  const slide = state.slide; state.slide = null;
  const slot = (k, role) => {
    const r = items[(i + k + n) % n];
    return el('figure', { class: `slot ${role}${k < 0 ? ' prev' : k > 0 ? ' next' : ''}`, onclick: () => (k ? moveRocket(items, k) : null) },
      role === 'mid' ? towerPicture(r) : '',
      rocketPicture(r, role === 'mid'),
      role === 'mid' ? towerPicture(r, true) : '',
      el('figcaption', { class: 'banner' }, tr(r, 'name')),
      el('span', { class: 'slot-price' }, r.maxPayload ? `${money(r.cost)} · ${kg(r.maxPayload)}` : money(r.cost)));
  };
  const mid = items[i];
  return el('div', {
    class: 'carousel', tabindex: '0', 'aria-label': t('hintRocket'), onkeydown: (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); moveRocket(items, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); moveRocket(items, 1); }
    },
  },
  el('div', { class: 'action-bar' }, NEXT),
  el('div', { class: 'carousel-stage' },
    n > 1 ? el('button', { class: 'arrow', type: 'button', 'data-dir': 'prev', 'aria-label': t('prevRocket'), onclick: () => moveRocket(items, -1) }, '‹') : el('span'),
    // endlos: ab zwei Raketen stehen immer links und rechts Nachbarn (bei zwei ist es dieselbe)
    el('div', { class: `slots${slide ? (slide > 0 ? ' slide-next' : ' slide-prev') : ''}` }, n > 1 ? slot(-1, 'side') : '', slot(0, 'mid'), n > 1 ? slot(1, 'side') : ''),
    n > 1 ? el('button', { class: 'arrow', type: 'button', 'data-dir': 'next', 'aria-label': t('nextRocket'), onclick: () => moveRocket(items, 1) }, '›') : el('span')),
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

// Fortschritt im Auftrag (Linus 14.11.): alle Aufträge des Levels mit Haken, Ziel und Zahlung.
// Forschungs-Hinweis nur, wenn gerade Forschung bezahlbar ist, die diesem Ziel hilft (unauffällig, Wunsch des Teams).
function contractBox() {
  const c = state.mission && state.mission.contract;
  if (!c) return null;
  const inLevel = contracts.filter((x) => x.level === c.level);
  const helpful = PROJECTS.filter((p) => !research.done[p.id] && p.level <= reachedLevel() && (!p.needs || research.done[p.needs])
    && p.helps && p.helps.includes(c.dest) && research.rp >= p.rp && company.cash - p.cost >= 0 && !research.active);
  return el('section', { class: 'contract-box card' },
    el('h3', {}, `${t('level')} ${c.level} · ${t('contractOf', { n: inLevel.indexOf(c) + 1, m: inLevel.length })}`),
    el('ol', { class: 'contract-steps' }, inLevel.map((x) => {
      const i = contracts.indexOf(x);
      return el('li', { class: i < company.index ? 'is-done' : x === c ? 'is-now' : '' }, `${i < company.index ? '✓ ' : ''}${tr(x, 'client')}`);
    })),
    el('p', { class: 'hint' }, `${tr(c, 'goal')} ${t('fee')} ${money(c.fee)}.`),
    helpful.length ? el('button', { class: 'link-btn', type: 'button', onclick: () => { state.returnTo = 'build'; state.researchView = helpful[0].level; go('research'); } },
      icon('flask'), el('span', {}, t('researchAvailable', { x: t(helpful[0].name) }))) : '');
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
    contractBox(),
    state.mission.module ? infobox(t({ moon: 'moonFlight', mars: 'marsFlight' }[state.mission.dest] || 'stationFlight', { m: tr(state.mission.module, 'name'), kg: kg(state.mission.module.mass), c: money(state.mission.module.cost) }))
      : el('nav', { class: 'steps', 'aria-label': t('buildSteps') }, t('steps').slice(0, 2).map((name, i) => el('button', {
        type: 'button', 'aria-current': i === state.build ? 'step' : 'false',
        onclick: () => { state.build = i; render(); },
      }, name))),
    infobox(cats.length ? t(cats[0].hint) : t('hintRocket')),
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
  if (!m.free && !m.module) meters.push(meter(t('science'), science(), m.minScience, `${science()} / ${m.minScience} ${t('minimum')}`, true));
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
    !m.module ? el('div', { class: 'score-box' },
      el('span', {}, t('sciencePerM')),
      el('strong', {}, m.budget - left > 0 ? (science() / (m.budget - left)).toFixed(1) : '0.0'),
      el('p', { class: 'hint' }, t('scoreHint'))) : '',
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
  const front = el('canvas', { class: 'front', 'aria-hidden': 'true' }); // vorderer Greifarm liegt vor der Rakete
  const wrap = el('div', { class: 'launch-wrap', role: 'img', 'aria-label': t('launch') }, canvas, rocket, front);
  // die Bau-Ansicht bleibt kurz stehen und blendet aus, nur ohne die vordere Rakete (die übernimmt die Szene)
  const old = $('center').firstElementChild;
  if (old) {
    old.querySelector('.slot.mid .rocket-pic')?.classList.add('gone');
    wrap.prepend(old);
    requestAnimationFrame(() => old.classList.add('fading')); // erst nach dem Einhängen, sonst kein Übergang
    setTimeout(() => old.remove(), 600);
  }
  NEXT.disabled = true;
  requestAnimationFrame(() => launch(canvas, rocket, launchMode(state.result), state.launchFrom, front));
  return wrap;
}

function launch(canvas, rocketEl, mode, from, frontCanvas) {
  const ctx = canvas.getContext('2d'), fctx = frontCanvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = reduce ? 0 : 700, count = reduce ? 600 : 3000, ignite = reduce ? 200 : 1400;
  const look = ROCKET_LOOK[state.rocket.id] || ROCKET_LOOK.own;
  // Wiederverwendbare Rakete (Linus 14.11.): Booster landet nach dem Start wieder im Ständer
  const reusable = mode === 'ok' && !reduce && (['falcon9', 'falconHeavy', 'starship'].includes(state.rocket.id) || (state.rocket.id === 'own' && research.done.reuse));
  let W = 0, H = 0, stars = [];
  function fit() {
    const r = canvas.getBoundingClientRect();
    if (Math.round(r.width) === Math.round(W) && Math.round(r.height) === Math.round(H)) return;
    W = r.width; H = r.height;
    for (const [c, x] of [[canvas, ctx], [frontCanvas, fctx]]) {
      c.width = W * devicePixelRatio; c.height = H * devicePixelRatio;
      x.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    stars = Array.from({ length: 120 }, () => [Math.random() * W, Math.random() * H, Math.random()]);
  }
  fit();
  // Wo die Rakete im Bau stand (Bildschirm-Koordinaten): Mitte, Boden (Rampe bei y = 312) und Maßstab
  const start0 = from ? (() => {
    const u = Math.min(from.width / 84, from.height / 320);
    return { cx: from.left + from.width / 2, ground: from.top + (from.height - 320 * u) / 2 + 312 * u, unit: u };
  })() : null;
  const smoke = [];
  // Im All (Linus 15.11.): seitliche Booster und erste Stufe lösen sich, Oberstufe zündet, Hitzeschild fällt ab, Satellit wird ausgesetzt.
  // Zeiten in Sekunden nach dem Abheben, nur beim geglückten Start.
  const stagey = mode === 'ok' && !reduce;
  const SEP = { side: 1.6, stage: 2.6, ignite2: 2.9, fairing: 3.5, cutoff: 4.6, deploy: 4.8 };
  const G = rocketGeom(state.rocket, true);
  const flight = mode === 'heavy' ? 3200 : mode === 'nofuel' ? 3600 : stagey ? 7000 : 5200;
  const back = reusable ? 3800 : 0;                                   // Rückflug des Boosters
  // Ankunft am Ziel (Josias 14.11.): Modul dockt an der Station an, Lander setzt auf Mond oder Mars auf
  const dest = state.mission.module ? (state.mission.dest || 'leo') : null;
  const arrive = mode === 'ok' && dest && !reduce ? 3400 : 0;
  const deliveredBefore = dest ? contracts.filter((x) => x.level === state.mission.contract.level && contracts.indexOf(x) < contracts.indexOf(state.mission.contract)).length : 0;
  function altitude(s) {
    if (mode === 'heavy') return 0;
    if (mode === 'nofuel') {
      if (s < 1.6) return 0.5 * (H * 0.14) * s * s;
      const top = 0.5 * (H * 0.14) * 1.6 * 1.6, f = s - 1.6;
      return Math.max(0, top - 0.5 * H * 0.9 * f * f);
    }
    return 0.5 * H * 0.6 * s * s;
  }
  const burning = (s) => (mode === 'heavy' ? s < 2.2 : mode === 'nofuel' ? s < 1.6 && Math.sin(s * 40) + Math.sin(s * 23) > 0.2 : mode === 'explode' ? s < 2.3 : stagey ? s < SEP.stage || (s >= SEP.ignite2 && s < SEP.cutoff) : true);
  const ease = (x) => x * x * (3 - 2 * x);
  const clamp = (x) => Math.max(0, Math.min(1, x));
  // Neigung nach dem Abheben (Gravity Turn): bis etwa 35°, nur wenn die Rakete wirklich fliegt
  const tilt = (s) => (mode === 'ok' || mode === 'explode' ? Math.min(0.6, Math.max(0, s - 1) * 0.22) : 0);
  const armY0 = armHeight(look); // Höhe der Greifarme am Turm, wie im Bau

  // Startturm (wie towerPicture, gleiche Maße): Bild-Einheiten -> Leinwand. armY = Höhe der Arme über der Rampe.
  // c = Leinwand: hinten (Turm und hinterer Arm) oder vorn (vorderer Arm, liegt über der Rakete).
  function tower(c, cx, gy, unit, open, armY, reach, front) {
    const X = (x) => cx + (x - 50) * unit, Y = (y) => gy + (y - 312) * unit;
    const { x0, x1, depth } = TOWER, top = 312 - TOWER.h;
    const poly = (list, color) => { c.fillStyle = color; c.beginPath(); list.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)))); c.closePath(); c.fill(); };
    const arm = (y, side, color, claw) => {
      const a = armPath(reach, y, open, side);
      poly(a.pts, color);
      poly([[a.ex - 2, a.ey - 7], [a.ex + 2, a.ey - 7], [a.ex + 2, a.ey + 7], [a.ex - 2, a.ey + 7]], claw);
    };
    if (front) { arm(312 - armY + 3, 1, '#9aa0a8', '#c9ced4'); return; }
    poly([[x1, 312], [x1 + depth, 308], [x1 + depth, top - 4], [x1, top]], '#3f434a');
    poly([[x0, top], [x1, top], [x1 + depth, top - 4], [x0 + depth, top - 4]], '#7d838b');
    poly([[x0, top], [x1, top], [x1, 312], [x0, 312]], '#5c6168');
    c.strokeStyle = '#8a9098'; c.lineWidth = Math.max(0.8, unit * 0.6); c.beginPath();
    for (let yy = 312; yy > top + 14; yy -= 14) { c.moveTo(X(x0), Y(yy)); c.lineTo(X(x1), Y(yy - 14)); c.moveTo(X(x0), Y(yy - 14)); c.lineTo(X(x1), Y(yy)); c.moveTo(X(x0), Y(yy)); c.lineTo(X(x1), Y(yy)); }
    c.moveTo(X(x0 + 3), Y(top)); c.lineTo(X(x0 + 3), Y(top - 14));
    c.stroke();
    poly([[x0 - 1, 312 - armY - 9], [x1 + 1, 312 - armY - 9], [x1 + 1, 312 - armY + 9], [x0 - 1, 312 - armY + 9]], '#474c53'); // Schlitten
    arm(312 - armY - 3, -1, '#555a61', '#6f747b');
  }

  // Feuer an der Düse, Ursprung (0, 0), zeigt nach unten (wird mit der Rakete gedreht)
  function flame(s, unit, scale = 1) {
    const nozzle = look.w * unit;
    const len = (40 + Math.min(s, 2) * 30) * unit * scale * (0.85 + Math.random() * 0.3);
    const glow = ctx.createRadialGradient(0, len * 0.2, 0, 0, len * 0.2, len);
    glow.addColorStop(0, 'rgba(255,200,120,0.55)'); glow.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, len * 0.2, len, 0, Math.PI * 2); ctx.fill();
    for (const [k, c1, c2] of [[1, 'rgba(224,96,90,0.85)', 'rgba(224,96,90,0)'], [0.72, '#ff9a3c', 'rgba(255,154,60,0)'], [0.42, '#fff8d8', 'rgba(255,243,176,0)']]) {
      const wN = nozzle * (0.55 + k * 0.5), L = len * k;
      const g = ctx.createLinearGradient(0, 0, 0, L);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(-wN / 2, 0); ctx.quadraticCurveTo(-wN * 0.7, L * 0.45, 0, L);
      ctx.quadraticCurveTo(wN * 0.7, L * 0.45, wN / 2, 0); ctx.closePath(); ctx.fill();
    }
  }

  // Booster beim Rückflug: Körper mit Licht, Gitterflossen oben, Landebeine kurz vor dem Aufsetzen
  function booster(cx, baseY, unit, legs, h = 170 * unit) {
    const w = look.w * unit, x = cx - w / 2;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, look.body[0]); g.addColorStop(0.55, look.body[0]); g.addColorStop(1, look.body[1]);
    ctx.fillStyle = g; ctx.fillRect(x, baseY - h, w, h);
    if (state.rocket.id === 'falcon9' || state.rocket.id === 'falconHeavy') { ctx.fillStyle = '#1c1918'; ctx.fillRect(x, baseY - h * 0.3, w, 4 * unit); }
    ctx.fillStyle = '#6f747b';
    ctx.fillRect(x - 4 * unit, baseY - h + 4 * unit, 4 * unit, 3 * unit); ctx.fillRect(x + w, baseY - h + 4 * unit, 4 * unit, 3 * unit);
    ctx.fillStyle = '#4a4550'; ctx.fillRect(cx - w * 0.35, baseY - 6 * unit, w * 0.7, 6 * unit);
    if (state.rocket.id === 'own') { // Name wie auf der Rakete im Bau, von unten nach oben gelesen
      ctx.save(); ctx.translate(cx, baseY - h * 0.45); ctx.rotate(-Math.PI / 2);
      ctx.font = `700 ${5 * unit}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2b2440';
      ctx.fillText(String(state.rocket.name).slice(0, 18), 0, 0); ctx.restore();
    }
    if (legs > 0) {
      ctx.strokeStyle = '#3a3540'; ctx.lineWidth = Math.max(1.5, unit * 1.6);
      ctx.beginPath();
      ctx.moveTo(x, baseY - 26 * unit); ctx.lineTo(x - 12 * unit * legs, baseY);
      ctx.moveTo(x + w, baseY - 26 * unit); ctx.lineTo(x + w + 12 * unit * legs, baseY);
      ctx.stroke();
    }
  }

  // Teile, die sich im All lösen, auf der Leinwand (die Rakete selbst ist ein SVG darüber).
  // N = Düse auf dem Bildschirm, U = Maßstab, angle = Neigung. Alles in Bild-Einheiten der Rakete, Ursprung an der Düse.
  function pieces(sf, N, U, angle) {
    const at = (fn) => { ctx.save(); ctx.translate(N.x, N.y); ctx.rotate(angle); fn(); ctx.restore(); };
    const b = look.boosters;
    if (b && sf >= SEP.side) { // seitliche Booster kippen nach außen weg
      const t = sf - SEP.side, bh = (304 - G.top) * b.h * U;
      for (const side of [-1, 1]) at(() => {
        ctx.translate(side * ((look.w + b.w) / 2 + t * t * 60) * U, t * t * 140 * U); ctx.rotate(side * t * 0.6);
        const x = (-b.w / 2) * U, bot = -8 * U, g = ctx.createLinearGradient(x, 0, x + b.w * U, 0);
        g.addColorStop(0, b.color[0]); g.addColorStop(0.55, b.color[0]); g.addColorStop(1, b.color[1]);
        ctx.fillStyle = g; ctx.fillRect(x, bot - bh, b.w * U, bh);
        ctx.beginPath(); ctx.moveTo(x, bot - bh); ctx.quadraticCurveTo(0, bot - bh - b.w * 1.6 * U, x + b.w * U, bot - bh); ctx.fill();
      });
    }
    if (sf >= SEP.stage) { // erste Stufe fällt zurück und dreht sich leicht
      const t = sf - SEP.stage;
      at(() => { ctx.translate(0, (t * 25 + t * t * 110) * U); ctx.rotate(t * 0.18); booster(0, 0, U, 0, (312 - G.splitY) * U); });
    }
    if (sf >= SEP.deploy && !state.mission.module) { // Satellit löst sich, richtet sich auf, klappt die Solarflügel aus
      const t = sf - SEP.deploy, open = ease(clamp((t - 0.4) / 1.2)), k = Math.max(14, G.fw * 0.6) * U; // etwas größer als in der Spitze, damit man das Ausklappen sieht
      at(() => {
        ctx.translate(t * 8 * U, (G.bodyTop - G.fh * 0.3 - 312 - t * 34) * U); ctx.rotate(-angle * clamp(t / 1.5));
        if (state.panel) for (const side of [-1, 1]) {
          const L = Math.max(3 * U, k * 2.6 * open), x0 = side * (k / 2 + U);
          ctx.fillStyle = '#2b3a6b'; ctx.fillRect(Math.min(x0, x0 + side * L), -k * 0.35, L, k * 0.7);
          ctx.strokeStyle = '#9fb3e8'; ctx.lineWidth = Math.max(0.6, 0.5 * U); ctx.beginPath();
          for (let j = 1; j < 3; j++) { const xx = x0 + side * (L * j) / 3; ctx.moveTo(xx, -k * 0.35); ctx.lineTo(xx, k * 0.35); }
          ctx.strokeRect(Math.min(x0, x0 + side * L), -k * 0.35, L, k * 0.7); ctx.stroke();
        }
        ctx.fillStyle = '#b08d3c'; ctx.fillRect(-k / 2, -k / 2, k, k);
        ctx.strokeStyle = '#e0c070'; ctx.lineWidth = Math.max(0.6, 0.5 * U); ctx.strokeRect(-k / 2, -k / 2, k, k);
        if (state.instruments.length) { ctx.fillStyle = '#3a3245'; ctx.fillRect(-k * 0.25, -k * 0.85, k * 0.5, k * 0.35); }
      });
    }
  }

  function fireball(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,243,176,${a})`); g.addColorStop(0.4, `rgba(255,154,60,${a * 0.9})`); g.addColorStop(1, 'rgba(224,96,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // Ankunftsszene über die ganze Fläche. p = 0..1 über die Dauer der Ankunft.
  function arrival(p) {
    const fadeIn = clamp(p / 0.12);
    if (dest === 'mars') {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a140e'); g.addColorStop(0.55, '#a65a36'); g.addColorStop(1, '#d98b5a');
      ctx.fillStyle = g;
    } else ctx.fillStyle = '#05040a';
    ctx.fillRect(0, 0, W, H);
    if (dest !== 'mars') for (const [x, y, b] of stars) { ctx.fillStyle = `rgba(245,239,230,${0.3 + b * 0.6})`; ctx.fillRect(x, y, 1.6, 1.6); }
    const u = H / 600;                                                // Maßstab der Szene
    if (dest === 'leo') {
      // Erde unten, Station in der Mitte, neues Modul gleitet heran und dockt an
      const eg = ctx.createRadialGradient(W / 2, H * 1.9, H * 0.6, W / 2, H * 1.9, H * 1.25);
      eg.addColorStop(0, '#4f8fd0'); eg.addColorStop(0.9, '#24507f'); eg.addColorStop(1, 'rgba(140,200,255,0.6)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(W / 2, H * 1.9, H * 1.25, 0, Math.PI * 2); ctx.fill();
      const sx0 = W * 0.56, sy0 = H * 0.42;
      ctx.fillStyle = '#8a8f96'; ctx.fillRect(sx0 - 200 * u, sy0 - 3 * u, 400 * u, 6 * u);
      for (const dx of [-200, -150, 120, 170]) { ctx.fillStyle = deliveredBefore >= 2 || dx > 0 ? '#2b3a6b' : 'rgba(43,58,107,0.35)'; ctx.fillRect(sx0 + dx * u, sy0 - 60 * u, 34 * u, 120 * u); }
      const cyl = (x, len, r, light) => { const g = ctx.createLinearGradient(0, sy0 - r, 0, sy0 + r); g.addColorStop(0, light); g.addColorStop(1, '#8f8a80'); ctx.fillStyle = g; ctx.fillRect(x, sy0 - r, len, 2 * r); };
      for (let k = 0; k < deliveredBefore; k++) cyl(sx0 - 40 * u + k * 30 * u - (k % 2 ? 0 : 60 * u), 60 * u, 16 * u, '#f5efe6');
      const dockX = sx0 - 60 * u - 70 * u, mx = -120 * u + (dockX + 120 * u) * ease(clamp((p - 0.12) / 0.6));
      cyl(mx, 70 * u, 18 * u, '#ffffff');
      if (p > 0.72) caption(t('capDocked'));
    } else {
      // Mond oder Mars: Boden unten, Lander bremst mit Feuer und setzt auf
      const surf = H * 0.78;
      ctx.fillStyle = dest === 'mars' ? '#a5552f' : '#8a8780';
      ctx.beginPath(); ctx.ellipse(W / 2, surf + H * 0.9, W * 1.2, H * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      for (const [x, r] of [[0.2, 40], [0.7, 26], [0.85, 50]]) { ctx.fillStyle = dest === 'mars' ? '#8a4526' : '#6f6c66'; ctx.beginPath(); ctx.ellipse(W * x, surf + 40 * u, r * u, r * 0.3 * u, 0, 0, Math.PI * 2); ctx.fill(); }
      if (dest === 'moon') { ctx.fillStyle = '#4f8fd0'; ctx.beginPath(); ctx.arc(W * 0.15, H * 0.18, 26 * u, 0, Math.PI * 2); ctx.fill(); }
      const L = u * 1.8; // Lander groß genug, dass man ihn gut sieht
      const q = clamp((p - 0.12) / 0.6), ly = -80 * L + (surf + 80 * L) * (1 - (1 - q) * (1 - q)), lx = W / 2;
      if (q < 1) { ctx.save(); ctx.translate(lx, ly); flame(1, L * 0.9, 0.6); ctx.restore(); }
      // Lander: goldener Körper, Beine, Solarflügel
      ctx.fillStyle = '#b08d3c'; ctx.fillRect(lx - 22 * L, ly - 50 * L, 44 * L, 34 * L);
      ctx.fillStyle = '#2b3a6b'; ctx.fillRect(lx - 60 * L, ly - 46 * L, 34 * L, 10 * L); ctx.fillRect(lx + 26 * L, ly - 46 * L, 34 * L, 10 * L);
      ctx.strokeStyle = '#B8AFA6'; ctx.lineWidth = 3 * L; ctx.beginPath();
      ctx.moveTo(lx - 18 * L, ly - 16 * L); ctx.lineTo(lx - 34 * L, ly); ctx.moveTo(lx + 18 * L, ly - 16 * L); ctx.lineTo(lx + 34 * L, ly); ctx.stroke();
      if (q >= 1) {
        const d = clamp((p - 0.72) / 0.2);
        ctx.fillStyle = `rgba(200,195,188,${0.5 * (1 - d)})`; ctx.beginPath(); ctx.ellipse(lx, surf, 60 * L * (1 + d), 14 * L, 0, 0, Math.PI * 2); ctx.fill();
        caption(t(dest === 'mars' ? 'capMarsLanded' : 'capMoonLanded'));
      }
    }
    if (fadeIn < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fadeIn})`; ctx.fillRect(0, 0, W, H); }
  }

  function caption(text) {
    ctx.font = '600 20px sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    const x = Math.min(W * 0.76, W - ctx.measureText(text).width / 2 - 16); // rechts neben der Rakete, nie über den Rand
    ctx.strokeStyle = 'rgba(11,10,18,0.9)'; ctx.lineWidth = 5; ctx.strokeText(text, x, H * 0.3);
    ctx.fillStyle = '#F5EFE6'; ctx.fillText(text, x, H * 0.3); ctx.textAlign = 'start';
  }

  // Ton (Linus/Josias 14.11.): Piepen beim Countdown, Grollen ab der Zündung, Knall bei Explosion
  const sound = { beeps: 0, rumble: null, boom: false, retro: null };
  const burnTime = (mode === 'heavy' ? ignite + 2200 : mode === 'nofuel' ? ignite + 1600 : mode === 'explode' ? ignite + 2300 : ignite + (stagey ? SEP.cutoff * 1000 : flight)) / 1000; // Ton endet mit dem Brennschluss der Oberstufe

  const begin = performance.now();
  let last = begin, boomAt = null;
  rocketEl.style.transformOrigin = '50% 97.5%';                       // dreht um die Düse (y = 312 von 320)
  function frame(now) {
    if (state.phase !== 'launch') { if (sound.rumble) sound.rumble(); if (sound.retro) sound.retro(); return; } // Szene verlassen
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
    const ta = tc - count - ignite - flight;                          // Zeit seit Ende des Aufstiegs
    const arriving = arrive > 0 && ta >= 0 && (ta < arrive || !reusable); // Ankunft am Ziel, ohne Rückflug bleibt sie stehen
    const tr = ta - arrive;                                           // Rückflug des Boosters danach
    const returning = reusable && tr >= 0;
    const igniting = tc >= count;
    const fire = igniting && !returning && !arriving && (tc < count + ignite || burning(s));
    const alt = tc < count + ignite ? 0 : altitude(Math.min(s, flight / 1000));
    const camUp = Math.max(0, alt - H * 0.08);
    const cam = returning ? camUp * (1 - ease(clamp(tr / 1100))) : camUp;  // Kamera fährt zur Landung zurück
    const angle = tilt(s);
    const shakeAmp = reduce ? 0 : fire ? (alt < H ? 7 : 3) : 0;
    const sx = (Math.random() - 0.5) * shakeAmp, sy = (Math.random() - 0.5) * shakeAmp;

    // Ton steuern
    if (tc >= 0 && sound.beeps < 3 && tc >= sound.beeps * 1000) { beep(sound.beeps === 2 ? 990 : 660); sound.beeps += 1; }
    if (igniting && !sound.rumble) sound.rumble = rumble(burnTime, mode === 'nofuel');
    if (boomAt !== null && !sound.boom) { boomSound(); sound.boom = true; }

    // Hitzeschild schließt sich beim Countdown über dem Satelliten
    if (tc >= 0) rocketEl.classList.add('closed');

    ctx.clearRect(0, 0, W, H); fctx.clearRect(0, 0, W, H);
    // dunkler Himmel blendet während des Countdowns ein: kein harter Bildwechsel, aber dichter (Josias 14.11.)
    const skyA = 0.94 * ease(clamp((tc + intro) / 2200));
    if (skyA > 0) {
      const sg = ctx.createLinearGradient(0, 0, 0, H);
      sg.addColorStop(0, `rgba(5,4,10,${skyA})`); sg.addColorStop(0.8, `rgba(16,20,38,${skyA})`); sg.addColorStop(1, `rgba(30,36,60,${skyA})`);
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      for (const [x, y, b] of stars) if (cam === 0) { ctx.fillStyle = `rgba(245,239,230,${(0.2 + b * 0.5) * skyA})`; ctx.fillRect(x, y, 1.4, 1.4); }
    }
    if (cam > 0) for (const [x, y, b] of stars) {                     // Sterne ziehen vorbei, schräg zur Neigung
      ctx.fillStyle = `rgba(245,239,230,${0.25 + b * 0.6})`;
      const yy = (y + cam * 0.15 * (0.5 + b)) % H, xx = ((x - cam * 0.1 * Math.sin(angle) * (0.5 + b)) % W + W) % W;
      ctx.fillRect(xx, yy, 1.6, 1.6 + Math.min(8, 4 * b));
    }
    ctx.save(); ctx.translate(sx, sy);
    const gy = groundY + cam;
    // Arme: schwenken beim Countdown auf; beim Rückflug fahren sie auf Fanghöhe und schließen sich, wenn der Booster ankommt
    const armOpen = returning ? 1 - ease(clamp((tr - 3300) / 500)) : tc > 0 ? ease(clamp(tc / Math.min(1500, count))) : 0; // ganz offen vor der Zündung, auch bei kurzem Countdown
    const armY = returning ? armY0 + (TOWER.catchY - armY0) * ease(clamp(tr / 1100)) : armY0;
    const reach = 50 + (returning ? look.w / 2 : halfWidth(look)) + 3;
    if (gy < H + 400) {
      ctx.fillStyle = '#5a564f'; ctx.fillRect(cx - 40 * unit, gy, 80 * unit, 4 * unit);   // Rampe wie im Bau
      tower(ctx, cx, gy, unit, armOpen, armY, reach, false);
      if (!arriving) { fctx.save(); fctx.translate(sx, sy); tower(fctx, cx, gy, unit, armOpen, armY, reach, true); fctx.restore(); }
    }
    if (fire && alt < H * 0.8 && !reduce) for (let i = 0; i < 3; i++) smoke.push({ x: (Math.random() - 0.5) * look.w * unit, y: 0, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 0.8, r: 8 + Math.random() * 14, life: 1 });
    for (const p of smoke) {
      p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.r += 0.35 * dt / 16; p.life -= 0.006 * dt / 16;
      if (p.life > 0) { ctx.fillStyle = `rgba(200,195,188,${p.life * 0.45})`; ctx.beginPath(); ctx.arc(cx + p.x, gy - 4 * unit + p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }
    const baseY = groundY - alt + cam;
    // Nach der Stufentrennung zoomt die Kamera heraus und hält Oberstufe und Spitze in der Bildmitte
    const sf = Math.min(s, flight / 1000);
    const zoomE = stagey && !returning ? ease(clamp((sf - SEP.stage) / 1.6)) : 0;
    const U = unit * (1 - 0.35 * zoomE), dC = ((G.top + G.splitY) / 2 - 312) * U;
    const Nn = { x: cx + (W / 2 + dC * Math.sin(angle) - cx) * zoomE, y: baseY + (H * 0.45 - dC * Math.cos(angle) - baseY) * zoomE }; // Düse ohne Wackeln
    if (fire && boomAt === null) {
      ctx.save(); ctx.translate(Nn.x, Nn.y); ctx.rotate(angle);
      if (stagey && sf >= SEP.stage) { ctx.translate(0, (G.splitY - 312) * U); flame(s, U, 0.55); } else flame(s, U); // Oberstufe: kleineres Feuer
      ctx.restore();
    }
    if (stagey && !returning && !arriving && sf >= SEP.side) pieces(sf, Nn, U, angle);
    if (mode === 'explode' && s >= 2.3 && boomAt === null) boomAt = now;
    if (mode === 'nofuel' && s > 1.6 && alt === 0 && boomAt === null) boomAt = now;
    if (boomAt !== null) {
      const b = (now - boomAt) / 1000;
      fireball(cx, baseY - (mode === 'explode' ? 160 * unit : 20 * unit), (mode === 'explode' ? 60 : 30) * unit + b * 220 * unit, Math.max(0, 1 - b * 0.9));
    }
    // Rückflug: Booster bremst mit Feuer und setzt in den Ständer
    let landed = false;
    if (returning) {
      const p = clamp((tr - 1100) / 2200);
      const bAlt = H * 1.1 * (1 - p) * (1 - p) + 14 * unit; // hängt zum Schluss knapp über der Rampe in den Armen
      landed = p >= 1;
      if (!landed) {
        if (!sound.retro) sound.retro = rumble(2.4, false);
        ctx.save(); ctx.translate(cx, gy - bAlt); flame(1.2, unit, 0.7); ctx.restore();
        if (bAlt < H * 0.2) for (let i = 0; i < 2; i++) smoke.push({ x: (Math.random() - 0.5) * look.w * unit, y: 0, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 0.5, r: 6 + Math.random() * 10, life: 0.8 });
      }
      booster(cx, gy - bAlt, unit, 0);
    }
    ctx.restore();
    if (arriving) arrival(Math.min(1, ta / arrive));

    // Rakete (SVG): Größe und Lage aus Maßstab und Boden, dazu Flug, Neigung und Wackeln. Beim Rückflug ist sie im All.
    rocketEl.style.height = `${320 * U}px`;
    rocketEl.style.left = `${Nn.x + sx}px`;
    rocketEl.style.top = `${Nn.y + sy - 312 * U}px`;
    rocketEl.style.transform = `translateX(-50%) rotate(${angle}rad)`;
    rocketEl.style.clipPath = stagey && sf >= SEP.stage ? `inset(0 0 ${((320 - G.splitY) / 320) * 100}% 0)` : ''; // erste Stufe ist weg
    rocketEl.classList.toggle('no-boosters', stagey && sf >= SEP.side);
    rocketEl.classList.toggle('jettison', stagey && sf >= SEP.fairing);
    rocketEl.classList.toggle('deployed', stagey && sf >= SEP.deploy && !state.mission.module);
    rocketEl.style.opacity = (mode === 'explode' && boomAt !== null) || returning || arriving ? '0' : '1';

    if (tc >= 0 && !igniting) {
      ctx.font = '800 96px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#F5EFE6';
      ctx.fillText(String(Math.ceil((count - tc) / 1000)), W * 0.76, H * 0.45); ctx.textAlign = 'start';
    }
    if (mode === 'heavy' && s > 0) caption(t('capHeavy'));
    if (mode === 'nofuel' && s > 0) caption(t('capNoFuel'));
    if (mode === 'explode' && boomAt !== null) caption(t('capExplode'));
    const goal = t({ moon: 'capMoon', mars: 'capMars' }[state.mission.dest] || 'capOrbit');
    if (stagey && !returning && !arriving) {
      if (sf >= SEP.stage && sf < SEP.fairing) caption(t('capStage'));
      else if (sf >= SEP.fairing && sf < SEP.deploy) caption(t('capFairing'));
      else if (sf >= SEP.deploy) caption(state.mission.module ? goal : t('capDeploy'));
    } else if (mode === 'ok' && s > 3.5 && !returning && !arriving) caption(goal);
    if (landed) caption(t('capLanded'));
    if (tc >= count + ignite + flight + arrive + back) { // nach kurzer Pause von selbst zum Ergebnis
      setTimeout(() => { if (state.phase === 'launch') { state.phase = 'result'; render(); } }, 1200);
      return;
    }
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

// Forschung je Ort (Linus 14.11.): Reiter für Erde, Raumstation, Mond, Mars; oben die Kulisse des Ortes.
const PLACE_NAME = { earth: 'placeEarth', station: 'placeStation', moon: 'placeMoon', mars: 'placeMars' };
function renderResearch() {
  const a = research.active;
  const reached = reachedLevel();
  const view = Math.min(state.researchView || reached, reached);
  const place = LEVELS[view - 1].place;
  const delivered = contracts.filter((x) => x.level === view && contracts.indexOf(x) < company.index).length;
  return el('section', { class: 'research enter' },
    el('nav', { class: 'levels', 'aria-label': t('research') }, LEVELS.map((l) => el('button', {
      type: 'button', class: l.n === view ? 'level on' : 'level', disabled: l.n > reached ? '' : null,
      title: l.n > reached ? t('reachLevel') : '', onclick: () => { state.researchView = l.n; render(); },
    }, t(PLACE_NAME[l.place])))),
    el('div', { class: 'lab-scene', 'aria-hidden': 'true' }, placeSvg(view, null, delivered)),
    el('h1', {}, t('labOf', { x: t(PLACE_NAME[place]) })),
    el('p', { class: 'lead' }, t('researchLead')),
    el('p', { class: 'big-number rp' }, `${research.rp} ${t('rpShort')} · ${money(company.cash)}`),
    el('div', { class: 'projects' }, PROJECTS.filter((pr) => pr.level === view).map((pr) => projectCard(pr, reached))));
}

// Eine Forschungs-Karte (im Labor und in der Level-Auswahl). Kostet Geld, Punkte und Zeit.
function projectCard(pr, reached) {
  const a = research.active;
      const done = !!research.done[pr.id];
      const locked = (pr.needs && !research.done[pr.needs]) || pr.level > reached;
      const running = a && a.id === pr.id;
      // nicht in die Pleite forschen: nach dem Kauf muss der billigste Weg zum nächsten Auftrag bezahlbar bleiben
      const ruins = !done && company.index < contracts.length && company.cash - pr.cost < minCostFor(company.index, { ...research.done, [pr.id]: true });
      const canStart = !done && !locked && !a && research.rp >= pr.rp && company.cash >= pr.cost && !ruins;
      return el('div', { class: `project card${done ? ' done-card' : ''}` },
        el('h2', {}, el('span', {}, t(pr.name)), el('span', { class: 'price' }, done ? `✓ ${t('doneLbl')}` : `${pr.rp} ${t('rpShort')} · ${money(pr.cost)}`)),
        el('p', { class: 'hint' }, t(pr.info)),
        locked && pr.needs && !research.done[pr.needs] ? el('p', { class: 'hint' }, t('needs', { x: t(PROJECTS.find((x) => x.id === pr.needs).name) })) : '',
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
          el('p', { class: 'hint research-pct' }, `${t('team')} · ${Math.round(a.progress * 100)} %`),
          el('div', { class: 'research-meter' }, meter('', a.progress, 1, '')),
          el('div', { class: 'research-actions' },
            el('button', { class: 'secondary', type: 'button', 'aria-pressed': String(!!a.fast), onclick: () => { a.fast = !a.fast; saveResearch(); render(); } }, t('speed2')),
            el('button', { class: 'secondary', type: 'button', disabled: research.rp < SKIP_RP ? '' : null,
              onclick: () => { if (research.rp < SKIP_RP) return; research.rp -= SKIP_RP; research.done[a.id] = true; research.active = null; saveResearch(); render(); } },
            t('skip', { n: SKIP_RP })))] : '',
        !done && !running && !locked ? el('button', { class: 'primary', type: 'button', disabled: canStart ? null : '',
          onclick: () => {
            if (!canStart) return;
            research.rp -= pr.rp; company.cash = Math.round((company.cash - pr.cost) * 1000) / 1000; // Forschung kostet Firmengeld
            research.active = { id: pr.id, progress: 0, fast: false }; saveResearch(); saveCompany(); render();
          } },
        canStart ? icon('flask') : '', el('span', {}, research.rp < pr.rp ? t('notEnoughRp') : company.cash < pr.cost ? t('notEnoughCash') : ruins ? t('wouldBankrupt') : t('startResearch', { n: pr.rp, c: money(pr.cost) }))) : '');
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

// Kenney-Bild (Space Kit, CC0) an einen Bodenpunkt stellen. k skaliert, foot = Anteil der Höhe unter dem Bodenpunkt.
function sprite(name, x, y, k = 0.7, foot = 0.22, extra = '') {
  const [w0, h0] = SPRITES[name], w = w0 * k, h = h0 * k;
  return svg('image', { href: `assets/kenney/${name}.png`, x: x - w / 2, y: y - h * (1 - foot), width: w, height: h, class: `kenney ${extra}` });
}

function baseSvg(c) {
  const s = svg('svg', { viewBox: '-270 -110 540 380', class: 'base', role: 'group', 'aria-label': t('baseLabel') });
  // Boden: 8 x 8 Felder, Straße zur Startrampe
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
    s.append(svg('polygon', { points: pts([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)]), fill: (x + y) % 2 ? '#3d4a3a' : '#43513f', stroke: '#2f3a2d', 'stroke-width': 0.5 }));
  }
  s.append(svg('polygon', { points: pts([iso(3.6, 3), iso(4.4, 3), iso(4.4, 5), iso(3.6, 5)]), fill: '#6b675f' }));
  s.append(svg('polygon', { points: pts([iso(3, 2.6), iso(6, 2.6), iso(6, 3.4), iso(3, 3.4)]), fill: '#6b675f' }));
  groundLight(s);

  // Leitstand (Aufträge), Labor (Forschung), Startrampe (Start): Bilder aus dem Kenney Space Kit
  const [hx, hy] = iso(2, 2), [lx, ly] = iso(6, 2), [px, py] = iso(4, 6);
  s.append(sprite('satelliteDish_large', ...iso(1, 4.4), 0.9));
  s.append(building(t('bldgControl'), [hx, hy - 78], focusContract, [sprite('hangar_largeA', hx, hy, 0.8)]));
  s.append(building(t('bldgLab'), [lx, ly - 62], labAction(1), [sprite('hangar_roundGlass', lx, ly, 1.2)]));
  s.append(building(t('bldgPad'), [px, py - 96], padAction(c), [
    sprite('platform_large', px, py, 0.75, 0.5),
    svg('path', { d: `M${px - 6} ${py - 6} L${px - 6} ${py - 56} Q${px} ${py - 76} ${px + 6} ${py - 56} L${px + 6} ${py - 6} Z`, fill: '#F5EFE6' }),
    svg('rect', { x: px - 6, y: py - 36, width: 12, height: 4, fill: '#A88FD6' }),
  ]));
  s.append(sprite('machine_generatorLarge', ...iso(6.8, 5.4), 0.6));
  s.append(sprite('barrels', ...iso(7.2, 6.6), 0.7));
  s.append(sprite('astronautA', ...iso(5.2, 4.6), 0.55));
  return s;
}

// ---------- Orte der Level: Raumstation, Mond, Mars (Linus 14.11.) ----------
// Jeder Ort hat dieselben drei Funktionen: Leitstand (Auftrag), Labor (Forschung dieses Ortes), Start- bzw. Andockplatz.
let sceneSeq = 0;
const labAction = (level) => () => { state.returnTo = 'start'; state.researchView = level; go('research'); };
const padAction = (c) => () => {
  if (c && !company.over && !contractLocked(c, research.done)) startMission(contractMission(c));
  else focusContract();
};

// Verlauf als <defs>-Eintrag, gibt die url() zurück
function grad(s, kind, stops, attrs = {}) {
  let defs = s.querySelector('defs');
  if (!defs) { defs = svg('defs'); s.prepend(defs); }
  const id = `sg${++sceneSeq}`;
  const g = svg(kind, { id, ...attrs });
  for (const [o, c] of stops) g.append(svg('stop', { offset: o, 'stop-color': c }));
  defs.append(g);
  return `url(#${id})`;
}
function starsInto(s, n, area = [-270, -110, 540, 200]) {
  for (let i = 0; i < n; i++) {
    const x = area[0] + ((i * 97) % area[2]), y = area[1] + ((i * 53) % area[3]);
    s.append(svg('circle', { cx: x, cy: y, r: (i % 3) * 0.4 + 0.5, fill: 'rgba(245,239,230,0.7)' }));
  }
}
// Kuppel mit Licht von links oben, wirkt räumlich
function dome(s, cx, cy, r, light, dark, extra = []) {
  const fill = grad(s, 'radialGradient', [['0', light], ['1', dark]], { cx: '0.35', cy: '0.3', r: '0.8' });
  const g = svg('g');
  g.append(svg('ellipse', { cx, cy, rx: r, ry: r * 0.32, fill: 'rgba(0,0,0,0.35)' }));
  g.append(svg('path', { d: `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`, fill }));
  for (const e of extra) g.append(e);
  return g;
}
// liegender Zylinder (Stationsmodul) mit Licht von oben
function cylinder(s, x, y, len, r, light, dark, solid) {
  const g = svg('g');
  if (!solid) {
    g.append(svg('rect', { x, y: y - r, width: len, height: 2 * r, rx: r * 0.5, fill: 'none', stroke: 'rgba(245,239,230,0.45)', 'stroke-dasharray': '4 3' }));
    return g;
  }
  const fill = grad(s, 'linearGradient', [['0', light], ['0.45', light], ['1', dark]], { x1: '0', x2: '0', y1: '0', y2: '1' });
  g.append(svg('rect', { x, y: y - r, width: len, height: 2 * r, fill }));
  g.append(svg('ellipse', { cx: x + len, cy: y, rx: r * 0.35, ry: r, fill: dark }));
  g.append(svg('ellipse', { cx: x, cy: y, rx: r * 0.35, ry: r, fill: light }));
  return g;
}
function groundLight(s) {
  const light = grad(s, 'linearGradient', [['0', 'rgba(255,248,230,0.16)'], ['0.55', 'rgba(255,248,230,0)'], ['1', 'rgba(0,0,0,0.3)']], { x1: '0', y1: '0', x2: '1', y2: '1' });
  s.append(svg('polygon', { points: pts([iso(0, 0), iso(8, 0), iso(8, 8), iso(0, 8)]), fill: light, 'pointer-events': 'none' }));
  // Kante der Bodenplatte, damit sie wie ein Block wirkt
  s.append(svg('polygon', { points: pts([iso(0, 8), iso(8, 8), [iso(8, 8)[0], iso(8, 8)[1] + 10], [iso(0, 8)[0], iso(0, 8)[1] + 10]]), fill: 'rgba(0,0,0,0.45)' }));
  s.append(svg('polygon', { points: pts([iso(8, 0), iso(8, 8), [iso(8, 8)[0], iso(8, 8)[1] + 10], [iso(8, 0)[0], iso(8, 0)[1] + 10]]), fill: 'rgba(0,0,0,0.3)' }));
}
function isoGround(s, a, b, stroke) {
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
    s.append(svg('polygon', { points: pts([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)]), fill: (x + y) % 2 ? a : b, stroke, 'stroke-width': 0.5 }));
  }
  groundLight(s);
}
function crater(s, gx, gy, r, dark, rim) {
  const [x, y] = iso(gx, gy);
  s.append(svg('ellipse', { cx: x, cy: y, rx: r, ry: r * 0.5, fill: dark }));
  s.append(svg('path', { d: `M${x - r} ${y} A${r} ${r * 0.5} 0 0 0 ${x + r} ${y}`, stroke: rim, 'stroke-width': 1.5, fill: 'none' }));
}
// Landeplatz mit Markierung und Lander bzw. Rakete
function landingPad(s, cx, cy, color, withShip) {
  const parts = [svg('ellipse', { cx, cy, rx: 46, ry: 23, fill: color, stroke: 'rgba(245,239,230,0.5)' }),
    svg('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', class: 'pad-mark' }, 'H')];
  if (withShip) {
    const body = grad(s, 'linearGradient', [['0', '#e4e8ec'], ['0.55', '#d6dbe1'], ['1', '#8d949c']], { x1: '0', x2: '1' });
    parts.push(svg('rect', { x: cx - 7, y: cy - 62, width: 14, height: 56, fill: body }));
    parts.push(svg('path', { d: `M${cx - 7} ${cy - 62} Q${cx} ${cy - 80} ${cx + 7} ${cy - 62} Z`, fill: body }));
    parts.push(svg('path', { d: `M${cx - 7} ${cy - 12} L${cx - 13} ${cy - 2} M${cx + 7} ${cy - 12} L${cx + 13} ${cy - 2}`, stroke: '#8d949c', 'stroke-width': 2 }));
  }
  return parts;
}

function stationScene(c, delivered) {
  const s = svg('svg', { viewBox: '-270 -110 540 380', class: 'base', role: 'group', 'aria-label': t('placeStation') });
  starsInto(s, 60);
  // Erde unten, mit Atmosphärenrand und Wolken
  const earth = grad(s, 'radialGradient', [['0', '#4f8fd0'], ['0.7', '#24507f'], ['1', '#14304f']], { cx: '0.45', cy: '0.15', r: '0.9' });
  s.append(svg('circle', { cx: 0, cy: 620, r: 430, fill: earth }));
  s.append(svg('circle', { cx: 0, cy: 620, r: 434, fill: 'none', stroke: 'rgba(140,200,255,0.55)', 'stroke-width': 6 }));
  for (const [x, y, rx] of [[-150, 215, 60], [40, 200, 80], [170, 230, 50]]) s.append(svg('ellipse', { cx: x, cy: y, rx, ry: 8, fill: 'rgba(255,255,255,0.25)' }));
  // Gitterträger und Solarflügel (Energiemodul)
  const y = 40;
  s.append(svg('rect', { x: -230, y: y - 3, width: 460, height: 6, fill: delivered ? '#8a8f96' : 'rgba(245,239,230,0.3)' }));
  for (const x of [-230, -180, 150, 200]) {
    const solid = delivered >= 2;
    s.append(svg('rect', { x, y: y - 70, width: 40, height: 140, fill: solid ? grad(s, 'linearGradient', [['0', '#3d5196'], ['1', '#1f2b52']]) : 'none', stroke: solid ? '#9fb3e8' : 'rgba(245,239,230,0.4)', 'stroke-dasharray': solid ? null : '4 3' }));
  }
  s.append(cylinder(s, -110, y, 70, 16, '#f1e3b8', '#a68f52', delivered >= 4));           // Wohnmodul
  s.append(building(t('bldgControl'), [-10, y + 44], focusContract, [cylinder(s, -40, y, 80, 20, '#f5efe6', '#a9a49b', delivered >= 1)]));
  s.append(building(t('bldgLab'), [105, y - 30], labAction(2), [cylinder(s, 40, y, 70, 17, '#e3f1f4', '#7fa9b0', delivered >= 3)]));
  const dock = grad(s, 'radialGradient', [['0', '#d8c9f2'], ['1', '#6d5a92']], { cx: '0.35', cy: '0.35' });
  s.append(building(t('bldgDock'), [0, y - 50], padAction(c), [svg('circle', { cx: 0, cy: y - 28, r: 12, fill: delivered >= 5 ? dock : 'none', stroke: delivered >= 5 ? 'none' : 'rgba(245,239,230,0.45)', 'stroke-dasharray': '3 3' })]));
  s.append(svg('text', { x: 0, y: y + 84, 'text-anchor': 'middle', class: 'bldg-label' }, t('modulesOf', { n: delivered, m: 5 })));
  return s;
}

function moonScene(c, delivered) {
  const s = svg('svg', { viewBox: '-270 -110 540 380', class: 'base', role: 'group', 'aria-label': t('placeMoon') });
  starsInto(s, 70, [-270, -110, 540, 130]);
  const earth = grad(s, 'radialGradient', [['0', '#6aa7e0'], ['1', '#1d3b5c']], { cx: '0.35', cy: '0.3' });
  s.append(svg('circle', { cx: -200, cy: -70, r: 20, fill: earth }));
  s.append(svg('path', { d: 'M-212 -76 q8 -6 18 0 q6 4 12 0', stroke: 'rgba(255,255,255,0.6)', 'stroke-width': 2, fill: 'none' }));
  isoGround(s, '#8a8780', '#93908a', '#77746e');
  // Mond: Krater und Felsen grau statt orange (Mars-Farben aus dem Kenney-Paket)
  s.append(sprite('craterLarge', ...iso(6.6, 5.8), 1.4, 0.5, 'gray'));
  s.append(sprite('crater', ...iso(1.2, 6.6), 1.1, 0.5, 'gray'));
  s.append(sprite('rock_largeA', ...iso(7.3, 1.2), 0.6, 0.22, 'gray'));
  s.append(sprite('rocks_smallA', ...iso(0.8, 3.2), 0.6, 0.5, 'gray'));
  // gelieferte Teile der Mondbasis
  if (delivered >= 1) s.append(sprite('machine_generatorLarge', ...iso(0.9, 4.4), 0.6));
  if (delivered >= 2) s.append(sprite('rover', ...iso(5.4, 4.6), 1.2));
  if (delivered >= 3) s.append(sprite('hangar_largeB', ...iso(3.4, 1.2), 0.55));
  if (delivered >= 4) s.append(sprite('machine_barrelLarge', ...iso(7, 3.4), 0.8));
  const [cx, cy] = iso(2, 2), [lx, ly] = iso(6, 2), [px, py] = iso(4, 6);
  s.append(building(t('bldgControl'), [cx, cy - 58], focusContract, [sprite('hangar_roundA', cx, cy, 1.1)]));
  s.append(building(t('bldgLab'), [lx, ly - 56], labAction(3), [sprite('hangar_roundGlass', lx, ly, 1.1)]));
  s.append(building(t('bldgLanding'), [px, py - 92], padAction(c), [sprite('platform_large', px, py, 0.7, 0.5), ...landingPad(s, px, py, 'transparent', true).slice(2)]));
  s.append(sprite('astronautA', ...iso(3.2, 4.2), 0.5));
  return s;
}

function marsScene(c, delivered) {
  const s = svg('svg', { viewBox: '-270 -110 540 380', class: 'base', role: 'group', 'aria-label': t('placeMars') });
  s.append(svg('rect', { x: -270, y: -110, width: 540, height: 380, fill: grad(s, 'linearGradient', [['0', '#3a1d14'], ['0.5', '#a65a36'], ['1', '#d98b5a']], { x1: '0', x2: '0', y1: '0', y2: '1' }) }));
  s.append(svg('circle', { cx: 210, cy: -70, r: 9, fill: '#fff3d6', opacity: 0.8 }));
  isoGround(s, '#a5552f', '#b0603a', '#8a4526');
  s.append(sprite('craterLarge', ...iso(6.8, 5.6), 1.3, 0.5));
  s.append(sprite('rock_largeB', ...iso(1, 1), 0.6));
  s.append(sprite('rock_largeA', ...iso(7.2, 2), 0.5));
  s.append(sprite('rocks_smallA', ...iso(2.5, 7.2), 0.6, 0.5));
  if (delivered >= 1) s.append(sprite('hangar_smallA', ...iso(0.9, 4), 0.45));
  if (delivered >= 2) s.append(sprite('hangar_largeB', ...iso(3.4, 1.0), 0.55));
  if (delivered >= 3) { s.append(sprite('astronautA', ...iso(5.6, 4.6), 0.55)); s.append(sprite('rover', ...iso(6.2, 4.2), 1.2)); }
  const [cx, cy] = iso(2, 2), [lx, ly] = iso(6, 2), [px, py] = iso(4, 6);
  s.append(building(t('bldgControl'), [cx, cy - 58], focusContract, [sprite('hangar_roundA', cx, cy, 1.1)]));
  s.append(building(t('bldgLab'), [lx, ly - 56], labAction(4), [sprite('hangar_roundGlass', lx, ly, 1.1)]));
  s.append(building(t('bldgLanding'), [px, py - 92], padAction(c), [sprite('platform_large', px, py, 0.7, 0.5), ...landingPad(s, px, py, 'transparent', true).slice(2)]));
  s.append(sprite('satelliteDish_detailed', ...iso(1.4, 5.6), 0.9));
  return s;
}

// Ort eines Levels zeichnen. delivered = gelieferte Module in diesem Level.
function placeSvg(level, c, delivered) {
  const place = LEVELS[level - 1].place;
  if (place === 'station') return stationScene(c, delivered);
  if (place === 'moon') return moonScene(c, delivered);
  if (place === 'mars') return marsScene(c, delivered);
  return baseSvg(c);
}

// ---------- Kampagne: Firmen-Bildschirm ----------
// Links die Basis von oben, rechts Geld und Auftrag. Gebäude wählen Aufträge und Forschung.
function renderCompany() {
  const done = company.index >= contracts.length;
  const c = contracts[company.index];
  const best = bestCompany();
  const current = reachedLevel();
  const view = Math.min(state.levelView || current, current);
  const inLevel = contracts.filter((x) => x.level === view);
  const delivered = inLevel.filter((x) => contracts.indexOf(x) < company.index).length;
  const locked = c && contractLocked(c, research.done);
  const need = locked ? PROJECTS.find((p) => p.id === c.requires) : null;
  return el('section', { class: 'company enter' },
    el('div', { class: 'base-wrap' },
      el('nav', { class: 'levels', 'aria-label': t('level') }, LEVELS.map((l) => el('button', {
        type: 'button', class: l.n === view ? 'level on' : 'level', disabled: l.n > current ? '' : null,
        title: l.n > current ? t('locked') : '',
        onclick: () => { state.levelView = l.n; render(); },
      }, `${l.n < current ? '✓ ' : ''}${t('level')} ${l.n} · ${tr(l, 'name')}`))),
      // jedes Level hat seinen Ort: Erde, Raumstation, Mond, Mars
      placeSvg(view, !done && view === current ? c : null, delivered),
      el('p', { class: 'hint' }, t('baseHint'))),
    el('div', { class: 'company-panel' },
      el('h1', {}, t('company')),
      el('p', { class: 'big-number rp' }, `${t('cash')}: ${money(company.cash)}`),
      company.over ? el('p', { class: 'result-msg fail' }, t('bankrupt')) : '',
      done ? el('p', { class: 'result-msg ok' }, t('wonAll', { c: money(company.cash) })) : '',
      view < current ? el('p', { class: 'result-msg ok' }, t('levelDone')) : '',
      !done && !company.over && view === current ? el('div', { class: 'project card' },
        el('h2', {}, el('span', {}, t('contractOf', { n: contracts.filter((x) => x.level === c.level).indexOf(c) + 1, m: contracts.filter((x) => x.level === c.level).length })), el('span', { class: 'price' }, `${t('fee')} ${money(c.fee)}`)),
        el('p', {}, el('strong', {}, tr(c, 'client'))),
        el('p', { class: 'hint' }, tr(c, 'goal')),
        c.module ? el('p', { class: 'hint' }, `${kg(c.module.mass)} · ${money(c.module.cost)}`) : el('p', { class: 'hint' }, `${t('scienceNeeded')}: ${c.minScience}`),
        need ? el('p', { class: 'hint warn' }, t('needsResearch', { x: t(need.name) })) : '',
        el('button', { class: 'primary', type: 'button', disabled: locked ? '' : null, onclick: () => { if (!locked) startMission(contractMission(c)); } }, t('startContract'))) : '',
      el('ol', { class: 'contracts' }, inLevel.map((x) => {
        const i = contracts.indexOf(x);
        return el('li', { class: i < company.index ? 'is-done' : '' }, `${i < company.index ? '✓ ' : ''}${tr(x, 'client')} · ${money(x.fee)}`);
      })),
      el('div', { class: 'research-actions' },
        el('button', { class: state.confirmRestart ? 'secondary danger-text' : 'secondary', type: 'button', onclick: () => {
          if (!state.confirmRestart) { state.confirmRestart = true; render(); return; } // zweiter Klick bestätigt
          state.confirmRestart = false; company = freshCompany(); state.levelView = null; saveCompany(); render();
        } }, state.confirmRestart ? t('confirmRestart') : t('restartCompany'))),
      best ? el('p', { class: 'hint' }, `${t('bestCompany')}: ${money(best)}`) : ''));
}

// ---------- Ergebnis ----------

// Erklärbild zum Weltraum-Fakt (Linus 14.11.): zeigt genau diesen Fakt, z. B. Größen oder Abstände im Vergleich.
// Vergleichswerte wie Auto (130 km/h) und Flugzeug (900 km/h) sind Alltagswerte zur Einordnung.
function factPicture(fact) {
  const s = svg('svg', { viewBox: '0 0 320 150', class: 'fact-pic', role: 'img', 'aria-label': fact[getLang()] });
  const add = (tag, a, text) => { const n = svg(tag, a, text); s.append(n); return n; };
  const label = (x, y, text, extra = {}) => add('text', { x, y, class: 'fact-label', 'text-anchor': 'middle', ...extra }, text);
  const earth = grad(s, 'radialGradient', [['0', '#6aa7e0'], ['1', '#1d3b5c']], { cx: '0.35', cy: '0.3' });
  const sun = grad(s, 'radialGradient', [['0', '#fff3b0'], ['0.5', '#ffb347'], ['1', '#e0605a']], { cx: '0.4', cy: '0.4' });
  // Balkenvergleich für Geschwindigkeiten: das Auto ist fast unsichtbar, genau das ist der Punkt
  const bars = (rows, unit) => rows.forEach(([name, v, max, color], i) => {
    const y = 26 + i * 40, w = Math.max(3, (v / max) * 210);
    label(8, y + 12, name, { 'text-anchor': 'start' });
    add('rect', { x: 92, y, width: w, height: 18, rx: 4, fill: color });
    label(98 + w, y + 13, `${v.toLocaleString(getLang())} ${unit}`, { 'text-anchor': w > 150 ? 'end' : 'start', x: w > 150 ? 88 + w : 98 + w });
  });
  switch (fact.pic) {
    case 'iss-orbit': {
      add('circle', { cx: 160, cy: 75, r: 34, fill: earth });
      add('ellipse', { cx: 160, cy: 75, rx: 58, ry: 50, fill: 'none', stroke: 'rgba(245,239,230,0.6)', 'stroke-dasharray': '4 3' });
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; add('circle', { cx: 160 + Math.cos(a) * 70, cy: 75 + Math.sin(a) * 62, r: 3.2, fill: '#ffb347' }); }
      add('rect', { x: 212, y: 71, width: 12, height: 6, fill: '#d9d2c7' }); add('rect', { x: 206, y: 69, width: 6, height: 10, fill: '#2b3a6b' }); add('rect', { x: 224, y: 69, width: 6, height: 10, fill: '#2b3a6b' });
      label(270, 70, '90 min'); label(270, 88, `16 × ☀`);
      break;
    }
    case 'iss-speed': bars([[t('picCar'), 130, 28800, '#8a857c'], [t('picPlane'), 900, 28800, '#9fb3e8'], [t('picStation'), 28800, 28800, '#e8c547']], 'km/h'); break;
    case 'debris-speed': bars([[t('picCar'), 130, 29000, '#8a857c'], [t('picPlane'), 900, 29000, '#9fb3e8'], [t('picDebris'), 29000, 29000, '#e0605a']], 'km/h'); break;
    case 'iss-mass': {
      add('path', { d: 'M40 120 L280 120 M160 120 L160 60 M70 60 L250 60', stroke: '#B8AFA6', 'stroke-width': 3, fill: 'none' });
      add('rect', { x: 50, y: 34, width: 40, height: 14, fill: '#2b3a6b' }); add('rect', { x: 92, y: 36, width: 26, height: 10, rx: 4, fill: '#d9d2c7' }); add('rect', { x: 120, y: 34, width: 40, height: 14, fill: '#2b3a6b' });
      label(105, 30, '420 t');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) add('rect', { x: 190 + c * 12, y: 50 - r * 8, width: 10, height: 6, rx: 2, fill: '#a9a29a' });
      label(225, 30, t('picCars'));
      break;
    }
    case 'webb-distance': {
      add('line', { x1: 20, y1: 80, x2: 300, y2: 80, stroke: 'rgba(245,239,230,0.4)', 'stroke-dasharray': '4 4' });
      add('circle', { cx: 24, cy: 80, r: 12, fill: earth }); label(24, 110, t('picEarth'));
      const moonX = 24 + (384400 / 1500000) * 270;
      add('circle', { cx: moonX, cy: 80, r: 5, fill: '#d9d2c7' }); label(moonX, 110, t('picMoon')); label(moonX, 62, `${(384400).toLocaleString(getLang())} km`);
      add('polygon', { points: '294,72 302,80 294,88 286,80', fill: '#e8c547' }); label(294, 110, 'Webb'); label(270, 62, `${(1500000).toLocaleString(getLang())} km`);
      break;
    }
    case 'moon-drift': {
      add('circle', { cx: 60, cy: 75, r: 30, fill: earth });
      add('circle', { cx: 210, cy: 75, r: 10, fill: '#d9d2c7' });
      add('path', { d: 'M226 75 L262 75 M254 68 L262 75 L254 82', stroke: '#e8c547', 'stroke-width': 3, fill: 'none' });
      add('rect', { x: 200, y: 108, width: 70, height: 10, fill: '#e8c547' });
      for (let k = 0; k <= 7; k++) add('line', { x1: 200 + k * 10, y1: 108, x2: 200 + k * 10, y2: k % 2 ? 112 : 115, stroke: '#171514' });
      label(235, 134, t('picPerYear'));
      break;
    }
    case 'sun-size': {
      add('circle', { cx: 300, cy: 75, r: 150, fill: sun });
      add('circle', { cx: 40, cy: 75, r: 1.6, fill: '#6aa7e0' });
      add('path', { d: 'M40 70 L40 50', stroke: '#F5EFE6', 'stroke-width': 1 }); label(40, 44, t('picEarth'));
      label(110, 120, `× ${(1300000).toLocaleString(getLang())}`);
      break;
    }
    case 'voyager': {
      add('circle', { cx: 30, cy: 75, r: 10, fill: sun });
      for (const r of [22, 34, 52, 70]) add('circle', { cx: 30, cy: 75, r, fill: 'none', stroke: 'rgba(245,239,230,0.2)' });
      add('path', { d: 'M150 10 Q215 75 150 140', stroke: '#9fb3e8', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '5 4' });
      label(170, 26, t('picBubble'));
      add('path', { d: 'M262 64 Q272 72 282 64 Z', fill: '#F5EFE6' }); add('rect', { x: 268, y: 66, width: 8, height: 8, fill: '#e0c070' });
      label(272, 98, '1977 → 2012');
      break;
    }
    default: s.append(factIcon(fact.icon));
  }
  return s;
}

// Kleine Grafik zum Weltraum-Fakt (Idee Josias 14.11.), Ersatz wenn kein Erklärbild passt
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
    r.fact ? el('div', { class: 'fact big-fact' }, factPicture(r.fact), el('p', {}, el('strong', {}, t('funFact')), ' ', r.fact[getLang()])) : '',
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
function resetProgress() {
  resetBest();
  company = freshCompany(); saveCompany();
  research = { rp: 0, done: {}, flights: 0, active: null }; saveResearch();
  try { localStorage.removeItem('seen-level'); localStorage.removeItem('best-company'); } catch { /* ohne Speicher */ }
  state.levelPick = null;
}
function resetBest() {
  try { for (const m of missions) localStorage.removeItem(`best-${m.id}`); } catch { /* ohne Speicher */ }
}

// ---------- Knöpfe unten und Gesamtaufbau ----------

function footer() {
  const back = BACK, next = NEXT;
  back.classList.toggle('hidden', state.phase === 'launch');
  next.classList.remove('hidden');
  if (state.phase === 'build') {
    setBack(state.build === 0 || state.mission.module ? t('changeDifficulty') : t('back'));
    const affordable = !state.mission.contract || budgetLeft(state.mission.budget, chosen()) >= 0; // Firma kann nicht mehr ausgeben, als sie hat
    const ready = affordable && (state.mission.module ? !!state.rocket : [state.instruments.length > 0, state.instruments.length > 0 && !!state.bus && !!state.panel && !!state.rocket][state.build]);
    if (state.build === 1) setNext(t('launch'), 'rocket'); else setNext(t('next'), 'next', true);
    next.disabled = !ready;
  } else if (state.phase === 'launch') {
    next.classList.add('hidden'); // Ergebnis kommt automatisch
  } else if (state.phase === 'research' || state.phase === 'company') {
    setBack(state.phase === 'company' ? t('changeDifficulty') : state.returnTo === 'build' ? t('back') : state.returnTo === 'company' ? t('backCompany') : t('changeDifficulty'));
    next.classList.add('hidden');
  } else if (state.phase === 'result') {
    setBack(t('changeDifficulty'));
    back.classList.toggle('hidden', !!state.mission.contract); // im Auftrag nur ein Knopf: zurück zur Levelauswahl
    if (state.mission.contract) setNext(t('changeDifficulty'), 'next', true); else setNext(t('tryAgain'), 'retry');
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
  $('mission-label').textContent = m.contract ? `${t('level')} ${m.contract.level}: ${tr(m, 'name')}` : `${t(`lvl${m.level}`)}: ${tr(m, 'name')}`;
  const left = budgetLeft(m.budget, chosen());
  $('budget').textContent = m.free ? t('noLimit') : `${t('budget')} ${money(left)} / ${money(m.budget)}`;
  $('budget').classList.toggle('low', !m.free && left < 0);

  if (state.phase === 'build') {
    // Fokus in der Mitte merken und nach dem Neuzeichnen zurückgeben (Tastatur-Nutzer)
    const f = document.activeElement, center = $('center');
    const key = f === NEXT ? '#next' : f && center.contains(f) ? (f.matches('.insure input') ? '.insure input' : f.dataset.dir ? `.arrow[data-dir="${f.dataset.dir}"]` : f.classList.contains('carousel') ? '.carousel' : null) : null;
    renderLeft(); renderRight(); center.replaceChildren(renderBuild());
    if (key) center.querySelector(key)?.focus({ preventScroll: true });
  }
  if (state.phase === 'launch' && !$('center').querySelector('.launch-wrap')) $('center').replaceChildren(renderLaunch()); // nur einmal pro Start
  if (state.phase === 'result') { $('center').replaceChildren(renderResult()); $('center').firstElementChild.append(NEXT); }
  if (state.phase === 'research') $('center').replaceChildren(renderResearch());
  footer();
}

NEXT.addEventListener('click', () => {
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
    // Stationsflüge und Basen bringen keine Wissenschaft, aber Erfahrung: feste Forschungspunkte
    r.rp = contract && contract.module ? (r.success ? 10 : 0) : pointsForMission(r, state.mission, previousBest);
    if (contract) {
      // Forschungspunkte gibt es pro Auftrag nur beim ersten Erfolg, sonst ließen sie sich durch Neustarts sammeln
      const paid = research.paid || [];
      if (paid.includes(contract.id)) r.rp = 0;
      else if (r.success) research.paid = [...paid, contract.id];
      company.cash = settleContract(company.cash, r, contract.fee);
      if (r.success) { company.index += 1; state.levelView = null; state.levelPick = null; } // Levelauswahl springt aufs aktuelle Level
      const next = contracts[company.index];
      if (next && isBankrupt(company.cash, minCostFor(company.index))) company.over = true; // billigster Weg inklusive Forschung
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
    if (state.mission.contract) { state.phase = 'start'; state.levelPick = reachedLevel(); } // zurück zur Levelauswahl
    else { state.phase = 'build'; state.build = 0; }
  }
  render();
});

BACK.addEventListener('click', () => {
  if (state.phase === 'build' && state.build > 0 && !(state.mission && state.mission.module)) state.build -= 1;
  else if (state.phase === 'company') state.phase = 'start';
  else if (state.phase === 'research') state.phase = state.returnTo || 'start'; // auch zurück in die Bau-Ansicht
  else if (state.mission && state.mission.contract && state.phase !== 'research') state.phase = 'start';
  else state.phase = 'start';
  render();
});

// Raketen-Schritt: Pfeiltasten blättern durchs Karussell, ohne es erst anzuklicken
addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if ((e.target.closest && e.target.closest('input, textarea, select, dialog')) || $('panel').open) return;
  if (state.phase === 'start') { e.preventDefault(); moveLevel(e.key === 'ArrowLeft' ? -1 : 1); return; }
  if (state.phase !== 'build') return;
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
// Der Ton-Knopf selbst zählt nicht, sonst schaltet derselbe Klick die Musik gleich wieder aus. pointerup statt pointerdown: auf Handys gibt erst das Loslassen den Ton frei.
function firstInput(e) {
  if (e.target.closest && e.target.closest('#sound')) return;
  removeEventListener('pointerup', firstInput); removeEventListener('keydown', firstInput);
  if (wantsMusic() && !isPlaying()) { setMusic(true); updateSound(); }
}
addEventListener('pointerup', firstInput); addEventListener('keydown', firstInput);

setLang(getLang(), false);
startSpace($('space'));
render();
