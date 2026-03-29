/**
 * 在 public/superx 下安装依赖（cwd=该目录，避免 npm --prefix 把父包 rubick 装进子 node_modules）。
 * 先 --ignore-scripts 再 rebuild：否则 rubick-active-win 的 install 可能在 node-pre-gyp 进 PATH 之前执行（npm 10 / Windows）。
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'public', 'superx');
const pkg = path.join(target, 'package.json');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const shell = process.platform === 'win32';

function run(args) {
  const r = spawnSync(npm, args, {
    cwd: target,
    stdio: 'inherit',
    shell,
  });
  return r.status === null ? 1 : r.status;
}

if (!fs.existsSync(pkg)) {
  console.warn('[install-public-superx] 跳过：不存在', pkg);
  process.exit(0);
}

let code = run(['install', '--no-audit', '--no-fund', '--ignore-scripts']);
if (code !== 0) process.exit(code);

const preGypBin = path.join(
  target,
  'node_modules',
  '@mapbox',
  'node-pre-gyp',
  'bin'
);
const env = {
  ...process.env,
  PATH: fs.existsSync(preGypBin)
    ? `${preGypBin}${path.delimiter}${process.env.PATH || ''}`
    : process.env.PATH,
};

code = spawnSync(npm, ['rebuild'], {
  cwd: target,
  stdio: 'inherit',
  shell,
  env,
}).status;
process.exit(code === null ? 1 : code);
