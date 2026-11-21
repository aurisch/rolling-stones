# Rolling-Stones 🟦

**Eine virtuelle Kugelbahn zum Selberbauen – für Jannik.**

Rolling-Stones ist ein geplantes, kindgerecht bedienbares Webspiel: Aus sechseckigen Bauteilen entsteht eine Kugelbahn. Die Kugel bewegt sich nicht automatisch zum Ziel, sondern folgt der Schwerkraft. Reibung, Kurven und Steigungen entscheiden, ob sie ankommt oder unterwegs stehen bleibt.

Der Browser-Prototyp bietet einen 2D-Baueditor, eine spielbare Beispielbahn, eine vereinfachte Rollsimulation und eine zusätzliche 3D-Ansicht. Zum lokalen Starten im Projektordner `python3 -m http.server 8000` ausführen und `http://localhost:8000` öffnen. Für die 3D-Ansicht benötigt der Browser WebGL und Internetzugriff auf jsDelivr.

Die folgenden Abschnitte beschreiben die Spielregeln und den geplanten Ausbau. Höhenstapel entstehen im Prototyp automatisch beim Anheben von Bahnstücken. Die Brückenprüfung und das Zurückrollen sind noch offen.

## Spielprinzip

Auf einem lückenlos gedachten Sechseckraster baut der Spieler eine Strecke von einem ausgezeichneten **Startbauteil** bis zu einem **Zielbauteil**. Am Start liegt zunächst eine Kugel; das gerade Startstück besitzt ein Gefälle von −1 und setzt sie in Bewegung.

Der Spieler wählt Bahnelemente aus, setzt sie an passende Nachbarn, dreht sie in 60°-Schritten und ergänzt bei Bedarf Stützelemente. Anschließend startet er die Simulation und beobachtet, ob die Kugel das Ziel erreicht. Misslingt der Versuch, kann die Bahn verändert werden.

Die Bedienung soll auch ohne Lesekenntnisse funktionieren, insbesondere auf einem iPad.

## Bauteile

| Typ | Schienenführung | Besonderheit |
| --- | --- | --- |
| Gerade | gegenüberliegende Seiten (180°) | waagerecht |
| Leichte Kurve | Seiten mit 120° Abstand | mehr Verluste als Gerade |
| Enge Kurve | Seiten mit 60° Abstand | mehr Verluste als leichte Kurve |
| Steigung | gerade | Austritt eine Ebene höher (+1) |
| Gefälle | gerade | Austritt eine Ebene tiefer (−1) |
| Start | gerade | anfänglich Gefälle −1, Kugel liegt bereit |
| Ziel | noch festzulegen | beendet einen erfolgreichen Lauf |
| Stützelement | **keine Schiene** | gleiche sechseckige Außenform, stapelbar |

Die Winkel 60°, 120° und 180° bezeichnen den Abstand der beiden angeschlossenen Sechseckseiten, nicht den Ablenkwinkel der Bewegungsrichtung. Die Kurven gibt es in gespiegelten bzw. gedrehten Orientierungen.

Spätere Ideen: Beschleuniger, Wippe und weitere Spezialbauteile.

## Raster und Koordinaten

Jedes Sechseck hat sechs Nachbarn. Vorgesehen ist ein ganzzahliges Koordinatensystem `(x, y, z)`:

- Bei geradem `x`: `y = 1, 3, 5, …`
- Bei ungeradem `x`: `y = 0, 2, 4, …`
- Die sechs Nachbarn von `(x,y)` liegen bei `(x,y±2)` und `(x±1,y±1)`.
- `z = 0` ist die Bodenebene. Eine Erhöhung um 1 entspricht einer zusätzlichen Bauteilschicht.
- Die Ausrichtung eines Bauteils wird in sechs Schritten zu jeweils 60° gespeichert.

**Normierte Maße (vorläufig):** Sechseck-Seitenlänge `a = 10`, Schichthöhe `h = 1`. Damit beträgt der Abstand gegenüberliegender Seiten `10√3 ≈ 17,32` und die Neigung einer geraden Rampe über diesen Abstand etwa `3,3°`. Absolute Maßeinheiten können später festgelegt werden.

Für Steigungen und Gefälle müssen **Eintritts- und Austrittshöhe** getrennt berücksichtigt werden: Ein einziges `z` beschreibt nicht beide Schienenenden.

## Konstruktionsregeln

