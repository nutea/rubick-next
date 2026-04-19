import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const nativeRoot = path.join(packageRoot, 'native');
const profile = process.argv.includes('--release') ? 'release' : 'debug';
const allowMissingCargo = process.argv.includes('--if-available');

const isExecutableAvailable = (command, args = ['--version']) => {
  const check = spawnSync(command, args, {
    cwd: nativeRoot,
    stdio: 'ignore',
    shell: false,
  });

  return check.status === 0;
};

const resolveCargoCommand = () => {
  const candidates = [];

  if (process.env.CARGO) candidates.push(process.env.CARGO);
  candidates.push('cargo');

  if (process.platform === 'win32') {
    candidates.push(path.join(os.homedir(), '.cargo', 'bin', 'cargo.exe'));
  }

  for (const candidate of candidates) {
    if (isExecutableAvailable(candidate)) return candidate;
  }

  return null;
};

const cargoCommand = resolveCargoCommand();

if (!cargoCommand) {
  const message =
    '[rubick-native-next] cargo was not found. Install Rust or reopen your terminal after installation.';

  if (allowMissingCargo) {
    console.warn(`${message} Skipping native build and keeping JS fallback.`);
    process.exit(0);
  }

  console.error(message);
  process.exit(1);
}

const result = spawnSync(
  cargoCommand,
  ['build', '--manifest-path', path.join(nativeRoot, 'Cargo.toml'), ...(profile === 'release' ? ['--release'] : [])],
  {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: false,
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const sourceDll = path.join(nativeRoot, 'target', profile, 'rubick_native_next.dll');
const targetNode = path.join(nativeRoot, 'rubick_native_next.node');

if (!existsSync(sourceDll)) {
  console.error(`[rubick-native-next] expected native artifact not found: ${sourceDll}`);
  process.exit(1);
}

mkdirSync(path.dirname(targetNode), { recursive: true });
try {
  copyFileSync(sourceDll, targetNode);
} catch (error) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error.code === 'EBUSY' || error.code === 'EPERM') &&
    existsSync(targetNode)
  ) {
    console.warn(
      `[rubick-native-next] native addon is currently locked, keeping existing file at ${targetNode}`
    );
    process.exit(0);
  }

  throw error;
}

console.log(`[rubick-native-next] native addon copied to ${targetNode}`);
