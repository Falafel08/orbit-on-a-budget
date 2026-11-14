# Orbit on a Budget

A browser game for students. You plan a space mission with a fixed budget, pick instruments, a satellite and a rocket, then launch. Each round, try to reach orbit for less money than last time.

**Play it in your browser: https://falafel08.github.io/orbit-on-a-budget/** (made for a laptop)

Built at the NASA Space Apps Challenge 2026, Aachen. Challenge: Space Mission Design Game.

## How to play
1. Choose a difficulty. Each one is a mission with a fixed budget and the science it needs.
2. Drag instruments onto the rocket. Each one adds science, mass, power draw and cost.
3. Drag on a satellite bus that can carry and power them.
4. Book a rocket or a CubeSat rideshare.
5. Launch.
6. See if you reached orbit, how much money is left and your science per million dollars. Then try again for less money.

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

## Data
Sources and licenses are listed in `data/SOURCES.md`.
