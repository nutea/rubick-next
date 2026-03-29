import * as path from 'path';
import { chmodSync } from 'fs';
import * as os from 'os';
import { keyboard, Key } from '@nut-tree/nut-js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import activeWin from 'rubick-active-win';
import createPanelWindow from './panel-window';
import { getPos, getSelectedContent } from './clipboard-helpers';

keyboard.config.autoDelayMs = 10;

try {
  const bin = path.join(__dirname, './node_modules/rubick-active-win/main');
  chmodSync(bin, 0o755);
} catch {
  try {
    const bin = path.join(__dirname, '../rubick-active-win/main');
    chmodSync(bin, 0o755);
  } catch {
    /* ignore */
  }
}

const isMacOS = os.type() === 'Darwin';
const modifier = isMacOS ? Key.LeftSuper : Key.LeftControl;

async function simulateCopy(): Promise<void> {
  await keyboard.pressKey(modifier, Key.C);
  await keyboard.releaseKey(modifier, Key.C);
}

const STORE_ID = 'rubick-system-super-panel-store';

/** 与 feature 超级面板设置页约定一致 */
const SP_MOUSE = {
  MIDDLE: 'rubick:sp:mouse-middle',
  LONG_LEFT: 'rubick:sp:long-left',
  LONG_RIGHT: 'rubick:sp:long-right',
  LONG_MIDDLE: 'rubick:sp:long-middle',
} as const;

/** libuiohook MOUSE_BUTTON1..3 */
const BTN = { LEFT: 1, RIGHT: 2, MIDDLE: 3 } as const;

const LONG_PRESS_MS = 450;

/** 首次注册延迟，避免与 Rubick 其它 globalShortcut 抢注册冲突；热更新时为 0 */
const INITIAL_KEYBOARD_REGISTER_MS = 1000;

function isMouseTrigger(s: string): boolean {
  return Object.values(SP_MOUSE).includes(s as (typeof SP_MOUSE)[keyof typeof SP_MOUSE]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryLoadUiohook(): any {
  const candidates = [
    () => require('uiohook-napi'),
    () => require(path.join(__dirname, '../../node_modules/uiohook-napi')),
    () => require(path.join(__dirname, '../../../node_modules/uiohook-napi')),
  ];
  for (const load of candidates) {
    try {
      return load();
    } catch {
      /* try next */
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RubickCtx = any;

function createPlugin() {
  let lastRegisteredKey: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mouseDownHandler: ((e: any) => void) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mouseUpHandler: ((e: any) => void) | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressButton: number | null = null;
  let keyboardRegisterTimer: ReturnType<typeof setTimeout> | null = null;

  function clearMouseRegistration(uIOhook: { removeListener: (ev: string, fn: unknown) => void }) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressButton = null;
    if (mouseDownHandler) {
      uIOhook.removeListener('mousedown', mouseDownHandler);
      mouseDownHandler = null;
    }
    if (mouseUpHandler) {
      uIOhook.removeListener('mouseup', mouseUpHandler);
      mouseUpHandler = null;
    }
  }

  return {
    async onReady(ctx: RubickCtx) {
      const { clipboard, screen, globalShortcut, API } = ctx;

      const panelInstance = createPanelWindow(ctx);
      panelInstance.init();

      const showSuperPanel = async () => {
        const { x, y } = screen.getCursorScreenPoint();
        const copyResult = await getSelectedContent(clipboard, simulateCopy);
        if (!copyResult.text && !copyResult.fileUrl) {
          const nativeWinInfo = await activeWin({
            screenRecordingPermission: false,
          });
          copyResult.fileUrl =
            nativeWinInfo?.owner?.path || copyResult.fileUrl;
        }
        const win = panelInstance.getWindow();
        if (!win) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localPlugins = (global as any).LOCAL_PLUGINS.getLocalPlugins();

        win.webContents.send('trigger-super-panel', {
          ...copyResult,
          optionPlugin: localPlugins,
        });
        const pos = getPos(screen, { x, y }, isMacOS);
        win.setPosition(parseInt(String(pos.x), 10), parseInt(String(pos.y), 10));
        win.setAlwaysOnTop(true);
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        win.focus();
        win.setVisibleOnAllWorkspaces(false, { visibleOnFullScreen: true });
        win.show();
      };

      let isFirstRegister = true;

      const register = async () => {
        if (keyboardRegisterTimer) {
          clearTimeout(keyboardRegisterTimer);
          keyboardRegisterTimer = null;
        }

        const dbStore = (await API.dbGet({ data: { id: STORE_ID } })) || {};
        const superPanelHotKey: string = dbStore.value || 'Ctrl+W';

        if (lastRegisteredKey && !isMouseTrigger(lastRegisteredKey)) {
          try {
            globalShortcut.unregister(lastRegisteredKey);
          } catch {
            /* ignore */
          }
        }
        const hookMod = tryLoadUiohook();
        const uIOhook = hookMod?.uIOhook;
        if (uIOhook) {
          clearMouseRegistration(uIOhook);
        }

        lastRegisteredKey = superPanelHotKey;

        if (isMouseTrigger(superPanelHotKey)) {
          if (!uIOhook) {
            console.warn(
              '[rubick-system-super-panel] uiohook-napi not found; mouse trigger disabled.'
            );
            return;
          }

          const btnFor = (): number | null => {
            if (superPanelHotKey === SP_MOUSE.MIDDLE) return BTN.MIDDLE;
            if (superPanelHotKey === SP_MOUSE.LONG_LEFT) return BTN.LEFT;
            if (superPanelHotKey === SP_MOUSE.LONG_RIGHT) return BTN.RIGHT;
            if (superPanelHotKey === SP_MOUSE.LONG_MIDDLE) return BTN.MIDDLE;
            return null;
          };

          const wantBtn = btnFor();
          if (wantBtn == null) return;

          const isLong =
            superPanelHotKey === SP_MOUSE.LONG_LEFT ||
            superPanelHotKey === SP_MOUSE.LONG_RIGHT ||
            superPanelHotKey === SP_MOUSE.LONG_MIDDLE;

          mouseDownHandler = (e: { button: number }) => {
            const b = Number(e.button);
            if (b !== wantBtn) return;

            if (!isLong) {
              void showSuperPanel();
              return;
            }

            longPressButton = b;
            if (longPressTimer) clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
              longPressTimer = null;
              longPressButton = null;
              void showSuperPanel();
            }, LONG_PRESS_MS);
          };

          mouseUpHandler = (e: { button: number }) => {
            const b = Number(e.button);
            if (!isLong) return;
            if (longPressButton !== null && b === longPressButton) {
              if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
              }
              longPressButton = null;
            }
          };

          uIOhook.on('mousedown', mouseDownHandler);
          uIOhook.on('mouseup', mouseUpHandler);
          return;
        }

        const delayMs = isFirstRegister ? INITIAL_KEYBOARD_REGISTER_MS : 0;
        isFirstRegister = false;

        keyboardRegisterTimer = setTimeout(() => {
          keyboardRegisterTimer = null;
          try {
            globalShortcut.register(superPanelHotKey, () => {
              void showSuperPanel();
            });
          } catch (err) {
            console.warn('[rubick-system-super-panel] globalShortcut.register failed:', err);
          }
        }, delayMs);
      };

      const scheduleRegister = () => {
        void register();
      };

      (globalThis as typeof globalThis & { __superPanelReregister?: () => void }).__superPanelReregister =
        scheduleRegister;
      await register();
    },
  };
}

export = createPlugin;
