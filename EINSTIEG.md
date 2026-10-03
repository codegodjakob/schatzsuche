# Einstieg für neue Mitarbeitende

Wer noch nichts eingerichtet hat, gibt seinem Claude Code den folgenden Text. Claude erledigt dann die Einrichtung.
Zwei Dinge musst du selbst tun: das GitHub-Konto im Browser anlegen und Jakob deinen GitHub-Namen schicken.

```
Richte meinen Rechner für das gemeinsame GitHub-Projekt codegodjakob/schatzsuche ein.
Ich bin nicht technisch: Erkläre jeden Schritt in einfachem Deutsch, erledige alles selbst,
was du selbst erledigen kannst, und frag mich nur, wenn du mich wirklich brauchst.

1. Stelle fest, welches Betriebssystem ich habe. Prüfe, ob „git" und die GitHub-Befehlszeile „gh"
   installiert sind, und installiere, was fehlt (Mac: über Homebrew, Windows: über winget).
2. Ich habe noch kein GitHub-Konto. Schick mich auf https://github.com/signup und warte, bis ich
   eins angelegt habe. Frag mich dann nach meinem Benutzernamen.
3. Melde „gh" mit meinem Konto an: `gh auth login --web --git-protocol https`. Führe mich durch den
   Code, den ich im Browser eingeben muss. Danach `gh auth setup-git`.
4. Gib mir genau diesen Satz zum Weiterschicken an Jakob:
   „Mein GitHub-Name ist <Benutzername>. Bitte lade mich zu schatzsuche ein."
   Warte, bis ich dir bestätige, dass die Einladung da ist.
5. Nimm die Einladung an: Suche sie mit `gh api user/repository_invitations` und nimm die für
   codegodjakob/schatzsuche mit `gh api -X PATCH user/repository_invitations/<id>` an.
6. Stelle in git meinen Namen und eine E-Mail-Adresse ein (`git config --global user.name` und
   `user.email`). Schlag mir als E-Mail die private GitHub-Adresse vor:
   `<id>+<benutzername>@users.noreply.github.com`. Die Nummer <id> bekommst du mit `gh api user --jq .id`.
7. Lade das Projekt in den Ordner „schatzsuche“ in meinem persönlichen Ordner herunter (Mac: `~/schatzsuche`,
   Windows: `%USERPROFILE%\schatzsuche`). Der Befehl dafür ist `gh repo clone codegodjakob/schatzsuche <Ordner>`.
8. Lies dort README.md, ZUSAMMENARBEIT.md und CLAUDE.md und erklär mir in höchstens fünf Sätzen,
   wie wir zusammenarbeiten.
9. Prüfe zum Schluss, ob ich Schreibrechte habe: `gh api repos/codegodjakob/schatzsuche --jq .permissions.push`
   muss „true" ergeben. Sag mir am Ende, was erledigt ist und was noch fehlt.
```
