import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const PREFIX = '/praesidium/';
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

export async function serveBuild(initialDir = 'dist') {
  let directory = resolve(initialDir);
  let fault: (relative: string) => number | undefined = () => undefined;
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (!url.pathname.startsWith(PREFIX)) { response.writeHead(404).end(); return; }
      const relative = decodeURIComponent(url.pathname.slice(PREFIX.length)) || 'index.html';
      const target = resolve(directory, relative);
      if (!target.startsWith(directory + sep)) { response.writeHead(404).end(); return; }
      const status = fault(relative);
      if (status) { response.writeHead(status).end(); return; }
      const body = await readFile(target);
      response.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(body);
    })().catch(() => response.writeHead(404).end());
  });
  await new Promise<void>((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Browser test server did not open a TCP socket');
  return {
    url: `http://127.0.0.1:${address.port}${PREFIX}`,
    serve: (dir: string, fail: typeof fault = () => undefined) => { directory = resolve(dir); fault = fail; },
    close: () => new Promise<void>((done, fail) => server.close(error => error ? fail(error) : done())),
  };
}
