import type { NativeSystemApi, NativeWindowInfo } from '../types';
import { getWindowsActiveWindow } from './windows';

const readFolderPathFromNative = (): string => {
  if (process.platform !== 'win32') return '';

  try {
    const native = require('../../native') as {
      getFolderOpenPath?: () => string;
    };

    return String(native.getFolderOpenPath?.() ?? '');
  } catch {
    return '';
  }
};

export const system: NativeSystemApi = {
  async getFolderOpenPath(): Promise<string> {
    return readFolderPathFromNative();
  },
  getFolderOpenPathSync(): string {
    return readFolderPathFromNative();
  },
  async getActiveWindow(): Promise<NativeWindowInfo | null> {
    if (process.platform === 'win32') {
      return getWindowsActiveWindow();
    }

    return null;
  },
};
