const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

const base = '.open-next';
const assets = path.join(base, 'assets');

// Copy worker.js → assets/_worker.js (entry point for Pages Advanced Mode)
fs.copyFileSync(path.join(base, 'worker.js'), path.join(assets, '_worker.js'));

// Copy all sibling dirs into assets/ so wrangler can resolve relative imports
for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name !== 'assets') {
    copyDir(path.join(base, entry.name), path.join(assets, entry.name));
  }
}

console.log('Worker and all dependencies staged under .open-next/assets/');
