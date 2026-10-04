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
| **M1 Fundament** (die Grundversion) | 1. RPG-Kern: Werte, Stufen, Statuspunkte, großes Inventar, Sammeln, Rezeptbuch, Aufgabenbuch, Münzen (**fertig**, siehe unten). 2. Kampf (**fertig**, siehe unten): Waffen, Räuber, der Räuberhauptmann als erster Boss, Beute. 3. Dorf Erlenbach (**fertig**, siehe unten): Händler, Fischer mit Angelrute, Angeln, Jobs. 4. Charakter-Editor (**fertig**, siehe unten): Gesicht, Haut, Haare, Bart, Körper; Haare und Bart wachsen; Muskeln wachsen; erste Kleidung sichtbar |
| **M2 Leben im Dorf** | Weitere Berufe (Bergbau, Schmieden, Kochen, Gerben), Beziehungen, Tagesabläufe, Haus mieten, Truhe, Pferd |
| **M3 Abenteuer** | Neue Gebiete, Tiere, Höhlen, Bogen, weitere Bosse, Kartenteile 1 bis 3 |
| **M4 Aufstieg** | Klassen und Fähigkeitsbäume vollständig, Ränge in Militär, Rat und Gilden, Burgstadt Rabenfels |
| **M5 Statthalter** | Die Siedler-Ebene für ein Dorf |
| **M6 Burg und Reich** | Burgherr, mehrere Orte, der Weg zur Krone, Ende der Schatzsuche |
| **M7 KI und Roblox** | Welt-Varianten per KI, Roblox-Fassung (#12), Mehrspieler |

### Was in M1, Stufe 1 gebaut ist

- **Sammeln** mit „Benutzen“ (E oder der große Knopf): rund 70 Äste, 55 Steine, 40 Steinpilze,
  450 Blumen (weiß = Kamille, gelb = Johanniskraut, blau = Flachs), fünf Brombeersträucher und jeder
  Baum (Ast abbrechen; mit der Steinaxt Holz hacken). Alles wächst nach ein bis zwei Spieltagen nach.
  Ein goldener Ring zeigt, was „Benutzen“ gerade nehmen würde.
- **Inventar** mit 48 Plätzen, Stapeln und Münzen; Essen und Wegwerfen im Menü.
- **Herstellen**: zehn Rezepte (Schnur, Speer, Steinmesser, Steinaxt, Holzkeule, Lagerfeuer, Fackel,
  gebratene Pilze, Kamillentee, Heilsalbe), manche nur an einem Feuer oder ab einer Berufsstufe.
- **Fortschritt**: Erfahrung und Stufen, drei Statuspunkte je Stufe für fünf Werte, die wirklich
  etwas bewirken, und fünf Berufe mit eigenen Stufen (Lehrling, Geselle, Meister).
- **Aufgaben**: die Hauptgeschichte (das Pergament der Alten Könige) und sechs Nebenaufgaben; die
  verfolgte Aufgabe steht am Bildschirmrand, mit Pfeil und Entfernung zum Ziel.
- **Spielstand**: speichert sich von selbst; beim nächsten Öffnen „Weiterspielen“.
- **Tod**: Was man bei sich trägt, ist fort (außer dem Pergament); Stufen, Werte und Berufe bleiben.
  Ob das zu hart ist, steht unten bei den offenen Fragen.

Alle Inhalte stehen als Listen in `src/inhalte/`. Neue Materialien, Rezepte und Aufgaben sind neue
Einträge dort; dieselben Listen kann später eine KI für Welt-Varianten füllen.

### Was in M1, Stufe 2 gebaut ist

- **Zuschlagen** mit Linksklick, X oder dem Knopf „Schlagen“, mit der stärksten Waffe, die man
  dabeihat (sie ist in der Hand zu sehen), sonst mit den Fäusten. Die Figur dreht sich zum nächsten
  Gegner; ein Hieb trifft alle im Bogen davor. Stärke macht Schläge härter, Geschick bringt
  Volltreffer mit doppeltem Schaden.
- **Die Straße nach Osten** führt von der Wiese zum **Räuberlager**: zwei Wegelagerer an der Straße,
  zwei Räuber am Feuer, der **Räuberhauptmann** hinten bei seinem Zelt. Räuber gehen wie Halbstarke,
  der Hauptmann wie ein Riese; beide sind eigene Figuren.
- Gegner warten, entdecken einen, rennen heran, holen aus und schlagen zu. Wer zu weit wegläuft, den
  lassen sie ziehen; sie gehen heim und heilen sich. Getroffene taumeln kurz, aber nicht öfter als
  alle anderthalb Sekunden. Der Hauptmann kündigt jeden dritten Angriff an: einen schweren Tritt.
- **Beute**: Erfahrung, Kupfer, Lederfetzen, Brot, manchmal eine Keule. Der Hauptmann lässt seine
  eisenbeschlagene Keule fallen und, nur beim ersten Sieg, das **erste Kartenteil**. Besiegte kommen
  nach ein bis drei Spieltagen wieder.
- **Rüstung**: Aus vier Lederfetzen und zwei Schnüren wird ein Lederwams; es hält ein Fünftel jedes
  Schlags ab und wird von selbst getragen.
- **Geschichte**: Der Einsiedler erzählt vom Hauptmann und seinem Pergament. Nach dem Sieg erkennt
  er im Kartenteil ein Stück der Karte zum Schatz und schickt einen nach Erlenbach (Stufe 3).
- **Anzeigen**: Lebensbalken über den Gegnern, aufsteigende Schadenszahlen (gelb bei Volltreffern),
  ein großer Balken für den Hauptmann, ein roter Rand, wenn man getroffen wird.

### Was in M1, Stufe 3 gebaut ist

- **Erlenbach**: Die Straße nach Osten endet in einem Dorf aus sieben Fachwerkhäusern mit
  Strohdach (eines davon eine Scheune) um einen Dorfplatz mit Brunnen, dazu Martas Marktstand und
  am Nordrand ein Weiher mit einem Steg, auf dem man bis über das tiefe Wasser hinausgehen kann.
- **Drei Dorfbewohner**, jeder eine eigene Figur: **Gerold**, der alte Kartenleser vor seinem
  Haus, **Marta**, die Händlerin am Marktstand, und **Jost**, der Fischer am Steg. Sie schauen einen
  an, wenn man näher kommt, und winken. Ansprechen: hingehen und „Benutzen“. Damit das Spiel am
  Handy schnell startet, laden sie erst, wenn man sich dem Dorf nähert.
- **Handel** im Menü (eigener Reiter, solange man mit jemandem handelt): Marta verkauft Brot,
  Angelrute, Schnur, Fackeln, Heilsalbe, Kamillentee, Lederwams und Steinmesser und kauft alles
  andere; Jost verkauft Angelruten und gebratenen Fisch und zahlt für Fisch viel mehr als Marta.
  Kaufen kostet mehr, als Verkaufen bringt. Wer an einem Tag viel vom Gleichen verkauft, bekommt
  für jedes weitere Stück etwas weniger (höchstens die Hälfte). Ausstrahlung macht die Preise besser.
- **Angeln**: mit einer Angelrute ans Ufer oder auf den Steg, aufs Wasser schauen, „Benutzen“: Die
  Figur holt aus und wirft, ein rot-weißer Schwimmer fliegt im Bogen aufs Wasser und treibt dort. Taucht
  er unter und das Wasser kräuselt sich (Biss!), sofort noch einmal „Benutzen“: Die Rute fährt hoch.
  Wer zu früh zieht, zu lange wartet oder losläuft, geht leer aus. Vier Fische: Rotauge (häufig),
  Barsch, Forelle, Hecht (selten, viel wert). Mit der Berufsstufe „Fischen“ beißen sie schneller,
  das Zeitfenster wird größer und die großen Fische häufiger. Wer Durst hat, trinkt am Ufer zuerst;
  erst danach wirft man aus.
- **Kochen**: Rotauge und Barsch werden am Feuer zu gebratenem Fisch, eine Forelle mit Kamille (ab
  Kochen Stufe 2) zu gebratener Forelle, die auch das Leben stärkt. Den Hecht verkauft man besser.
- **Jobs**, die man immer wieder annehmen kann („Gibt es Arbeit?“): fünf Fische für Jost (20 Kupfer),
  acht Holzscheite für Martas Ofen (18 Kupfer).
- **Hauptgeschichte**: Gerold liest Pergament und Kartenteil. Die Schrift der Alten Könige zeigt den
  Weiher, die Straße und die Graufels-Berge im Norden: Dort liegt das nächste Stück.

### Was in M1, Stufe 4 gebaut ist

- **Charakter-Editor** nach der Wahl „Mann“ oder „Frau“: Die Figur steht auf der Wiese, groß im Bild,
  und lässt sich durch Ziehen drehen. Daneben (am Handy darunter) drei Reiter:
  - **Gesicht**: Kopfform (normal, rund, eckig, oval) und zehn Regler: Nase, Nasenform (Stupsnase bis
    Höcker), Augen, Augenbrauen, Mund, Lippen, Wangen, Kinn, Ohren, Ohrform (bis spitz wie ein Elf).
  - **Haare**: acht Haarfarben, Haarlänge (kahl bis lang), beim Mann der Bart (glatt bis lang).
    Brauen und Haaransatz bekommen dieselbe Farbe.
  - **Körper**: sechs Hauttöne, Größe, Statur, Gewicht.
  - Dazu ein Name und „Würfeln“ für ein zufälliges Aussehen.
- **Der Körper verändert sich im Spiel**: Haare wachsen gut einen Zentimeter am Spieltag, der Bart
  halb so schnell. Mit einem Messer schneidet man sie (Menü, Figur). Muskeln kommen mit Stärke, Holz
  hacken und Kämpfen; wer immer satt ist, wird runder, wer hungert, dünner.
- **Kleidung sichtbar**: Wer ein Lederwams hat, trägt es sichtbar.
- Technisch: Die Spielerfiguren bringen 24 Formziele für Gesicht und Körper mit (aus den
  MakeHuman-Formen), dazu Haar- und Bartlängen in Stufen; das Spiel mischt sie stufenlos.
  Haare sind zwei Netze (kurz am Kopf, lang auf Nacken und Rücken), damit beide sich richtig bewegen.
  Alles steht im Spielstand.

### Was in M2, Schritt 1 gebaut ist

Jakobs Wünsche nach M1 (#20) kommen in sieben Schritten: 1. Oberfläche und Nacht, 2. Bäume fällen und
Werkzeug-Bewegungen, 3. Graben, Aufschütten und Bauen, 4. dichterer Wald, mehr Seen, ein Bach, 5. Tiere und
Jagd mit Pfeil und Bogen, 6. mehr mit den Leuten, 7. Graufels-Berge, eine zweite Stadt, Entdeckungen.

- **Menü und Inventar** in Leder und Messing statt grauer Kästen. Jeder Gegenstand hat ein eigenes,
  gezeichnetes Bild (statt Emojis), auch im Rezeptbuch und beim Handel.
- **Die Steuerung steht nicht mehr ständig im Bild**: Ein Knopf „?“ (am Rechner oben rechts, am Handy über
  den Knöpfen) oder die Taste H klappt sie auf und zu.
- **Fundstücke sieht man**: Äste, Steine und Steinpilze sind größer, das Gras um sie herum steht niedrig,
  und ab und zu blitzt es kurz über ihnen auf, wie Sonne auf nasser Rinde (nur bis etwa 30 Meter).
- **Die Nacht**: Die Fackel trägt man sichtbar in der linken Hand, mit echter Flamme; sie leuchtet etwa
  25 Meter weit. Nachts zündet man sie von selbst an, mit T steckt man sie weg oder zündet sie an. Sie ist
  leicht zu bekommen: Der Einsiedler gibt zwei mit, wenn er das Feuermachen zeigt, und aus einem Ast und
  zwei Flachsfasern macht man überall zwei neue. Jede brennt drei Stunden. Mondnächte sind heller, und
  auch ohne Mond ist es nie ganz finster.
- **Schlafen**: Nachts (20 bis 5 Uhr) an einem brennenden Feuer heißt „Benutzen“: schlafen. Man wacht bei
  Sonnenaufgang auf, warm und geheilt, aber hungriger und durstiger. Sind Feinde in der Nähe, findet man
  keine Ruhe.

## Offene Fragen für Jakob und Vincenz

- **Mehrspieler**: Auf Roblox spielt man fast immer mit anderen. Soll man später gemeinsam in
  einer Welt spielen, handeln und bauen können? Das würde die Technik früh beeinflussen.
- **Magie**: Eragon hat Magie. Soll es sie geben, und erst spät mit dem Schatz?
- **Tod**: Ist es zu hart, beim Tod alles Mitgetragene zu verlieren? Oder lieber nur einen Teil?
