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
    allowed: ['cube-camera', 'cube-radiometer', 'cube-1u', 'cube-3u', 'cube-6u', 'panel-body', 'panel-deploy', 'rideshare', 'electron'],
  },
  {
    id: 'weather', level: 'Intermediate', name: 'Weather satellite',
    goal: 'Put a weather satellite into an 800 km orbit to watch clouds and storms.',
    budget: 120, minScience: 55, requiredDv: 9500, verified: false,
    allowed: ['camera', 'lightning', 'radiometer', 'sounder', 'bus-s', 'bus-m', 'panel-s', 'panel-m', 'electron', 'alpha', 'vegac', 'pslv', 'h3', 'soyuz', 'ariane6', 'pegasus', 'falcon9', 'own', 'starship'],
  },
  {
    id: 'ocean', level: 'Hard', name: 'Ocean satellite',
    goal: 'Measure sea level from an 800 km orbit. The radar needs a lot of power.',
    budget: 120, minScience: 125, requiredDv: 9500, verified: false,
    allowed: ['camera', 'radiometer', 'sounder', 'altimeter', 'bus-s', 'bus-m', 'bus-l', 'panel-s', 'panel-m', 'panel-l', 'electron', 'alpha', 'vegac', 'pslv', 'h3', 'soyuz', 'ariane6', 'pegasus', 'falcon9', 'own', 'starship'],
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
  // Masse und Nutzlast nach echten Bussen im NASA-Katalog RSDO Rapid IV (Datenblätter Ball BCP Small, BCP Large).
  // Klein: Bus 114 kg, Nutzlast 44 kg. Mittel: Bus 170 kg, Nutzlast 170 kg. Groß: 2.190 kg minus 610 kg Nutzlast = 1.580 kg, Nutzlast 610 kg.
  // Strom für die Nutzlast ebenfalls laut RSDO (BCP-Small 100 W bzw. 90 W, BCP-Large 600 W im Mittel), die Solarflügel des Busses
  // sind in seiner Masse schon enthalten (Faktencheck 15.11., Linus: echte Leistung). Preise bleiben Spiel-Annahme (RSDO nennt keine Preise).
  { id: 'bus-s', name: 'Small bus', mass: 114, capacity: 44, power: 100, cost: 4, verified: 'mass', info: BUS_INFO + ' Mass, payload and power like the Ball BCP-Small bus in NASA\'s RSDO catalog. Its own solar wings are included.' },
  { id: 'bus-m', name: 'Medium bus', mass: 170, capacity: 170, power: 90, cost: 15, verified: 'mass', info: BUS_INFO + ' Mass, payload and power like the larger Ball BCP-Small version in NASA\'s RSDO catalog. Its own solar wings are included.' },
  { id: 'bus-l', name: 'Large bus', mass: 1580, capacity: 610, power: 600, cost: 45, verified: 'mass', info: BUS_INFO + ' Mass, payload and power like the Ball BCP-Large bus in NASA\'s RSDO catalog. Its own solar wings are included.' },
];

