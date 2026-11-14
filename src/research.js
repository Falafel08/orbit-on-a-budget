// Forschung ohne DOM: Research Points, Preis der eigenen Rakete. Spielregeln aus der Besprechung Sa 13:10.

// Eine erfolgreiche Mission bringt ein Fünftel ihrer Wissenschaft als Research Points
export function pointsForMission(result, mission) {
  if (!result.success || mission.free) return 0;
  return Math.round(result.science / 5);
}

// Preis der eigenen Rakete in Mio. $: erster Flug 90, jeder weitere 15 % billiger, Boden 40 %.
// Wiederverwendbarer Booster: zusätzlich 40 % billiger. Gerundet auf 0,1 Mio. $.
export function ownRocketCost(flights, reusable) {
  const base = 90;
  const price = Math.max(base * 0.4, base * 0.85 ** flights) * (reusable ? 0.6 : 1);
  return Math.round(price * 10) / 10;
}
