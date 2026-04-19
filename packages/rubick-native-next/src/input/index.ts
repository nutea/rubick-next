import type {
  NativeInputApi,
  NativeInputEvent,
  NativeMouseButton,
} from '../types';
import { sendKeyboardChordDarwinLinux } from './platform-chord';

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

/** Normalized names: modifiers `control`|`alt`|`shift`|`super`, plus key tokens (`a`…`z`, `0`…`9`, `f1`…, `enter`, …). */
const TOKEN_ALIASES: Record<string, string> = {
  ctrl: 'control',
  control: 'control',
  leftcontrol: 'control',
  rightcontrol: 'control',
  alt: 'alt',
  option: 'alt',
  leftalt: 'alt',
  rightalt: 'alt',
  shift: 'shift',
  leftshift: 'shift',
  rightshift: 'shift',
  command: 'super',
  cmd: 'super',
  meta: 'super',
  super: 'super',
  leftsuper: 'super',
  rightsuper: 'super',
  enter: 'enter',
  'return': 'enter',
  esc: 'escape',
  escape: 'escape',
  del: 'delete',
  delete: 'delete',
  backspace: 'backspace',
  space: 'space',
  tab: 'tab',
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  pageup: 'pageup',
  pagedown: 'pagedown',
  pgup: 'pageup',
  pgdn: 'pagedown',
  home: 'home',
  end: 'end',
  insert: 'insert',
  minus: '-',
  equal: '=',
  grave: '`',
};

const MODIFIERS = new Set(['control', 'alt', 'shift', 'super']);

/** Tokens that are already canonical key names (after lowercasing). */
const KNOWN_KEY_NAMES = new Set([
  'enter',
  'escape',
  'tab',
  'space',
  'backspace',
  'delete',
  'up',
  'down',
  'left',
  'right',
  'pageup',
  'pagedown',
  'home',
  'end',
  'insert',
  '-',
  '=',
  '`',
]);

const toCanonicalToken = (raw: string): string | null => {
  const normalized = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!normalized) return null;

  if (TOKEN_ALIASES[normalized]) {
    return TOKEN_ALIASES[normalized];
  }

  if (KNOWN_KEY_NAMES.has(normalized)) {
    return normalized;
  }

  if (/^f\d{1,2}$/.test(normalized)) {
    return normalized;
  }

  if (/^[a-z]$/.test(normalized)) {
    return normalized;
  }

  if (/^\d$/.test(normalized)) {
    return normalized;
  }

  if (/^[A-Z]$/.test(raw.trim())) {
    return raw.trim().toLowerCase();
  }

  return null;
};

const parseChordTokens = (
  tokens: string[]
): { modifiers: string[]; key: string } | null => {
  const mods: string[] = [];
  const keys: string[] = [];

  for (const t of tokens) {
    if (MODIFIERS.has(t)) mods.push(t);
    else keys.push(t);
  }

  if (keys.length !== 1) return null;

  const order = ['control', 'alt', 'shift', 'super'];
  const uniq = Array.from(new Set(mods));
  uniq.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return { modifiers: uniq, key: keys[0] };
};

interface NativeChordBinding {
  sendKeyboardChord?: (modifiers: string[], key: string) => void;
}

const tryLoadNativeChord = (): NativeChordBinding | null => {
  if (process.platform !== 'win32') return null;

  try {
    return require('../../native') as NativeChordBinding;
  } catch {
    return null;
  }
};

const dispatchChord = async (rawKeys: string[]): Promise<void> => {
  const tokens = rawKeys
    .map(toCanonicalToken)
    .filter((t): t is string => Boolean(t));
  const parsed = parseChordTokens(tokens);
  if (!parsed) return;

  if (process.platform === 'win32') {
    try {
      tryLoadNativeChord()?.sendKeyboardChord?.(
        parsed.modifiers,
        parsed.key
      );
    } catch {
      // N-API failure: ignore to match prior fire-and-forget behaviour.
    }
    return;
  }

  await sendKeyboardChordDarwinLinux(
    process.platform,
    parsed.modifiers,
    parsed.key
  );
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
    const mod = process.platform === 'darwin' ? 'super' : 'control';
    await dispatchChord([mod, 'c']);
  },
  async sendKeyboardTap(key: string, modifiers: string[] = []): Promise<void> {
    await dispatchChord([...modifiers, key]);
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
