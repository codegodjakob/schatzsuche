# Spielentwurf

> Das Gesamtbild: alle Systeme, wie sie zusammenhängen, und in welcher Reihenfolge wir sie bauen.
> Die Grundidee und alle Entscheidungen stehen in `docs/SPIELIDEE.md`; dieser Entwurf baut darauf
> auf und füllt die Lücken. Alles hier ist ein Vorschlag, bis es gebaut ist. Was sich beim Spielen
> nicht bewährt, ändern wir.

## Der Kreislauf, der alles antreibt

```
Erkunden ──► Sammeln ──► Herstellen ──► Kämpfen und Arbeiten ──► Geld, Erfahrung, Ansehen
   ▲                                                                       │
   │                                                                       ▼
Neue Gebiete, Ränge, Besitz  ◄──  Bessere Ausrüstung, Stufen, Berufe  ◄────┘
   │
   ▼
Verwalten: Dorf, Burg, Reich (Siedler-Ebene)  ──►  noch größere Ziele
```

Das Spiel hat drei Zeitebenen, damit es sofort packt und trotzdem lange trägt:

| Ebene | Dauer | Was man tut |
|---|---|---|
| Augenblick | Minuten | Kämpfen, Sammeln, Angeln, Herstellen, eine Aufgabe erledigen |
| Fortschritt | Stunden | Stufen, Berufe, Klassen, Ausrüstung, Geld, Beziehungen |
| Lebenswerk | Wochen | Ränge, Besitz, ein Dorf führen, eine Burg bauen, König werden, den Schatz finden |

## Die Hauptgeschichte: die Schatzsuche

Der Name des Projekts wird zur Geschichte. Man wacht auf der Wiese auf und hat nur einen
Lendenschurz an. Darin steckt ein zerrissenes Stück Pergament mit seltsamen Zeichen. Der
Einsiedler erkennt es: Es ist ein Teil der Karte zum Schatz der Alten Könige.

- Die Karte ist in sieben Teile zerrissen. Jedes Teil liegt in einem anderen Gebiet und wird
  bewacht: von einem Boss, einem Rätsel oder einem Menschen, der es nicht hergeben will.
- Jedes gefundene Teil zeigt ein Stück mehr von der Welt und öffnet neue Wege.
- Der Schatz ist mehr als Gold. Er ist das Recht auf die Krone und das alte Wissen der Könige,
  vielleicht sogar Magie. Damit schließt sich der Kreis zum Aufstieg bis zum König.
- Wer man vor dem Erwachen war, erfährt man nach und nach.

So hat man vom ersten Moment an ein großes Ziel, und jedes andere System zahlt darauf ein.

## 1. Die Figur

**Charakter-Editor** (wie bei den Mii-Figuren der Wii, nur realistisch):
- Mann oder Frau, Name.
- Gesicht: Form, Nase, Kinn, Augen, Augenfarbe.
- Haut: mehrere Töne.
- Haare: Frisur und Farbe. Bart (bei Männern): Form und Farbe.
- Körper: Größe, Statur, Gewicht.

**Der Körper verändert sich mit dem Leben, das man führt:**
- Muskeln wachsen mit Stärke und schwerer Arbeit (Holz hacken, Schmieden, Kämpfen).
- Das Gewicht folgt dem Essen. Hunger macht schlanker, Völlerei runder.
- Haare und Bart wachsen jeden Spieltag. Schneiden kann man sie mit einem Messer (zottelig) oder
  beim Barbier im Dorf (gepflegt, mit Auswahl der Frisur).
- Schmutz von Arbeit und Kampf, abwaschen im Teich oder Badehaus.
- Bräune von der Sonne, Narben von schweren Kämpfen.
- Nach sehr langer Spielzeit altert die Figur leicht.

**Kleidung und Rüstung sieht man an der Figur**, in Schichten:
- Unterkleid
- Hemd
- Hose
- Schuhe
- Umhang
- Kopf
- Rüstungsteile

Der Weg führt vom Lendenschurz über Leinen, Leder und Kettenhemd zur Platte. Kleidung lässt sich
färben.

## 2. Werte, Stufen, Klassen, Berufe

**Erfahrung und Stufen.** Erfahrung gibt es für fast alles:
- Kämpfen
- Sammeln und Herstellen
- Aufgaben
- Entdecken
- Arbeit

Jede Stufe bringt drei **Statuspunkte** zum Verteilen:

| Wert | Wirkt auf |
|---|---|
| Stärke | Schaden im Nahkampf, schwere Dinge tragen, sichtbare Muskeln |
| Geschick | Treffen, Fernkampf, feines Handwerk, Schleichen |
| Ausdauer | Leben, Puste, Hunger und Kälte aushalten |
| Verstand | Schneller lernen, mehr Rezepte, später Magie |
| Ausstrahlung | Preise, Überzeugen, Beziehungen, Aufstieg in Politik und Gilden |

