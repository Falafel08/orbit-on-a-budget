import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetLeft, deltaV, missionResult, launchOutcome } from '../src/logic.js';

// Budget: Kosten aller gewählten Teile abziehen
test('budget left subtracts the cost of every chosen part', () => {
  const parts = [{ cost: 10 }, { cost: 5.5 }];
  assert.equal(budgetLeft(60, parts), 44.5);
});

// Raketengleichung: dv = Isp * g0 * ln(m0 / m1), Stufen von unten nach oben
test('delta-v of one stage follows the rocket equation', () => {
  const stages = [{ dryMass: 1000, propMass: 9000, isp: 300 }];
  assert.ok(Math.abs(deltaV(stages, 0) - 300 * 9.80665 * Math.log(10)) < 0.01);
});

test('payload and upper stages count as mass for the lower stage', () => {
  const stages = [
    { dryMass: 1000, propMass: 9000, isp: 300 },
    { dryMass: 100, propMass: 900, isp: 300 },
  ];
  const g = 300 * 9.80665;
  const expected = g * Math.log((10000 + 1000 + 100) / (1000 + 1000 + 100)) + g * Math.log(1100 / 200);
  assert.ok(Math.abs(deltaV(stages, 100) - expected) < 0.01);
});

// Ergebnis einer Mission: Orbit, Restbudget, Wissenschaft pro Million
const stage = { dryMass: 1000, propMass: 9000, isp: 450 }; // knapp 10 km/s ohne Nutzlast
const base = {
  mission: { budget: 60, requiredDv: 9400 },
  instruments: [{ cost: 5, mass: 20, power: 30, science: 40 }],
  bus: { cost: 10, mass: 80, power: 100, capacity: 50 },
  rocket: { cost: 20, stages: [stage] },
};

test('a mission within budget, power and delta-v reaches orbit', () => {
  const r = missionResult(base);
  assert.equal(r.reachedOrbit, true);
  assert.equal(r.budgetLeft, 25);
  assert.equal(r.sciencePerMillion, 40 / 35);
  assert.deepEqual(r.problems, []);
});

test('too little delta-v means no orbit', () => {
  const r = missionResult({ ...base, mission: { budget: 60, requiredDv: 20000 } });
  assert.equal(r.reachedOrbit, false);
  assert.ok(r.problems.includes('delta-v'));
});

test('instruments that need more power than the bus gives fail', () => {
  const r = missionResult({ ...base, bus: { ...base.bus, power: 10 } });
  assert.equal(r.reachedOrbit, false);
  assert.ok(r.problems.includes('power'));
});

test('a mission over budget cannot launch', () => {
  const r = missionResult({ ...base, rocket: { ...base.rocket, cost: 100 } });
  assert.equal(r.reachedOrbit, false);
  assert.ok(r.problems.includes('budget'));
});

// Mitfluggelegenheit: kein eigenes Delta-v, nur eine Massengrenze für die Nutzlast
test('a rideshare launch reaches orbit if the satellite is light enough', () => {
  const ride = { cost: 0.3, rideshare: true, maxPayload: 4 };
  const r = missionResult({
    ...base,
    instruments: [{ cost: 0.5, mass: 1, power: 5, science: 10 }],
    bus: { cost: 1, mass: 2, power: 10, capacity: 2 },
    rocket: ride,
  });
  assert.equal(r.reachedOrbit, true);
});

test('a rideshare launch fails if the satellite is too heavy', () => {
  const r = missionResult({ ...base, rocket: { cost: 0.3, rideshare: true, maxPayload: 4 } });
  assert.equal(r.reachedOrbit, false);
  assert.ok(r.problems.includes('rocket-mass'));
});

// Schwierigkeit: eine Mission kann Mindest-Wissenschaft verlangen
test('a mission fails if it brings less science than required', () => {
  const r = missionResult({ ...base, mission: { budget: 60, requiredDv: 9400, minScience: 50 } });
  assert.equal(r.reachedOrbit, true);
  assert.equal(r.success, false);
  assert.ok(r.problems.includes('science'));
});

// Gekaufte Rakete mit NASA-Nutzlast für den Ziel-Orbit: nur Massengrenze, kein eigenes Delta-v
test('a bought rocket reaches orbit if the satellite is within its NASA capacity', () => {
  const r = missionResult({ ...base, rocket: { cost: 20, maxPayload: 190 } });
  assert.equal(r.reachedOrbit, true);
});

