import type { NativeWindowInfo } from '../types';

interface WindowsActiveWindowBindingResult {
  title?: string;
  path?: string;
  processId?: number;
  appName?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface WindowsActiveWindowBinding {
  getActiveWindow(): WindowsActiveWindowBindingResult | null;
}

const tryLoadWindowsActiveWindowBinding =
  (): WindowsActiveWindowBinding | null => {
    try {
      return require('../../native') as WindowsActiveWindowBinding;
    } catch {
      return null;
    }
  };

export const getWindowsActiveWindow =
  async (): Promise<NativeWindowInfo | null> => {
    const binding = tryLoadWindowsActiveWindowBinding();
    if (!binding) return null;

    try {
      const current = binding.getActiveWindow();
      if (!current) return null;

      return {
        title: current.title || '',
        path: current.path,
        processId: current.processId,
        appName: current.appName,
        x: current.x,
        y: current.y,
        width: current.width,
        height: current.height,
      };
    } catch {
      return null;
    }
  };
