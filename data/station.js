// Level 2: Module, Crew und Roboter der eigenen Raumstation.
// Massen, Preise und Strom der Module sind Spiel-Annahmen (Größenordnung wie ISS-Module, vereinfacht).
// cost in Mio. $, mass in kg, power in kW (+ erzeugt, − verbraucht), storage in kg Vorräte.
export const MODULES = {
  core: { mass: 6000, cost: 40, power: 5, beds: 0, storage: 300, lab: false,
    en: { name: 'Core module', info: 'The heart of the station: computers, control and a small solar array.' },
    de: { name: 'Kernmodul', info: 'Das Herz der Station: Computer, Steuerung und kleine Solarflügel.' } },
  node: { mass: 3000, cost: 25, power: 0, beds: 0, storage: 0, lab: false,
    en: { name: 'Node', info: 'Connects up to four modules.' }, de: { name: 'Knoten', info: 'Verbindet bis zu vier Module.' } },
  solar: { mass: 4000, cost: 30, power: 30, beds: 0, storage: 0, lab: false,
    en: { name: 'Solar array', info: 'Big solar wings. Nothing can dock behind them.' }, de: { name: 'Solarflügel', info: 'Große Solarflügel. Dahinter kann nichts andocken.' } },
  habitat: { mass: 9000, cost: 55, power: -4, beds: 3, storage: 0, lab: false,
    en: { name: 'Habitat', info: 'Beds, kitchen and air for three people.' }, de: { name: 'Wohnmodul', info: 'Betten, Küche und Luft für drei Leute.' } },
  lab: { mass: 8000, cost: 50, power: -8, beds: 0, storage: 0, lab: true,
    en: { name: 'Lab', info: 'Experiments in weightlessness. Crew and robots earn research points here.' }, de: { name: 'Labor', info: 'Versuche in der Schwerelosigkeit. Crew und Roboter bringen hier Forschungspunkte.' } },
  storage: { mass: 4000, cost: 20, power: -1, beds: 0, storage: 2000, lab: false,
    en: { name: 'Storage', info: 'Holds 2,000 kg of food and supplies.' }, de: { name: 'Lager', info: 'Fasst 2.000 kg Essen und Vorräte.' } },
};
export const STATION_MAX_MASS = 80000; // Spiel-Annahme (die ISS wiegt etwa 420 t)

// Crew: NASA plant etwa 1,8 kg Essen pro Person und Tag, mit Verpackung (NASA Human Research Roadmap).
// Eine Runde = 30 Tage. Wasser und Luft werden auf der Station aufbereitet (vereinfacht: nicht gezählt).
export const FOOD_PER_PERSON_DAY = 1.8;
export const ROUND_DAYS = 30;
export const CREW_MIN_RELIABILITY = 0.99;
export const CREW_RP = 6; // Forschungspunkte pro Person im Labor und Runde (Spiel-Annahme)
// Kapsel für bis zu drei Leute. NASA zahlte für Crew Dragon etwa 55 Mio. $ pro Sitz, Start inklusive (Schätzung NASA OIG 2019).
// Im Spiel: Rakete plus Kapsel 100 Mio. $, zusammen mit Falcon 9 also etwa 56 Mio. $ pro Sitz. Kapselmasse vereinfacht.
export const CAPSULE = { mass: 9500, cost: 100, seats: 3 };
export const RESCUE_COST = 120; // Notrückkehr mit dem Rettungsboot plus Ausfall (Spiel-Annahme)
export const SUPPLY_COST_PER_KG = 0.02; // Fracht zur Station, ohne Rakete (Spiel-Annahme)

// Roboter: echte Vorbilder. Massen aus Quellen, Preise, Strom und Punkte sind Spiel-Annahmen.
export const ROBOT_MIN_RELIABILITY = 0.9;
export const ROBOTS = [
  { id: 'astrobee', mass: 10, power: 0.1, cost: 5, rp: 1, assemble: false, source: 'NASA Ames',
    en: { name: 'Astrobee', info: 'A small flying cube that helps inside the station. Cannot build.' },
    de: { name: 'Astrobee', info: 'Ein kleiner fliegender Würfel, der in der Station hilft. Kann nicht bauen.' } },
  { id: 'robonaut', mass: 150, power: 0.5, cost: 20, rp: 3, assemble: false, source: 'NASA/GM',
    en: { name: 'Robonaut 2', info: 'A humanoid robot that worked on the ISS from 2011. Good at experiments, cannot build modules.' },
    de: { name: 'Robonaut 2', info: 'Ein humanoider Roboter, ab 2011 auf der ISS. Gut bei Versuchen, kann keine Module anbauen.' } },
  { id: 'dextre', mass: 1662, power: 2, cost: 60, rp: 1, assemble: true, source: 'CSA',
    en: { name: 'Dextre', info: 'The two-armed repair robot of the ISS. Can build modules.' },
    de: { name: 'Dextre', info: 'Der zweiarmige Wartungsroboter der ISS. Kann Module anbauen.' } },
  { id: 'canadarm', mass: 1800, power: 2, cost: 80, rp: 0, assemble: true, source: 'CSA',
    en: { name: 'Canadarm2', info: 'The big robot arm of the ISS. Grabs modules and docks them.' },
    de: { name: 'Canadarm2', info: 'Der große Roboterarm der ISS. Greift Module und dockt sie an.' } },
  { id: 'optimus', mass: 57, power: 0.5, cost: 30, rp: 3, assemble: true, source: 'Tesla (company claim)', claim: true,
    en: { name: 'Optimus', info: 'Tesla\'s humanoid robot. Mass is a company figure, it has never flown in space.' },
    de: { name: 'Optimus', info: 'Der humanoide Roboter von Tesla. Masse ist eine Firmenangabe, er war nie im All.' } },
];