1. Normale Bahnelemente stehen auf dem Boden oder auf einem lückenlosen Stapel aus Stützelementen.
2. **Bahnelemente dürfen nicht auf anderen Bahnelementen gestapelt werden.**
3. Stützelemente haben dieselbe äußere Sechseckform wie Bahnelemente, jedoch keine Schiene.
4. Bei `z = 0` sind keine Stützen erforderlich; bei `z = n` benötigt ein reguläres Bahnelement `n` Stützelemente darunter.
5. Benachbarte Schienen müssen an derselben gemeinsamen Seitenmitte und auf derselben Anschlusshöhe zusammentreffen.
6. Ein Gefälle von −1 führt zur nächsten um eine Schicht niedrigeren Ebene, eine Steigung von +1 entsprechend höher.
7. Alle Konstruktionen sollen grundsätzlich mit echten, stapelbaren Sechsecken nachbaubar sein. Definierte Spezialelemente dürfen eigene Tragregeln besitzen.

### Brücke

Eine Brücke ist eine besondere **Anordnung aus genau drei Sechsecken in einer geraden Reihe**, alle auf derselben Höhenebene:

- Anfang: 120°-Kurve
- Mitte: Gerade (180°)
- Ende: entgegengesetzte 120°-Kurve (−120°)

**In der Draufsicht** führt die Bahn am einen Ende nach oben aus der geraden Verbindung heraus, am anderen nach unten. Das bezeichnet nur die Richtung auf dem Bildschirm – **keine Steigung**. Die Brücke liegt vollständig waagerecht.

Die äußeren Brückenelemente stehen auf Stützelementen bis zum Boden; das mittlere darf **ohne eigene Stütze** zwischen ihnen liegen. Auf `z = 0` kann dieselbe dreiteilige Anordnung ohne Säulen gebaut werden.

Die Brücke wird damit durch die Kombination vorhandener Schienenformen und einer speziellen Tragregel beschrieben, nicht durch eine neue Art von Höhenverlauf.

## Physiksimulation

Die Kugel soll entlang der tatsächlichen Schienenbahn simuliert werden. Für jedes Element lassen sich Eintritts- und Austrittsgeschwindigkeit ausgeben.

Das Modell berücksichtigt mindestens:

- Schwerkraft und Höhenunterschiede;
- Rollbewegung einschließlich Rotationsenergie;
- Rollwiderstand;
- zusätzliche, zunächst kalibrierbare Verluste in Kurven (enge Kurve > leichte Kurve > Gerade);
- Anhalten innerhalb eines Elements und gegebenenfalls Zurückrollen auf Steigungen.

Die Simulation soll nicht künstlich garantieren, dass eine gebaute Bahn funktioniert. Ein Erfolg liegt nur vor, wenn die Kugel das Ziel tatsächlich erreicht. Die physikalischen Parameter und ihre Kalibrierung sind noch offen.

## Geplante WebApp

- Großer Baueditor in Draufsicht mit sechseckigem Raster
- Bauteile per Touch auswählen, platzieren, drehen, austauschen und entfernen
- Stützelemente und Höhenebenen verwalten
- Verbindungen und Tragfähigkeit prüfen
- Kugel starten, animieren und zurücksetzen
- Erkennbar machen, wo und warum die Kugel stehen bleibt
- Optional Eintritts-/Austrittsgeschwindigkeiten anzeigen
- Bahnen lokal speichern und später wieder laden
- Kindgerechte Bedienung ohne erforderliche Lesekenntnisse

**Technik:** Der Prototyp läuft mit JavaScript-Modulen ohne Build-Schritt. Baueditor, Simulation und 3D-Ansicht verwenden dasselbe Bahnmodell.

## Entwicklungsplan

1. Datenmodell für Raster, Schienenanschlüsse, Höhen und Stützen
2. Interaktiver 2D-Baueditor mit Drehung und Validierung
3. Start, Ziel und zusammenhängende Strecken
4. Kontinuierliche Kugelsimulation mit Schwerkraft und Verlusten
5. Brückenregel und komplexere Höhenkonstruktionen
6. Speichern, kindgerechte Bedienung und Feinschliff
7. Später zusätzliche Spezialbauteile

## Hintergrund

Dieses Spiel entsteht als gemeinsames Projekt für Jannik. Die Idee verbindet kreatives Bauen, räumliches Denken, Ausprobieren und ein nachvollziehbares physikalisches Ergebnis.

**Ziel ist nicht, dass jede Kugel ankommt – sondern dass Jannik herausfinden kann, wie er eine funktionierende Kugelbahn baut.**
