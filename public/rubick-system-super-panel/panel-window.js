"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createPanelWindow;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const execa_1 = __importDefault(require("execa"));
/** Rubick 注入的 ctx，与历史 `panel-window.js` 一致 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPanelWindow(ctx) {
    const { BrowserWindow, ipcMain, mainWindow, dialog, nativeImage } = ctx;
    let win;
    let pinned = false;
    const createWindow = () => {
        win = new BrowserWindow({
            frame: false,
            autoHideMenuBar: true,
            width: 240,
            height: 50,
            show: false,
            alwaysOnTop: true,
            webPreferences: {
                contextIsolation: false,
                webviewTag: true,
                webSecurity: false,
                backgroundThrottling: false,
                nodeIntegration: true,
                preload: path.join(__dirname, 'panel-preload.js'),
            },
        });
        win.loadURL(`file://${path.join(__dirname, 'main.html')}`);
        win.on('closed', () => {
            win = undefined;
        });
        win.on('blur', () => {
            if (!pinned)
                win === null || win === void 0 ? void 0 : win.hide();
        });
    };
    const init = () => {
        if (win !== null && win !== undefined)
            return;
        createWindow();
        ipcMain.on('superPanel-hidden', () => {
            win === null || win === void 0 ? void 0 : win.hide();
        });
        ipcMain.on('superPanel-setSize', (_e, height) => {
            win === null || win === void 0 ? void 0 : win.setSize(240, height);
        });
        ipcMain.on('superPanel-openPlugin', (_e, args) => {
            mainWindow.webContents.send('superPanel-openPlugin', args);
        });
        ipcMain.on('create-file', (_e, args) => {
            dialog.showSaveDialog(args).then((result) => {
                if (result.filePath) {
                    fs.writeFileSync(result.filePath, '');
                }
            });
        });
        ipcMain.on('get-file-base64', (event, filePath) => {
            const data = nativeImage.createFromPath(filePath).toDataURL();
            event.returnValue = data;
        });
        ipcMain.on('get-path', async (event) => {
            const data = await (0, execa_1.default)(path.join(__dirname, './modules/cdwhere.exe'));
            event.returnValue = data;
        });
        ipcMain.on('trigger-pin', (_event, pin) => {
            pinned = pin;
        });
    };
    const getWindow = () => win;
    return { init, getWindow };
}
