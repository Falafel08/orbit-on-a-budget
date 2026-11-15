// Meilensteine (Linus 15.11.): Abzeichen für erste Erfolge. Ohne DOM, jedes genau einmal.
// e = Ereignis nach einem Flug: success, stars, kind ('satellite' | 'station' | 'module'), crew, stationDone, reuse, dest
export const BADGES = [
  { id: 'first-sat', icon: 'sat', en: 'First satellite', de: 'Erster Satellit', test: (e) => e.success && e.kind === 'satellite' },
  { id: 'budget', icon: 'star', en: 'Under budget: three stars', de: 'Unter Budget: drei Sterne', test: (e) => e.success && e.stars === 3 },
  { id: 'reuse', icon: 'retry', en: 'First reusable booster', de: 'Erster wiederverwendbarer Booster', test: (e) => e.reuse },
  { id: 'first-crew', icon: 'shield', en: 'First crew in space', de: 'Erste Crew im All', test: (e) => e.success && e.kind === 'station' && e.crew > 0 },
  { id: 'station', icon: 'antenna', en: 'Station complete', de: 'Station fertig', test: (e) => e.stationDone },
  { id: 'moon', icon: 'rocket', en: 'First landing on the Moon', de: 'Erste Landung auf dem Mond', test: (e) => e.success && e.dest === 'moon' },
  { id: 'mars', icon: 'rocket', en: 'First landing on Mars', de: 'Erste Landung auf dem Mars', test: (e) => e.success && e.dest === 'mars' },
];

// Neu verdiente Abzeichen: Regel erfüllt und noch nicht in have
export const newBadges = (e, have) => BADGES.filter((b) => !have.includes(b.id) && b.test(e)).map((b) => b.id);
