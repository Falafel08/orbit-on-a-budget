// Meilensteine (Linus 15.11.): Abzeichen für erste Erfolge, jedes genau einmal
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BADGES, newBadges } from '../src/badges.js';

const base = { success: true, stars: 1, level: 1, kind: 'satellite', crew: 0, stationDone: false, reuse: false, dest: 'leo' };

test('Erster erfolgreicher Satellit gibt das erste Abzeichen', () => {
  assert.deepEqual(newBadges(base, []), ['first-sat']);
  assert.deepEqual(newBadges({ ...base, success: false }, []), []);
});

test('Jedes Abzeichen genau einmal', () => {
  assert.deepEqual(newBadges(base, ['first-sat']), []);
});

test('Drei Sterne = unter Budget, Crew an Bord, Station fertig, Wiederverwendung, Mond, Mars', () => {
  assert.ok(newBadges({ ...base, stars: 3 }, ['first-sat']).includes('budget'));
  assert.ok(newBadges({ ...base, kind: 'station', crew: 3 }, ['first-sat']).includes('first-crew'));
  assert.ok(newBadges({ ...base, kind: 'station', stationDone: true }, ['first-sat']).includes('station'));
  assert.ok(newBadges({ ...base, reuse: true }, ['first-sat']).includes('reuse'));
  assert.ok(newBadges({ ...base, kind: 'module', dest: 'moon' }, ['first-sat']).includes('moon'));
  assert.ok(newBadges({ ...base, kind: 'module', dest: 'mars' }, ['first-sat']).includes('mars'));
});

test('Alle Abzeichen haben Namen in beiden Sprachen', () => {
  for (const b of BADGES) { assert.ok(b.en && b.de && b.icon, b.id); }
});
