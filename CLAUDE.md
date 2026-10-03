# Schatzsuche

Ein Spiel, das Jakob (`codegodjakob`) und Vincenz (`vincenztellier`) gemeinsam bauen. Beide
arbeiten über Claude Code im Browser. Beide sind nicht technisch: Erkläre in klarem Deutsch,
ohne Fachbegriffe, die nicht sofort miterklärt werden.

Worum es im Spiel geht, steht in `docs/SPIELIDEE.md`. Die Idee entsteht beim Bauen. Wird
etwas entschieden, trage es dort ein.

## Arbeitsweise (gilt für jede Claude-Sitzung in diesem Projekt)

- Jede Aufgabe ist ein GitHub-Issue. Gibt es keins, lege eins an, bevor du loslegst.
- Nie direkt auf `main` arbeiten. Für jede Änderung einen eigenen Zweig (`kurz-was-passiert`)
  anlegen und als Pull Request vorschlagen. Im Text steht `Schließt #<Nummer>`.
- Vor dem Arbeiten den neuesten Stand holen (`git pull`), damit ihr euch nicht überschreibt.
- Entscheidungen, die beide betreffen, gehören als Kommentar ins Issue, nicht nur in den Chat.
- **Nach jeder sichtbaren Änderung eine Vorschau veröffentlichen**, damit man sie sofort
  spielen kann (siehe unten). Den Link in den Pull Request schreiben.
- Neue Mitarbeitende: siehe `EINSTIEG.md`.

## Technik in Kürze

- Läuft im Browser: `index.html` + JavaScript-Module in `src/`, 3D mit three.js.
- three.js liegt fest im Projekt (`vendor/three/`, Version 0.170.0), damit nichts aus dem
  Internet nachgeladen werden muss. Brauchst du weitere three.js-Bausteine: per
  `npm pack three@0.170.0` holen und unter `vendor/three/addons/` am gleichen Unterpfad ablegen.
- Kein Bauschritt: Dateien ändern, Seite neu laden, fertig.

| Ordner / Datei | Inhalt |
|---|---|
| `src/welt/` | Gelände, Himmel und Licht, Gras, Bäume, Felsen. `orte.js` = feste Orte |
| `src/spieler/` | Figur (Aussehen, Bewegung) und Steuerung (Laufen, Kamera) |
| `src/ereignisse/liste.js` | **Alle Ereignisse und Entscheidungen.** Hier wächst die Geschichte |
| `src/ereignisse/ereignisse.js` | Die Mechanik dahinter (nur ändern, wenn sie etwas Neues können muss) |
| `src/ui/` | Startbildschirm, Ereignis-Tafel, Inventar, Nachrichten |
| `docs/SPIELIDEE.md` | Die Spielidee: entschieden und offen |

Damit ihr euch selten in die Quere kommt: Neue Inhalte (Ereignisse, Orte) sind kleine
Einträge in Listen. Neue Systeme (Bauen, Tag/Nacht, Tiere) bekommen eine eigene Datei.

## Prüfen

```
npm install        # einmal pro Sitzung (passiert automatisch beim Sitzungsstart)
npm test           # startet das Spiel unsichtbar und prüft: läuft, bewegt sich, keine Fehler
npm start          # Spiel lokal starten
```

`npm test` legt Bildschirmfotos in `test-ergebnisse/` ab. Schau sie dir an, bevor du sagst,
dass etwas fertig ist. Vor jedem Pull Request muss `npm test` grün sein.

## Vorschau veröffentlichen

1. `npm run vorschau` → erzeugt `vorschau/index.html` und `vorschau/dateien.json`.
2. Mit dem Artifact-Werkzeug `vorschau/index.html` veröffentlichen, als `files` die Liste aus
   `vorschau/dateien.json`. Gleiche Datei = gleicher Link, die Vorschau wird also aktualisiert.
3. Den Link nennen.
