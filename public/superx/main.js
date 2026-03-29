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
const path = __importStar(require("path"));
const fs_1 = require("fs");
const os = __importStar(require("os"));
const nut_js_1 = require("@nut-tree/nut-js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rubick_active_win_1 = __importDefault(require("rubick-active-win"));
const panel_window_1 = __importDefault(require("./panel-window"));
const clipboard_helpers_1 = require("./clipboard-helpers");
nut_js_1.keyboard.config.autoDelayMs = 10;
try {
    const bin = path.join(__dirname, './node_modules/rubick-active-win/main');
    (0, fs_1.chmodSync)(bin, 0o755);
}
catch {
    try {
        const bin = path.join(__dirname, '../rubick-active-win/main');
        (0, fs_1.chmodSync)(bin, 0o755);
    }
    catch {
        /* ignore */
    }
}
const isMacOS = os.type() === 'Darwin';
const modifier = isMacOS ? nut_js_1.Key.LeftSuper : nut_js_1.Key.LeftControl;
async function simulateCopy() {
    await nut_js_1.keyboard.pressKey(modifier, nut_js_1.Key.C);
    await nut_js_1.keyboard.releaseKey(modifier, nut_js_1.Key.C);
}
const STORE_ID = 'rubick-system-super-panel-store';
/** 与插件市场「超级面板」设置页写入的 dbStorage 键一致 */
const SP_MOUSE = {
    MIDDLE: 'rubick:sp:mouse-middle',
    LONG_LEFT: 'rubick:sp:long-left',
    LONG_RIGHT: 'rubick:sp:long-right',
    LONG_MIDDLE: 'rubick:sp:long-middle',
};
/** libuiohook MOUSE_BUTTON1..3 */
const BTN = { LEFT: 1, RIGHT: 2, MIDDLE: 3 };
const LONG_PRESS_MS = 450;
/** 首次注册延迟，避免与 Rubick 其它 globalShortcut 抢注册冲突；热更新时为 0 */
const INITIAL_KEYBOARD_REGISTER_MS = 1000;
/** 窗口顶边略低于光标，避免无边框窗顶缘与指针重合触发系统调整大小 */
const SUPER_PANEL_TOP_CURSOR_GAP_PX = 12;
function isMouseTrigger(s) {
    return Object.values(SP_MOUSE).includes(s);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryLoadUiohook() {
    const candidates = [
        () => require('uiohook-napi'),
        () => require(path.join(__dirname, '../../node_modules/uiohook-napi')),
        () => require(path.join(__dirname, '../../../node_modules/uiohook-napi')),
    ];
    for (const load of candidates) {
        try {
            return load();
        }
        catch {
            /* try next */
        }
    }
    return null;
}
function createPlugin() {
    /** 上次呼出面板时记录的剪贴板快照；与当前不一致且无选区复制时，仍用当前剪贴板处理一次 */
    let lastPanelClipboardSnap = null;
    let lastRegisteredKey = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mouseDownHandler = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mouseUpHandler = null;
    let longPressTimer = null;
    let longPressButton = null;
    let keyboardRegisterTimer = null;
    function clearMouseRegistration(uIOhook) {
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
        async onReady(ctx) {
            const { clipboard, screen, globalShortcut, API, ipcMain } = ctx;
            const panelInstance = (0, panel_window_1.default)(ctx);
            panelInstance.init();
            const showSuperPanel = async () => {
                var _a;
                const { x, y } = screen.getCursorScreenPoint();
                let copyResult = await (0, clipboard_helpers_1.getSelectedContent)(clipboard, simulateCopy);
                const snapNow = (0, clipboard_helpers_1.snapshotClipboard)(clipboard);
                if (!copyResult.text && !copyResult.fileUrl) {
                    if (lastPanelClipboardSnap === null ||
                        !(0, clipboard_helpers_1.clipboardSnapsEqual)(snapNow, lastPanelClipboardSnap)) {
                        copyResult = (0, clipboard_helpers_1.readClipboardPayload)(clipboard);
                    }
                }
                if (!copyResult.text && !copyResult.fileUrl) {
                    const nativeWinInfo = await (0, rubick_active_win_1.default)({
                        screenRecordingPermission: false,
                    });
                    copyResult.fileUrl =
                        ((_a = nativeWinInfo === null || nativeWinInfo === void 0 ? void 0 : nativeWinInfo.owner) === null || _a === void 0 ? void 0 : _a.path) || copyResult.fileUrl;
                }
                lastPanelClipboardSnap = (0, clipboard_helpers_1.snapshotClipboard)(clipboard);
                const win = panelInstance.getWindow();
                if (!win)
                    return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const localPlugins = global.LOCAL_PLUGINS.getLocalPlugins();
                const cursor = (0, clipboard_helpers_1.getPos)(screen, { x, y }, isMacOS);
                const placePanelAtCursor = () => {
                    if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed()))
                        return;
                    const bounds = win.getBounds();
                    let left = Math.round(cursor.x - bounds.width / 2);
                    let top = Math.round(cursor.y + SUPER_PANEL_TOP_CURSOR_GAP_PX);
                    try {
                        const disp = screen.getDisplayNearestPoint({ x: cursor.x, y: cursor.y });
                        const wa = disp.workArea;
                        left = Math.max(wa.x, Math.min(left, wa.x + wa.width - bounds.width));
                        top = Math.max(wa.y, Math.min(top, wa.y + wa.height - bounds.height));
                    }
                    catch {
                        /* ignore clamp if display API fails */
                    }
                    win.setPosition(left, top);
                    panelInstance.setPanelPositionAnchor(left, top);
                };
                await new Promise((resolve) => {
                    const ms = 800;
                    const timer = setTimeout(() => {
                        ipcMain.removeListener('superPanel-content-applied', onApplied);
                        resolve();
                    }, ms);
                    const onApplied = (event) => {
                        if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed()))
                            return;
                        if (event.sender.id !== win.webContents.id)
                            return;
                        clearTimeout(timer);
                        ipcMain.removeListener('superPanel-content-applied', onApplied);
                        resolve();
                    };
                    ipcMain.on('superPanel-content-applied', onApplied);
                    win.webContents.send('trigger-super-panel', {
                        ...copyResult,
                        optionPlugin: localPlugins,
                    });
                });
                placePanelAtCursor();
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
                const superPanelHotKey = dbStore.value || 'Ctrl+W';
                if (lastRegisteredKey && !isMouseTrigger(lastRegisteredKey)) {
                    try {
                        globalShortcut.unregister(lastRegisteredKey);
                    }
                    catch {
                        /* ignore */
                    }
                }
                const hookMod = tryLoadUiohook();
                const uIOhook = hookMod === null || hookMod === void 0 ? void 0 : hookMod.uIOhook;
                if (uIOhook) {
                    clearMouseRegistration(uIOhook);
                }
                lastRegisteredKey = superPanelHotKey;
                if (isMouseTrigger(superPanelHotKey)) {
                    if (!uIOhook) {
                        console.warn('[rubick-system-super-panel] uiohook-napi not found; mouse trigger disabled.');
                        return;
                    }
                    const btnFor = () => {
                        if (superPanelHotKey === SP_MOUSE.MIDDLE)
                            return BTN.MIDDLE;
                        if (superPanelHotKey === SP_MOUSE.LONG_LEFT)
                            return BTN.LEFT;
                        if (superPanelHotKey === SP_MOUSE.LONG_RIGHT)
                            return BTN.RIGHT;
                        if (superPanelHotKey === SP_MOUSE.LONG_MIDDLE)
                            return BTN.MIDDLE;
                        return null;
                    };
                    const wantBtn = btnFor();
                    if (wantBtn == null)
                        return;
                    const isLong = superPanelHotKey === SP_MOUSE.LONG_LEFT ||
                        superPanelHotKey === SP_MOUSE.LONG_RIGHT ||
                        superPanelHotKey === SP_MOUSE.LONG_MIDDLE;
                    mouseDownHandler = (e) => {
                        const b = Number(e.button);
                        if (b !== wantBtn)
                            return;
                        if (!isLong) {
                            void showSuperPanel();
                            return;
                        }
                        longPressButton = b;
                        if (longPressTimer)
                            clearTimeout(longPressTimer);
                        longPressTimer = setTimeout(() => {
                            longPressTimer = null;
                            longPressButton = null;
                            void showSuperPanel();
                        }, LONG_PRESS_MS);
                    };
                    mouseUpHandler = (e) => {
                        const b = Number(e.button);
                        if (!isLong)
                            return;
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
                    }
                    catch (err) {
                        console.warn('[rubick-system-super-panel] globalShortcut.register failed:', err);
                    }
                }, delayMs);
            };
            const scheduleRegister = () => {
                void register();
            };
            globalThis.__superPanelReregister =
                scheduleRegister;
            await register();
        },
    };
}
module.exports = createPlugin;
