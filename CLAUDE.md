# Schatzsuche

Ein Spiel, das Jakob (`codegodjakob`) und Vincenz (`vincenztellier`) gemeinsam bauen. Beide
arbeiten über Claude Code im Browser. Beide sind nicht technisch: Erkläre in klarem Deutsch,
ohne Fachbegriffe, die nicht sofort miterklärt werden.

Worum es im Spiel geht, steht in `docs/SPIELIDEE.md`. Die Idee entsteht beim Bauen. Wird
etwas entschieden, trage es dort ein. Ziel bei der Grafik: **so realistisch wie möglich**.

## Arbeitsweise (gilt für jede Claude-Sitzung in diesem Projekt)

- Jede Aufgabe ist ein GitHub-Issue. Gibt es keins, lege eins an, bevor du loslegst.
- Nie direkt auf `main` arbeiten. Für jede Änderung einen eigenen Zweig (`kurz-was-passiert`)
  anlegen und als Pull Request vorschlagen. Im Text steht `Closes #<Nummer>` (nur das englische Wort schließt das Issue von selbst).
- Pull Requests nicht selbst zusammenführen: Die andere Person schaut drüber und führt zusammen.
- Vor dem Arbeiten den neuesten Stand holen (`git pull`), damit ihr euch nicht überschreibt.
- Entscheidungen, die beide betreffen, gehören als Kommentar ins Issue, nicht nur in den Chat.
- **Nach jeder sichtbaren Änderung eine Vorschau veröffentlichen**, damit man sie sofort
  spielen kann (siehe unten). Den Link in den Pull Request schreiben.
- Alles, was von außen kommt (Modelle, Texturen, Bewegungen, Code), mit Herkunft und Lizenz in
  `docs/QUELLEN.md` eintragen. Achtung: Die Bewegungsaufnahmen sind nur nicht-kommerziell nutzbar.
- Neue Mitarbeitende: siehe `EINSTIEG.md`.

## Technik in Kürze

- Läuft im Browser: `index.html` + JavaScript-Module in `src/`, 3D mit three.js.
- three.js liegt fest im Projekt (`vendor/three/`, Version 0.170.0), damit nichts aus dem
  Internet nachgeladen werden muss. Brauchst du weitere three.js-Bausteine: per
  `npm pack three@0.170.0` holen und unter `vendor/three/addons/` am gleichen Unterpfad ablegen.
- Kein Bauschritt fürs Spiel: Dateien ändern, Seite neu laden, fertig.
- Die Figuren (`assets/figuren/*.glb`) werden mit einem Python-Werkzeug gebaut (siehe unten) und
  fertig eingecheckt. Wer nur am Spiel arbeitet, braucht das Werkzeug nicht.

| Ordner / Datei | Inhalt |
|---|---|
| `src/welt/` | Gelände (`gelaende.js`), Himmel und Tageszeit, Gras (wächst mit dem Spieler mit), Wald (`baeume.js`), Felsen/Blumen/Beeren (`natur.js`), Wasser, Feuer, Fundstücke, Zusammenstöße. `orte.js` = feste Orte |
| `src/spieler/` | Figur (lädt GLB, überblendet Bewegungen) und Steuerung (Laufen, Kamera) |
| `src/figuren/` | Andere Figuren, z. B. der Einsiedler |
| `src/ueberleben/werte.js` | Sättigung, Wasser, Wärme, Leben, Tod |
| `src/ereignisse/liste.js` | **Alle Ereignisse und Entscheidungen.** Hier wächst die Geschichte |
| `src/ereignisse/ereignisse.js` | Die Mechanik dahinter (nur ändern, wenn sie etwas Neues können muss) |
| `src/ui/` | Startbildschirm, Ereignis-Tafel, Inventar, Nachrichten, Anzeigen; `beruehrung.js` = Fingersteuerung für Handy und Tablet |
| `src/modelle.js` | Lädt 3D-Modelle (auch in der Vorschau, wo sie als Text vorliegen) |
| `src/qualitaet.js`, `src/nachbearbeitung.js` | Grafikstufen (hoch/mittel/niedrig) und Bild-Nachbearbeitung |
| `werkzeuge/figuren/` | Python-Werkzeug, das die Figuren baut (MakeHuman + Bewegungen) |
| `docs/SPIELIDEE.md` | Die Spielidee: entschieden und offen |
| `docs/QUELLEN.md` | Herkunft und Lizenzen aller fremden Bausteine |

