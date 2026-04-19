import { ipcMain } from 'electron';
import { system } from 'rubick-native-next';

export default function registerCdwhereIpc(): void {
  ipcMain.removeHandler('get-path-async');
  ipcMain.removeAllListeners('get-path');

  ipcMain.on('get-path', (event: { returnValue?: unknown }) => {
    event.returnValue = { stdout: system.getFolderOpenPathSync() };
  });

  ipcMain.handle('get-path-async', async () => {
    return { stdout: await system.getFolderOpenPath() };
  });
}
