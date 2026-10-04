# Quellen und Lizenzen

Alles, was nicht selbst geschrieben oder selbst erzeugt ist, steht hier. Wer etwas Neues
von außen hinzufügt, trägt es hier ein, mit Herkunft und Lizenz.

## Wichtig: nur für nicht-kommerzielle Nutzung

Die **Bewegungsaufnahmen** (Gehen, Rennen, Winken, Hieb, Faustschlag, Tritt) stammen aus dem Bandai Namco Research
Motion Dataset. Lizenz: **CC BY-NC 4.0**. Sie dürfen mit Namensnennung genutzt werden, aber
**nicht kommerziell**. Soll das Spiel einmal verkauft werden, müssen diese Bewegungen ersetzt
werden. Das Werkzeug `werkzeuge/figuren/` kann dann andere BVH-Dateien verwenden.

## Figuren

| Was | Quelle | Lizenz |
|---|---|---|
| Menschlicher Grundkörper, Körperformen, Gesichtsformen für den Charakter-Editor (Nase, Kinn, Augen, Mund, Wangen, Ohren, Brauen, Kopf), Skelett, Haut-Gewichte, Hautbereich-Masken | [MakeHuman / MPFB2](https://github.com/makehumancommunity/mpfb2) | CC0 |
| Augen (Form und Textur) | [MakeHuman](https://github.com/makehumancommunity/makehuman) | CC0 |
| Bewegungen: Gehen, Rennen, Sprinten, erschöpftes Gehen, Gehen eines alten Menschen, weibliches Gehen, Winken (auch eines alten Menschen), Gang und Lauf der Räuber („chimpira“) und des Hauptmanns („giant“), Hieb, Faustschlag, Tritt; Stehen (aus dem ersten Bild einer Aufnahme) | [Bandai Namco Research Motion Dataset](https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset), © Bandai Namco Research Inc. | CC BY-NC 4.0 |
| Haut-Texturen, Haare, Bart, Lendenschurz, Brustband, Kutte, Lederwams, Kittel der Räuber, Kleider von Gerold, Marta und Jost | selbst erzeugt mit `werkzeuge/figuren/` | wie das Projekt |
| Waffen in der Hand (Speer, Messer, Axt, Keulen, Angelrute), Schwimmer, Zelte des Räuberlagers | selbst erzeugt im Code | wie das Projekt |
| Erlenbach: Fachwerkhäuser, Putz- und Strohtexturen, Brunnen, Marktstand mit gestreifter Markise, Steg | selbst erzeugt im Code (`src/welt/dorf.js`) | wie das Projekt |

## Pflanzen, Boden, Felsen

| Was | Quelle | Lizenz |
|---|---|---|
| Baum-Erzeuger (Äste, Blätter, Voreinstellungen), `vendor/ez-tree/` | [EZ-Tree](https://github.com/dgreenheck/ez-tree), Daniel Greenheck | MIT |
| Rindentexturen Eiche und Weide | Poly Haven (bark_brown_02, bark_willow_02), über EZ-Tree | CC0 |
| Rindentexturen Birke und Kiefer | TextureCan, über EZ-Tree | frei nutzbar laut Anbieter |
| Blatttexturen, Bodentexturen (Gras, Erde), Felstextur, Blumenmodelle | aus dem Paket von EZ-Tree | MIT (Paketlizenz) |
| Felsformen, Gras, Wasser, Himmel, Wolken, Sterne, Feuer | selbst erzeugt im Code | wie das Projekt |

## Programmbibliotheken

| Was | Quelle | Lizenz |
|---|---|---|
| three.js 0.170.0 samt Zusätzen (darunter `SkeletonUtils.js` aus dem Stand r170), `vendor/three/` | [three.js](https://github.com/mrdoob/three.js) | MIT |

## Schriften

| Was | Quelle | Lizenz |
|---|---|---|
| IM Fell English SC, Alegreya Sans | Google Fonts | SIL Open Font License |
