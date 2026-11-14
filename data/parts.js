// Spieldaten. STAND: Platzhalter-Klassen, noch keine NASA-Daten.
// Jeder Eintrag mit verified: false wird durch belegte Zahlen ersetzt (siehe SOURCES.md).
// Geld in Mio. US-Dollar, Masse in kg, Strom in W, Isp in s, Delta-v in m/s.

export const missions = [
  {
    id: 'weather',
    name: 'Weather satellite',
    goal: 'Put a weather satellite into an 800 km orbit.',
    budget: 60,
    requiredDv: 9500, // erdnaher Orbit inkl. Verluste, zu belegen
    verified: false,
  },
  {
    id: 'cubesat',
    name: 'Student CubeSat',
    goal: 'Get a small CubeSat into low Earth orbit for under $1M.',
    budget: 1,
    requiredDv: 9400, // erdnaher Orbit inkl. Verluste, zu belegen
    verified: false,
  },
];

export const instruments = [
  { id: 'cube-camera', name: 'CubeSat camera', mass: 0.4, power: 2, cost: 0.1, science: 8, verified: false },
  { id: 'cube-radiometer', name: 'CubeSat radiometer', mass: 1.2, power: 6, cost: 0.4, science: 15, verified: false },
  { id: 'camera', name: 'Imaging camera', mass: 15, power: 40, cost: 3, science: 30, verified: false },
  { id: 'lightning', name: 'Lightning mapper', mass: 25, power: 50, cost: 5, science: 25, verified: false },
  { id: 'radiometer', name: 'Microwave radiometer', mass: 45, power: 90, cost: 8, science: 45, verified: false },
  { id: 'sounder', name: 'Infrared sounder', mass: 60, power: 120, cost: 12, science: 60, verified: false },
  { id: 'altimeter', name: 'Radar altimeter', mass: 120, power: 400, cost: 20, science: 80, verified: false },
];

// capacity = Masse an Instrumenten, die der Bus tragen kann
// CubeSats: 1U ist ein 10-cm-Würfel mit höchstens 1,33 kg Gesamtmasse (NASA CubeSat 101).
// Aufteilung halb Bus, halb Instrumente ist eine Annahme.
const U = 1.33;
export const buses = [
  { id: 'cube-1u', name: '1U CubeSat', mass: U / 2, capacity: U / 2, power: 2, cost: 0.05, verified: 'mass' },
  { id: 'cube-3u', name: '3U CubeSat', mass: 3 * U / 2, capacity: 3 * U / 2, power: 7, cost: 0.15, verified: 'mass' },
  { id: 'cube-6u', name: '6U CubeSat', mass: 6 * U / 2, capacity: 6 * U / 2, power: 20, cost: 0.4, verified: 'mass' },
  { id: 'cube-12u', name: '12U CubeSat', mass: 12 * U / 2, capacity: 12 * U / 2, power: 40, cost: 0.9, verified: 'mass' },
  { id: 'bus-s', name: 'Small bus', mass: 60, capacity: 40, power: 150, cost: 4, verified: false },
  { id: 'bus-m', name: 'Medium bus', mass: 300, capacity: 200, power: 800, cost: 15, verified: false },
  { id: 'bus-l', name: 'Large bus', mass: 1500, capacity: 900, power: 3000, cost: 45, verified: false },
];

// Stufen von unten nach oben. Mitfluggelegenheit: nur Massengrenze, kein eigenes Delta-v.
export const rockets = [
  {
    id: 'rideshare', name: 'CubeSat rideshare', cost: 0.3, rideshare: true,
    maxPayload: 3 * U, // NASA zahlt bis 300.000 $, meist genug für einen 3U-CubeSat (CubeSat 101)
    verified: true,
  },
  {
    id: 'small', name: 'Small launcher', cost: 7.5, verified: false,
    stages: [{ dryMass: 950, propMass: 9250, isp: 311 }, { dryMass: 250, propMass: 2050, isp: 343 }],
  },
  {
    id: 'medium', name: 'Medium launcher', cost: 30, verified: false,
    stages: [{ dryMass: 9000, propMass: 120000, isp: 300 }, { dryMass: 1500, propMass: 22000, isp: 345 }],
  },
  {
    id: 'heavy', name: 'Heavy launcher', cost: 70, verified: false,
    stages: [{ dryMass: 25000, propMass: 410000, isp: 300 }, { dryMass: 4000, propMass: 105000, isp: 348 }],
  },
];