Damit ihr euch selten in die Quere kommt: Neue Inhalte (Ereignisse, Orte, Fundstücke) sind kleine
Einträge in Listen. Neue Systeme (Bauen, Tiere) bekommen eine eigene Datei.

## Prüfen

```
npm install        # einmal pro Sitzung (passiert automatisch beim Sitzungsstart)
npm test           # spielt das Spiel unsichtbar durch, am Rechner und auf einem nachgebauten Handy
npm start          # Spiel lokal starten
node werkzeuge/foto_spiel.mjs hoch "name:x:z:blickSeite:blickHoehe:stunde"   # Fotos zur Grafikprüfung
```

`npm test` legt Bildschirmfotos in `test-ergebnisse/` ab (Grafik „niedrig“, weil der Test-Browser
keine Grafikkarte hat). Der Handytest (`test/handytest.mjs`) bedient das Spiel nur mit dem Finger:
Stick, Wischen, Knöpfe, Ereignisse antippen. Schau sie dir an, bevor du sagst, dass etwas fertig ist. Vor jedem Pull
Request muss `npm test` grün sein. `foto_spiel.mjs` macht Fotos in jeder Stufe, ist aber ohne
Grafikkarte langsam (ein Bild in „hoch“ dauert zwischen einer und sechs Minuten).

## Figuren neu bauen (nur wenn sich Figuren ändern sollen)

```
werkzeuge/figuren/hole_quellen.sh                       # Rohdaten holen (MakeHuman, Bewegungen)
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install -r werkzeuge/figuren/requirements.txt
/tmp/venv/bin/python werkzeuge/figuren/baue_figuren.py  # baut assets/figuren/er|sie|einsiedler.glb
node werkzeuge/figuren/foto.mjs er:vorne sie:seite:gehen:0.3   # Prüfbilder in werkzeuge/figuren/ausgabe-pruefung/
```

Aussehen, Körperform, Haare, Kleidung und Bewegungen jeder Figur stehen oben in `baue_figuren.py`
(`FIGUREN`).

## Vorschau veröffentlichen

1. `npm run vorschau -- <ordner>` → legt im Ordner (ohne Angabe: `vorschau/`) `index.html`, alle
   nötigen Dateien und `dateien.json` an. Der Ordner muss dort liegen, wo das Artifact-Werkzeug
   lesen darf (Arbeitsverzeichnis oder Scratchpad). Artifacts liefern keine `.glb`-Dateien aus und
   sperren Nachladen über data:-Adressen. Darum legt das Skript die Modelle als Text ab (`.glb.txt`),
   und `src/modelle.js` entpackt sie beim Laden.
2. `npm run vorschau:pruefen -- <ordner>` → startet die Vorschau unter denselben Sperren wie auf
   claude.ai (dort ist fast alles blockiert, was nicht direkt eine eigene Datei ist). Nur
   veröffentlichen, wenn hier alles grün ist. Lokal kann etwas laufen, das auf claude.ai hängt.
3. Mit dem Artifact-Werkzeug `<ordner>/index.html` veröffentlichen, `root` = der Ordner, als `files`
   die Liste aus `dateien.json`. Damit der Link gleich bleibt, den bisherigen Link als `url` mitgeben.
   Aktuelle Vorschau: https://claude.ai/artifact/8bKmkunsU8BGSamBnMTpCi
4. Den Link nennen. Die Vorschau soll auf Rechner und Handy spielbar sein.
