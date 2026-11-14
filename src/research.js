// Forschung ohne DOM: Research Points, Preis der eigenen Rakete. Spielregeln aus der Besprechung Sa 13:10.

// Eine erfolgreiche Mission bringt ein Fünftel ihrer Wissenschaft als Research Points,
// aber nur, wenn sie den bisherigen Bestwert schlägt (kein Sammeln durch Wiederholen)
export function pointsForMission(result, mission, previousBest = 0) {
  if (!result.success || mission.free) return 0;
  if (previousBest > 0 && !(result.sciencePerMillion > previousBest)) return 0;
  return Math.round(result.science / 5);
}

// Preis der eigenen Rakete in Mio. $: erster Flug 90, jeder weitere 15 % billiger, Boden 40 %.
// Wiederverwendbarer Booster: zusätzlich 40 % billiger. Gerundet auf 0,1 Mio. $.
export function ownRocketCost(flights, reusable) {
  const base = 90;
  const price = Math.max(base * 0.4, base * 0.85 ** flights) * (reusable ? 0.6 : 1);
  return Math.round(price * 10) / 10;
}

// Erfolgsquote der eigenen Rakete (Spiel-Annahme): neue Raketen scheitern anfangs öfter,
// jeder Flug +6 %, Obergrenze 99 %. Qualitätsprogramm: Start bei 85 %, Obergrenze 99,8 % (besser als Falcon 9).
export function ownRocketReliability(flights, quality) {
  const start = quality ? 0.85 : 0.75;
  const cap = quality ? 0.998 : 0.99;
  return Math.min(cap, Math.round((start + 0.06 * flights) * 1000) / 1000);
}
