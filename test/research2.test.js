import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starshipCost, researchCostFor } from '../src/research.js';
import { deltaV } from '../src/logic.js';
import { OWN_STAGES, OWN_STAGES_2 } from '../data/parts.js';

// Starship (Linus 14.11.): Start bei 100 Mio. $, Forschung „Wiederverwendung“ in drei Stufen bis 10 Mio. $
test('Starship costs $100M and gets cheaper with each reuse research tier', () => {
  assert.equal(starshipCost({}), 100);
  assert.equal(starshipCost({ 'ss-reuse-1': true }), 60); // Untergrenze 30 Mio. $, sonst ist Starship immer die beste Wahl (Linus 15.11.)
  assert.equal(starshipCost({ 'ss-reuse-1': true, 'ss-reuse-2': true }), 40);
  assert.equal(starshipCost({ 'ss-reuse-1': true, 'ss-reuse-2': true, 'ss-reuse-3': true }), 30);
});

// Orbiter-2: die eigene Rakete wird groß genug für Stationsmodule (bis 10 t in den Erdorbit, 9,5 km/s)
test('Orbiter-2 can carry a 10 t module to Earth orbit, Orbiter-1 cannot', () => {
  assert.ok(deltaV(OWN_STAGES_2, 10000) >= 9500);
  assert.ok(deltaV(OWN_STAGES, 10000) < 9500);
});

// Forschung kostet Geld (Krisp 13:10): offene Forschung, die einem Ziel hilft, zählt bei der Pleite-Prüfung mit
test('open research that helps a destination adds its money cost', () => {
  const projects = [
    { id: 'refuel', cost: 150, helps: ['moon', 'mars'] },
    { id: 'lunar-ice', cost: 200, helps: ['mars'] },
  ];
  assert.equal(researchCostFor('moon', projects, {}), 150);
  assert.equal(researchCostFor('mars', projects, { refuel: true }), 200);
  assert.equal(researchCostFor('leo', projects, {}), 0);
});
