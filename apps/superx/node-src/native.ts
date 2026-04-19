import { input, system } from 'rubick-native-next';
import type { NativeInputEvent } from 'rubick-native-next';

export interface ActiveWindowInfo {
  path?: string;
}

export async function simulateCopyShortcut(): Promise<void> {
  await input.sendCopyShortcut();
}

export async function getActiveWindowInfo(): Promise<ActiveWindowInfo | null> {
  const current = await system.getActiveWindow();
  if (!current) return null;

  return {
    path: current.path,
  };
}

export function onNativeInputEvent(
  listener: (event: NativeInputEvent) => void
): () => void {
  return input.onInputEvent(listener);
}
