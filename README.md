# Orbit on a Budget

A browser game for students. You plan a space mission with a fixed budget, pick instruments, a satellite and a rocket, then launch. Each round, try to reach orbit for less money than last time.

**Play it in your browser: https://falafel08.github.io/orbit-on-a-budget/** (made for a laptop)

Built at the NASA Space Apps Challenge 2026, Aachen. Challenge: Space Mission Design Game.

Slides of our pitch: [docs/Orbit-on-a-Budget_Pitch_v1.pdf](docs/Orbit-on-a-Budget_Pitch_v1.pdf) (PowerPoint in the same folder).

## How to play
1. Choose a level, then open Mission control at your base.
2. Pick instruments. Each one brings research points, mass, power draw and cost.
3. Pick a satellite bus. Big buses bring their own power (NASA RSDO data), CubeSats need solar panels.
4. Choose one of 12 real rockets, from Electron to Starship, and decide whether to insure the launch.
5. Launch. Watch the stages separate, the fairing open and the satellite unfold. Every rocket has a real success rate, so a launch can fail.
6. Your score is research points per million dollars. Try the same mission again for less money.

The first contract has a short intro. Point at any part, rocket or the insurance to see what it does.

## Campaign
You run a space company and start with $110M. Your company pays for parts and launches, the client pays when the mission works, and the rest funds the next contract. Research costs money and research points: your own rocket Orbiter-1 gets cheaper with every flight, a reusable booster cuts the price again.

- Level 1, Earth orbit: satellites for four clients.
- Level 2, Space station: five flights, each module docks to the station.
- Level 3, Moon base: four landings. The habitat needs a big rocket.
- Level 4, Mars: three flights. The crewed landing needs a fuel plant on Mars first.

## Run it on your own computer
Serve the folder and open `http://localhost:8000`:

```bash
python3 -m http.server 8000
```

Tests for the game logic:

```bash
npm test
```

## Credits
- **Idea and game design:** Linus Fritz (initiator)
- **Code:** written with AI (Claude), directed by Linus Fritz
- **Team:** Josias Wolff (home screen design)

## Data
Sources and licenses are listed in `data/SOURCES.md`.
