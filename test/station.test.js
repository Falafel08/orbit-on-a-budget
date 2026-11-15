// Level 2: eigene Raumstation (Spec docs/Level2_Station_Spec_v1.md)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newStation, canPlace, place } from '../src/station.js';

test('Kern liegt in der Mitte, daneben ist jedes freie Feld erlaubt', () => {
  const s = newStation('Aurora');
  assert.equal(s.name, 'Aurora');
  assert.deepEqual(s.modules.map((m) => [m.x, m.y, m.type]), [[2, 2, 'core']]);
  for (const [x, y] of [[1, 2], [3, 2], [2, 1], [2, 3]]) assert.equal(canPlace(s, x, y, 'lab').ok, true);
  assert.equal(canPlace(s, 1, 1, 'lab').ok, false, 'schräg ist kein Anschluss');
});

test('Normales Modul hat nur vorne und hinten einen Anschluss, Solar keinen weiteren', () => {
  let s = place(newStation('A'), 3, 2, 'lab'); // Labor rechts vom Kern, Achse waagrecht
  assert.equal(canPlace(s, 4, 2, 'habitat').ok, true, 'hinter dem Labor in Achsrichtung');
  assert.equal(canPlace(s, 3, 1, 'habitat').ok, false, 'seitlich am Labor geht nicht');
  s = place(s, 2, 1, 'solar');
  assert.equal(canPlace(s, 2, 0, 'node').ok, false, 'an Solar hängt nichts');
  assert.equal(canPlace(s, 3, 2, 'node').ok, false, 'belegt');
  assert.equal(canPlace(s, 5, 2, 'node').ok, false, 'außerhalb');
  assert.equal(canPlace(s, 4, 2, 'core').ok, false, 'nur ein Kern');
});

test('Knoten hat vier Anschlüsse', () => {
  const s = place(place(newStation('A'), 3, 2, 'node'), 4, 2, 'lab');
  assert.equal(canPlace(s, 3, 1, 'habitat').ok, true);
  assert.equal(canPlace(s, 3, 3, 'habitat').ok, true);
});

import { stationStats } from '../src/station.js';

test('Werte einer Beispiel-Station: Strom, Betten, Lager, Masse', () => {
  let s = newStation('A');
  s = place(s, 3, 2, 'solar'); s = place(s, 1, 2, 'node'); s = place(s, 0, 2, 'habitat');
  s = place(s, 1, 1, 'lab'); s = place(s, 1, 3, 'storage');
  s = { ...s, robots: ['dextre'] };
  const st = stationStats(s);
  assert.equal(st.power, 5 + 30 - 4 - 8 - 1 - 2); // Kern + Solar − Wohnen − Labor − Lager − Dextre
  assert.equal(st.beds, 3);
  assert.equal(st.storage, 2300);
  assert.equal(st.mass, 6000 + 4000 + 3000 + 9000 + 8000 + 4000 + 1662);
  assert.equal(st.hasLab, true);
});

import { flightCheck, payloadOf } from '../src/station.js';
const F9 = { reliability: 0.997 }, PSLV = { reliability: 0.93 }, ALPHA = { reliability: 0.6 };

test('Crew nur mit Rakete ab 99 % und mit freien Betten, Roboter mit eigener Grenze', () => {
  let s = place(place(newStation('A'), 3, 2, 'solar'), 1, 2, 'habitat');
  assert.equal(flightCheck(s, { kind: 'crew', crew: 3 }, F9).ok, true);
  assert.equal(flightCheck(s, { kind: 'crew', crew: 3 }, PSLV).reason, 'crewUnsafe');
  assert.equal(flightCheck(s, { kind: 'crew', crew: 4 }, F9).reason, 'noBeds');
  assert.equal(flightCheck(s, { kind: 'robot', robot: 'dextre' }, PSLV).ok, true);
  assert.equal(flightCheck(s, { kind: 'robot', robot: 'dextre' }, ALPHA).reason, 'robotUnsafe');
});

