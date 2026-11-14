import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointsForMission, ownRocketCost, ownRocketReliability } from '../src/research.js';

// Research Points: eine erfolgreiche Mission bringt Punkte nach Wissenschaft, freies Spiel bringt nichts
test('a successful mission earns research points from its science', () => {
  assert.equal(pointsForMission({ success: true, science: 125 }, { free: false }), 25);
});

test('free play and failed missions earn no research points', () => {
  assert.equal(pointsForMission({ success: true, science: 125 }, { free: true }), 0);
  assert.equal(pointsForMission({ success: false, science: 125 }, { free: false }), 0);
});

// Eigene Rakete: erst teuer, mit jedem Flug billiger, nie unter 40 % des ersten Preises
test('your own rocket gets cheaper with every flight down to a floor', () => {
  assert.equal(ownRocketCost(0, false), 90);
  assert.equal(ownRocketCost(1, false), 76.5);
  assert.equal(ownRocketCost(50, false), 36);
});

// Wiederverwendbarer Booster senkt den Preis zusätzlich um 40 %
test('a reusable booster makes every flight 40 percent cheaper', () => {
  assert.equal(ownRocketCost(0, true), 54);
});

// Kein Punkte-Sammeln durch Wiederholen: nur ein neuer Bestwert bringt Punkte
test('repeating a mission without beating your best earns no points', () => {
  assert.equal(pointsForMission({ success: true, science: 125, sciencePerMillion: 1.1 }, { free: false }, 1.1), 0);
  assert.equal(pointsForMission({ success: true, science: 125, sciencePerMillion: 1.2 }, { free: false }, 1.1), 25);
});

test('your own rocket gets more reliable with every flight', () => {
  assert.equal(ownRocketReliability(0), 0.7);
  assert.equal(ownRocketReliability(2), 0.8);
  assert.equal(ownRocketReliability(20), 0.97);
});
