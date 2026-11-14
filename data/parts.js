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
    id: 'weather', level: 'Intermediate', name: 'Weather satellite',
    goal: 'Put a weather satellite into an 800 km orbit.',
    budget: 120, minScience: 55,
    requiredDv: 9500, // zu belegen
    verified: false,
  },
  {
    id: 'weather-tight', level: 'Hard', name: 'Weather satellite, tight budget',
    goal: 'The same weather satellite with a third less money.',
    budget: 80, minScience: 55,
    requiredDv: 9500, // zu belegen
    verified: false,
  },
  {
    id: 'free', level: 'Unrestricted', name: 'Free play', free: true,
    goal: 'No budget and no science target. Try out any combination.',
    budget: 100000, minScience: 0,
    requiredDv: 9500,
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

// Gekaufte Raketen: Nutzlast in einen 800-km-Sonnensynchron-Orbit laut NASA Launch Services Program
// (elvperf.ksc.nasa.gov, Abfrage 14.11.2026, Start Vandenberg). Preis = NASA-Gesamtkosten aus Vertragsmeldungen,
// inklusive Leistungen rund um den Start. Mitfluggelegenheit: NASA CubeSat 101.
export const rockets = [
  {
    id: 'rideshare', name: 'CubeSat rideshare', cost: 0.3, rideshare: true,
    maxPayload: 3 * U, // NASA zahlt bis 300.000 $, meist genug für einen 3U-CubeSat (CubeSat 101)
    verified: true,
    info: 'Your CubeSat flies along on someone else\'s rocket. It is cheap, but it only takes CubeSats up to 3U.',
  },
  {
    id: 'pegasus', name: 'Pegasus XL', cost: 56.3, maxPayload: 190,
    verified: true, // 190 kg: NASA LSP; 56,3 Mio. $: NASA, Launch-Vertrag ICON
    info: 'A small rocket launched from under a plane. NASA lists 190 kg to an 800 km orbit.',
  },
  {
    id: 'falcon9', name: 'Falcon 9', cost: 69, maxPayload: 10670,
    verified: true, // 10.670 kg (Booster landet auf Drohnenschiff): NASA LSP; 69 Mio. $: NASA, Launch-Vertrag COSI
    info: 'A large rocket whose first stage lands again and flies once more. NASA lists 10,670 kg to an 800 km orbit.',
  },
];

// Deutsche Namen und Texte, an jeden Datensatz gehängt (tr() in src/i18n.js liest sie)
const BUS_DE = 'Der Körper des Satelliten. Er trägt die Instrumente und gibt ihnen Strom, Funk und einen Computer.';
const DE = {
  cubesat: { name: 'Studenten-CubeSat', goal: 'Bring einen kleinen CubeSat mit Kamera in eine niedrige Erdumlaufbahn.' },
  weather: { name: 'Wettersatellit', goal: 'Bring einen Wettersatelliten in einen Orbit in 800 km Höhe.' },
  'weather-tight': { name: 'Wettersatellit, knappes Budget', goal: 'Derselbe Wettersatellit mit einem Drittel weniger Geld.' },
  free: { name: 'Freies Spiel', goal: 'Kein Budget und kein Wissenschaftsziel. Probier jede Kombination aus.' },
  'cube-camera': { name: 'CubeSat-Kamera', info: 'Eine kleine Kamera, die in einen CubeSat passt. Sie fotografiert die Erde.' },
  'cube-radiometer': { name: 'CubeSat-Radiometer', info: 'Ein kleiner Sensor, der misst, wie warm die Luft ist.' },
  camera: { name: 'Bildkamera', info: 'Fotografiert Wolken, Land und Meer.' },
  lightning: { name: 'Blitzkartierer', info: 'Zählt Blitze. Wetterdienste verfolgen damit Gewitter.' },
  radiometer: { name: 'Mikrowellen-Radiometer', info: 'Misst die Wärme von Luft und Wasser, auch durch Wolken.' },
  sounder: { name: 'Infrarot-Sounder', info: 'Misst Temperatur und Feuchte in verschiedenen Höhen der Luft.' },
  altimeter: { name: 'Radar-Höhenmesser', info: 'Schickt Funkpulse aufs Meer und misst die Zeit bis zum Echo. Daraus ergeben sich Meereshöhe und Wellenhöhe.' },
  'cube-1u': { name: '1U-CubeSat', info: 'Ein Würfel mit 10 cm Kante. ' + BUS_DE },
  'cube-3u': { name: '3U-CubeSat', info: 'Drei 10-cm-Würfel in einer Reihe. ' + BUS_DE },
  'cube-6u': { name: '6U-CubeSat', info: 'Sechs 10-cm-Würfel. ' + BUS_DE },
  'cube-12u': { name: '12U-CubeSat', info: 'Zwölf 10-cm-Würfel. ' + BUS_DE },
  'bus-s': { name: 'Kleiner Bus', info: BUS_DE },
  'bus-m': { name: 'Mittlerer Bus', info: BUS_DE },
  'bus-l': { name: 'Großer Bus', info: BUS_DE },
  rideshare: { name: 'CubeSat-Mitflug', info: 'Dein CubeSat fliegt auf der Rakete von jemand anderem mit. Das ist billig, aber nur für CubeSats bis 3U.' },
  pegasus: { info: 'Eine kleine Rakete, die unter einem Flugzeug startet. Laut NASA trägt sie 190 kg in einen Orbit in 800 km Höhe.' },
  falcon9: { info: 'Eine große Rakete, deren erste Stufe landet und wieder fliegt. Laut NASA trägt sie 10.670 kg in einen Orbit in 800 km Höhe.' },
};
for (const list of [missions, instruments, buses, rockets]) for (const x of list) x.de = DE[x.id];
