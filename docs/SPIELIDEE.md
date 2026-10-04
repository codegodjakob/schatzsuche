# Spielidee

> Lebendes Dokument. Die Idee entsteht beim Bauen. Was entschieden ist, steht unter
> „Entschieden“. Was noch offen ist, steht unter „Offene Fragen“. Neue Einfälle kommen
> als Issue mit der Vorlage „Idee“ und landen hier, wenn ihr euch einig seid.
> Das ausgearbeitete Gesamtbild mit allen Systemen und Etappen steht in `docs/SPIELENTWURF.md`.

## Der Kern in einem Satz

Du wachst fast nackt auf einer Wiese in einer Fantasy-Mittelalter-Welt auf. Durch Erkunden,
Entscheidungen und Aufgaben wirst du vom Niemand zu jemandem, der Häuser baut und am Ende
eine eigene Siedlung führt.

## Woher die Idee kommt

Die ursprüngliche „Schatzsuche“ war ein reines Kopfspiel. Ein Erzähler beschrieb die Welt, und die
Mitspieler stellten sie sich vor. Deshalb gab es unendlich viele Möglichkeiten. Eine Zeit lang war
auch ein reines Textspiel mit einem KI-Erzähler im Gespräch. Jetzt bauen wir es in 3D. Der Erzähler
lebt in den Ereignissen weiter: Text plus Entscheidungen, möglichst viele davon.

## Vorbilder und was wir von ihnen nehmen

| Vorbild | Was wir übernehmen |
|---|---|
| Eragon, Herr der Ringe | Die Welt: Fantasy-Mittelalter, ernst, eher realistisch als bunt |
| GTA | Frei herumlaufen; die Welt bietet dir unterwegs Ereignisse und Aufgaben an |
| The Witcher | Die Sicht aus den eigenen Augen oder über die Schulter; Entscheidungen mit Folgen |
| Minecraft | Rohstoffe sammeln, Inventar, Dinge herstellen |
| Die Siedler | Später: Häuser bauen, Wirtschaft, Verwaltung von oben |
| Klassische Rollenspiele | Gleich zu Beginn viel zu tun: Waffen bauen, Monster besiegen, Bosse angreifen |
| Roblox | Leicht verständlich für alle Altersgruppen; sofort Spaß, dann lange dabeibleiben |

## Der Bogen des Spiels

1. **Erwachen.** Nichts außer einem Lendenschurz. Wiese, Teich, Wald. *(gebaut)*
2. **Überleben.** Hunger, Durst, Kälte; Wasser am Teich, Beeren, Äste sammeln, Feuer machen,
   ein Speer als erstes Werkzeug. *(gebaut)*
3. **Begegnungen.** Menschen, Tiere, erste Aufgaben. *(angefangen: der Einsiedler am Lagerfeuer)*
4. **Der erste Kampf.** Schon in den ersten Minuten: Waffen herstellen, Monster besiegen, einen
   ersten Boss sehen und angreifen. Hier packt das Spiel einen.
5. **Aufstieg.** Du wirst jemand: Stufen und Fähigkeiten, Währung, Kleidung, Rüstung, Werkzeug,
   ein Pferd. Gegner und Bosse werden mit dir stärker.
6. **Siedeln.** Ein Haus bauen, dann mehrere, Burgen, ein eigenes Reich. Der Blick wechselt zur
   Aufsicht wie bei den Siedlern.

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

## Grundsätze für Spaß und Fortschritt (Oktober 2026)

Diese Grundsätze ergänzen alles oben. Die Grundidee bleibt, nichts davon ist eine Korrektur.

- **Sofort packend, ohne alles vorwegzunehmen.** Die ersten Minuten müssen richtig gut sein: viel zu
  tun, schnelle Erfolge, schöne Bilder. Der Anfang zeigt aber nur einen Vorgeschmack. Das Meiste und
  Größte kommt später.
- **Langer Atem.** Es gibt immer ein nächstes Ziel: die nächste Stufe, die nächste Waffe, der nächste
  Boss, das nächste Gebäude. Am Ende baut man ganze Welten auf: Häuser, Burgen, ein Reich.
- **Sehr viele Möglichkeiten, trotzdem leicht verständlich.** Viele Rezepte, Waffen, Wege und
  Entscheidungen. Man sieht aber immer nur, was gerade passt. Neues wird gezeigt, wenn es nützlich
  wird. Am Anfang ist alles eindeutig: ein klares Ziel, eine klare nächste Handlung.
- **Fortschritt, den man sieht und spürt.** Erfahrung, Stufenaufstiege, bessere Ausrüstung, ein
  wachsendes Inventar, ein wachsender Besitz.
- **Schöne Grafik gehört zum Spaß.** Überzeugende Bilder sind ein Grund, weiterzuspielen.
- **Für alle Altersgruppen.** Das Ziel ist auch eine Fassung auf Roblox. Darum muss es ohne
  Vorwissen verständlich sein.
- **Große Iteration.** Lieber oft eine spielbare Fassung als selten eine perfekte.

Der Fahrplan dazu steht in den Issues:
- [#7 Der erste Kampf](https://github.com/codegodjakob/schatzsuche/issues/7)
- [#8 Fortschritt](https://github.com/codegodjakob/schatzsuche/issues/8)
- [#9 Herstellen](https://github.com/codegodjakob/schatzsuche/issues/9)
- [#10 Handel und Besitz](https://github.com/codegodjakob/schatzsuche/issues/10)
- [#11 Bauen und Siedeln](https://github.com/codegodjakob/schatzsuche/issues/11)
- [#12 Roblox](https://github.com/codegodjakob/schatzsuche/issues/12)
- [#13 KI-Erzähler](https://github.com/codegodjakob/schatzsuche/issues/13)

### Was „Roblox“ für die Technik bedeutet

Roblox-Spiele werden in Roblox Studio gebaut, in der Programmiersprache Luau, mit Roblox-Figuren und
eigenen Bausteinen. Die Browser-Fassung lässt sich dort nicht hochladen. Daraus folgt:

- Die Browser-Fassung ist die Werkstatt, in der wir schnell herausfinden, was Spaß macht.
- Inhalte (Ereignisse, Gegenstände, Rezepte, Gegner, Aufgaben) stehen als Listen in eigenen Dateien.
  So lassen sie sich später nach Roblox übertragen.
- Figuren und Bewegungen müssten auf Roblox neu entstehen. Die jetzigen Bewegungsaufnahmen dürfen
  ohnehin nicht kommerziell genutzt werden.
- Wann der Wechsel kommt, ist offen ([Issue 12](https://github.com/codegodjakob/schatzsuche/issues/12)).

## Offene Fragen

- Wie entsteht die Welt beim Herumlaufen: von Hand gebaut, zufällig erzeugt oder beides?
- Welche Tiere gibt es, und kann man jagen? (Der Speer wartet darauf.)
- Was erzählt der Einsiedler über die Welt, und wohin schickt er einen als Nächstes?
- Wann und wie geht es vom Einzelkämpfer zur Siedlung über?
- Wie heißt das Spiel wirklich? („Schatzsuche“ ist nur der Projektname.)
- Welche Monster und welcher erste Boss? Wie stark werden sie mit der Zeit?
- Wofür gibt es Erfahrung, und was bringt eine neue Stufe?
- Was kann man kaufen, und womit bezahlt man?
- Wann bauen wir die Roblox-Fassung, sobald der Kern Spaß macht oder erst später?
- Soll das Spiel einmal verkauft werden? Dann müssen die Bewegungsaufnahmen ersetzt werden
  (siehe `docs/QUELLEN.md`).
