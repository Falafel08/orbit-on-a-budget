import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetLeft, deltaV, missionResult } from '../src/logic.js';

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
  assert.ok(r.problems.includes('rideshare-mass'));
});

// Schwierigkeit: eine Mission kann Mindest-Wissenschaft verlangen
test('a mission fails if it brings less science than required', () => {
  const r = missionResult({ ...base, mission: { budget: 60, requiredDv: 9400, minScience: 50 } });
  assert.equal(r.reachedOrbit, true);
  assert.equal(r.success, false);
  assert.ok(r.problems.includes('science'));
});
