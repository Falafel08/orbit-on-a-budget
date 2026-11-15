# Mini-Spec: Level 2, deine eigene Raumstation

Stand 15.11.2026. Ideen und Entscheidungen von Linus nach dem Hackathon.

### 1. Ziel
In Level 2 baust du deine eigene Raumstation im Erdorbit. Du planst, wo jedes Modul andockt, wie viel Strom und Vorräte die Station hat, und ob Menschen oder Roboter darin arbeiten. Spieler sehen, wie viel Planung eine Mission braucht, und erleben Folgen ihrer Entscheidungen.

### 2. Nutzerfall
1. Level 1 geschafft (Satelliten, Geld verdient). Level 2 startet: Du gibst deiner Station einen Namen.
2. Flug wählen: Modul, Vorräte, Crew oder Roboter.
3. Bei einem Modul: Typ wählen und auf dem Raster das Feld, wo es andocken soll. Feld ohne Anschluss ist rot, Start gesperrt.
4. Rakete wählen (wie bisher). Crew fliegt nur mit Raketen ab 99 % Erfolgsquote.
5. Start, dann Andocken in 3D: Rakete bremst, Steuerdüsen pusten, Modul gleitet an seinen Platz.
6. Runde wird verrechnet: Crew isst Vorräte, Strom wird verbraucht, Labor bringt Forschungspunkte.
7. Fehlen Vorräte: Crew kehrt mit dem Rettungsboot zurück. Rückflug kostet, Ruf sinkt, die Crew ist weg.
8. Station ist fertig, wenn sie Kern, Strom, Labor, Wohnmodul, Lager und eine Crew von 3 mit Vorräten für die nächste Runde hat. Dann ist Level 3 offen.

### 3. Rahmen
- **Designsprache:** Werte aus repos/designsprache/Designsprache/specs/designsprache.md. Akzent: Lila #A88FD6. Abweichungen: dunkle Weltraum-Optik wie bisher.
- Läuft ohne Server, Spielstand im Browser (wie bisher).
- Rechenlogik in `src/station.js` ohne DOM, testgetrieben.
- Raster 5 × 5, flach. Kern in der Mitte. Knoten und Kern haben 4 Anschlüsse, normale Module 2 (vorne und hinten, Richtung beim Andocken festgelegt), Solar 1 (Ende).
- Werte: Strom erzeugt und verbraucht (kW), Betten, Lager (kg Vorräte), Masse bis zum Höchstwert der Station.
- Crew: Sitzpreis etwa 55 Mio $ (Schätzung NASA OIG 2019 für Crew Dragon, von NASA und Boeing als zu hoch kritisiert). Kapselmasse vereinfacht. Vorräte pro Person und Runde mit Quelle oder als Annahme markiert.
- Roboter, echte Vorbilder: Astrobee (NASA), Robonaut 2 (NASA/GM, 150 kg), Dextre (CSA, 1.662 kg), Canadarm2 (CSA, 1.800 kg), Optimus (Tesla, Herstellerangabe). Preise und Strombedarf sind Spiel-Annahmen. Roboter brauchen Strom statt Vorräte und eine niedrigere Erfolgsquote, bringen weniger Forschungspunkte.
- Ab dem dritten Modul muss Crew oder ein Roboter an Bord sein, der anbaut.
- Runde = ein Flug. Keine Echtzeit.
- 3D mit Three.js (lokal im Repo), Modelle aus dem Kenney Space Kit (CC0). Ohne WebGL: 2D-Raster.
- Weniger pro Bildschirm: Flugwahl, Raster und Rakete sind eigene Schritte.
- Neue sichtbare Texte vor dem Commit mit `skills/unslop/SKILL.md` prüfen. Englisch und Deutsch.

### 4. Stack
HTML, CSS, JavaScript ES-Module, Three.js, `node --test`.

### 5. Akzeptanzkriterien
1. `canPlace`: Feld neben Kern oder Knoten ist frei wählbar, neben einem normalen Modul nur in dessen Richtung, neben Solar nie, belegtes Feld nie, Feld außerhalb des Rasters nie.
2. `stationStats`: Strom, Betten, Lager und Masse stimmen für eine Beispiel-Station.
3. Crew-Flug mit Rakete unter 99 % ist gesperrt, Roboter mit eigener Grenze.
4. Crew ohne genug Vorräte: nach der Runde Notrückkehr, Crew 0, Kosten berechnet.
5. Ab dem dritten Modul ohne Crew oder Roboter: Start gesperrt mit Grund.
6. Strom negativ: Labor und Roboter bringen keine Punkte.
7. Station fertig genau dann, wenn alle Bedingungen aus Nutzerfall 8 erfüllt sind.
8. Spielstand mit Station übersteht Neuladen.
9. 3D-Ansicht lädt, ohne WebGL erscheint das 2D-Raster, keine Konsolenfehler.

### 6. Nicht-Ziele
- Kein Mond und kein Mars (Level 3 und 4 später).
- Keine Echtzeit, keine Ich-Perspektive, Rakete nicht mit der Maus drehen.
- Kein mehrstöckiges Raster.
- Keine Verbindung zu anderen Spielern.
