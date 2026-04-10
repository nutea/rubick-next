import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const asar = require('@electron/asar');

const rootDir = process.cwd();
const asarPath =
  process.argv[2] ||
  path.join(rootDir, 'build', 'win-unpacked', 'resources', 'app.asar');

if (!fs.existsSync(asarPath)) {
  console.error(`Packaged runtime check failed: missing asar file: ${asarPath}`);
  process.exit(1);
}

const extractDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'rubick-packaged-runtime-')
);

const modulesToCheck = [
  'axios',
  'form-data',
  'combined-stream',
  'delayed-stream',
  'fs-extra',
  'jsonfile',
  'plist',
  'pouchdb-load',
  'pouchdb-utils',
  'debug',
  'ms',
  'webdav',
];

try {
  asar.extractAll(asarPath, extractDir);

  const extractedPkgJson = path.join(extractDir, 'package.json');
  if (!fs.existsSync(extractedPkgJson)) {
    throw new Error('Extracted app.asar is missing package.json');
  }

  const extractedRequire = createRequire(extractedPkgJson);
  const checked = [];

  for (const moduleName of modulesToCheck) {
    extractedRequire(moduleName);
    checked.push(moduleName);
  }

  console.log(
    `Packaged runtime check passed for ${checked.length} module(s): ${checked.join(', ')}`
  );
} catch (error) {
  console.error('Packaged runtime check failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.rmSync(extractDir, { recursive: true, force: true });
}
