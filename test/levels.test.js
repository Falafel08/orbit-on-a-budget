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