test('a bought rocket fails if the satellite is heavier than its capacity', () => {
  const r = missionResult({ ...base, rocket: { cost: 20, maxPayload: 50 } });
  assert.equal(r.reachedOrbit, false);
  assert.ok(r.problems.includes('rocket-mass'));
});

// Solarpanel: bringt Strom, kostet Geld und wiegt etwas (Besprechung Sa 13:10)
test('a solar panel adds power, mass and cost', () => {
  const r = missionResult({
    ...base,
    instruments: [{ cost: 5, mass: 20, power: 130, science: 40 }],
    bus: { cost: 10, mass: 80, power: 0, capacity: 50 },
    panel: { cost: 2, mass: 10, power: 150 },
  });
  assert.equal(r.reachedOrbit, true);
  assert.equal(r.budgetLeft, 23);
  assert.equal(r.payload, 110);
});

test('without enough panel power the instruments cannot run', () => {
  const r = missionResult({
    ...base,
    instruments: [{ cost: 5, mass: 20, power: 130, science: 40 }],
    bus: { cost: 10, mass: 80, power: 0, capacity: 50 },
    panel: { cost: 1, mass: 5, power: 100 },
  });
  assert.ok(r.problems.includes('power'));
});

// Startrisiko: Zufall wird übergeben, damit der Test feste Werte nutzen kann
test('a launch fails when the random roll is above the success rate', () => {
  assert.deepEqual(launchOutcome(0.9, false, () => 0.95), { launched: false, attempts: 1 });
  assert.deepEqual(launchOutcome(0.9, false, () => 0.5), { launched: true, attempts: 1 });
});

test('with insurance a failed launch gets a second try', () => {
  const rolls = [0.95, 0.5];
  assert.deepEqual(launchOutcome(0.9, true, () => rolls.shift()), { launched: true, attempts: 2 });
});

test('insurance costs money from the budget', () => {
  const r = missionResult({ ...base, insurance: 1.6 });
  assert.equal(r.budgetLeft, 23.4);
});

// Busse liefern Strom laut NASA-Katalog RSDO (Ball BCP-Small 100 W bzw. 90 W, BCP-Large 600 W), Linus 15.11.
test('big buses bring their own power, so a satellite without extra panels can work', async () => {
  const { buses, instruments } = await import('../data/parts.js');
  const power = Object.fromEntries(buses.map((b) => [b.id, b.power]));
  assert.deepEqual([power['bus-s'], power['bus-m'], power['bus-l']], [100, 90, 600]);
  const camera = instruments.find((i) => i.id === 'camera');
  const r = missionResult({ mission: { budget: 1000, minScience: 0 }, instruments: [camera], bus: buses.find((b) => b.id === 'bus-s'), panel: null, rocket: { cost: 69, maxPayload: 10670 } });
  assert.ok(!r.problems.includes('power'));
});

// Nebenaufträge (Linus 15.11.): Satelliten anderer Kunden fliegen mit, ihre Masse zählt zur Nutzlast der Rakete
test('side payloads add mass, so a full rocket can no longer reach orbit', () => {
  const base = { mission: { budget: 100, minScience: 0 }, instruments: [], bus: { cost: 1, mass: 100, power: 0, capacity: 10 }, panel: null, rocket: { cost: 10, maxPayload: 500 } };
  assert.equal(missionResult({ ...base, sideMass: 300 }).payload, 400);
  assert.ok(missionResult({ ...base, sideMass: 450 }).problems.includes('rocket-mass'));
});

// Eigene Rakete in kg vergleichbar machen (Linus 15.11.): größte Last, mit der die Rakete noch das nötige Delta-v schafft
test('the payload of your own rocket is the heaviest load that still reaches the needed delta-v', async () => {
  const { maxPayload } = await import('../src/logic.js');
  const { OWN_STAGES, OWN_STAGES_2 } = await import('../data/parts.js');
  const p1 = maxPayload(OWN_STAGES, 9500), p2 = maxPayload(OWN_STAGES_2, 9500);
  assert.ok(p1 > 1400 && p1 < 1700, `Orbiter-1 ${p1}`);
  assert.ok(deltaV(OWN_STAGES, p1) >= 9500 && deltaV(OWN_STAGES, p1 + 10) < 9500);
  assert.ok(p2 > 9000 && p2 < 12000, `Orbiter-2 ${p2}`);
});