**Klassen.** Ab Stufe 5 wählt man bei einem Lehrmeister eine Klasse. Ein späterer Wechsel geht,
kostet aber Mühe.

| Klasse | Stärken | Lehrmeister |
|---|---|---|
| Krieger | Nahkampf, Rüstung, Führung im Militär | Hauptmann der Wache |
| Waldläufer | Bogen, Fallen, Spuren lesen, Jagd | der Einsiedler |
| Handwerker | Bessere Gegenstände, schneller bauen | Schmiedemeisterin |
| Händler | Preise, Karawanen, Gilden, Politik | Kaufmann im Dorf |
| Heiler | Kräuter, Tränke, Heilen, Ansehen beim Volk | Kräuterfrau |

Später gibt es **Meisterklassen** wie Ritter, Meisterjäger, Baumeister, Kaufherr und den Hüter des
alten Wissens. Letzterer kommt mit dem Schatz und mit Magie.

**Berufe** lernt jeder, unabhängig von der Klasse. Sie steigen durch Tun, von Lehrling über
Geselle bis Meister:

| Beruf | Was man tut |
|---|---|
| Sammeln und Kräuterkunde | Fasern, Beeren, Kräuter, Pilze |
| Holzfällen | Äste, Scheite, Stämme |
| Bergbau | Stein, Feuerstein, Erze, Edelsteine |
| Fischen | Fische in Teich, Fluss, See und Meer; seltene Fänge |
| Jagen | Fleisch, Fell, Leder, Knochen |
| Kochen | Mahlzeiten, die länger satt machen und Vorteile geben |
| Schmieden | Werkzeug, Waffen, Rüstung aus Metall |
| Schreinern | Bögen, Möbel, Bauteile |
| Gerben und Schneidern | Leder, Stoffe, Kleidung |
| Bauen | Unterschlupf, Hütte, Haus, später ganze Orte |
| Handeln | Bessere Preise, Waren zwischen Orten handeln |

**Fähigkeiten**: Jede Klasse und jeder Beruf hat einen kleinen Baum mit freischaltbaren
Fähigkeiten, zum Beispiel „Doppelter Fang“, „Wuchtiger Hieb“ oder „Feilschen“.

## 3. Gegenstände, Inventar, Herstellen

**Materialien in Stufen:**

| Gruppe | Stufen |
|---|---|
| Holz | Ast, Scheit, Stamm, Brett |
| Stein | Stein, Feuerstein, Bruchstein, Steinblock |
| Metall | Kupfer, Zinn, Bronze, Eisen, Stahl, Silber, Gold |
| Pflanzen | Fasern, Beeren, Kräuter, Pilze, Getreide, Flachs |
| Tier | Fleisch, Fisch, Fell, Leder, Knochen, Federn |
| Stoffe | Garn, Leinen, Wolle |
| Wertvolles | Edelsteine, alte Münzen, Kartenteile |

**Werkzeug und Waffen** gibt es in den Stufen Stein, Bronze, Eisen und Stahl. Bessere Stufen
sammeln schneller, treffen härter und halten länger.

**Herstellen** geht an verschiedenen Orten. Was man herstellen kann, hängt vom Ort ab:

| Ort | Was dort entsteht |
|---|---|
| Hände | Einfaches |
| Lagerfeuer | Kochen, Brennen |
| Werkbank | Holz und Werkzeug |
| Esse und Amboss | Metall |
| Gerberei | Leder |
| Webstuhl | Stoff |
| Kräutertisch | Tränke |

**Das Rezeptbuch** zeigt zuerst, was man gerade herstellen kann. Was fehlt, steht in klarer
Sprache daneben. Neue Rezepte bekommt man durch Stufen, Fundstücke, Lehrmeister und Bücher.

**Das Inventar** ist groß, in Kategorien sortiert, und Gleiches stapelt sich. Ein Gewicht gibt es
nicht. Nur wirklich schwere Dinge sind begrenzt, etwa Baumstämme, Steinblöcke und Erzbrocken.
Davon trägt man nur wenige. Mehr geht mit Packesel, Karren oder Pferd.

**Truhen zu Hause** bewahren Dinge sicher auf. Wer stirbt, verliert nur, was er bei sich trägt.
Deshalb lohnen sich ein Zuhause und ein Lager.

## 4. Die Welt

| Gebiet | Was es dort gibt |
|---|---|
| Erlenwiese (Start) | Teich, Wald, Einsiedler |
| Dunkelwald | Wölfe, Räuberlager, Kräuter |
| Graufels-Berge | Minen, Erze, Trolle, Höhlen |
| Moorland | Seltene Kräuter, Nebel, Rätsel |
| Seeufer und Küste | Fischerdörfer, Handel, große Fische |

