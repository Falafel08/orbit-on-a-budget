// Kampagne als Raumfahrtfirma ohne DOM: Restgeld bleibt und finanziert den nächsten Auftrag.
import { missionResult } from './logic.js';
// Geld in Mio. US-Dollar.

// Neuer Kontostand nach einem Auftrag: Teile bezahlt die Firma, bei Erfolg zahlt der Kunde.
export function settleContract(cash, result, fee) {
  const after = cash - result.spent + (result.success ? fee : 0);
  return Math.round(after * 10) / 10;
}

// Pleite, wenn das Geld nicht mehr für den billigsten möglichen Auftrag reicht
export function isBankrupt(cash, cheapestMission) {
  return cash < cheapestMission;
}

// Billigster erfolgreicher Weg durch eine Mission, über alle angebotenen Teile und die gegebenen Raketen.
// Dient als Pleite-Grenze. Wenige Teile pro Mission, darum reicht Durchprobieren.
export function cheapestMission(mission, { instruments, buses, panels }, rockets) {
  const ok = (x) => !mission.allowed || mission.allowed.includes(x.id);
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