// Solarpanels: Strom für die Instrumente. Werte sind Spiel-Annahmen (verified: false).
export const panels = [
  { id: 'panel-body', name: 'Body solar cells', mass: 0.1, power: 2, cost: 0.02, verified: false,
    info: 'Solar cells glued onto the sides of the CubeSat. Light and cheap, but little power.' },
  { id: 'panel-deploy', name: 'Fold-out CubeSat panels', mass: 0.3, power: 8, cost: 0.06, verified: false,
    info: 'Small wings that fold out in orbit. Four times the power of body cells.' },
  { id: 'panel-s', name: 'Small solar wing', mass: 8, power: 150, cost: 1, verified: false,
    info: 'One extra small wing on top of the bus\'s own power.' },
  { id: 'panel-m', name: 'Medium solar wings', mass: 25, power: 500, cost: 3, verified: false,
    info: 'Two extra wings on top of the bus\'s own power. Enough for most weather instruments.' },
  { id: 'panel-l', name: 'Large solar wings', mass: 70, power: 1500, cost: 8, verified: false,
    info: 'Two big extra wings for power-hungry instruments like a radar.' },
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
  // Neue Raketen (Linus 15.11.: mehr Raketen). Nutzlast für 500 km Sonnensynchron laut Hersteller, nicht aus der NASA-Abfrage,
  // darum im Infotext mit Bahn und Quelle. Erfolgsquote nach keeptrack.space, Stand 15.11.2026.
  {
    id: 'electron', name: 'Electron', cost: 6.9, maxPayload: 200, reliability: 0.956, // 86 von 90 Flügen erfolgreich
    verified: true, // 6,9 Mio. $: NASA Venture Class Launch Services (2015); 200 kg auf 500 km SSO: Rocket Lab
    info: 'A small carbon-fibre rocket from Rocket Lab with battery-driven engine pumps. About 200 kg to a 500 km sun-synchronous orbit (Rocket Lab figure, lower than the 800 km of the NASA numbers). NASA paid $6.9M for a dedicated launch in 2015. 86 of 90 flights worked.',
  },
  {
    id: 'alpha', name: 'Firefly Alpha', cost: 15, maxPayload: 630, reliability: 0.57, // 4 von 7 Flügen erfolgreich
    verified: true, // 630 kg auf 500 km SSO und 15 Mio. $ Listenpreis: Firefly Payload User's Guide
    info: 'A two-stage carbon-fibre rocket from Firefly in Texas. 630 kg to a 500 km sun-synchronous orbit and a list price of $15M (Firefly figures). Only 4 of 7 flights worked so far.',
  },
  // Raketen anderer Länder (Linus und Freund 15.11.): ESA, JAXA, ISRO, Roskosmos. Nutzlast mit Bahn laut Betreiber,
  // geschätzte Preise sind im Infotext so benannt. Quellen in data/sources.js.
  {
    id: 'ariane6', name: 'Ariane 6', cost: 110, maxPayload: 7200, reliability: 0.89, // 8 von 9 Flügen erfolgreich, 1 Teilerfolg (Wikipedia, 15.11.2026)
    verified: true,
    info: 'Europe\'s newest heavy rocket, here as Ariane 62 with two side boosters. 7,200 kg to a 500 km sun-synchronous orbit (Arianespace manual). The price of about $110M (€100M) is a press estimate. 8 of 9 flights fully worked.',
  },
  {
    id: 'vegac', name: 'Vega C', cost: 52, maxPayload: 2300, reliability: 0.875, // 7 von 8 Flügen erfolgreich (Wikipedia, 15.11.2026)
    verified: true,
    info: 'A slim European rocket for small satellites, without side boosters. 2,300 kg to a 700 km sun-synchronous orbit (ESA, Arianespace). The price of about $52M (€48M) is a press estimate. 7 of 8 flights worked.',
  },
  {
    id: 'h3', name: 'H3', cost: 34, maxPayload: 4000, reliability: 0.8, // 8 von 10 Flügen erfolgreich (Wikipedia, aerotime, 15.11.2026)
    verified: true,
    info: 'Japan\'s new main rocket, here as H3-30 without side boosters. At least 4,000 kg to a 500 km sun-synchronous orbit (JAXA). About $34M (¥5 billion) is JAXA\'s price target, an estimate. 8 of 10 flights worked.',
  },
  {
    id: 'pslv', name: 'PSLV-XL', cost: 26, maxPayload: 1750, reliability: 0.926, // 25 von 27 Flügen erfolgreich (Wikipedia, 15.11.2026)
    verified: true,
    info: 'India\'s workhorse rocket with six thin boosters around its base. 1,750 kg to a 600 km sun-synchronous orbit (ISRO). The US GAO lists $21–31M per launch; the game uses $26M. 25 of 27 flights worked.',
  },
  {
    id: 'soyuz', name: 'Soyuz-2.1b', cost: 80, maxPayload: 4400, reliability: 0.977, // 86 von 88 Flügen erfolgreich (keeptrack.space, 15.11.2026)
    verified: true,
    info: 'Russia\'s veteran rocket with four cone-shaped boosters, here with the Fregat upper stage. 4,400 kg to an 820 km sun-synchronous orbit (Arianespace manual, launch from Kourou). The US GAO lists $80M per launch (2017). 86 of 88 flights worked.',
  },
  {
    id: 'pegasus', name: 'Pegasus XL', cost: 56.3, maxPayload: 190, reliability: 0.9, // 27 von 30 Starts erfolgreich
    verified: true, // 190 kg: NASA LSP; 56,3 Mio. $: NASA, Launch-Vertrag ICON
    info: 'A small rocket launched from under a plane. NASA lists 190 kg to an 800 km orbit.',
  },
  {
    id: 'falcon9', name: 'Falcon 9', cost: 69, maxPayload: 10670, reliability: 0.997, // 700 von 702 Flügen erfolgreich (keeptrack.space, 15.11.2026)
    verified: true, // 10.670 kg (Booster landet auf Drohnenschiff): NASA LSP; 69 Mio. $: NASA, Launch-Vertrag COSI
    info: 'A large rocket whose first stage lands again and flies once more. NASA lists 10,670 kg to an 800 km orbit.',
  },
];

