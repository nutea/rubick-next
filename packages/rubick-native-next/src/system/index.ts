import type { NativeSystemApi, NativeWindowInfo } from '../types';
import { getWindowsActiveWindow } from './windows';

interface ElectronAppLike {
  isPackaged: boolean;
  getAppPath(): string;
}

interface ElectronLike {
  app: ElectronAppLike;
}

interface PathLikeModule {
  join(...paths: string[]): string;
}

interface FsLikeModule {
  existsSync(filePath: string): boolean;
}

interface ChildProcessLikeModule {
  execFile(
    file: string,
    options: { encoding: 'utf8' },
    callback: (error: unknown, stdout?: unknown) => void
  ): void;
  execFileSync(file: string, options: { encoding: 'utf8' }): string;
}

const tryLoadElectron = (): ElectronLike | null => {
  try {
    return require('electron') as ElectronLike;
  } catch {
    return null;
  }
};

const resolveCdwhereExe = (): string | null => {
  if (process.platform !== 'win32') return null;

  const fs = require('fs') as FsLikeModule;
  const path = require('path') as PathLikeModule;
  const runtimeProcess = process as NodeJS.Process & { resourcesPath?: string };
  const electron = tryLoadElectron();
  const candidates: string[] = [];
  const executableName = 'cdwhere.exe';

  if (electron?.app.isPackaged) {
    if (runtimeProcess.resourcesPath) {
      candidates.push(
        path.join(
          runtimeProcess.resourcesPath,
          'app.asar.unpacked',
          'public',
          'bin',
          executableName
        )
      );
    }
    candidates.push(
      path.join(electron.app.getAppPath(), 'public', 'bin', executableName)
    );
  } else {
    candidates.push(path.join(process.cwd(), 'public', 'bin', executableName));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const execFileUtf8 = (file: string): Promise<string> => {
  const childProcess = require('child_process') as ChildProcessLikeModule;

  return new Promise((resolve) => {
    childProcess.execFile(file, { encoding: 'utf8' }, (_error, stdout) => {
      resolve(String(stdout ?? ''));
    });
  });
};

const execFileUtf8Sync = (file: string): string => {
  const childProcess = require('child_process') as ChildProcessLikeModule;

  try {
    return String(childProcess.execFileSync(file, { encoding: 'utf8' }) ?? '');
  } catch {
    return '';
  }
};

export const system: NativeSystemApi = {
  async getFolderOpenPath(): Promise<string> {
    const executable = resolveCdwhereExe();
    if (!executable) return '';

    return execFileUtf8(executable);
  },
  getFolderOpenPathSync(): string {
    const executable = resolveCdwhereExe();
    if (!executable) return '';

    return execFileUtf8Sync(executable);
  },
  async getActiveWindow(): Promise<NativeWindowInfo | null> {
    if (process.platform === 'win32') {
      return getWindowsActiveWindow();
    }

    return null;
  },
};
