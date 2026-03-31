import path from 'path';
import { app } from 'electron';

const staticDir = app.isPackaged
  ? path.join(app.getAppPath(), 'public')
  : path.join(process.cwd(), 'public');

globalThis.__static = staticDir;

void import('./index');