// Starship: nicht in der NASA-Datenbank, nur Angaben von SpaceX. Nur in der Kampagne, ab Auftrag 2.
// 100 t: SpaceX Starship Users Guide (2020), gilt für niedrigen Orbit. 10 Mio. $: Musks Ziel (CNBC, 11.02.2022).
// Erfolgsquote: 10 von 15 Testflügen (Wikipedia, Stand 14.11.2026). Kein Versicherer deckt Testflüge (Spiel-Annahme).
export const starship = {
  id: 'starship', name: 'Starship', cost: 100, maxPayload: 100000, reliability: 0.67, // 100 Mio. $ ohne Forschung, bis 30 Mio. $ mit (starshipCost)
  capacity: { moon: 100000, mars: 100000 }, needsRefuel: true, // über den Erdorbit hinaus nur mit Betankung im Orbit
  claim: true, uninsurable: true,
  info: 'SpaceX\'s giant rocket, still in test flights. 100 t to low orbit is SpaceX\'s own figure and not shown yet. The price of $100M per flight is a game estimate; it gets cheaper with the research Starship reuse. 10 of 15 test flights worked. In the game no insurer covers it (assumption).',
};

// Eigene Rakete (Spiel-Entwurf, Raketengleichung). Orbiter-1 trägt etwa 1,6 t, Orbiter-2 nach Forschung etwa 10 t in den Erdorbit.
export const OWN_STAGES = [{ dryMass: 6000, propMass: 60000, isp: 295 }, { dryMass: 900, propMass: 9500, isp: 340 }];
export const OWN_STAGES_2 = [{ dryMass: 20000, propMass: 300000, isp: 300 }, { dryMass: 4000, propMass: 60000, isp: 345 }];

// Mond und Mars (Level 3 und 4). capacity = Nutzlast je Ziel in kg.
// Falcon Heavy: Preis 178 Mio. $ laut NASA-Startvertrag Europa Clipper (2021). Nutzlast 16,8 t zum Mars (Angabe SpaceX);
// für den Mond gilt im Spiel derselbe Wert, das ist vorsichtig, denn zum Mond trägt sie mehr.
export const falconHeavy = {
  id: 'falconHeavy', name: 'Falcon Heavy', cost: 178, reliability: 0.99, capacity: { moon: 16800, mars: 16800 },
  info: 'Three Falcon 9 cores side by side. NASA paid about $178M to launch Europa Clipper with it. Sends up to 16.8 t toward Mars, then all three cores are lost (SpaceX figure). The game uses both numbers together, a simplification.',
};
// SLS: über 27 t zum Mond (NASA, SLS Lift Capabilities). 2,2 Mrd. $ pro Rakete (NASA Inspector General, IG-22-003).
// Erfolgsquote: Spiel-Annahme.
export const sls = {
  id: 'sls', name: 'SLS', cost: 2200, reliability: 0.95, capacity: { moon: 27000 },
  info: 'NASA\'s Moon rocket. It sends more than 27 t toward the Moon, together with the Orion crew capsule. NASA\'s Inspector General puts building one rocket at about $2.2 billion.',
};

