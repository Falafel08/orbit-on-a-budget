// Texte der Oberfläche in Englisch und Deutsch. Sprache wird im Browser gemerkt.
const STR = {
  en: {
    play: 'Play', settings: 'Settings', menu: 'Menu', credits: 'Credits', version: 'Ver 1.0',
    chooseDifficulty: 'Choose your difficulty',
    lead: 'Reach orbit, bring enough science and spend as little as you can.',
    budget: 'Budget', scienceNeeded: 'Science needed', best: 'Your best', noneYet: 'none yet',
    perM: 'per $1M', noLimit: 'No limit', completed: 'Completed',
    lvlEasy: 'Easy', lvlIntermediate: 'Intermediate', lvlHard: 'Hard', lvlUnrestricted: 'Unrestricted',
    steps: ['Instruments', 'Satellite', 'Rocket'],
    hintInstrument: 'Drag instruments onto the rocket, or press Enter. Each one adds science, mass, power draw and cost.',
    hintBus: 'Build your satellite: a bus that carries the instruments and solar panels that give them power.',
    groupBus: 'Bus', groupPanel: 'Solar panels',
    hintRocket: 'Book a launch. Your satellite must not be heavier than what the rocket carries to orbit. Figures are from NASA.',
    science: 'Science', mass: 'Mass', power: 'Power', carries: 'Carries', ownMass: 'Own mass',
    carriesToOrbit: 'Carries to orbit', yourSatellite: 'Your satellite', dvWithSat: 'Delta-v with your satellite',
    budgetLeft: 'Budget left', instMass: 'Instrument mass', powerDraw: 'Power draw', satMass: 'Satellite mass',
    needed: 'needed', pointAt: 'Point at a part to learn what it does.',
    satelliteBus: 'Satellite bus', rocket: 'Rocket', shared: 'shared with others', remove: 'Remove',
    next: 'Next', back: 'Back', launch: 'Launch', seeResult: 'See result', tryAgain: 'Try again cheaper',
    changeDifficulty: 'Change difficulty', orbit: 'Orbit',
    complete: 'Mission complete', notEnough: 'Not enough science', failed: 'Mission failed',
    rBudget: 'You spent more than your budget.',
    rPower: 'Your instruments need more power than your solar panels give.',
    rCapacity: 'Your instruments are too heavy for the bus.',
    rDv: 'The rocket does not have enough delta-v for this satellite.',
    rRocketMass: 'Your satellite is heavier than the rocket can carry to this orbit.',
    rScience: 'You reached orbit, but the mission needs {n} science.',
    spent: 'Spent', sciencePerM: 'Science per $1M',
    music: 'Music', on: 'On', off: 'Off', language: 'Language', resetBest: 'Reset best scores', close: 'Close',
    musicToggle: 'Music on or off', languageToggle: 'Change language',
    creditsIdea: 'Idea and game design: Linus Fritz',
    creditsTeam: 'Team: Josias Wolff',
    creditsCode: 'Code written with AI (Claude), directed by Linus Fritz',
    creditsData: 'Data: NASA Launch Services Program, NASA CubeSat 101, NASA launch contract releases',
    creditsEvent: 'Built at the NASA Space Apps Challenge 2026 in Aachen',
    bestReset: 'Best scores deleted.',
  },
  de: {
    play: 'Spielen', settings: 'Einstellungen', menu: 'Menü', credits: 'Credits', version: 'Ver 1.0',
    chooseDifficulty: 'Wähle die Schwierigkeit',
    lead: 'Erreiche den Orbit, bring genug Wissenschaft mit und gib so wenig Geld aus wie möglich.',
    budget: 'Budget', scienceNeeded: 'Nötige Wissenschaft', best: 'Dein Bestwert', noneYet: 'noch keiner',
    perM: 'pro 1 Mio. $', noLimit: 'Ohne Grenze', completed: 'Geschafft',
    lvlEasy: 'Leicht', lvlIntermediate: 'Mittel', lvlHard: 'Schwer', lvlUnrestricted: 'Frei',
    steps: ['Instrumente', 'Satellit', 'Rakete'],
    hintInstrument: 'Zieh Instrumente auf die Rakete oder drück Enter. Jedes bringt Wissenschaft, Masse, Stromverbrauch und Kosten.',
    hintBus: 'Bau deinen Satelliten: einen Bus, der die Instrumente trägt, und Solarpanels, die ihnen Strom geben.',
    groupBus: 'Bus', groupPanel: 'Solarpanels',
    hintRocket: 'Buch einen Start. Dein Satellit darf nicht schwerer sein, als die Rakete in den Orbit bringt. Die Zahlen sind von der NASA.',
    science: 'Wissenschaft', mass: 'Masse', power: 'Strom', carries: 'Trägt', ownMass: 'Eigenmasse',
    carriesToOrbit: 'Trägt in den Orbit', yourSatellite: 'Dein Satellit', dvWithSat: 'Delta-v mit deinem Satelliten',
    budgetLeft: 'Budget übrig', instMass: 'Masse der Instrumente', powerDraw: 'Stromverbrauch', satMass: 'Masse des Satelliten',
    needed: 'nötig', pointAt: 'Zeig auf ein Teil, dann siehst du, was es macht.',
    satelliteBus: 'Satellitenbus', rocket: 'Rakete', shared: 'mit anderen geteilt', remove: 'Entfernen:',
    next: 'Weiter', back: 'Zurück', launch: 'Starten', seeResult: 'Zum Ergebnis', tryAgain: 'Nochmal, billiger',
    changeDifficulty: 'Schwierigkeit ändern', orbit: 'Orbit',
    complete: 'Mission geschafft', notEnough: 'Zu wenig Wissenschaft', failed: 'Mission gescheitert',
    rBudget: 'Du hast mehr ausgegeben, als dein Budget erlaubt.',
    rPower: 'Deine Instrumente brauchen mehr Strom, als deine Solarpanels liefern.',
    rCapacity: 'Deine Instrumente sind zu schwer für den Bus.',
    rDv: 'Die Rakete hat für diesen Satelliten zu wenig Delta-v.',
    rRocketMass: 'Dein Satellit ist schwerer, als die Rakete in diesen Orbit bringt.',
    rScience: 'Du bist im Orbit, aber die Mission braucht {n} Wissenschaft.',
    spent: 'Ausgegeben', sciencePerM: 'Wissenschaft pro 1 Mio. $',
    music: 'Musik', on: 'An', off: 'Aus', language: 'Sprache', resetBest: 'Bestwerte löschen', close: 'Schließen',
    musicToggle: 'Musik an oder aus', languageToggle: 'Sprache wechseln',
    creditsIdea: 'Idee und Spieldesign: Linus Fritz',
    creditsTeam: 'Team: Josias Wolff',
    creditsCode: 'Code mit KI (Claude) geschrieben, geführt von Linus Fritz',
    creditsData: 'Daten: NASA Launch Services Program, NASA CubeSat 101, NASA-Meldungen zu Startverträgen',
    creditsEvent: 'Entstanden bei der NASA Space Apps Challenge 2026 in Aachen',
    bestReset: 'Bestwerte gelöscht.',
  },
};

let lang = 'en';
try { lang = localStorage.getItem('lang') || (navigator.language.startsWith('de') ? 'de' : 'en'); } catch { /* Standard EN */ }
if (!STR[lang]) lang = 'en';

export const getLang = () => lang;
export function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem('lang', l); } catch { /* ohne Speicher */ }
}
export function t(key, vars = {}) {
  const s = STR[lang][key] ?? STR.en[key] ?? key;
  return typeof s === 'string' ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s;
}
// Name, Info oder Ziel eines Datensatzes in der aktuellen Sprache
export const tr = (item, field) => (lang === 'de' && item.de && item.de[field]) || item[field];
