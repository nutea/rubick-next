import type { NativeClipboardApi, NativeClipboardContent } from '../types';

interface ElectronClipboardLike {
  has(format: string): boolean;
  read(format: string): string;
  readBuffer(format: string): Uint8Array;
  readText(format?: string): string;
}

interface ClipboardExLike {
  readFilePaths(): string[];
}

interface ElectronLike {
  clipboard: ElectronClipboardLike;
}

const decodeUtf16le = (value: Uint8Array): string => {
  if (!value.length) return '';
  const view = value.byteOffset
    ? value.slice().buffer
    : value.buffer.slice(0, value.byteLength);
  return new TextDecoder('utf-16le').decode(view);
};

const stripNulls = (value: string): string =>
  value.split(String.fromCharCode(0)).join('').trim();

const parseWindowsFileNameW = (value: Uint8Array): string[] => {
  const decoded = stripNulls(decodeUtf16le(value));
  return decoded ? [decoded] : [];
};

const parseWindowsCfHdrop = (raw: string): string[] => {
  if (!raw) return [];

  let normalized = [...raw]
    .filter((_, index) => raw.charCodeAt(index) !== 0)
    .join('');

  const drivePrefix = normalized.match(/[a-zA-Z]:\\/);
  if (!drivePrefix) return [];

  const prefix = drivePrefix[0];
  const prefixIndex = normalized.indexOf(prefix);
  if (prefixIndex > 0) {
    normalized = normalized.slice(prefixIndex);
  }

  return normalized
    .split(prefix)
    .filter(Boolean)
    .map((item) => `${prefix}${item}`);
};

const parseMacFileUrls = (raw: string): string[] =>
  (raw.match(/<string>.*?<\/string>/g) || [])
    .map((item) => item.replace(/<string>|<\/string>/g, '').trim())
    .filter(Boolean);

const tryLoadElectron = (): ElectronLike | null => {
  try {
    return require('electron') as ElectronLike;
  } catch {
    return null;
  }
};

const tryLoadClipboardEx = (): ClipboardExLike | null => {
  if (process.platform !== 'win32') return null;
  try {
    return require('electron-clipboard-ex') as ClipboardExLike;
  } catch {
    return null;
  }
};

const readWindowsFilePaths = (clipboard: ElectronClipboardLike): string[] => {
  const clipboardEx = tryLoadClipboardEx();
  if (clipboardEx) {
    try {
      const filePaths = clipboardEx.readFilePaths();
      if (Array.isArray(filePaths) && filePaths.length > 0) {
        return filePaths.filter(Boolean);
      }
    } catch {
      // Fall through to Electron clipboard parsing.
    }
  }

  if (clipboard.has('CF_HDROP')) {
    const filePaths = parseWindowsCfHdrop(clipboard.read('CF_HDROP') || '');
    if (filePaths.length > 0) {
      return filePaths;
    }
  }

  return parseWindowsFileNameW(clipboard.readBuffer('FileNameW'));
};

const readMacFilePaths = (clipboard: ElectronClipboardLike): string[] => {
  if (clipboard.has('NSFilenamesPboardType')) {
    return parseMacFileUrls(clipboard.read('NSFilenamesPboardType'));
  }

  const fileUrl = clipboard
    .read('public.file-url')
    .replace('file://', '')
    .trim();
  return fileUrl ? [fileUrl] : [];
};

const readFilePaths = (clipboard: ElectronClipboardLike): string[] => {
  if (process.platform === 'win32') {
    return readWindowsFilePaths(clipboard);
  }

  if (process.platform === 'darwin') {
    return readMacFilePaths(clipboard);
  }

  return [];
};

export const clipboard: NativeClipboardApi = {
  async getClipboardContent(): Promise<NativeClipboardContent> {
    const electron = tryLoadElectron();
    if (!electron) return null;

    const filePaths = readFilePaths(electron.clipboard);
    if (filePaths.length > 0) {
      return {
        type: 'file',
        content: filePaths,
      };
    }

    const text =
      electron.clipboard.readText('clipboard') || electron.clipboard.readText();

    if (!text) return null;

    return {
      type: 'text',
      content: text,
    };
  },
};
