import { BrowserWindow, ipcMain, nativeTheme } from 'electron';
import localConfig from '../common/initLocalConfig';
import commonConst from '@/common/utils/commonConst';
import path from 'path';
import { WINDOW_MIN_HEIGHT } from '@/common/constans/common';
import mainInstance from '@/main';
export default () => {
  let win: any;

  const init = async (pluginInfo, viewInfo, view) => {
    ipcMain.on('detach:service', async (event, arg: { type: string }) => {
      const data = await operation[arg.type]();
      event.returnValue = data;
    });
    const createWin = await createWindow(pluginInfo, viewInfo, view);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@electron/remote/main').enable(createWin.webContents);
  };

  /** 插件 BrowserView 不可铺满整个客户区，否则会盖住 detach 页顶栏（无法拖动/关闭）。 */
  const layoutDetachPluginView = (w: BrowserWindow) => {
    const bv = w.getBrowserView();
    if (!bv) return;
    const [cw, ch] = w.getContentSize();
    bv.setBounds({
      x: 0,
      y: WINDOW_MIN_HEIGHT,
      width: cw,
      height: Math.max(0, ch - WINDOW_MIN_HEIGHT),
    });
  };

  const createWindow = async (pluginInfo, viewInfo, view) => {
    const createWin = new BrowserWindow({
      height: viewInfo.height,
      minHeight: WINDOW_MIN_HEIGHT,
      width: viewInfo.width,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 12, y: 21 },
      title: pluginInfo.pluginName,
      resizable: true,
      frame: true,
      show: false,
      enableLargerThanScreen: true,
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1c28' : '#fff',
      x: viewInfo.x,
      y: viewInfo.y,
      webPreferences: {
        webSecurity: false,
        backgroundThrottling: false,
        contextIsolation: false,
        webviewTag: true,
        devTools: true,
        nodeIntegration: true,
        navigateOnDragDrop: true,
        spellcheck: false,
      },
    });
    const detachFileUrl = `file://${path.join(
      __static,
      './detach/index.html'
    )}`;
    // 勿与主窗口 WEBPACK_DEV_SERVER_URL 绑定：electron:serve 时 8082 往往未启动（需单独 cd detach && npm run serve）。
    // 需要调试分离窗壳时设置环境变量 DETACH_DEV_SERVER_URL，例如 http://localhost:8082
    const detachDevUrl = process.env.DETACH_DEV_SERVER_URL;
    if (detachDevUrl) {
      const onFail = (
        _e: Electron.Event,
        _code: number,
        _desc: string,
        url: string,
        isMainFrame: boolean
      ) => {
        if (!isMainFrame) return;
        createWin.webContents.removeListener('did-fail-load', onFail);
        createWin.webContents.removeListener('did-finish-load', onOk);
        void createWin.loadURL(detachFileUrl);
      };
      const onOk = () => {
        createWin.webContents.removeListener('did-fail-load', onFail);
        createWin.webContents.removeListener('did-finish-load', onOk);
      };
      createWin.webContents.once('did-fail-load', onFail);
      createWin.webContents.once('did-finish-load', onOk);
      void createWin.loadURL(detachDevUrl).catch(() => {
        createWin.webContents.removeListener('did-fail-load', onFail);
        createWin.webContents.removeListener('did-finish-load', onOk);
        void createWin.loadURL(detachFileUrl);
      });
    } else {
      void createWin.loadURL(detachFileUrl);
    }
    createWin.on('close', () => {
      executeHooks('PluginOut', null);
    });
    createWin.on('closed', () => {
      view.webContents?.destroy();
      win = undefined;
    });
    createWin.on('focus', () => {
      win = createWin;
      view && win.webContents?.focus();
    });

    createWin.once('ready-to-show', async () => {
      const config = await localConfig.getConfig();
      const darkMode = config.perf.common.darkMode;
      darkMode &&
        createWin.webContents.executeJavaScript(
          `document.body.classList.add("dark");window.rubick.theme="dark"`
        );
      createWin.setBrowserView(view);
      view.inDetach = true;
      layoutDetachPluginView(createWin);
      createWin.webContents.executeJavaScript(
        `window.initDetach(${JSON.stringify(pluginInfo)})`
      );
      win = createWin;
      createWin.show();
    });

    createWin.on('resize', () => layoutDetachPluginView(createWin));

    // 最大化设置
    createWin.on('maximize', () => {
      createWin.webContents.executeJavaScript('window.maximizeTrigger()');
      layoutDetachPluginView(createWin);
    });
    // 最小化
    createWin.on('unmaximize', () => {
      createWin.webContents.executeJavaScript('window.unmaximizeTrigger()');
      layoutDetachPluginView(createWin);
    });

    createWin.on('page-title-updated', (e) => {
      e.preventDefault();
    });
    createWin.webContents.once('render-process-gone', () => {
      createWin.close();
    });

    if (commonConst.macOS()) {
      createWin.on('enter-full-screen', () => {
        createWin.webContents.executeJavaScript(
          'window.enterFullScreenTrigger()'
        );
      });
      createWin.on('leave-full-screen', () => {
        createWin.webContents.executeJavaScript(
          'window.leaveFullScreenTrigger()'
        );
      });
    }

    view.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      if (!(input.meta || input.control || input.shift || input.alt)) {
        if (input.key === 'Escape') {
          operation.endFullScreen();
        }
        return;
      }
    });

    const executeHooks = (hook, data) => {
      if (!view) return;
      const evalJs = `console.log(window.rubick);if(window.rubick && window.rubick.hooks && typeof window.rubick.hooks.on${hook} === 'function' ) {
          try {
            window.rubick.hooks.on${hook}(${data ? JSON.stringify(data) : ''});
          } catch(e) {console.log(e)}
        }
      `;
      view.webContents.executeJavaScript(evalJs);
    };
    return createWin;
  };

  const getWindow = () => win;

  const operation = {
    minimize: () => {
      win.focus();
      win.minimize();
    },
    maximize: () => {
      win.isMaximized() ? win.unmaximize() : win.maximize();
    },
    close: () => {
      win.close();
    },
    endFullScreen: () => {
      win.isFullScreen() && win.setFullScreen(false);
    },
  };

  return {
    init,
    getWindow,
  };
};