test('Ab dem dritten Modul braucht es Crew oder einen Bau-Roboter an Bord', () => {
  const s = place(newStation('A'), 3, 2, 'solar'); // Kern + Solar = zwei Module
  assert.equal(flightCheck(s, { kind: 'module', type: 'lab', x: 1, y: 2 }, F9).reason, 'noBuilder');
  assert.equal(flightCheck({ ...s, robots: ['robonaut'] }, { kind: 'module', type: 'lab', x: 1, y: 2 }, F9).reason, 'noBuilder', 'Robonaut baut nicht');
  assert.equal(flightCheck({ ...s, robots: ['canadarm'] }, { kind: 'module', type: 'lab', x: 1, y: 2 }, F9).ok, true);
  assert.equal(flightCheck({ ...s, crew: 1 }, { kind: 'module', type: 'lab', x: 3, y: 1 }, F9).reason, 'noPort');
});

test('Vorräte nur so viel, wie ins Lager passt; Nutzlast und Preis je Flug', () => {
  const s = newStation('A'); // Kern fasst 300 kg
  assert.equal(flightCheck(s, { kind: 'supplies', kg: 300 }, F9).ok, true);
  assert.equal(flightCheck(s, { kind: 'supplies', kg: 400 }, F9).reason, 'noStorage');
  assert.deepEqual(payloadOf({ kind: 'module', type: 'lab' }), { mass: 8000, cost: 50 });
  assert.deepEqual(payloadOf({ kind: 'crew', crew: 3 }), { mass: 9500, cost: 100 });
  assert.deepEqual(payloadOf({ kind: 'robot', robot: 'dextre' }), { mass: 1662, cost: 60 });
  assert.deepEqual(payloadOf({ kind: 'supplies', kg: 500 }), { mass: 500, cost: 10 });
});

import { applyFlight, endRound, isComplete } from '../src/station.js';

function fullStation() {
  let s = newStation('Aurora');
  s = place(s, 3, 2, 'solar'); s = place(s, 1, 2, 'node'); s = place(s, 0, 2, 'habitat');
  s = place(s, 1, 1, 'lab'); s = place(s, 1, 3, 'storage');
  return s;
}

test('Erfolgreicher Flug ändert die Station', () => {
  let s = applyFlight(newStation('A'), { kind: 'module', type: 'solar', x: 3, y: 2 });
  assert.equal(s.modules.length, 2);
  s = applyFlight(s, { kind: 'robot', robot: 'canadarm' });
  s = applyFlight(s, { kind: 'supplies', kg: 200 });
  s = applyFlight(s, { kind: 'crew', crew: 2 });
  assert.deepEqual([s.robots, s.supplies, s.crew], [['canadarm'], 200, 2]);
});

test('Runde: Crew isst 54 kg pro Person, Labor bringt Punkte nur mit Strom', () => {
  const s = { ...fullStation(), crew: 3, supplies: 500, robots: ['robonaut'] };
  const r = endRound(s);
  assert.equal(r.station.supplies, 500 - 3 * 54);
  assert.equal(r.rp, 3 * 6 + 3);
  assert.equal(r.rescue, false);
  const dark = { ...s, modules: s.modules.filter((m) => m.type !== 'solar') }; // ohne Solar: Strom negativ
  assert.equal(endRound(dark).rp, 0);
  assert.equal(endRound(dark).noPower, true);
});

test('Zu wenig Vorräte: Notrückkehr, Crew weg, Kosten', () => {
  const r = endRound({ ...fullStation(), crew: 3, supplies: 100 });
  assert.equal(r.rescue, true);
  assert.equal(r.station.crew, 0);
  assert.equal(r.station.supplies, 0);
  assert.equal(r.cost, 120);
});

test('Station fertig mit allen Modularten, Crew von 3, Strom und Vorräten für die nächste Runde', () => {
  const s = { ...fullStation(), crew: 3, supplies: 162 };
  assert.equal(isComplete(s), true);
  assert.equal(isComplete({ ...s, crew: 2 }), false);
  assert.equal(isComplete({ ...s, supplies: 161 }), false);
  assert.equal(isComplete({ ...s, modules: s.modules.filter((m) => m.type !== 'storage') }), false);
});
