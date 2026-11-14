// Quellen für die Credits im Spiel (Jury-Kriterium Validität). Ausführlich mit Lizenzen: data/SOURCES.md.
import { facts } from './facts.js';

const FACT_PAGES = {
  iss: { en: 'Space fact: International Space Station facts and figures', de: 'Weltraum-Fakt: Zahlen zur Internationalen Raumstation' },
  webb: { en: 'Space fact: James Webb Space Telescope', de: 'Weltraum-Fakt: James-Webb-Teleskop' },
  moon: { en: 'Space fact: Moon facts', de: 'Weltraum-Fakt: Mond' },
  sun: { en: 'Space fact: Sun facts', de: 'Weltraum-Fakt: Sonne' },
  voyager: { en: 'Space fact: Voyager 1', de: 'Weltraum-Fakt: Voyager 1' },
  debris: { en: 'Space fact: space debris', de: 'Weltraum-Fakt: Weltraumschrott' },
};

export const nasaSources = [
  { en: 'Rocket payload to an 800 km orbit (Pegasus XL, Falcon 9): NASA Launch Services Program, Launch Vehicle Performance Website',
    de: 'Nutzlast der Raketen für 800 km (Pegasus XL, Falcon 9): NASA Launch Services Program, Launch Vehicle Performance Website',
    url: 'https://elvperf.ksc.nasa.gov' },
  { en: 'Pegasus XL price: NASA launch contract for ICON', de: 'Preis Pegasus XL: NASA-Startvertrag für ICON',
    url: 'https://www.nasa.gov/news-release/nasa-awards-launch-services-contract-for-ionospheric-connection-explorer' },
  { en: 'Falcon 9 price: NASA launch contract for COSI', de: 'Preis Falcon 9: NASA-Startvertrag für COSI',
    url: 'https://www.nasa.gov/news-release/nasa-awards-launch-services-contract-for-space-telescope-mission' },
  { en: 'CubeSat sizes, masses and rideshare cost: NASA CubeSat 101', de: 'CubeSat-Größen, Massen und Mitflug-Preis: NASA CubeSat 101',
    url: 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf' },
  // Fun Facts: jede NASA-Seite einmal, benannt nach dem Bild des Fakts
  ...[...new Map(facts.map((f) => [f.source, f.icon])).entries()].map(([url, icon]) => ({ ...FACT_PAGES[icon], url })),
];

export const otherSources = [
  { en: 'Background image: Cosmic Cliffs, NASA, ESA, CSA, and STScI (ESA/Webb, CC BY 4.0)', de: 'Hintergrundbild: Cosmic Cliffs, NASA, ESA, CSA, and STScI (ESA/Webb, CC BY 4.0)',
    url: 'https://esawebb.org/images/weic2205a/' },
  { en: 'Falcon 9 success rate: public launch records', de: 'Erfolgsquote Falcon 9: öffentliche Startliste',
    url: 'https://en.wikipedia.org/wiki/List_of_Falcon_9_and_Falcon_Heavy_launches' },
  { en: 'Pegasus XL success rate: public launch records', de: 'Erfolgsquote Pegasus XL: öffentliche Startliste',
    url: 'https://keeptrack.space/launches/vehicles/pegasus-xl' },
  { en: 'Starship test flights and success rate', de: 'Starship-Testflüge und Erfolgsquote', url: 'https://en.wikipedia.org/wiki/SpaceX_Starship' },
  { en: 'Starship payload (SpaceX claim): Starship Users Guide, reported by Space.com', de: 'Starship-Nutzlast (Angabe von SpaceX): Starship Users Guide, Bericht von Space.com',
    url: 'https://www.space.com/spacex-starship-transportation-system-users-guide.html' },
  { en: 'Starship price target (SpaceX claim): CNBC, 2022', de: 'Starship-Preisziel (Angabe von SpaceX): CNBC, 2022',
    url: 'https://www.cnbc.com/2022/02/11/elon-musk-spacexs-starship-is-solution-to-efficient-space-travel.html' },
];
