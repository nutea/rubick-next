import { BrowserWindow } from 'electron';
import { WINDOW_WIDTH } from '@/common/constans/common';

const lastAppliedContentHeight = new WeakMap<BrowserWindow, number>();

/**
 * 主窗口内容区左上角「意图」坐标（与超级面板 panelPositionAnchor 同理）。
 * Win 高 DPI 下仅用 getContentBounds 再 setContentBounds 改高，x/y 会舍入漂移，逐字变高时向左上角蹭。
 */
const contentPositionAnchor = new WeakMap<BrowserWindow, { x: number; y: number }>();

/** 拖拽移动主窗口时由 api.windowMoving 写入 */
export function setMainWindowContentPositionAnchor(
  win: BrowserWindow,
  x: number,
  y: number
): void {
  contentPositionAnchor.set(win, { x: Math.round(x), y: Math.round(y) });
}

/**
 * 快捷键弹出等场景下先 setPosition 后，用当前内容区同步一次锚点（只读一次 getContentBounds）。
 */
export function syncMainWindowContentAnchorFromWindow(win: BrowserWindow): void {
  if (!win || win.isDestroyed()) return;
  const b = win.getContentBounds();
  contentPositionAnchor.set(win, { x: Math.round(b.x), y: Math.round(b.y) });
}

/**
 * 主窗口（useContentSize）仅改内容高度：固定锚点 x/y，避免 setContentBounds 与 DPI 舍入互相踩。
 */
export function applyMainWindowContentHeight(
  win: BrowserWindow,
  targetHeight: number
): void {
  const h = Math.round(Number(targetHeight));
  if (!Number.isFinite(h) || h < 1) return;

  const last = lastAppliedContentHeight.get(win);
  if (last === h) return;

  let ax: number;
  let ay: number;
  const anchor = contentPositionAnchor.get(win);
  if (anchor) {
    ax = anchor.x;
    ay = anchor.y;
  } else {
    const b = win.getContentBounds();
    ax = Math.round(b.x);
    ay = Math.round(b.y);
    contentPositionAnchor.set(win, { x: ax, y: ay });
  }

  win.setContentBounds({
    x: ax,
    y: ay,
    width: WINDOW_WIDTH,
    height: h,
  });
  lastAppliedContentHeight.set(win, h);
}
