"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateCopyShortcut = simulateCopyShortcut;
exports.getActiveWindowInfo = getActiveWindowInfo;
exports.onNativeInputEvent = onNativeInputEvent;
const rubick_native_next_1 = require("rubick-native-next");
async function simulateCopyShortcut() {
    await rubick_native_next_1.input.sendCopyShortcut();
}
async function getActiveWindowInfo() {
    const current = await rubick_native_next_1.system.getActiveWindow();
    if (!current)
        return null;
    return {
        path: current.path,
    };
}
function onNativeInputEvent(listener) {
    return rubick_native_next_1.input.onInputEvent(listener);
}
