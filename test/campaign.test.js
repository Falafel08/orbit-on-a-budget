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
