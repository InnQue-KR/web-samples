// dist/를 GitHub Pages처럼 정적으로 제공한다(디렉터리 → index.html, 없는 경로 → 404.html + 404 상태).
// 로컬 미리보기·smoke 검사 전용. 사용: node scripts/serve-dist.mjs [포트]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };
const dist = fileURLToPath(new URL('../dist', import.meta.url));

export function startServer(port = 0) {
  const server = createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(dist, path);
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith('/')) { res.writeHead(301, { Location: path + '/' }).end(); return; }
      file = join(file, 'index.html');
    }
    const found = existsSync(file) && statSync(file).isFile();
    const body = readFileSync(found ? file : join(dist, '404.html'));
    res.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[found ? extname(file) : '.html'] ?? 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer(Number(process.argv[2] ?? 4321));
  console.log(`http://127.0.0.1:${server.address().port}/landing-01/`);
}