// Deutsche Namen und Texte, an jeden Datensatz gehängt (tr() in src/i18n.js liest sie)
const BUS_DE = 'Der Körper des Satelliten. Er trägt die Instrumente und gibt ihnen Strom, Funk und einen Computer.';
const DE = {
  cubesat: { name: 'Studenten-CubeSat', goal: 'Bring einen kleinen CubeSat mit Kamera in eine niedrige Erdumlaufbahn.' },
  weather: { name: 'Wettersatellit', goal: 'Bring einen Wettersatelliten in einen Orbit in 800 km Höhe, um Wolken und Gewitter zu beobachten.' },
  'panel-body': { name: 'Solarzellen am Gehäuse', info: 'Solarzellen direkt auf den Seiten des CubeSats. Leicht und billig, aber wenig Strom.' },
  'panel-deploy': { name: 'Klapp-Panels für CubeSats', info: 'Kleine Flügel, die sich im Orbit aufklappen. Viermal so viel Strom wie Zellen am Gehäuse.' },
  'panel-s': { name: 'Kleiner Solarflügel', info: 'Ein zusätzlicher kleiner Flügel zum eigenen Strom des Busses.' },
  'panel-m': { name: 'Mittlere Solarflügel', info: 'Zwei zusätzliche Flügel zum eigenen Strom des Busses. Reicht für die meisten Wetter-Instrumente.' },
  'panel-l': { name: 'Große Solarflügel', info: 'Zwei große zusätzliche Flügel für Instrumente mit viel Strombedarf wie ein Radar.' },
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
  'bus-s': { name: 'Kleiner Bus', info: BUS_DE + ' Masse, Nutzlast und Strom wie der Bus Ball BCP-Small im NASA-Katalog RSDO. Seine eigenen Solarflügel sind schon dabei.' },
  'bus-m': { name: 'Mittlerer Bus', info: BUS_DE + ' Masse, Nutzlast und Strom wie die größere Ausführung von Ball BCP-Small im NASA-Katalog RSDO. Seine eigenen Solarflügel sind schon dabei.' },
  'bus-l': { name: 'Großer Bus', info: BUS_DE + ' Masse, Nutzlast und Strom wie der Bus Ball BCP-Large im NASA-Katalog RSDO. Seine eigenen Solarflügel sind schon dabei.' },
  rideshare: { name: 'CubeSat-Mitflug', info: 'Dein CubeSat fliegt auf der Rakete von jemand anderem mit. Das ist billig, aber nur für CubeSats bis 3U.' },
  pegasus: { info: 'Eine kleine Rakete, die unter einem Flugzeug startet. Laut NASA trägt sie 190 kg in einen Orbit in 800 km Höhe.' },
  falconHeavy: { info: 'Drei Falcon-9-Stufen nebeneinander. Die NASA zahlte etwa 178 Mio. $ für den Start von Europa Clipper damit. Schickt bis zu 16,8 t Richtung Mars, dann sind alle drei Stufen verloren (Angabe von SpaceX). Das Spiel nutzt beide Zahlen zusammen, eine Vereinfachung.' },
  sls: { info: 'Die Mondrakete der NASA. Sie schickt mehr als 27 t Richtung Mond, zusammen mit der Crew-Kapsel Orion. Laut NASA-Prüfbericht kostet der Bau einer Rakete etwa 2,2 Mrd. $.' },
  starship: { info: 'Die Riesenrakete von SpaceX, noch in Testflügen. 100 t in einen niedrigen Orbit ist eine Angabe von SpaceX und noch nicht gezeigt. Der Preis von 100 Mio. $ pro Flug ist eine Schätzung des Spiels; mit der Forschung Starship-Wiederverwendung wird er billiger. 10 von 15 Testflügen haben geklappt. Im Spiel versichert sie niemand (Annahme).' },
  electron: { info: 'Kleine Rakete aus Kohlefaser von Rocket Lab, die Pumpen der Triebwerke laufen mit Akkus. Etwa 200 kg in einen Sonnensynchron-Orbit in 500 km Höhe (Angabe Rocket Lab, niedriger als die 800 km der NASA-Zahlen). Die NASA zahlte 2015 6,9 Mio. $ für einen eigenen Start. 86 von 90 Flügen haben geklappt.' },
  alpha: { info: 'Zweistufige Rakete aus Kohlefaser von Firefly aus Texas. 630 kg in einen Sonnensynchron-Orbit in 500 km Höhe und 15 Mio. $ Listenpreis (Angaben von Firefly). Bisher haben nur 4 von 7 Flügen geklappt.' },
  ariane6: { info: 'Europas neueste schwere Rakete, hier als Ariane 62 mit zwei Seitenboostern. 7.200 kg in einen Sonnensynchron-Orbit in 500 km Höhe (Handbuch Arianespace). Der Preis von etwa 110 Mio. $ (100 Mio. €) ist eine Schätzung aus der Presse. 8 von 9 Flügen haben ganz geklappt.' },
  vegac: { info: 'Schlanke europäische Rakete für kleine Satelliten, ohne Seitenbooster. 2.300 kg in einen Sonnensynchron-Orbit in 700 km Höhe (ESA, Arianespace). Der Preis von etwa 52 Mio. $ (48 Mio. €) ist eine Schätzung aus der Presse. 7 von 8 Flügen haben geklappt.' },
  h3: { info: 'Japans neue Hauptrakete, hier als H3-30 ohne Seitenbooster. Mindestens 4.000 kg in einen Sonnensynchron-Orbit in 500 km Höhe (JAXA). Etwa 34 Mio. $ (5 Mrd. ¥) ist das Preisziel der JAXA, eine Schätzung. 8 von 10 Flügen haben geklappt.' },
  pslv: { info: 'Indiens Arbeitspferd mit sechs dünnen Boostern unten am Rumpf. 1.750 kg in einen Sonnensynchron-Orbit in 600 km Höhe (ISRO). Der US-Rechnungshof GAO nennt 21 bis 31 Mio. $ pro Start, das Spiel nimmt 26 Mio. $. 25 von 27 Flügen haben geklappt.' },
  soyuz: { info: 'Russlands altbewährte Rakete mit vier kegelförmigen Boostern, hier mit der Oberstufe Fregat. 4.400 kg in einen Sonnensynchron-Orbit in 820 km Höhe (Handbuch Arianespace, Start in Kourou). Der US-Rechnungshof GAO nennt 80 Mio. $ pro Start (2017). 86 von 88 Flügen haben geklappt.' },
  falcon9: { info: 'Eine große Rakete, deren erste Stufe landet und wieder fliegt. Laut NASA trägt sie 10.670 kg in einen Orbit in 800 km Höhe.' },
};
for (const list of [missions, instruments, buses, panels, rockets, [starship, falconHeavy, sls]]) for (const x of list) x.de = DE[x.id];

