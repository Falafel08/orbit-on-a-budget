import {
  MODULES, ROBOTS, CAPSULE, CREW_MIN_RELIABILITY, ROBOT_MIN_RELIABILITY, STATION_MAX_MASS, SUPPLY_COST_PER_KG, FOOD_PER_PERSON_DAY, ROUND_DAYS, CREW_RP, RESCUE_COST,
} from '../data/station.js';

// Level 2: eigene Raumstation, Rechenlogik ohne DOM (Spec docs/Level2_Station_Spec_v1.md).
// Raster 5 × 5, Kern in der Mitte. Kern und Knoten haben 4 Anschlüsse, normale Module 2 (in ihrer Achse), Solar 1.
export const GRID = 5;
const MID = 2;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ALL_PORTS = new Set(['core', 'node']);

export function newStation(name) {
  return { name, modules: [{ x: MID, y: MID, type: 'core', axis: null }], crew: 0, robots: [], supplies: 0 };
}

const at = (s, x, y) => s.modules.find((m) => m.x === x && m.y === y);

// Hat Modul m einen Anschluss in Richtung (dx, dy)?
function hasPort(m, dx, dy) {
  if (ALL_PORTS.has(m.type)) return true;
  if (m.type === 'solar') return false; // Solar ist ein Ende, daran hängt nichts
  return m.axis === (dx !== 0 ? 'h' : 'v');
}

// Darf ein Modul vom Typ type auf (x, y)? Antwort mit Grund, damit das Spiel ihn zeigen kann.
export function canPlace(s, x, y, type) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return { ok: false, reason: 'outside' };
  if (at(s, x, y)) return { ok: false, reason: 'taken' };
  if (type === 'core') return { ok: false, reason: 'oneCore' };
  const parent = DIRS.map(([dx, dy]) => ({ m: at(s, x - dx, y - dy), dx, dy })).find((p) => p.m && hasPort(p.m, p.dx, p.dy));
  return parent ? { ok: true, axis: parent.dx !== 0 ? 'h' : 'v' } : { ok: false, reason: 'noPort' };
}

// Neue Station mit dem Modul; die Achse folgt dem Anschluss, an dem es andockt
export function place(s, x, y, type) {
  const c = canPlace(s, x, y, type);
  if (!c.ok) throw new Error(`cannot place ${type} at ${x},${y}: ${c.reason}`);
  return { ...s, modules: [...s.modules, { x, y, type, axis: c.axis }] };
}

// Summen der Station: Strom (kW), Betten, Lager (kg), Masse (kg), ob ein Labor da ist
export function stationStats(s) {
  const mods = s.modules.map((m) => MODULES[m.type]);
  const bots = (s.robots || []).map((id) => ROBOTS.find((r) => r.id === id));
  const sum = (list, k) => list.reduce((a, x) => a + x[k], 0);
  return {
    power: Math.round((sum(mods, 'power') - sum(bots, 'power')) * 10) / 10,
    beds: sum(mods, 'beds'), storage: sum(mods, 'storage'),
    mass: sum(mods, 'mass') + sum(bots, 'mass'), hasLab: mods.some((m) => m.lab),
  };
}

// Was ein Flug mitnimmt: Masse (kg) und Preis der Nutzlast ohne Rakete (Mio. $)
export function payloadOf(f) {
  if (f.kind === 'module') return { mass: MODULES[f.type].mass, cost: MODULES[f.type].cost };
  if (f.kind === 'crew') return { mass: CAPSULE.mass, cost: CAPSULE.cost };
  if (f.kind === 'robot') { const r = ROBOTS.find((x) => x.id === f.robot); return { mass: r.mass, cost: r.cost }; }
  return { mass: f.kg, cost: Math.round(f.kg * SUPPLY_COST_PER_KG * 1000) / 1000 };
}

// Darf der Flug starten? Grund als Schlüssel für den Text im Spiel.
export function flightCheck(s, f, rocket) {
  const st = stationStats(s);
  const no = (reason) => ({ ok: false, reason });
  if (f.kind === 'crew') {
    if (rocket.reliability < CREW_MIN_RELIABILITY) return no('crewUnsafe');
    if ((s.crew || 0) + f.crew > st.beds) return no('noBeds');
  } else if (f.kind === 'robot') {
    if (rocket.reliability < ROBOT_MIN_RELIABILITY) return no('robotUnsafe');
  } else if (f.kind === 'module') {
    const c = canPlace(s, f.x, f.y, f.type);
    if (!c.ok) return no(c.reason);
    const builder = (s.crew || 0) > 0 || (s.robots || []).some((id) => ROBOTS.find((r) => r.id === id).assemble);
    if (s.modules.length >= 2 && !builder) return no('noBuilder');
    if (st.mass + MODULES[f.type].mass > STATION_MAX_MASS) return no('tooHeavy');
  } else if (f.kind === 'supplies') {
    if ((s.supplies || 0) + f.kg > st.storage) return no('noStorage');
  }
  return { ok: true };
}

// Nach einem erfolgreichen Flug: Modul, Crew, Roboter oder Vorräte sind an Bord
export function applyFlight(s, f) {
  if (f.kind === 'module') return place(s, f.x, f.y, f.type);
  if (f.kind === 'crew') return { ...s, crew: (s.crew || 0) + f.crew };
  if (f.kind === 'robot') return { ...s, robots: [...(s.robots || []), f.robot] };
  return { ...s, supplies: (s.supplies || 0) + f.kg };
}

// Eine Runde (30 Tage): Crew isst, Labor forscht nur mit Strom. Reichen die Vorräte nicht, kehrt die Crew mit dem Rettungsboot zurück.
export const foodPerRound = (crew) => Math.round(crew * FOOD_PER_PERSON_DAY * ROUND_DAYS);
export function endRound(s) {
  const st = stationStats(s), need = foodPerRound(s.crew || 0);
  const noPower = st.power < 0;
  if ((s.supplies || 0) < need) {
    return { station: { ...s, crew: 0, supplies: 0 }, rp: 0, rescue: true, cost: RESCUE_COST, noPower };
  }
  const bots = (s.robots || []).reduce((a, id) => a + ROBOTS.find((r) => r.id === id).rp, 0);
  const rp = st.hasLab && !noPower ? (s.crew || 0) * CREW_RP + bots : 0;
  return { station: { ...s, supplies: (s.supplies || 0) - need }, rp, rescue: false, cost: 0, noPower };
}

// Fertig: alle Modularten, Crew von 3, Strom nicht negativ, Vorräte für die nächste Runde
const NEEDED = ['core', 'solar', 'lab', 'habitat', 'storage'];
export function isComplete(s) {
  const types = new Set(s.modules.map((m) => m.type));
  return NEEDED.every((t) => types.has(t)) && (s.crew || 0) >= 3 && stationStats(s).power >= 0 && (s.supplies || 0) >= foodPerRound(3);
}
