// Spieldaten. Einträge mit verified: false sind Platzhalter (siehe SOURCES.md).
// Geld in Mio. US-Dollar, Masse in kg, Strom in W, Isp in s, Delta-v in m/s.

// Schwierigkeit = Budget und Mindest-Wissenschaft (Besprechung Sa 14.11.)
export const missions = [
  {
    id: 'cubesat', level: 'Easy', name: 'Student CubeSat',
    goal: 'Get a small CubeSat with a camera into low Earth orbit.',
    budget: 1, minScience: 8,
    requiredDv: 9400, // erdnaher Orbit inkl. Verluste, zu belegen
    verified: false,
  },
  {
    id: 'weather', level: 'Medium', name: 'Weather satellite',
    goal: 'Put a weather satellite into an 800 km orbit.',
    budget: 60, minScience: 55,
    requiredDv: 9500, // zu belegen
    verified: false,
  },
  {
    id: 'weather-tight', level: 'Hard', name: 'Weather satellite, tight budget',
    goal: 'The same weather satellite with less than half the money.',
    budget: 25, minScience: 55,
    requiredDv: 9500, // zu belegen
    verified: false,
  },
];

export const instruments = [
  { id: 'cube-camera', name: 'CubeSat camera', mass: 0.4, power: 2, cost: 0.1, science: 8, verified: false,
    info: 'A small camera that fits inside a CubeSat. It takes pictures of Earth.' },
  { id: 'cube-radiometer', name: 'CubeSat radiometer', mass: 1.2, power: 6, cost: 0.4, science: 15, verified: false,
    info: 'A small sensor that measures how warm the air is.' },
  { id: 'camera', name: 'Imaging camera', mass: 15, power: 40, cost: 3, science: 30, verified: false,
    info: 'Takes pictures of clouds, land and sea.' },
  { id: 'lightning', name: 'Lightning mapper', mass: 25, power: 50, cost: 5, science: 25, verified: false,
    info: 'Counts lightning flashes. Forecasters use it to follow storms.' },
  { id: 'radiometer', name: 'Microwave radiometer', mass: 45, power: 90, cost: 8, science: 45, verified: false,
    info: 'Measures heat from air and water. It works even through clouds.' },
  { id: 'sounder', name: 'Infrared sounder', mass: 60, power: 120, cost: 12, science: 60, verified: false,
    info: 'Measures temperature and humidity at different heights in the air.' },
  { id: 'altimeter', name: 'Radar altimeter', mass: 120, power: 400, cost: 20, science: 80, verified: false,
    info: 'Sends radio pulses down to the sea and times the echo. That gives sea level and wave height.' },
];

// capacity = Masse an Instrumenten, die der Bus tragen kann
// CubeSats: 1U ist ein 10-cm-Würfel mit höchstens 1,33 kg Gesamtmasse (NASA CubeSat 101).
// Aufteilung halb Bus, halb Instrumente ist eine Annahme.
const U = 1.33;
const BUS_INFO = 'The body of the satellite. It holds the instruments and gives them power, a radio and a computer.';
export const buses = [
  { id: 'cube-1u', name: '1U CubeSat', mass: U / 2, capacity: U / 2, power: 2, cost: 0.05, verified: 'mass',
    info: 'A 10 cm cube. ' + BUS_INFO },
  { id: 'cube-3u', name: '3U CubeSat', mass: 3 * U / 2, capacity: 3 * U / 2, power: 7, cost: 0.15, verified: 'mass',
    info: 'Three 10 cm cubes in a row. ' + BUS_INFO },
  { id: 'cube-6u', name: '6U CubeSat', mass: 6 * U / 2, capacity: 6 * U / 2, power: 20, cost: 0.4, verified: 'mass',
    info: 'Six 10 cm cubes. ' + BUS_INFO },
  { id: 'cube-12u', name: '12U CubeSat', mass: 12 * U / 2, capacity: 12 * U / 2, power: 40, cost: 0.9, verified: 'mass',
    info: 'Twelve 10 cm cubes. ' + BUS_INFO },
  { id: 'bus-s', name: 'Small bus', mass: 60, capacity: 40, power: 150, cost: 4, verified: false, info: BUS_INFO },
  { id: 'bus-m', name: 'Medium bus', mass: 300, capacity: 200, power: 800, cost: 15, verified: false, info: BUS_INFO },
  { id: 'bus-l', name: 'Large bus', mass: 1500, capacity: 900, power: 3000, cost: 45, verified: false, info: BUS_INFO },
];

// Stufen von unten nach oben. Mitfluggelegenheit: nur Massengrenze, kein eigenes Delta-v.
export const rockets = [
  {
    id: 'rideshare', name: 'CubeSat rideshare', cost: 0.3, rideshare: true,
    maxPayload: 3 * U, // NASA zahlt bis 300.000 $, meist genug für einen 3U-CubeSat (CubeSat 101)
    verified: true,
    info: 'Your CubeSat flies along on someone else\'s rocket. It is cheap, but it only takes CubeSats up to 3U.',
  },
  {
    id: 'small', name: 'Small launcher', cost: 7.5, verified: false,
    info: 'A rocket of your own. Two stages, made for small satellites.',
    stages: [{ dryMass: 950, propMass: 9250, isp: 311 }, { dryMass: 250, propMass: 2050, isp: 343 }],
  },
  {
    id: 'medium', name: 'Medium launcher', cost: 30, verified: false,
    info: 'A rocket of your own for satellites of a few tonnes.',
    stages: [{ dryMass: 9000, propMass: 120000, isp: 300 }, { dryMass: 1500, propMass: 22000, isp: 345 }],
  },
  {
    id: 'heavy', name: 'Heavy launcher', cost: 70, verified: false,
    info: 'A big rocket for heavy satellites. It is strong but expensive.',
    stages: [{ dryMass: 25000, propMass: 410000, isp: 300 }, { dryMass: 4000, propMass: 105000, isp: 348 }],
  },
];
