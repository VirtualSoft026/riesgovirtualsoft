import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8080);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };

http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const requested = pathname === '/' ? '/smoke.html' : pathname;
    const file = path.normalize(path.join(here, requested));

    if (!file.startsWith(here + path.sep) || file.includes(`${path.sep}node_modules${path.sep}`)) {
        res.writeHead(403).end('Forbidden');
        return;
    }

    fs.readFile(file, (error, data) => {
        if (error) {
            res.writeHead(404).end('Not found');
            return;
        }

        res.writeHead(200, {
            'Content-Type': types[path.extname(file)] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        }).end(data);
    });
}).listen(port, '127.0.0.1', () => console.log(`Smoke server: http://127.0.0.1:${port}/`));
