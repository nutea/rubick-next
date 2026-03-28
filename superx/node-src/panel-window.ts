import * as path from 'path';
import * as fs from 'fs';
import execa from 'execa';

/** Rubick 注入的 ctx，与历史 `panel-window.js` 一致 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function createPanelWindow(ctx: any) {
  const { BrowserWindow, ipcMain, mainWindow, dialog, nativeImage } = ctx;

  let win: InstanceType<typeof BrowserWindow> | undefined;
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
      if (!pinned) win?.hide();
    });
  };

  const init = () => {
    if (win !== null && win !== undefined) return;

    createWindow();

    ipcMain.on('superPanel-hidden', () => {
      win?.hide();
    });
    ipcMain.on('superPanel-setSize', (_e: unknown, height: number) => {
      win?.setSize(240, height);
    });
    ipcMain.on('superPanel-openPlugin', (_e: unknown, args: unknown) => {
      mainWindow.webContents.send('superPanel-openPlugin', args);
    });
    ipcMain.on('create-file', (_e: unknown, args: { filePath?: string }) => {
      dialog.showSaveDialog(args).then((result: { filePath?: string }) => {
        if (result.filePath) {
          fs.writeFileSync(result.filePath, '');
        }
      });
    });
    ipcMain.on('get-file-base64', (event: { returnValue?: string }, filePath: string) => {
      const data = nativeImage.createFromPath(filePath).toDataURL();
      event.returnValue = data;
    });
    ipcMain.on('get-path', async (event: { returnValue?: unknown }) => {
      const data = await execa(path.join(__dirname, './modules/cdwhere.exe'));
      event.returnValue = data;
    });
    ipcMain.on('trigger-pin', (_event: unknown, pin: boolean) => {
      pinned = pin;
    });
  };

  const getWindow = () => win;

  return { init, getWindow };
}
