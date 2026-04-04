import { execFile, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { app, ipcMain } from 'electron';

/** Windows 资源管理器当前路径探测（cdwhere.exe），与历史 superx `panel-window` 行为一致。 */
function resolveCdwhereExe(): string | null {
  const name = 'cdwhere.exe';
  if (process.platform !== 'win32') return null;

  const candidates: string[] = [];
  if (app.isPackaged) {
    candidates.push(
      path.join(process.resourcesPath, 'app.asar.unpacked', 'public', 'bin', name)
    );
    candidates.push(path.join(app.getAppPath(), 'public', 'bin', name));
  } else {
    candidates.push(path.join(process.cwd(), 'public', 'bin', name));
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export default function registerCdwhereIpc(): void {
  ipcMain.removeHandler('get-path-async');
  ipcMain.removeAllListeners('get-path');

  ipcMain.on('get-path', (event: { returnValue?: unknown }) => {
    if (process.platform !== 'win32') {
      event.returnValue = { stdout: '' };
      return;
    }
    const exe = resolveCdwhereExe();
    if (!exe) {
      event.returnValue = { stdout: '' };
      return;
    }
    try {
      const out = execFileSync(exe, { encoding: 'utf8' });
      event.returnValue = { stdout: out };
    } catch {
      event.returnValue = { stdout: '' };
    }
  });

  ipcMain.handle('get-path-async', async () => {
    if (process.platform !== 'win32') {
      return { stdout: '' };
    }
    const exe = resolveCdwhereExe();
    if (!exe) {
      return { stdout: '' };
    }
    try {
      const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
        execFile(exe, { encoding: 'utf8' }, (err, stdout) => {
          if (err) reject(err);
          else resolve({ stdout: String(stdout ?? '') });
        });
      });
      return { stdout };
    } catch {
      return { stdout: '' };
    }
  });
}
