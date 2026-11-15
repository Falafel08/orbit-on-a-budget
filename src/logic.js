// Spiellogik ohne DOM. Geld in Millionen US-Dollar, Masse in kg, Strom in W.

export function budgetLeft(budget, parts) {
  return parts.reduce((left, p) => left - p.cost, budget);
}

const G0 = 9.80665; // Erdbeschleunigung in m/s², Standardwert für den spezifischen Impuls

// Delta-v einer Rakete aus Stufen (unterste zuerst) mit Nutzlast, in m/s
export function deltaV(stages, payloadMass) {
  let dv = 0;
  for (let i = 0; i < stages.length; i++) {
    const above = stages.slice(i + 1).reduce((m, s) => m + s.dryMass + s.propMass, 0) + payloadMass;
    const m0 = stages[i].dryMass + stages[i].propMass + above;
    const m1 = stages[i].dryMass + above;
    dv += stages[i].isp * G0 * Math.log(m0 / m1);
  }
  return dv;
}

// Prüft eine geplante Mission. problems nennt jeden Grund fürs Scheitern.
export function missionResult({ mission, instruments, bus, panel, rocket, insurance = 0, sideMass = 0 }) {
  // Solarpanel ist freiwillig: ohne Panel zählt nur der Strom des Busses. Versicherung zählt wie ein Teil.
  const parts = [...instruments, bus, panel, rocket, insurance ? { cost: insurance } : null].filter(Boolean);
  const left = budgetLeft(mission.budget, parts);
  const spent = mission.budget - left;
  const instMass = instruments.reduce((m, i) => m + i.mass, 0);
  const instPower = instruments.reduce((p, i) => p + i.power, 0);
  const science = instruments.reduce((s, i) => s + i.science, 0);
  const powerAvailable = (bus.power || 0) + (panel ? panel.power : 0);
  const payload = bus.mass + instMass + (panel ? panel.mass : 0) + sideMass; // Nebenaufträge fliegen mit
  // Gekaufte Rakete oder Mitfluggelegenheit: Nutzlast laut NASA für den Ziel-Orbit.
  // Selbst gebaute Rakete (stages): Delta-v aus der Raketengleichung.
  const bySpec = rocket.maxPayload !== undefined;
  const dv = bySpec ? null : deltaV(rocket.stages, payload);

  const problems = [];
  if (left < 0) problems.push('budget');
  if (instPower > powerAvailable) problems.push('power');
  if (instMass > bus.capacity) problems.push('capacity');
  if (bySpec && payload > rocket.maxPayload) problems.push('rocket-mass');
  if (!bySpec && dv < mission.requiredDv) problems.push('delta-v');

  const reachedOrbit = problems.length === 0;
  // Erfolg: Orbit erreicht und genug Wissenschaft für die Schwierigkeit
  if (reachedOrbit && science < (mission.minScience ?? 0)) problems.push('science');
  const success = problems.length === 0;
  return {
    reachedOrbit,
    success,
    budgetLeft: left,
    spent,
    payload,
    deltaV: dv,
    science,
    sciencePerMillion: success && spent > 0 ? science / spent : 0,
    problems,
  };
}

// Ergebnis des Starts: Erfolg, wenn der Zufallswert unter der Erfolgsquote liegt.
// Mit Versicherung bezahlt die Versicherung einen zweiten Start.
export function launchOutcome(reliability, insured, rng = Math.random) {
  if (rng() < reliability) return { launched: true, attempts: 1 };
  if (insured && rng() < reliability) return { launched: true, attempts: 2 };
  return { launched: false, attempts: insured ? 2 : 1 };
}

// Größte Nutzlast in kg, mit der die Stufen noch requiredDv schaffen (Halbierungssuche, auf 10 kg genau abgerundet)
export function maxPayload(stages, requiredDv) {
  if (deltaV(stages, 0) < requiredDv) return 0;
  let lo = 0, hi = 1000000;
  while (hi - lo > 1) { const mid = (lo + hi) / 2; if (deltaV(stages, mid) >= requiredDv) lo = mid; else hi = mid; }
  return Math.floor(lo / 10) * 10;
}
