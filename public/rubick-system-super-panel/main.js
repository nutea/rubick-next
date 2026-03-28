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
/** 与 feature 超级面板设置页约定一致 */
const SP_MOUSE = {
    MIDDLE: 'rubick:sp:mouse-middle',
    LONG_LEFT: 'rubick:sp:long-left',
    LONG_RIGHT: 'rubick:sp:long-right',
    LONG_MIDDLE: 'rubick:sp:long-middle',
};
/** libuiohook MOUSE_BUTTON1..3 */
const BTN = { LEFT: 1, RIGHT: 2, MIDDLE: 3 };
const LONG_PRESS_MS = 450;
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
    let lastRegisteredKey = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mouseDownHandler = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mouseUpHandler = null;
    let longPressTimer = null;
    let longPressButton = null;
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
            const { clipboard, screen, globalShortcut, API } = ctx;
            const panelInstance = (0, panel_window_1.default)(ctx);
            panelInstance.init();
            const dbStore = (await API.dbGet({ data: { id: STORE_ID } })) || {};
            const superPanelHotKey = dbStore.value || 'Ctrl+W';
            const showSuperPanel = async () => {
                var _a;
                const { x, y } = screen.getCursorScreenPoint();
                const copyResult = await (0, clipboard_helpers_1.getSelectedContent)(clipboard, simulateCopy);
                if (!copyResult.text && !copyResult.fileUrl) {
                    const nativeWinInfo = await (0, rubick_active_win_1.default)({
                        screenRecordingPermission: false,
                    });
                    copyResult.fileUrl =
                        ((_a = nativeWinInfo === null || nativeWinInfo === void 0 ? void 0 : nativeWinInfo.owner) === null || _a === void 0 ? void 0 : _a.path) || copyResult.fileUrl;
                }
                const win = panelInstance.getWindow();
                if (!win)
                    return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const localPlugins = global.LOCAL_PLUGINS.getLocalPlugins();
                win.webContents.send('trigger-super-panel', {
                    ...copyResult,
                    optionPlugin: localPlugins,
                });
                const pos = (0, clipboard_helpers_1.getPos)(screen, { x, y }, isMacOS);
                win.setPosition(parseInt(String(pos.x), 10), parseInt(String(pos.y), 10));
                win.setAlwaysOnTop(true);
                win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
                win.focus();
                win.setVisibleOnAllWorkspaces(false, { visibleOnFullScreen: true });
                win.show();
            };
            const register = () => {
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
                setTimeout(() => {
                    try {
                        globalShortcut.register(superPanelHotKey, () => {
                            void showSuperPanel();
                        });
                    }
                    catch (err) {
                        console.warn('[rubick-system-super-panel] globalShortcut.register failed:', err);
                    }
                }, 1000);
            };
            register();
        },
    };
}
module.exports = createPlugin;
