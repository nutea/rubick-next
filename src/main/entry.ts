import path from 'path';
import { app } from 'electron';

function swallowBrokenPipe(stream?: NodeJS.WriteStream): void {
  stream?.on?.('error', (err: NodeJS.ErrnoException) => {
    if (err?.code === 'EPIPE') {
      return;
    }
    throw err;
  });
}

swallowBrokenPipe(process.stdout);
swallowBrokenPipe(process.stderr);

const staticDir = app.isPackaged
  ? path.join(app.getAppPath(), 'public')
  : path.join(process.cwd(), 'public');

globalThis.__static = staticDir;

void import('./index');