**Orte, die mit dem Spieler wachsen:**

| Ort | Was dort ist |
|---|---|
| Einsiedlerlager | Der erste Mentor |
| Dorf Erlenbach | Händler, Fischer, Schmiede, Gasthaus, Barbier, Älteste |
| Räuberlager „Krähennest“ | Der erste Boss: der Räuberhauptmann |
| Burgstadt Rabenfels | Garnison, Gilden, Markt, Rat |
| Königsmark | Hauptstadt und Hof des Königs |

**Reisen** geht zu Fuß, mit dem Pferd und später mit der Kutsche. Zwischen Orten, die man schon
besucht hat, gibt es eine Schnellreise.

## 5. Menschen und Beziehungen

- Jeder Mensch hat einen Namen, einen Beruf und einen Tagesablauf: arbeiten, essen, schlafen.
- Jeder Mensch hat eine Beziehung zum Spieler. Sie wächst durch Hilfe, Geschenke und
  Entscheidungen und sinkt durch Lügen, Diebstahl und Gewalt.
- Gute Beziehungen bringen bessere Preise, Aufgaben und Hilfe in der Not. Später sind auch
  Gefährten und eine Familie möglich.
- Dazu kommen Gruppen mit eigenem Ansehen:
  - die Dörfler von Erlenbach
  - die Räuberbande „die Krähen“
  - die Wache von Rabenfels
  - die Gilden
  - der Orden der Alten, der über den Schatz wacht
  - der Hof des Königs

## 6. Aufgaben

| Art | Was sie bringen |
|---|---|
| Hauptgeschichte | Die Schatzsuche, sieben Kartenteile |
| Nebenaufgaben | Kleine Geschichten von Menschen im Dorf und unterwegs |
| Arbeitsaufträge (Jobs) | Holz hacken, bei der Ernte helfen, Wache stehen, Fische liefern, Botengänge. Bringt Geld, Berufserfahrung und Ansehen |
| Kopfgelder | Bestimmte Räuber oder Bestien besiegen |
| Rangaufgaben | Beweisen, dass man den nächsten Rang verdient |

Das Aufgabenbuch zeigt immer den nächsten klaren Schritt. Ein Hinweis in der Welt zeigt, wohin.

## 7. Kampf

- **Nahkampf**: Hieb, Stich, Block, Ausweichen.
- **Fernkampf**: Steinschleuder, Speerwurf, Bogen.
- **Gegner**:
  - Tiere: Wolf, Wildschwein, Bär
  - Menschen: Räuber, Söldner
  - später Fantasy: Troll, Oger, ganz spät ein Drache
- **Bosse** bewachen Kartenteile, zum Beispiel der Räuberhauptmann, der Höhlentroll und der
  Keiler „Narbenhauer“.
- Jedes Gebiet hat eine Gegnerstärke. Wer zu früh kommt, merkt es und kommt später stärker
  zurück. So sieht man den Boss früh, besiegt ihn aber erst, wenn man bereit ist.

## 8. Geld und Wirtschaft

- **Münzen**: Kupfer, Silber, Gold.
- **Händler** kaufen und verkaufen. Die Preise hängen von Angebot und Nachfrage ab: Wer zehn
  Fische auf einmal verkauft, bekommt für den zehnten weniger. In der Stadt zahlt man andere
  Preise als im Dorf, deshalb lohnt sich Handel zwischen Orten.
- **Geld verdient man so:**
  - Beute
  - Jobs
  - Verkauf von Fängen und Hergestelltem
  - später Mieten, Pacht und Steuern
- **Ausgeben kann man es für:**
  - Werkzeug, zum Beispiel eine Angelrute
  - Kleidung und Rüstung
  - ein Pferd
  - ein Haus
  - Ausbildung bei Lehrmeistern
  - Bestechung

## 9. Aufstieg: Ränge und Laufbahnen

| Laufbahn | Ränge |
|---|---|
| Militär | Rekrut, Wachmann, Hauptmann, Kommandant, Feldherr |
| Verwaltung und Politik | Bürger, Ratsmitglied, Statthalter (Dorf), Burgherr, Fürst, König |
| Gilden | Lehrling, Geselle, Meister, Gildenmeister |

Aufsteigen kann man durch Ansehen, Stufe, Rangaufgaben und Beziehungen zu den richtigen Leuten.
Ränge bringen Lohn, Rechte und Pflichten.

## 10. Die Siedler-Ebene

Wird man **Statthalter** eines Dorfes, wechselt das Spiel auf Wunsch in die **Aufsicht von oben**.