// Kampagne: Aufträge der Reihe nach. base = Mission, deren Teile angeboten werden.
// Die Pleite-Grenze rechnet src/campaign.js (cheapestMission) aus den verfügbaren Raketen aus.
// 110: Ein Fehlstart mit Falcon 9 bei Auftrag 2 (82 Mio. $) ist verkraftbar, danach bleibt nur noch Pegasus (69,3 Mio. $). Scheitert auch der, ist die Firma pleite.
export const CAMPAIGN_START = 110;
export const contracts = [
  { id: 'c1', level: 1, dest: 'leo', base: 'cubesat', minScience: 8, fee: 2,
    client: 'University space club', goal: 'Launch a small CubeSat with a camera for students.',
    de: { client: 'Raumfahrt-AG einer Uni', goal: 'Starte einen kleinen CubeSat mit Kamera für Studierende.' } },
  { id: 'c2', level: 1, dest: 'leo', base: 'weather', minScience: 55, fee: 75, // 15.11.: erst gesenkt (billige Raketen), dann wieder angehoben (Pleite beim Forschen)
    client: 'National weather service', goal: 'Put a weather satellite into an 800 km orbit.',
    de: { client: 'Nationaler Wetterdienst', goal: 'Bring einen Wettersatelliten in einen Orbit in 800 km Höhe.' } },
  { id: 'c3', level: 1, dest: 'leo', base: 'ocean', minScience: 125, fee: 130,
    client: 'Ocean research institute', goal: 'Measure sea level with a radar satellite.',
    de: { client: 'Institut für Meeresforschung', goal: 'Miss die Meereshöhe mit einem Radar-Satelliten.' } },
  { id: 'c4', level: 1, dest: 'leo', base: 'weather', minScience: 100, fee: 110,
    client: 'Storm warning network', goal: 'A weather satellite with more instruments to warn of storms earlier.',
    de: { client: 'Sturmwarn-Netz', goal: 'Ein Wettersatellit mit mehr Instrumenten, der früher vor Stürmen warnt.' } },
  // Level 2: eine kleine Raumstation aus fünf Modulen (Idee Mentor und Josias, 14.11.).
  // Massen und Preise sind Spiel-Annahmen, kein NASA-Wert. Die Raketen-Nutzlast gilt laut NASA für 800 km,
  // eine Station fliegt tiefer. Echte Raketen tragen dorthin mehr, das Spiel rechnet vorsichtig.
  ...[
    ['s1', 'Core module', 'Kernmodul', 'The heart of the station: computers, control and the first room.', 'Das Herz der Station: Computer, Steuerung und der erste Raum.', 6000, 40, 155],
    ['s2', 'Power module', 'Energiemodul', 'Big solar wings that give the whole station power.', 'Große Solarflügel, die der ganzen Station Strom geben.', 4000, 30, 145],
    ['s3', 'Lab module', 'Labormodul', 'A lab for experiments in weightlessness.', 'Ein Labor für Versuche in der Schwerelosigkeit.', 8000, 50, 170],
    ['s4', 'Habitat module', 'Wohnmodul', 'Beds, kitchen and air for a crew of three.', 'Betten, Küche und Luft für drei Leute.', 9000, 55, 180],
    ['s5', 'Docking node', 'Andockknoten', 'Lets spacecraft dock. After this the station is complete.', 'Hier docken Raumschiffe an. Danach ist die Station fertig.', 3000, 25, 140],
  ].map(([id, name, nameDe, goal, goalDe, mass, cost, fee]) => ({
    id, level: 2, dest: 'leo', module: { mass, cost, name, de: { name: nameDe } }, fee: fee + 60, // +60 je Modul (15.11.): Level 3 braucht Geld zum Einstieg
    client: name, goal, de: { client: nameDe, goal: goalDe },
  })),
  // Level 3: Mondbasis, Level 4: Mars. Massen, Baukosten und Zahlungen sind Spiel-Annahmen.
  // Das Wohnmodul (20 t) passt nicht in Falcon Heavy: entweder die teure SLS oder Starship nach der Forschung „Betankung“.
  ...[
    ['m1', 3, 'moon', 'Lunar lander and power', 'Mondlander mit Kraftwerk', 'Solar power and a landing pad at the south pole of the Moon.', 'Solarstrom und ein Landeplatz am Südpol des Mondes.', 9000, 180, 520],
    ['m2', 3, 'moon', 'Moon rover', 'Mond-Rover', 'A rover that drives to the dark craters to look for ice.', 'Ein Rover, der zu den dunklen Kratern fährt und Eis sucht.', 4000, 120, 420],
    ['m3', 3, 'moon', 'Moon habitat', 'Mond-Wohnmodul', 'A home for four people. Too heavy for Falcon Heavy.', 'Ein Zuhause für vier Leute. Zu schwer für Falcon Heavy.', 20000, 300, 900],
    ['m4', 3, 'moon', 'Ice mine', 'Eismine', 'Turns ice from the craters into water and rocket fuel.', 'Macht aus dem Eis der Krater Wasser und Raketentreibstoff.', 12000, 220, 640],
    ['r1', 4, 'mars', 'Mars cargo lander', 'Mars-Frachtlander', 'Supplies and tools wait on Mars before people arrive.', 'Vorräte und Werkzeug warten auf dem Mars, bevor Menschen kommen.', 15000, 350, 1200],
    ['r2', 4, 'mars', 'Mars habitat', 'Mars-Wohnmodul', 'A pressurized home on Mars. Only Starship can carry it.', 'Ein Zuhause unter Druck auf dem Mars. Nur Starship kann es tragen.', 30000, 500, 2000],
    ['r3', 4, 'mars', 'Crewed Mars landing', 'Bemannte Marslandung', 'The first crew lands on Mars. They need fuel from Mars to fly home.', 'Die erste Crew landet auf dem Mars. Für den Rückflug braucht sie Treibstoff vom Mars.', 50000, 800, 3200, 'mars-fuel'],
  ].map(([id, level, dest, name, nameDe, goal, goalDe, mass, cost, fee, requires]) => ({
    id, level, dest, module: { mass, cost, name, de: { name: nameDe } }, fee, requires,
    client: name, goal, de: { client: nameDe, goal: goalDe },
  })),
];

