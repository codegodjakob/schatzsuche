# Schatzsuche

Ein gemeinsames Projekt von Jakob (`codegodjakob`) und Vincenz (`vincenztellier`).

## Worum geht es?

Ein Spiel in einer Fantasy-Mittelalter-Welt. Du wachst fast nackt auf einer Wiese auf und wirst
durch Erkunden, Entscheidungen und Aufgaben vom Niemand zu jemandem, der am Ende eine eigene
Siedlung baut. Eine Mischung aus GTA, The Witcher, Minecraft und den Siedlern.
„Schatzsuche“ ist nur der Projektname. Die ganze Idee steht in [docs/SPIELIDEE.md](docs/SPIELIDEE.md).

## Spielen

Claude veröffentlicht nach jeder Änderung eine Vorschau als Link. Der steht im jeweiligen Pull Request.

| Taste | Was passiert |
|---|---|
| `W` `A` `S` `D` | laufen |
| `Shift` | rennen |
| `Leertaste` | springen |
| Maus | umsehen (einmal ins Bild klicken) |
| `V` | Blick über die Schulter oder aus den eigenen Augen |
| `E` | benutzen: aufheben, pflücken, Holz hacken, trinken, jemanden ansprechen, angeln, nachts am Feuer schlafen (ein goldener Ring zeigt, was gemeint ist) |
| Linksklick oder `X` | zuschlagen, mit der stärksten Waffe, die man dabeihat (sonst mit den Fäusten) |
| `E`, `Q`, `R`, `T` | Entscheidungen, solange eine Erzähltafel offen ist (auch in Gesprächen) |
| `I` | Inventar: 48 Plätze, Essen, Wegwerfen |
| `K` | Herstellen: das Rezeptbuch |
| `C` | Figur: Stufe, Werte (Punkte verteilen), Berufe, Einstellungen |
| `J` | Aufgaben: was zu tun ist, welche Aufgabe am Bildschirmrand steht |
| `Esc` | Menü schließen |
| `F` | Feuer machen (wenn man es gelernt hat) |
| `T` | Fackel anzünden oder wegstecken (nachts brennt sie von selbst in der linken Hand) |
| `G` | Grafikqualität: hoch, mittel, niedrig |
| `H` oder Knopf `?` oben rechts | Steuerung auf- und zuklappen |

Das Spiel speichert sich von selbst. Beim nächsten Öffnen steht oben „Weiterspielen“.

Auf Handy und Tablet erscheint eine Fingersteuerung:

| Finger | Was passiert |
|---|---|
| Daumen links aufsetzen und ziehen | laufen, ganz ausgelenkt rennen |
| Rechts wischen | umsehen |
| Großer Knopf unten rechts | benutzen; er zeigt an, was gerade geht („Ast aufheben“) |
| Knöpfe darüber | springen, schlagen (leuchtet rot, wenn Gegner da sind), Blickwinkel, Menü |
| Menü | Inventar, Herstellen, Figur (auch die Grafik), Aufgaben; beim Händler auch Handel |
| Knopf `?` über den Knöpfen | Steuerung auf- und zuklappen |
| Ereignis antippen | Entscheidung treffen |

## Wie wir zusammenarbeiten

Neu dabei? → [EINSTIEG.md](EINSTIEG.md). Kurzfassung — die Einzelheiten stehen in [ZUSAMMENARBEIT.md](ZUSAMMENARBEIT.md):

1. **Jede Aufgabe ist ein Issue** (ein Eintrag im Reiter „Issues"). So sieht jeder, was offen ist und wer woran sitzt.
2. **Niemand arbeitet direkt auf `main`.** Jede Änderung bekommt einen eigenen Zweig und wird als Pull Request vorgeschlagen.
3. **Der andere schaut kurz drüber**, dann wird zusammengeführt.

## Stand

| Was | Wer | Status |
|---|---|---|
| Anfangsszene: Wiese, Teich, Wald, Figur, Steuerung | Jakob | fertig |
| Erste Ereignisse: Erwachen, Feuerstein, Teich, Ast, Speer | Jakob | fertig |
| Realistische Grafik: Figuren aus MakeHuman, echte Bewegungen, Wald, Gras, Himmel, Tag und Nacht | Jakob | fertig |
| Überleben: Hunger, Durst, Kälte, Tod | Jakob | fertig |
| Erste Begegnung: der Einsiedler am Lagerfeuer, Feuer machen | Jakob | fertig |
| Rollenspiel-Kern: Stufen, Werte, Berufe, Inventar, Sammeln, Herstellen, Aufgaben, Münzen, Spielstand | Jakob | fertig (Etappe M1, Stufe 1) |
| Kampf: Waffen in der Hand, Räuberlager an der Straße nach Osten, der Räuberhauptmann als erster Boss, Beute, Lederwams, erstes Kartenteil | Jakob | fertig (Etappe M1, Stufe 2) |
| Dorf Erlenbach: Gerold, Marta und Jost, Handel, Angeln vom Steg, Fische braten, Jobs, Gerold liest die Karte | Jakob | fertig (Etappe M1, Stufe 3) |
| Charakter-Editor: Gesicht, Haare, Bart, Haut, Körper, Name; Haare und Bart wachsen und lassen sich schneiden, Muskeln und Gewicht verändern sich, Lederwams sichtbar | Jakob | fertig (Etappe M1, Stufe 4) |
| Leben im Dorf: weitere Berufe, Beziehungen, Tagesabläufe, Haus, Pferd | – | nächste Etappe (M2), siehe [docs/SPIELENTWURF.md](docs/SPIELENTWURF.md) |
