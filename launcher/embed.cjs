#!/usr/bin/env node
'use strict';

// Reads the single-file build (dist-single/index.html) and writes it as a
// CommonJS module so it can be bundled into the pkg binary.

const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'dist-single', 'index.html');
const out = path.resolve(__dirname, 'embedded.cjs');

if (!fs.existsSync(src)) {
  console.error(`Missing ${src}. Run "npm run build:single" first.`);
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
fs.writeFileSync(out, `module.exports = ${JSON.stringify(html)};\n`);
console.log(`Embedded ${(html.length / 1024).toFixed(1)} KB into ${path.relative(process.cwd(), out)}`);
