# Spielidee

> Lebendes Dokument. Die Idee entsteht beim Bauen. Was entschieden ist, steht unter
> „Entschieden“. Was noch offen ist, steht unter „Offene Fragen“. Neue Einfälle kommen
> als Issue mit der Vorlage „Idee“ und landen hier, wenn ihr euch einig seid.

## Der Kern in einem Satz

Du wachst fast nackt auf einer Wiese in einer Fantasy-Mittelalter-Welt auf. Durch Erkunden,
Entscheidungen und Aufgaben wirst du vom Niemand zu jemandem, der Häuser baut und am Ende
eine eigene Siedlung führt.

## Vorbilder und was wir von ihnen nehmen

| Vorbild | Was wir übernehmen |
|---|---|
| Eragon, Herr der Ringe | Die Welt: Fantasy-Mittelalter, ernst, eher realistisch als bunt |
| GTA | Frei herumlaufen; die Welt bietet dir unterwegs Ereignisse und Aufgaben an |
| The Witcher | Die Sicht aus den eigenen Augen oder über die Schulter; Entscheidungen mit Folgen |
| Minecraft | Rohstoffe sammeln, Inventar, Dinge herstellen |
| Die Siedler | Später: Häuser bauen, Wirtschaft, Verwaltung von oben |

## Der Bogen des Spiels

1. **Erwachen.** Nichts außer einem Lendenschurz. Wiese, Teich, Wald. *(gebaut)*
2. **Überleben.** Hunger, Durst, Kälte; Wasser am Teich, Beeren, Äste sammeln, Feuer machen,
   ein Speer als erstes Werkzeug. *(gebaut)*
3. **Begegnungen.** Menschen, Tiere, erste Aufgaben. *(angefangen: der Einsiedler am Lagerfeuer)*
4. **Aufstieg.** Du wirst jemand: Ruf, Besitz, Währung.
5. **Siedeln.** Häuser bauen, Rohstoffe verwalten. Der Blick wechselt zur Aufsicht wie bei den Siedlern.

## Entschieden

- Zwei Startfiguren, Mann und Frau. Beide starten gleich.
- Zwei Blickwinkel, umschaltbar mit `V`: über die Schulter oder aus den eigenen Augen.
- Ereignisse sind Entscheidungen mit Tasten (`E`, `Q`, `R` …). Sie stehen alle in `src/ereignisse/liste.js`.
- Das Spiel läuft im Browser. Man muss nichts installieren.
- **Grafik so realistisch wie möglich** (Jakob, Oktober 2026): echte Menschenkörper (MakeHuman),
  aufgezeichnete Bewegungen, Fototexturen, echte Bäume, Tag und Nacht. Die Grafik passt sich an den
  Rechner an (Taste `G`: hoch, mittel, niedrig).
- **Überleben** (Jakob, [Issue 3](https://github.com/codegodjakob/schatzsuche/issues/3)): ja zu allem.
  - Sättigung und Wasser sinken mit der Zeit, beim Rennen schneller.
  - Nachts wird es kalt; am Feuer wird man warm, tagsüber wärmt die Sonne.
  - Ist ein Wert leer, schwindet das Leben. Bei null stirbt man: Man wacht am nächsten Morgen wieder
    auf der Wiese auf, das Inventar ist weg. Was man in der Welt erlebt hat, bleibt.
  - Tag und Nacht: Eine Spielstunde dauert eine echte Minute, ein Tag also 24 Minuten.
- **Erste Begegnung** ([Issue 2](https://github.com/codegodjakob/schatzsuche/issues/2)): ein alter
  Einsiedler in einer Wollkutte, der am Waldrand an seinem Lagerfeuer lebt. Ein Pfad führt von der Wiese
  dorthin, sein Rauch ist von Weitem zu sehen. Er gibt zu essen und bringt einem bei, Feuer zu machen,
  wenn man ihm drei trockene Äste bringt. Danach kann man mit `F` selbst Feuer machen.

## Offene Fragen

- Wie entsteht die Welt beim Herumlaufen: von Hand gebaut, zufällig erzeugt oder beides?
- Welche Tiere gibt es, und kann man jagen? (Der Speer wartet darauf.)
- Was erzählt der Einsiedler über die Welt, und wohin schickt er einen als Nächstes?
- Wann und wie geht es vom Einzelkämpfer zur Siedlung über?
- Wie heißt das Spiel wirklich? („Schatzsuche“ ist nur der Projektname.)
- Soll das Spiel einmal verkauft werden? Dann müssen die Bewegungsaufnahmen ersetzt werden
  (siehe `docs/QUELLEN.md`).
