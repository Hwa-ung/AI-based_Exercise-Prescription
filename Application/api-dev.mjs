import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// .env 수동 로드
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(path.join(__dirname, '.env'), 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && !key.startsWith('#')) process.env[key.trim()] = rest.join('=').trim();
  });
} catch {}

import registerHandler      from './api/auth-register.js';
import loginHandler         from './api/auth-login.js';
import updateProfileHandler from './api/auth-update-profile.js';

const ROUTES = {
  '/api/auth-register':       registerHandler,
  '/api/auth-login':          loginHandler,
  '/api/auth-update-profile': updateProfileHandler,
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const handler = ROUTES[req.url];
  if (!handler) { res.writeHead(404); res.end(); return; }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    const mock = {
      method: req.method,
      body: body ? JSON.parse(body) : {},
    };
    const resMock = {
      _code: 200,
      status(c) { this._code = c; return this; },
      json(d) {
        res.writeHead(this._code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(d));
      },
      end() { res.writeHead(this._code); res.end(); },
    };
    try { await handler(mock, resMock); }
    catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(3001, () => console.log('[API] local server → http://localhost:3001'));
