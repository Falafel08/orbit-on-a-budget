// Kampagne als Raumfahrtfirma ohne DOM: Restgeld bleibt und finanziert den nächsten Auftrag.
import { missionResult } from './logic.js';
// Geld in Mio. US-Dollar.

// Neuer Kontostand nach einem Auftrag: Teile bezahlt die Firma, bei Erfolg zahlt der Kunde.
export function settleContract(cash, result, fee) {
  const after = cash - result.spent + (result.success ? fee : 0);
  return Math.round(after * 1000) / 1000; // auf 1.000 $ genau, sonst sammelt sich Rundungsfehler
}

// Pleite, wenn das Geld nicht mehr für den billigsten möglichen Auftrag reicht
export function isBankrupt(cash, cheapestMission) {
  return cash < cheapestMission;
}

// Billigster erfolgreicher Weg durch eine Mission, über alle angebotenen Teile und die gegebenen Raketen.
// Dient als Pleite-Grenze. Wenige Teile pro Mission, darum reicht Durchprobieren.
// Stationsflug: Das Modul ersetzt den Satelliten. Masse = Modul, Preis = Bau des Moduls.
export const moduleBus = (module) => ({ id: 'module', mass: module.mass, capacity: 0, power: 0, cost: module.cost });

export function cheapestMission(mission, { instruments, buses, panels }, rockets) {
  const ok = (x) => !mission.allowed || mission.allowed.includes(x.id);
  if (mission.module) {
    const m = { ...mission, budget: 1e9 };
    const costs = rockets.filter(ok).map((rocket) => missionResult({ mission: m, instruments: [], bus: moduleBus(mission.module), panel: null, rocket }))
      .filter((r) => r.success).map((r) => r.spent);
    return costs.length ? Math.round(Math.min(...costs) * 100) / 100 : Infinity;
  }
  const ins = instruments.filter(ok), bs = buses.filter(ok), ps = [null, ...panels.filter(ok)], rs = rockets.filter(ok);
  const m = { ...mission, budget: 1e9 }; // kein Limit (Infinity ergäbe NaN bei spent)
  let best = Infinity;
  for (let mask = 1; mask < 1 << ins.length; mask++) {
    const chosen = ins.filter((_, i) => mask & (1 << i));
    for (const bus of bs) for (const panel of ps) for (const rocket of rs) {
      const r = missionResult({ mission: m, instruments: chosen, bus, panel, rocket });
      if (r.success && r.spent < best) best = r.spent;
    }
  }
  return Math.round(best * 100) / 100;
}

// Raketen für ein Ziel (leo = Erdorbit, moon, mars): nur die, die dorthin tragen, mit der Nutzlast für dieses Ziel.
// Starship braucht für Mond und Mars die Forschung „Betankung im Orbit“. Eis vom Mond macht Marsflüge 25 % billiger.
export function rocketsFor(dest, rockets, done) {
  if (dest === 'leo') return rockets.filter((r) => r.maxPayload !== undefined || r.stages);
  return rockets
    .filter((r) => r.capacity && r.capacity[dest] && (!r.needsRefuel || done.refuel))
    .map((r) => ({ ...r, maxPayload: r.capacity[dest], cost: dest === 'mars' && done['lunar-ice'] ? Math.round(r.cost * 0.75 * 10) / 10 : r.cost }));
}

// Auftrag gesperrt, solange die nötige Forschung fehlt
export const contractLocked = (contract, done) => !!contract.requires && !done[contract.requires];

// Wie viel Geld braucht die Firma mindestens, um den Auftrag zu schaffen? Probiert alle sinnvollen Kombinationen
// offener Forschung (hilft diesem Ziel oder ist Pflicht) und nimmt die billigste: Forschungsgeld plus billigster Flug.
// rocketsFn(done) liefert die Raketen bei diesem Forschungsstand (Preise ändern sich mit der Forschung).
export function minCostToFinish(mission, parts, rocketsFn, projects, done) {
  const open = projects.filter((p) => !done[p.id] && ((p.helps && p.helps.includes(mission.dest)) || p.id === mission.requires));
  let best = Infinity;
  for (let mask = 0; mask < 1 << open.length; mask++) {
    const pick = open.filter((_, i) => mask & (1 << i));
    const d = { ...done };
    for (const p of pick) d[p.id] = true;
    if (pick.some((p) => p.needs && !d[p.needs])) continue;          // Voraussetzung fehlt
    if (mission.requires && !d[mission.requires]) continue;           // Pflicht-Forschung fehlt
    const research = pick.reduce((sum, p) => sum + p.cost, 0);
    if (research >= best) continue;
    const flight = cheapestMission(mission, parts, rocketsFn(d));
    best = Math.min(best, research + flight);
  }
  return Math.round(best * 100) / 100;
}
