import { randomUUID } from 'crypto';

/** Electron Clipboard 子集，避免依赖 electron 类型包 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClipboardApi = any;

type FileEntry =
  | string
  | {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    };

/**
 * 从系统剪贴板解析文件路径 / 图片（与原版 main.js 行为一致）
 */
export function getFilePathFromClipboard(clipboard: ClipboardApi): FileEntry[] {
  let filePath: FileEntry[] = [];

  if (process.platform === 'darwin') {
    if (clipboard.has('NSFilenamesPboardType')) {
      filePath =
        clipboard
          .read('NSFilenamesPboardType')
          .match(/<string>.*<\/string>/g)
          ?.map((item: string) => item.replace(/<string>|<\/string>/g, '')) || [];
    } else {
      const clipboardImage = clipboard.readImage('clipboard');
      if (!clipboardImage.isEmpty()) {
        const png = clipboardImage.toPNG();
        filePath = [
          {
            buffer: png,
            mimetype: 'image/png',
            originalname: `${randomUUID()}.png`,
          },
        ];
      } else {
        filePath = [
          clipboard.read('public.file-url').replace('file://', ''),
        ].filter(Boolean);
      }
    }
  } else {
    if (clipboard.has('CF_HDROP')) {
      const rawFilePathStr = clipboard.read('CF_HDROP') || '';
      let formatFilePathStr = [...rawFilePathStr]
        .filter((_, index) => rawFilePathStr.charCodeAt(index) !== 0)
        .join('')
        .replace(/\\/g, '\\');

      const drivePrefix = formatFilePathStr.match(/[a-zA-Z]:\\/);

      if (drivePrefix) {
        const drivePrefixIndex = formatFilePathStr.indexOf(drivePrefix[0]);
        if (drivePrefixIndex !== 0) {
          formatFilePathStr = formatFilePathStr.substring(drivePrefixIndex);
        }
        filePath = formatFilePathStr
          .split(drivePrefix[0])
          .filter((item: string) => item)
          .map((item: string) => drivePrefix[0] + item);
      }
    } else {
      const clipboardImage = clipboard.readImage('clipboard');
      if (!clipboardImage.isEmpty()) {
        const png = clipboardImage.toPNG();
        filePath = [
          {
            buffer: png,
            mimetype: 'image/png',
            originalname: `${randomUUID()}.png`,
          },
        ];
      } else {
        const buf = clipboard.readBuffer('FileNameW');
        filePath = [
          buf
            .toString('ucs2')
            .replace(RegExp(String.fromCharCode(0), 'g'), ''),
        ].filter(Boolean);
      }
    }
  }
  return filePath;
}

export async function getSelectedContent(
  clipboard: ClipboardApi,
  simulateCopy: () => Promise<void>
): Promise<{ text: string; fileUrl: string }> {
  clipboard.clear();
  await simulateCopy();
  return new Promise((resolve) => {
    setTimeout(() => {
      const text = clipboard.readText('clipboard') || '';
      const raw = getFilePathFromClipboard(clipboard)[0];
      let fileUrl = '';
      if (typeof raw === 'string') {
        fileUrl = raw;
      }
      resolve({
        text: fileUrl ? '' : text,
        fileUrl,
      });
    }, 50);
  });
}

export function getPos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  screen: any,
  point: { x: number; y: number },
  isMacOS: boolean
): { x: number; y: number } {
  return isMacOS ? point : screen.screenToDipPoint({ x: point.x, y: point.y });
}
