declare module '../../native' {
  export function getActiveWindow(): {
    title?: string;
    path?: string;
    processId?: number;
    appName?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  } | null;
}
