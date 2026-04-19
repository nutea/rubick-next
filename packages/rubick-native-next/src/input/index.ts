import { keyboard, Key } from '@nut-tree/nut-js';
import type {
  NativeInputApi,
  NativeInputEvent,
  NativeMouseButton,
} from '../types';

interface UiohookKeyboardEventLike {
  keycode: number;
}

interface UiohookMouseEventLike {
  button: unknown;
  x: number;
  y: number;
}

interface UiohookWheelEventLike {
  direction: number;
  rotation: number;
}

interface UiohookLike {
  on(
    event:
      | 'keydown'
      | 'keyup'
      | 'mousedown'
      | 'mouseup'
      | 'mousemove'
      | 'wheel',
    listener: (event: unknown) => void
  ): this;
  removeListener(
    event:
      | 'keydown'
      | 'keyup'
      | 'mousedown'
      | 'mouseup'
      | 'mousemove'
      | 'wheel',
    listener: (event: unknown) => void
  ): this;
  start(): void;
  stop(): void;
}

interface UiohookModuleLike {
  uIOhook: UiohookLike;
  UiohookKey?: Record<string, number>;
  WheelDirection?: {
    VERTICAL?: number;
    HORIZONTAL?: number;
  };
}

const listeners = new Set<(event: NativeInputEvent) => void>();
let stopHook: (() => void) | null = null;

keyboard.config.autoDelayMs = 10;

const keyMap = Key as Record<string, unknown>;

const KEY_ALIASES: Record<string, string> = {
  ctrl: 'LeftControl',
  control: 'LeftControl',
  alt: 'LeftAlt',
  option: 'LeftAlt',
  shift: 'LeftShift',
  command: 'LeftSuper',
  cmd: 'LeftSuper',
  meta: 'LeftSuper',
  super: 'LeftSuper',
  enter: 'Enter',
  return: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  space: 'Space',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  del: 'Delete',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  pageup: 'PageUp',
  pagedown: 'PageDown',
};

const toNutKeyName = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!normalized) return '';

  if (KEY_ALIASES[normalized]) {
    return KEY_ALIASES[normalized];
  }

  if (/^f\d{1,2}$/.test(normalized)) {
    return normalized.toUpperCase();
  }

  if (/^[a-z]$/.test(normalized)) {
    return normalized.toUpperCase();
  }

  if (/^\d$/.test(normalized)) {
    return normalized;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const resolveNutKey = (value: string): unknown | null => {
  const alias = toNutKeyName(value);
  if (!alias) return null;

  return keyMap[alias] ?? null;
};

const sendKeySequence = async (keys: string[]): Promise<void> => {
  const resolved = keys
    .map((key) => resolveNutKey(key))
    .filter((key): key is unknown => key !== null);

  if (!resolved.length) return;

  await keyboard.pressKey(...resolved);
  await keyboard.releaseKey(...resolved);
};

const createKeyNameMap = (
  uiohookKey?: Record<string, number>
): Map<number, string> => {
  const entries = Object.entries(uiohookKey || {});
  const map = new Map<number, string>();

  for (const [name, keycode] of entries) {
    if (typeof keycode !== 'number' || map.has(keycode)) continue;

    switch (name) {
      case 'Ctrl':
        map.set(keycode, 'ControlLeft');
        break;
      case 'CtrlRight':
        map.set(keycode, 'ControlRight');
        break;
      case 'Alt':
        map.set(keycode, 'AltLeft');
        break;
      case 'AltRight':
        map.set(keycode, 'AltRight');
        break;
      case 'Shift':
        map.set(keycode, 'ShiftLeft');
        break;
      case 'ShiftRight':
        map.set(keycode, 'ShiftRight');
        break;
      case 'Meta':
        map.set(keycode, 'MetaLeft');
        break;
      case 'MetaRight':
        map.set(keycode, 'MetaRight');
        break;
      default:
        map.set(keycode, name);
        break;
    }
  }

  return map;
};

const normalizeButton = (button: unknown): NativeMouseButton | 'unknown' => {
  if (button === 1) return 'left';
  if (button === 2) return 'right';
  if (button === 3) return 'middle';
  if (button === 4) return 'back';
  if (button === 5) return 'forward';
  return 'unknown';
};

const emit = (event: NativeInputEvent): void => {
  for (const listener of listeners) {
    listener(event);
  }
};

const tryLoadUiohook = (): UiohookModuleLike | null => {
  try {
    return require('uiohook-napi') as UiohookModuleLike;
  } catch {
    return null;
  }
};

const startSharedHook = (): (() => void) | null => {
  const hookModule = tryLoadUiohook();
  if (!hookModule) return null;

  const { uIOhook } = hookModule;
  const keyNames = createKeyNameMap(hookModule.UiohookKey);
  const verticalWheelDirection = hookModule.WheelDirection?.VERTICAL ?? 3;

  const keydown = (event: unknown) => {
    const input = event as UiohookKeyboardEventLike;
    emit({
      kind: 'key',
      state: 'down',
      key: keyNames.get(input.keycode) || `KeyCode:${input.keycode}`,
    });
  };

  const keyup = (event: unknown) => {
    const input = event as UiohookKeyboardEventLike;
    emit({
      kind: 'key',
      state: 'up',
      key: keyNames.get(input.keycode) || `KeyCode:${input.keycode}`,
    });
  };

  const mousedown = (event: unknown) => {
    const input = event as UiohookMouseEventLike;
    emit({
      kind: 'mouse',
      state: 'down',
      button: normalizeButton(input.button),
    });
  };

  const mouseup = (event: unknown) => {
    const input = event as UiohookMouseEventLike;
    emit({
      kind: 'mouse',
      state: 'up',
      button: normalizeButton(input.button),
    });
  };

  const mousemove = (event: unknown) => {
    const input = event as UiohookMouseEventLike;
    emit({
      kind: 'mouse-move',
      x: input.x,
      y: input.y,
    });
  };

  const wheel = (event: unknown) => {
    const input = event as UiohookWheelEventLike;
    const rotation = Number(input.rotation) || 0;
    const isVertical = input.direction === verticalWheelDirection;
    emit({
      kind: 'wheel',
      deltaX: isVertical ? 0 : rotation,
      deltaY: isVertical ? rotation : 0,
    });
  };

  uIOhook.on('keydown', keydown);
  uIOhook.on('keyup', keyup);
  uIOhook.on('mousedown', mousedown);
  uIOhook.on('mouseup', mouseup);
  uIOhook.on('mousemove', mousemove);
  uIOhook.on('wheel', wheel);
  uIOhook.start();

  return () => {
    uIOhook.removeListener('keydown', keydown);
    uIOhook.removeListener('keyup', keyup);
    uIOhook.removeListener('mousedown', mousedown);
    uIOhook.removeListener('mouseup', mouseup);
    uIOhook.removeListener('mousemove', mousemove);
    uIOhook.removeListener('wheel', wheel);
    uIOhook.stop();
  };
};

export const input: NativeInputApi = {
  async sendCopyShortcut(): Promise<void> {
    await sendKeySequence([process.platform === 'darwin' ? 'command' : 'control', 'c']);
  },
  async sendKeyboardTap(key: string, modifiers: string[] = []): Promise<void> {
    await sendKeySequence([...modifiers, key]);
  },
  onInputEvent(listener: (event: NativeInputEvent) => void): () => void {
    listeners.add(listener);

    if (!stopHook) {
      stopHook = startSharedHook();
    }

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && stopHook) {
        stopHook();
        stopHook = null;
      }
    };
  },
};
