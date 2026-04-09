declare module '@nut-tree/nut-js' {
  export const keyboard: {
    config: { autoDelayMs: number };
    pressKey: (...keys: unknown[]) => Promise<void>;
    releaseKey: (...keys: unknown[]) => Promise<void>;
  };
  export const Key: Record<string, unknown>;
}

declare module 'rubick-active-win' {
  export default function activeWin(opts?: {
    screenRecordingPermission?: boolean;
  }): Promise<{ owner?: { path?: string } } | null>;
}
