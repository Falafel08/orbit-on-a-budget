# Orbit on a Budget

A browser game for students. You plan a space mission with a fixed budget, pick instruments, a satellite and a rocket, then launch. Each round, try to reach orbit for less money than last time.

**Play it in your browser: https://falafel08.github.io/orbit-on-a-budget/** (made for a laptop)

Built at the NASA Space Apps Challenge 2026, Aachen. Challenge: Space Mission Design Game.

## How to play
1. Choose a difficulty. Each one is a different mission with its own parts, budget and science target.
2. Drag instruments onto the rocket. Each one adds science, mass, power draw and cost.
3. Build the satellite: a bus that carries the instruments and solar panels that power them.
4. Book a rocket or a CubeSat rideshare.
5. Launch. Every rocket has a real success rate, so a launch can fail. Insurance pays for a second launch.
6. See if you reached orbit, how much money is left and your science per million dollars. Then try again for less money.
7. A new best score earns research points. Repeating the same mission without doing better earns none. Use them to research your own rocket, Orbiter-1. Its first flight is expensive, every flight after that is cheaper, and a reusable booster cuts the price again.

## Campaign
Run your own space company. You start with $150M and four contracts. Your company pays for the parts, the client pays when the mission works, and what is left funds the next contract. Fail twice in a row and you go bankrupt.

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
