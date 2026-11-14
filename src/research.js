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

// Erfolgsquote der eigenen Rakete: neue Raketen scheitern anfangs öfter (Spiel-Annahme)
export function ownRocketReliability(flights) {
  return Math.min(0.97, Math.round((0.7 + 0.05 * flights) * 100) / 100);
}
