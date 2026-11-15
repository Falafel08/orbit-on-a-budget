// Quellen für die Credits im Spiel (Jury-Kriterium Validität). Ausführlich mit Lizenzen: data/SOURCES.md.
import { facts } from './facts.js';

const FACT_PAGES = {
  iss: { en: 'Space fact: International Space Station facts and figures', de: 'Weltraum-Fakt: Zahlen zur Internationalen Raumstation' },
  webb: { en: 'Space fact: James Webb Space Telescope', de: 'Weltraum-Fakt: James-Webb-Teleskop' },
  moon: { en: 'Space fact: lunar laser ranging (NASA JPL)', de: 'Weltraum-Fakt: Laser-Entfernungsmessung zum Mond (NASA JPL)' },
  sun: { en: 'Space fact: Sun facts', de: 'Weltraum-Fakt: Sonne' },
  voyager: { en: 'Space fact: Voyager 1', de: 'Weltraum-Fakt: Voyager 1' },
  debris: { en: 'Space fact: space debris', de: 'Weltraum-Fakt: Weltraumschrott' },
};

export const nasaSources = [
  { en: 'Electron price ($6.9M, 2015): NASA Venture Class Launch Services contracts', de: 'Preis Electron (6,9 Mio. $, 2015): NASA-Verträge Venture Class Launch Services',
    url: 'https://www.nasa.gov/news-release/nasa-awards-venture-class-launch-services-contracts-for-cubesat-satellites/' },
  { en: 'Rocket payload to an 800 km orbit (Pegasus XL, Falcon 9): NASA Launch Services Program, Launch Vehicle Performance Website',
    de: 'Nutzlast der Raketen für 800 km (Pegasus XL, Falcon 9): NASA Launch Services Program, Launch Vehicle Performance Website',
    url: 'https://elvperf.ksc.nasa.gov' },
  { en: 'Pegasus XL price: NASA launch contract for ICON', de: 'Preis Pegasus XL: NASA-Startvertrag für ICON',
    url: 'https://www.nasa.gov/news-release/nasa-awards-launch-services-contract-for-ionospheric-connection-explorer' },
  { en: 'Falcon 9 price: NASA launch contract for COSI', de: 'Preis Falcon 9: NASA-Startvertrag für COSI',
    url: 'https://www.nasa.gov/news-release/nasa-awards-launch-services-contract-for-space-telescope-mission' },
  { en: 'Falcon Heavy price: NASA launch contract for Europa Clipper', de: 'Preis Falcon Heavy: NASA-Startvertrag für Europa Clipper',
    url: 'https://www.nasa.gov/news-release/nasa-awards-launch-services-contract-for-europa-clipper-mission/' },
  { en: 'SLS payload to the Moon (more than 27 t): NASA, SLS lift capabilities', de: 'SLS-Nutzlast zum Mond (über 27 t): NASA, SLS Lift Capabilities',
    url: 'https://www.nasa.gov/wp-content/uploads/2020/02/sls_lift_capabilities_and_configurations_508_08202018_0.pdf' },
  { en: 'SLS cost (about $2.2 billion per rocket): NASA Office of Inspector General, IG-22-003', de: 'SLS-Kosten (etwa 2,2 Mrd. $ pro Rakete): NASA-Prüfbericht IG-22-003',
    url: 'https://oig.nasa.gov/docs/IG-22-003.pdf' },
  { en: 'Satellite buses, small and medium (Ball BCP-Small: 114 kg carrying 44 kg, 170 kg carrying 170 kg): NASA RSDO Rapid IV catalog', de: 'Satelliten-Busse klein und mittel (Ball BCP-Small: 114 kg trägt 44 kg, 170 kg trägt 170 kg): NASA-Katalog RSDO Rapid IV',
    url: 'https://assets.science.nasa.gov/content/dam/science/cds/spacecraft-development/rsdo/rapid-iv-catalog/Ball_BCP_Small_Data%20Sheet.pdf' },
  { en: 'Satellite bus, large (Ball BCP-Large: 610 kg payload): NASA RSDO Rapid IV catalog', de: 'Satelliten-Bus groß (Ball BCP-Large: 610 kg Nutzlast): NASA-Katalog RSDO Rapid IV',
    url: 'https://assets.science.nasa.gov/content/dam/science/cds/spacecraft-development/rsdo/rapid-iv-catalog/Ball_BCP_Large_Data%20Sheet.pdf' },
  { en: 'CubeSat sizes, masses and rideshare cost: NASA CubeSat 101', de: 'CubeSat-Größen, Massen und Mitflug-Preis: NASA CubeSat 101',
    url: 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf' },
  // Fun Facts: jede NASA-Seite einmal, benannt nach dem Bild des Fakts
  ...[...new Map(facts.map((f) => [f.source, f.icon])).entries()].map(([url, icon]) => ({ ...FACT_PAGES[icon], url })),
];

export const otherSources = [
  { en: 'Electron payload (200 kg to 500 km SSO): Rocket Lab', de: 'Nutzlast Electron (200 kg auf 500 km SSO): Rocket Lab',
    url: 'https://rocketlabcorp.com/updates/rocket-lab-increases-electron-payload-capacity-enabling-interplanetary-missions-and-reusability/' },
  { en: 'Firefly Alpha payload (630 kg to 500 km SSO) and price ($15M): Firefly Payload User\'s Guide', de: 'Nutzlast Firefly Alpha (630 kg auf 500 km SSO) und Preis (15 Mio. $): Firefly Payload User\'s Guide',
    url: 'https://fireflyspace.com/alpha/' },
  { en: 'Success rates Electron, Firefly Alpha, Falcon 9, Pegasus XL: keeptrack.space launch statistics', de: 'Erfolgsquoten Electron, Firefly Alpha, Falcon 9, Pegasus XL: keeptrack.space',
    url: 'https://keeptrack.space/launches/vehicles/electron' },
  { en: 'Moon moving away 3.8 cm per year: NASA JPL lunar laser ranging', de: 'Mond entfernt sich 3,8 cm pro Jahr: NASA JPL, Laser-Entfernungsmessung',
    url: 'https://funphysics.jpl.nasa.gov/technical/grp/lunar-laser.html' },
  { en: 'Buildings, domes, rovers and rocks: Kenney Space Kit (CC0), www.kenney.nl', de: 'Gebäude, Kuppeln, Rover und Felsen: Kenney Space Kit (CC0), www.kenney.nl',
    url: 'https://kenney.nl/assets/space-kit' },
  { en: 'Background image: Cosmic Cliffs, NASA, ESA, CSA, and STScI (ESA/Webb, CC BY 4.0)', de: 'Hintergrundbild: Cosmic Cliffs, NASA, ESA, CSA, and STScI (ESA/Webb, CC BY 4.0)',
    url: 'https://esawebb.org/images/weic2205a/' },
  { en: 'Falcon 9 success rate: public launch records', de: 'Erfolgsquote Falcon 9: öffentliche Startliste',
    url: 'https://en.wikipedia.org/wiki/List_of_Falcon_9_and_Falcon_Heavy_launches' },
  { en: 'Pegasus XL success rate: public launch records', de: 'Erfolgsquote Pegasus XL: öffentliche Startliste',
    url: 'https://keeptrack.space/launches/vehicles/pegasus-xl' },
  { en: 'Falcon Heavy payload to Mars (16.8 t, SpaceX figure)', de: 'Falcon-Heavy-Nutzlast zum Mars (16,8 t, Angabe von SpaceX)',
    url: 'https://en.wikipedia.org/wiki/Falcon_Heavy' },
  { en: 'Starship test flights and success rate', de: 'Starship-Testflüge und Erfolgsquote', url: 'https://en.wikipedia.org/wiki/SpaceX_Starship' },
  { en: 'Starship payload (SpaceX claim): Starship Users Guide, reported by Space.com', de: 'Starship-Nutzlast (Angabe von SpaceX): Starship Users Guide, Bericht von Space.com',
    url: 'https://www.space.com/spacex-starship-transportation-system-users-guide.html' },
  { en: 'Starship price target (SpaceX claim): CNBC, 2022', de: 'Starship-Preisziel (Angabe von SpaceX): CNBC, 2022',
    url: 'https://www.cnbc.com/2022/02/11/elon-musk-spacexs-starship-is-solution-to-efficient-space-travel.html' },
];
