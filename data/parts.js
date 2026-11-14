// Spieldaten. Einträge mit verified: false sind Platzhalter (siehe SOURCES.md).
// Geld in Mio. US-Dollar, Masse in kg, Strom in W, Isp in s, Delta-v in m/s.

// Schwierigkeit = Budget und Mindest-Wissenschaft (Besprechung Sa 14.11.)
// Jede Stufe ist eine eigene Mission mit eigenen Teilen (Besprechung Sa 13:10).
// allowed: welche Teile die Mission anbietet. Freies Spiel: alle Teile.
export const missions = [
  {
    id: 'cubesat', level: 'Easy', name: 'Student CubeSat',
    goal: 'Get a small CubeSat with a camera into low Earth orbit.',
    budget: 1, minScience: 8, requiredDv: 9400, verified: false,
    allowed: ['cube-camera', 'cube-radiometer', 'cube-1u', 'cube-3u', 'cube-6u', 'panel-body', 'panel-deploy', 'rideshare'],
  },
  {
    id: 'weather', level: 'Intermediate', name: 'Weather satellite',
    goal: 'Put a weather satellite into an 800 km orbit to watch clouds and storms.',
    budget: 120, minScience: 55, requiredDv: 9500, verified: false,
    allowed: ['camera', 'lightning', 'radiometer', 'sounder', 'bus-s', 'bus-m', 'panel-s', 'panel-m', 'pegasus', 'falcon9', 'own'],
  },
  {
    id: 'ocean', level: 'Hard', name: 'Ocean satellite',
    goal: 'Measure sea level from an 800 km orbit. The radar needs a lot of power.',
    budget: 120, minScience: 125, requiredDv: 9500, verified: false,
    allowed: ['camera', 'radiometer', 'sounder', 'altimeter', 'bus-s', 'bus-m', 'bus-l', 'panel-s', 'panel-m', 'panel-l', 'pegasus', 'falcon9', 'own'],
  },
  {
    id: 'free', level: 'Unrestricted', name: 'Free play', free: true,
    goal: 'No budget and no science target. Try out any combination.',
    budget: 100000, minScience: 0, requiredDv: 9500, verified: false,
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
  { id: 'cube-1u', name: '1U CubeSat', mass: U / 2, capacity: U / 2, power: 0, cost: 0.05, verified: 'mass',
    info: 'A 10 cm cube. ' + BUS_INFO },
  { id: 'cube-3u', name: '3U CubeSat', mass: 3 * U / 2, capacity: 3 * U / 2, power: 0, cost: 0.15, verified: 'mass',
    info: 'Three 10 cm cubes in a row. ' + BUS_INFO },
  { id: 'cube-6u', name: '6U CubeSat', mass: 6 * U / 2, capacity: 6 * U / 2, power: 0, cost: 0.4, verified: 'mass',
    info: 'Six 10 cm cubes. ' + BUS_INFO },
  { id: 'cube-12u', name: '12U CubeSat', mass: 12 * U / 2, capacity: 12 * U / 2, power: 0, cost: 0.9, verified: 'mass',
    info: 'Twelve 10 cm cubes. ' + BUS_INFO },
  { id: 'bus-s', name: 'Small bus', mass: 60, capacity: 40, power: 0, cost: 4, verified: false, info: BUS_INFO },
  { id: 'bus-m', name: 'Medium bus', mass: 300, capacity: 200, power: 0, cost: 15, verified: false, info: BUS_INFO },
  { id: 'bus-l', name: 'Large bus', mass: 1500, capacity: 900, power: 0, cost: 45, verified: false, info: BUS_INFO },
];

// Solarpanels: Strom für die Instrumente. Werte sind Spiel-Annahmen (verified: false).
export const panels = [
  { id: 'panel-body', name: 'Body solar cells', mass: 0.1, power: 2, cost: 0.02, verified: false,
    info: 'Solar cells glued onto the sides of the CubeSat. Light and cheap, but little power.' },
  { id: 'panel-deploy', name: 'Fold-out CubeSat panels', mass: 0.3, power: 8, cost: 0.06, verified: false,
    info: 'Small wings that fold out in orbit. Four times the power of body cells.' },
  { id: 'panel-s', name: 'Small solar wing', mass: 8, power: 150, cost: 1, verified: false,
    info: 'One small wing. Enough for a camera and a lightning mapper.' },
  { id: 'panel-m', name: 'Medium solar wings', mass: 25, power: 500, cost: 3, verified: false,
    info: 'Two wings. Enough for most weather instruments.' },
  { id: 'panel-l', name: 'Large solar wings', mass: 70, power: 1500, cost: 8, verified: false,
    info: 'Two big wings for power-hungry instruments like a radar.' },
];

// Gekaufte Raketen: Nutzlast in einen 800-km-Sonnensynchron-Orbit laut NASA Launch Services Program
// (elvperf.ksc.nasa.gov, Abfrage 14.11.2026, Start Vandenberg). Preis = NASA-Gesamtkosten aus Vertragsmeldungen,
// inklusive Leistungen rund um den Start. Mitfluggelegenheit: NASA CubeSat 101.
export const rockets = [
  {
    id: 'rideshare', name: 'CubeSat rideshare', cost: 0.3, rideshare: true, reliability: 0.95, // Quote: Spiel-Annahme
    maxPayload: 3 * U, // NASA zahlt bis 300.000 $, meist genug für einen 3U-CubeSat (CubeSat 101)
    verified: true,
    info: 'Your CubeSat flies along on someone else\'s rocket. It is cheap, but it only takes CubeSats up to 3U.',
  },
  {
    id: 'pegasus', name: 'Pegasus XL', cost: 56.3, maxPayload: 190, reliability: 0.9, // 27 von 30 Starts erfolgreich
    verified: true, // 190 kg: NASA LSP; 56,3 Mio. $: NASA, Launch-Vertrag ICON
    info: 'A small rocket launched from under a plane. NASA lists 190 kg to an 800 km orbit.',
  },
  {
    id: 'falcon9', name: 'Falcon 9', cost: 69, maxPayload: 10670, reliability: 0.996, // etwa 2 Fehlstarts in über 600 Flügen
    verified: true, // 10.670 kg (Booster landet auf Drohnenschiff): NASA LSP; 69 Mio. $: NASA, Launch-Vertrag COSI
    info: 'A large rocket whose first stage lands again and flies once more. NASA lists 10,670 kg to an 800 km orbit.',
  },
];

// Deutsche Namen und Texte, an jeden Datensatz gehängt (tr() in src/i18n.js liest sie)
const BUS_DE = 'Der Körper des Satelliten. Er trägt die Instrumente und gibt ihnen Strom, Funk und einen Computer.';
const DE = {
  cubesat: { name: 'Studenten-CubeSat', goal: 'Bring einen kleinen CubeSat mit Kamera in eine niedrige Erdumlaufbahn.' },
  weather: { name: 'Wettersatellit', goal: 'Bring einen Wettersatelliten in einen Orbit in 800 km Höhe, um Wolken und Gewitter zu beobachten.' },
  'panel-body': { name: 'Solarzellen am Gehäuse', info: 'Solarzellen direkt auf den Seiten des CubeSats. Leicht und billig, aber wenig Strom.' },
  'panel-deploy': { name: 'Klapp-Panels für CubeSats', info: 'Kleine Flügel, die sich im Orbit aufklappen. Viermal so viel Strom wie Zellen am Gehäuse.' },
  'panel-s': { name: 'Kleiner Solarflügel', info: 'Ein kleiner Flügel. Reicht für eine Kamera und einen Blitzkartierer.' },
  'panel-m': { name: 'Mittlere Solarflügel', info: 'Zwei Flügel. Reicht für die meisten Wetter-Instrumente.' },
  'panel-l': { name: 'Große Solarflügel', info: 'Zwei große Flügel für Instrumente mit viel Strombedarf wie ein Radar.' },
  ocean: { name: 'Ozean-Satellit', goal: 'Miss die Meereshöhe aus einem Orbit in 800 km Höhe. Das Radar braucht viel Strom.' },
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
for (const list of [missions, instruments, buses, panels, rockets]) for (const x of list) x.de = DE[x.id];

// Kampagne: Aufträge der Reihe nach. base = Mission, deren Teile angeboten werden.
// cheapest = billigste Lösung in Mio. $ (zum Erkennen einer Pleite), mit den Spieldaten durchgerechnet.
export const CAMPAIGN_START = 150; // ein Fehlschlag ist verkraftbar, zwei nicht
export const contracts = [
  { id: 'c1', base: 'cubesat', minScience: 8, fee: 2, cheapest: 0.47,
    client: 'University space club', goal: 'Launch a small CubeSat with a camera for students.',
    de: { client: 'Raumfahrt-AG einer Uni', goal: 'Starte einen kleinen CubeSat mit Kamera für Studierende.' } },
  { id: 'c2', base: 'weather', minScience: 55, fee: 130, cheapest: 69.3,
    client: 'National weather service', goal: 'Put a weather satellite into an 800 km orbit.',
    de: { client: 'Nationaler Wetterdienst', goal: 'Bring einen Wettersatelliten in einen Orbit in 800 km Höhe.' } },
  { id: 'c3', base: 'ocean', minScience: 125, fee: 190, cheapest: 115,
    client: 'Ocean research institute', goal: 'Measure sea level with a radar satellite.',
    de: { client: 'Institut für Meeresforschung', goal: 'Miss die Meereshöhe mit einem Radar-Satelliten.' } },
  { id: 'c4', base: 'weather', minScience: 100, fee: 160, cheapest: 107,
    client: 'Storm warning network', goal: 'A weather satellite with more instruments to warn of storms earlier.',
    de: { client: 'Sturmwarn-Netz', goal: 'Ein Wettersatellit mit mehr Instrumenten, der früher vor Stürmen warnt.' } },
];
