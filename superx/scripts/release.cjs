/**
 * 构建 superx，并将产物写入仓库内 public/rubick-system-super-panel。
 * 保留目标目录下的 node_modules 与 modules（除非 deploy/modules 存在内容则覆盖 modules）。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SUPERX_ROOT = path.resolve(__dirname, '..');
const DIST = path.join(SUPERX_ROOT, 'dist');
const DIST_NODE = path.join(SUPERX_ROOT, 'dist-node');
const DEPLOY = path.join(SUPERX_ROOT, 'deploy');
const TARGET = path.join(SUPERX_ROOT, '..', 'public', 'rubick-system-super-panel');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
  if (r.error) throw r.error;
  if (r.status !== 0 && r.status !== null) {
    process.exit(r.status);
  }
}

function rm(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
  }
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDirContents(fromDir, toDir) {
  if (!fs.existsSync(fromDir)) return;
  fs.mkdirSync(toDir, { recursive: true });
  for (const name of fs.readdirSync(fromDir)) {
    const from = path.join(fromDir, name);
    const to = path.join(toDir, name);
    rm(to);
    fs.cpSync(from, to, { recursive: true });
  }
}

function deployModulesHasFiles() {
  const mod = path.join(DEPLOY, 'modules');
  if (!fs.existsSync(mod)) return false;
  const stat = fs.statSync(mod);
  if (!stat.isDirectory()) return false;
  return fs.readdirSync(mod).length > 0;
}

console.log('[superx:release] build (web + node)…');
run('npm', ['run', 'build'], { cwd: SUPERX_ROOT });

if (!fs.existsSync(DIST)) {
  console.error('[superx:release] missing dist/. Run build:web first.');
  process.exit(1);
}
if (!fs.existsSync(DIST_NODE)) {
  console.error('[superx:release] missing dist-node/. Run build:node first.');
  process.exit(1);
}

fs.mkdirSync(TARGET, { recursive: true });

console.log('[superx:release] clean old renderer/main bundles in target (keep node_modules, modules)…');
const removePaths = [
  path.join(TARGET, 'js'),
  path.join(TARGET, 'css'),
  path.join(TARGET, 'assets'),
  path.join(TARGET, 'index.html'),
  path.join(TARGET, 'main.html'),
  path.join(TARGET, 'main.js'),
  path.join(TARGET, 'panel-window.js'),
  path.join(TARGET, 'panel-preload.js'),
  path.join(TARGET, 'clipboard-helpers.js'),
  path.join(TARGET, 'package.json'),
  path.join(TARGET, 'package-lock.json'),
];
for (const p of removePaths) {
  rm(p);
}

console.log('[superx:release] copy deploy/package.json → target…');
copyFile(path.join(DEPLOY, 'package.json'), path.join(TARGET, 'package.json'));

console.log('[superx:release] copy dist/ → target…');
copyDirContents(DIST, TARGET);

console.log('[superx:release] copy dist-node/*.js → target…');
for (const name of fs.readdirSync(DIST_NODE)) {
  if (!name.endsWith('.js')) continue;
  if (name.endsWith('.d.js')) continue;
  copyFile(path.join(DIST_NODE, name), path.join(TARGET, name));
}

if (deployModulesHasFiles()) {
  console.log('[superx:release] replace target/modules from deploy/modules…');
  rm(path.join(TARGET, 'modules'));
  fs.cpSync(path.join(DEPLOY, 'modules'), path.join(TARGET, 'modules'), {
    recursive: true,
  });
} else {
  console.log(
    '[superx:release] keep existing target/modules (deploy/modules empty or missing).'
  );
}

console.log('[superx:release] npm install --omit=dev in target…');
run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], {
  cwd: TARGET,
});

console.log('[superx:release] done →', TARGET);
