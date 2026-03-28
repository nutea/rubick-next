"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilePathFromClipboard = getFilePathFromClipboard;
exports.getSelectedContent = getSelectedContent;
exports.getPos = getPos;
const crypto_1 = require("crypto");
/**
 * 从系统剪贴板解析文件路径 / 图片（与原版 main.js 行为一致）
 */
function getFilePathFromClipboard(clipboard) {
    var _a;
    let filePath = [];
    if (process.platform === 'darwin') {
        if (clipboard.has('NSFilenamesPboardType')) {
            filePath =
                ((_a = clipboard
                    .read('NSFilenamesPboardType')
                    .match(/<string>.*<\/string>/g)) === null || _a === void 0 ? void 0 : _a.map((item) => item.replace(/<string>|<\/string>/g, ''))) || [];
        }
        else {
            const clipboardImage = clipboard.readImage('clipboard');
            if (!clipboardImage.isEmpty()) {
                const png = clipboardImage.toPNG();
                filePath = [
                    {
                        buffer: png,
                        mimetype: 'image/png',
                        originalname: `${(0, crypto_1.randomUUID)()}.png`,
                    },
                ];
            }
            else {
                filePath = [
                    clipboard.read('public.file-url').replace('file://', ''),
                ].filter(Boolean);
            }
        }
    }
    else {
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
                    .filter((item) => item)
                    .map((item) => drivePrefix[0] + item);
            }
        }
        else {
            const clipboardImage = clipboard.readImage('clipboard');
            if (!clipboardImage.isEmpty()) {
                const png = clipboardImage.toPNG();
                filePath = [
                    {
                        buffer: png,
                        mimetype: 'image/png',
                        originalname: `${(0, crypto_1.randomUUID)()}.png`,
                    },
                ];
            }
            else {
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
async function getSelectedContent(clipboard, simulateCopy) {
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
function getPos(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
screen, point, isMacOS) {
    return isMacOS ? point : screen.screenToDipPoint({ x: point.x, y: point.y });
}
