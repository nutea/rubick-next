export type NativeMouseButton =
  | 'left'
  | 'middle'
  | 'right'
  | 'back'
  | 'forward';

export type NativeInputEvent =
  | {
      kind: 'key';
      state: 'down' | 'up';
      key: string;
      text?: string | null;
    }
  | {
      kind: 'mouse';
      state: 'down' | 'up';
      button: NativeMouseButton | 'unknown';
    }
  | {
      kind: 'mouse-move';
      x: number;
      y: number;
    }
  | {
      kind: 'wheel';
      deltaX: number;
      deltaY: number;
    };

export interface NativeClipboardContentText {
  type: 'text';
  content: string;
}

export interface NativeClipboardContentFile {
  type: 'file';
  content: string[];
}

export type NativeClipboardContent =
  | NativeClipboardContentText
  | NativeClipboardContentFile
  | null;

export interface NativeWindowInfo {
  title: string;
  path?: string;
  processId?: number;
  execName?: string;
  appName?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  url?: string;
}

export interface NativeSystemApi {
  getFolderOpenPath(): Promise<string>;
  getFolderOpenPathSync(): string;
  getActiveWindow(): Promise<NativeWindowInfo | null>;
}

export interface NativeInputApi {
  sendCopyShortcut(): Promise<void>;
  sendKeyboardTap(key: string, modifiers?: string[]): Promise<void>;
  onInputEvent(listener: (event: NativeInputEvent) => void): () => void;
}

export interface NativeClipboardApi {
  getClipboardContent(): Promise<NativeClipboardContent>;
}

export interface NativeRuntimeApi {
  system: NativeSystemApi;
  input: NativeInputApi;
  clipboard: NativeClipboardApi;
}