// Level der Kampagne. Mond und Mars sind als Ausblick gesperrt.
// place = Ort der Basis und des Forschungslabors in diesem Level
export const LEVELS = [
  { n: 1, place: 'earth', name: 'Earth orbit', de: { name: 'Erdorbit' } },
  { n: 2, place: 'station', name: 'Space station', de: { name: 'Raumstation' } },
  { n: 3, place: 'moon', name: 'Moon base', de: { name: 'Mondbasis' } },
  { n: 4, place: 'mars', name: 'Mars', de: { name: 'Mars' } },
];

// Nebenaufträge (Linus 15.11.): Satelliten anderer Kunden fliegen als Zusatzladung mit, nur im Erdorbit.
// Bezahlung wie ein Mitflug bei SpaceX: etwa 7.000 $ pro kg, mindestens 50 kg (Marktberichte 2026, kein offizielles Preisblatt).
// Bringt Geld, aber keine Forschungspunkte. Die Vorräte gibt es nur bei Flügen zur Station (Level 2).
export const RIDESHARE_PER_KG = 0.007;
export const sideJobs = [
  ['side-school', 'School CubeSat', 'Schul-CubeSat', 4],
  ['side-iot', 'Small IoT satellite', 'Kleiner IoT-Satellit', 120],
  ['side-eo', 'Earth observation satellite', 'Erdbeobachtungs-Satellit', 450],
  ['side-comms', 'Comms satellites', 'Funksatelliten', 1500],
  ['side-cargo', 'Supplies for the station', 'Vorräte für die Station', 2500, 2],
].map(([id, name, nameDe, mass, level]) => ({ id, name, mass, level, fee: Math.round(Math.max(50, mass) * RIDESHARE_PER_KG * 1000) / 1000, de: { name: nameDe } }));
// Großauftrag (Linus 15.11.): füllt große Raketen wie Starship. 2.000 $ pro kg ist eine Annahme des Spiels (Großkunden zahlen weniger pro kg).
export const BULK_PER_KG = 0.002;
sideJobs.push({ id: 'side-bulk', name: 'Bulk order: satellite network', mass: 20000, minCapacity: 20000, bulk: true, fee: 20000 * BULK_PER_KG, de: { name: 'Großauftrag: Satellitennetz' } });
