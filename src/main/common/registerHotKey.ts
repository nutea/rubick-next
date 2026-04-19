import {
  globalShortcut,
  nativeTheme,
  BrowserWindow,
  BrowserView,
  ipcMain,
  app,
  Notification,
} from 'electron';
import { input } from 'rubick-native-next';
import type { NativeInputEvent } from 'rubick-native-next';
import screenCapture from '@/core/screen-capture';
import localConfig from '@/main/common/initLocalConfig';
import commonConst from '@/common/utils/commonConst';
import winPosition from './getWinPosition';
import { writeStartupLog } from './startupDiagnostics';

let removeInputSubscription: (() => void) | null = null;

const DOUBLE_PRESS_SHORTCUTS = [
  'Ctrl+Ctrl',
  'Option+Option',
  'Shift+Shift',
  'Command+Command',
];

const DOUBLE_PRESS_KEY_MAP: Record<string, string[]> = {
  Ctrl: ['ControlLeft', 'ControlRight'],
  Shift: ['ShiftLeft', 'ShiftRight'],
  Option: ['AltLeft', 'AltRight'],
  Command: ['MetaLeft', 'MetaRight'],
};

const registerHotKey = (mainWindow: BrowserWindow): void => {
  const setAutoLogin = async () => {
    const config = await localConfig.getConfig();
    if (app.getLoginItemSettings().openAtLogin !== config.perf.common.start) {
      app.setLoginItemSettings({
        openAtLogin: config.perf.common.start,
        openAsHidden: true,
      });
    }
  };

  const setTheme = async () => {
    mainWindow.webContents.executeJavaScript(
      `window.rubick && typeof window.rubick.changeTheme === "function" && window.rubick.changeTheme()`
    );
    mainWindow.getBrowserViews().forEach((view: BrowserView) => {
      view.webContents.executeJavaScript(
        `window.rubick && typeof window.rubick.changeTheme === "function" && window.rubick.changeTheme()`
      );
    });
  };

  const setDarkMode = async () => {
    const config = await localConfig.getConfig();
    const isDark = config.perf.common.darkMode;
    if (isDark) {
      nativeTheme.themeSource = 'dark';
      mainWindow.webContents.executeJavaScript(
        `document.body.classList.add("dark");window.rubick.theme="dark"`
      );
      mainWindow.getBrowserViews().forEach((view: BrowserView) => {
        view.webContents.executeJavaScript(
          `document.body.classList.add("dark");window.rubick.theme="dark"`
        );
      });
    } else {
      nativeTheme.themeSource = 'light';
      mainWindow.webContents.executeJavaScript(
        `document.body.classList.remove("dark");window.rubick.theme="light"`
      );
      mainWindow.getBrowserViews().forEach((view: BrowserView) => {
        view.webContents.executeJavaScript(
          `document.body.classList.remove("dark");window.rubick.theme="light"`
        );
      });
    }
  };

  function mainWindowPopUp() {
    const currentShow = mainWindow.isVisible() && mainWindow.isFocused();
    if (currentShow) {
      mainWindow.blur();
      mainWindow.hide();
      return;
    }
    const { x: wx, y: wy } = winPosition.getPosition();
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.focus();
    mainWindow.setVisibleOnAllWorkspaces(false, {
      visibleOnFullScreen: true,
    });
    mainWindow.setPosition(wx, wy);
    mainWindow.show();
  }

  const init = async () => {
    await setAutoLogin();
    await setDarkMode();
    await setTheme();
    const config = await localConfig.getConfig();
    globalShortcut.unregisterAll();

    const isDoublePressShortcut = DOUBLE_PRESS_SHORTCUTS.includes(
      config.perf.shortCut.showAndHidden
    );

    if (!isDoublePressShortcut) {
      const candidates = [config.perf.shortCut.showAndHidden];
      if (commonConst.windows()) {
        if (config.perf.shortCut.showAndHidden.includes('Option+')) {
          candidates.push(
            config.perf.shortCut.showAndHidden.replace(/Option\+/g, 'Alt+')
          );
        }
        candidates.push('Ctrl+SPACE');
      }
      let registered = false;
      for (const shortcut of Array.from(new Set(candidates))) {
        try {
          if (
            globalShortcut.register(shortcut, () => {
              mainWindowPopUp();
            })
          ) {
            registered = true;
            break;
          }
        } catch (error) {
          writeStartupLog(`globalShortcut.register failed for ${shortcut}`, error);
        }
      }
      if (!registered) {
        writeStartupLog('no global shortcut registered for main window popup');
      }
    }

    globalShortcut.register(config.perf.shortCut.capture, () => {
      screenCapture(mainWindow, (data) => {
        data &&
          new Notification({
            title: '截图完成',
            body: '截图已存储到系统剪贴板中',
          }).show();
      });
    });

    globalShortcut.register(config.perf.shortCut.quit, () => {
      // mainWindow.webContents.send('init-rubick');
      // mainWindow.show();
    });

    mainWindow.webContents.on('before-input-event', (event, inputEvent) => {
      if (
        inputEvent.key.toLowerCase() === 'w' &&
        (inputEvent.control || inputEvent.meta) &&
        !inputEvent.alt &&
        !inputEvent.shift
      ) {
        event.preventDefault();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.hide();
        }
      }
    });

    config.global.forEach((sc) => {
      if (!sc.key || !sc.value) return;
      globalShortcut.register(sc.key, () => {
        mainWindow.webContents.send('global-short-key', sc.value);
      });
    });
  };

  uIOhookRegister(mainWindowPopUp);
  init();
  ipcMain.on('re-register', () => {
    init();
  });
};

export default registerHotKey;

function uIOhookRegister(callback: () => void) {
  let lastModifierPress = Date.now();
  removeInputSubscription?.();
  removeInputSubscription = input.onInputEvent(async (event: NativeInputEvent) => {
    if (event.kind !== 'key' || event.state !== 'down') return;

    const config = await localConfig.getConfig();
    if (!DOUBLE_PRESS_SHORTCUTS.includes(config.perf.shortCut.showAndHidden)) {
      return;
    }

    const modifiers = config.perf.shortCut.showAndHidden.split('+');
    const showAndHiddenKeyStr = modifiers.pop() || '';
    const expectedKeys = DOUBLE_PRESS_KEY_MAP[showAndHiddenKeyStr] || [];
    if (!expectedKeys.includes(event.key)) return;

    const currentTime = Date.now();
    if (currentTime - lastModifierPress < 300) {
      callback();
    }
    lastModifierPress = currentTime;
  });
}
