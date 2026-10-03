// Kleiner Webserver, der das Spiel im Browser zeigt. Start: npm start
// Ohne PORT sucht sich das Betriebssystem einen freien Port aus.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const ARTEN = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };

export function starteServer(port = Number(process.env.PORT ?? 0)) {
  const server = createServer(async (anfrage, antwort) => {
    const pfad = normalize(decodeURIComponent(new URL(anfrage.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    const datei = pfad && pfad !== '.' ? pfad : 'index.html';
    try {
      const inhalt = await readFile(join(WURZEL, datei));
      antwort.writeHead(200, { 'content-type': ARTEN[extname(datei)] ?? 'application/octet-stream' });
      antwort.end(inhalt);
    } catch {
      antwort.writeHead(404).end('Nicht gefunden');
    }
  });
  return new Promise((fertig) => server.listen(port, '127.0.0.1', () => fertig({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await starteServer();
  console.log(`Schatzsuche läuft auf ${url}`);
}
