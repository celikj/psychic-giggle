#!/usr/bin/env node
'use strict';

// TaskLock desktop launcher.
// Serves the self-contained single-file build over localhost and opens
// the default browser. Bundled into a native binary with @yao-pkg/pkg.

const http = require('http');
const { exec } = require('child_process');

// HTML is inlined at build time into embedded.cjs (module.exports = "<!DOCTYPE...>")
const HTML = require('./embedded.cjs');

const PORT = Number(process.env.PORT) || 4173;

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(HTML);
});

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? `open "${url}"` :
    platform === 'win32' ? `start "" "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) {
      console.log(`Could not auto-open a browser. Open this URL manually:\n  ${url}`);
    }
  });
}

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║            🔒  TaskLock               ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log(`  Running at ${url}`);
  console.log('  Opening your browser…  (press Ctrl+C to quit)');
  console.log('');
  openBrowser(url);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const url = `http://127.0.0.1:${PORT}`;
    console.log(`  TaskLock already appears to be running at ${url} — opening it.`);
    openBrowser(url);
    process.exit(0);
  } else {
    console.error('  Failed to start TaskLock:', err.message);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  console.log('\n  TaskLock stopped. See you next session 👋');
  process.exit(0);
});
