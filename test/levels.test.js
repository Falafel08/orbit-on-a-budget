import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rocketsFor, contractLocked } from '../src/campaign.js';
import { rockets, falconHeavy, sls, starship } from '../data/parts.js';

const all = [...rockets, falconHeavy, sls, starship];
const byId = (list) => Object.fromEntries(list.map((r) => [r.id, r]));

// Mond: nur Raketen, die bis zum Mond tragen. Nutzlast je Ziel (SLS laut NASA über 27 t zum Mond).
test('to the Moon only rockets that can reach it are offered, with their Moon payload', () => {
  const r = byId(rocketsFor('moon', all, {}));
  assert.equal(r.falcon9, undefined);
  assert.equal(r.pegasus, undefined);
  assert.equal(r.falconHeavy.maxPayload, 16800);
  assert.equal(r.sls.maxPayload, 27000);
});

// Starship fliegt nur mit Betankung im Orbit zum Mond oder Mars (Forschung auf der Raumstation)
test('Starship needs orbital refueling research to fly beyond Earth orbit', () => {
  assert.equal(byId(rocketsFor('moon', all, {})).starship, undefined);
  assert.equal(byId(rocketsFor('moon', all, { refuel: true })).starship.maxPayload, 100000);
});

// Eis vom Mond wird Treibstoff: Flüge zum Mars werden 25 % billiger
test('lunar ice research makes Mars launches 25 percent cheaper', () => {
  assert.equal(byId(rocketsFor('mars', all, {})).falconHeavy.cost, 178);
  assert.equal(byId(rocketsFor('mars', all, { 'lunar-ice': true })).falconHeavy.cost, 133.5);
});

// Erdorbit: alles wie bisher
test('in Earth orbit rockets keep their NASA payload for 800 km', () => {
  assert.equal(byId(rocketsFor('leo', all, {})).falcon9.maxPayload, 10670);
});

// Die bemannte Marslandung braucht Treibstoff vom Mars für den Rückflug
test('a contract that needs research stays locked until it is done', () => {
  assert.equal(contractLocked({ requires: 'mars-fuel' }, {}), true);
  assert.equal(contractLocked({ requires: 'mars-fuel' }, { 'mars-fuel': true }), false);
  assert.equal(contractLocked({}, {}), false);
});

// Pleite-Prüfung (Fund Code-Review 14.11.): billigster Weg über alle sinnvollen Forschungs-Kombinationen,
// Forschung kostet Geld. Mond-Wohnmodul (20 t), nur Starship-Wiederverwendung I erforscht:
// Betankung 150 + Starship 60 + Modul 300 = 510 (nicht 2.500 mit SLS und nicht „alles erforschen“).
test('the cheapest way to finish counts only the research a path needs', async () => {
  const { minCostToFinish } = await import('../src/campaign.js');
  const { starshipCost } = await import('../src/research.js');
  const P = await import('../data/parts.js');
  const projects = [
    { id: 'refuel', cost: 150, helps: ['moon', 'mars'] },
    { id: 'ss-reuse-1', cost: 100, helps: ['leo', 'moon', 'mars'] },
    { id: 'ss-reuse-2', cost: 100, needs: 'ss-reuse-1', helps: ['leo', 'moon', 'mars'] },
    { id: 'mars-fuel', cost: 300, helps: ['mars'] },
  ];
  const rocketsWith = (dest, d) => rocketsFor(dest, [...P.rockets, { ...P.starship, cost: starshipCost(d) }, P.falconHeavy, P.sls], d);
  const habitat = { minScience: 0, requiredDv: 9500, module: { mass: 20000, cost: 300 }, dest: 'moon' };
  assert.equal(minCostToFinish(habitat, P, (d) => rocketsWith('moon', d), projects, { 'ss-reuse-1': true }), 510);
  // Gesperrter Auftrag: die nötige Forschung zählt immer mit
  const crew = { minScience: 0, requiredDv: 9500, module: { mass: 50000, cost: 800 }, dest: 'mars', requires: 'mars-fuel' };
  assert.equal(minCostToFinish(crew, P, (d) => rocketsWith('mars', d), projects, { refuel: true, 'ss-reuse-1': true, 'ss-reuse-2': true }), 300 + 40 + 800);
});
