'use strict';

const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, 'rubick_native_next.node'),
  path.join(__dirname, 'target', 'debug', 'rubick_native_next.node'),
  path.join(__dirname, 'target', 'release', 'rubick_native_next.node'),
];

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    module.exports = require(candidate);
    return;
  }
}

throw new Error(
  '[rubick-native-next] native addon not found. Run `pnpm --filter rubick-native-next run native:build` first.'
);