- **Bauen**: Gebäude setzen und ausbauen.
- **Arbeit verteilen**: Bürgern Arbeit geben, etwa als Holzfäller, Bauer, Schmied oder Wache.
- **Warenketten**: Holzfäller, Sägewerk, Schreiner. Feld, Mühle, Bäcker. Mine, Schmelze, Schmied.
- **Bedürfnisse der Bürger**: Nahrung, Wohnen, Sicherheit, Freude und Glaube. Zufriedene Bürger
  arbeiten mehr und bleiben. Unzufriedene ziehen weg oder murren.
- **Steuern und Schatzkammer**: Steuern füllen die Kasse, die Kasse bezahlt Bauten.
- **Ereignisse**: Feuer, Räuberangriffe, Missernten, Feste, Gesandte.
- **Wachstum**: Weiler, Dorf, Marktflecken, Stadt, Burgstadt. Als Burgherr, Fürst und König
  verwaltet man mehrere Orte.
- **Jederzeit zurück**: Man kann immer in die eigene Figur zurückwechseln, über die Schulter oder
  aus den eigenen Augen, und durch das eigene Dorf laufen.

## 11. Jedes Spiel anders: später mit KI

- Schon jetzt: Die Welt entsteht aus Bausteinen und einer Zufallszahl (Saat). So lassen sich
  Karte, Orte, Fundorte und Aufgaben in Varianten erzeugen.
- Später erzeugt eine KI über eine Schnittstelle neue Varianten innerhalb des Grundgerüsts:
  - andere Karten
  - Städte und Dörfer
  - Menschen mit Persönlichkeit
  - Aufgaben
  - Materialien und Klassen
  - der KI-Erzähler aus Issue #13
- Deshalb stehen alle Inhalte schon jetzt als Listen mit festem Aufbau in eigenen Dateien. Die
  KI muss später nur neue Listen im gleichen Aufbau liefern.

## 12. Bedienung: viel drin, leicht verständlich

- **Ein Knopf für alles in der Nähe**: `E` oder Antippen zum Nehmen, Sprechen, Angeln und Öffnen.
  Das Spiel zeigt, was er gerade tut.
- **Schnellleiste**: Waffe und Werkzeug wechseln mit `1` bis `5` oder Antippen.
- **Ein Menü mit Reitern**: Inventar, Herstellen, Figur, Aufgaben, später Karte.
- **Klare Ziele**: Am Bildschirmrand steht immer die nächste Aufgabe mit dem nächsten Schritt.
- **Neues dann, wenn es gebraucht wird**: Der Einsiedler und der Erzähler führen ein. Es gibt
  keine Erklärungstafeln am Anfang.
- **Rechner und Handy gleichwertig**: Maus und Tastatur oder Finger.

## Etappen

Jede Etappe ist spielbar und wird als Vorschau veröffentlicht. Grafik und Figuren werden in jeder
Etappe ein Stück besser.

| Etappe | Inhalt |
|---|---|
| **M1 Fundament** (die Grundversion) | 1. RPG-Kern: Werte, Stufen, Statuspunkte, großes Inventar, Sammeln, Rezeptbuch, Aufgabenbuch, Münzen. 2. Kampf: Waffen, Räuber, der Räuberhauptmann als erster Boss, Beute. 3. Dorf Erlenbach: Händler, Fischer mit Angelrute, Angeln, Jobs. 4. Charakter-Editor: Gesicht, Haut, Haare, Bart, Körper; Haare und Bart wachsen; Muskeln wachsen; erste Kleidung sichtbar |
| **M2 Leben im Dorf** | Weitere Berufe (Bergbau, Schmieden, Kochen, Gerben), Beziehungen, Tagesabläufe, Haus mieten, Truhe, Pferd |
| **M3 Abenteuer** | Neue Gebiete, Tiere, Höhlen, Bogen, weitere Bosse, Kartenteile 1 bis 3 |
| **M4 Aufstieg** | Klassen und Fähigkeitsbäume vollständig, Ränge in Militär, Rat und Gilden, Burgstadt Rabenfels |
| **M5 Statthalter** | Die Siedler-Ebene für ein Dorf |
| **M6 Burg und Reich** | Burgherr, mehrere Orte, der Weg zur Krone, Ende der Schatzsuche |
| **M7 KI und Roblox** | Welt-Varianten per KI, Roblox-Fassung (#12), Mehrspieler |

## Offene Fragen für Jakob und Vincenz

- **Mehrspieler**: Auf Roblox spielt man fast immer mit anderen. Soll man später gemeinsam in
  einer Welt spielen, handeln und bauen können? Das würde die Technik früh beeinflussen.
- **Magie**: Eragon hat Magie. Soll es sie geben, und erst spät mit dem Schatz?
- **Tod**: Ist es zu hart, beim Tod alles Mitgetragene zu verlieren? Oder lieber nur einen Teil?
