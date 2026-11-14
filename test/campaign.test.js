import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleContract, isBankrupt } from '../src/campaign.js';

// Kampagne: die Firma zahlt die Teile, der Kunde zahlt bei Erfolg den Auftragspreis
test('a successful contract pays the client fee minus what you spent', () => {
  assert.equal(settleContract(100, { success: true, spent: 70 }, 130), 160);
});

test('a failed contract only costs money', () => {
  assert.equal(settleContract(100, { success: false, spent: 70 }, 130), 30);
});

// Pleite: Die Firma kann den billigsten Weg in den Orbit nicht mehr bezahlen
test('the company is bankrupt when it cannot pay the cheapest mission', () => {
  assert.equal(isBankrupt(0.4, 0.47), true);
  assert.equal(isBankrupt(0.5, 0.47), false);
});

// Pleite-Grenze wird aus den verfügbaren Raketen berechnet, nicht fest eingetragen.
// Mit Starship (10 Mio. $) wird der Wetter-Auftrag viel billiger als mit Pegasus.
test('the cheapest way to finish a contract depends on the rockets you can book', async () => {
  const { cheapestMission } = await import('../src/campaign.js');
  const P = await import('../data/parts.js');
  const weather = { ...P.missions.find((m) => m.id === 'weather'), minScience: 55 };
  assert.equal(cheapestMission(weather, P, P.rockets), 69.3);
  assert.equal(cheapestMission(weather, P, [...P.rockets, { ...P.starship, cost: 10 }]), 23); // Starship nach voller Forschung
});

// Level 2 Raumstation: Jeder Flug bringt ein festes Modul. Billigster Weg = Modul + billigste Rakete, die es trägt.
test('a station flight costs the module plus the cheapest rocket that can carry it', async () => {
  const { cheapestMission } = await import('../src/campaign.js');
  const P = await import('../data/parts.js');
  const flight = { allowed: ['pegasus', 'falcon9', 'starship'], minScience: 0, requiredDv: 9500, module: { mass: 6000, cost: 40 } };
  assert.equal(cheapestMission(flight, P, P.rockets), 109);
  assert.equal(cheapestMission(flight, P, [...P.rockets, { ...P.starship, cost: 10 }]), 50);
});
