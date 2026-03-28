import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { getChildProcess, getElectron, getOs, getPath } from './electron';
import { rubickDb } from './db';
import { openPlugin } from './open-plugin';
import { parseCmdRegex } from './cmd-regex';
import type {
  CmdItem,
  FeatureItem,
  MatchPluginItem,
  OptionPlugin,
  TriggerSuperPanelPayload,
  TranslateState,
  UserPluginItem,
} from './types';

const EXPLORER_LIKE = [
  'explorer.exe',
  'SearchApp.exe',
  'SearchHost.exe',
  'FESearchHost.exe',
  'Finder.app',
];

function msgTriggerSync<T>(type: string, data: unknown): T {
  const { ipcRenderer } = getElectron();
  const res = ipcRenderer.sendSync('msg-trigger', { type, data });
  if (res instanceof Error) throw res;
  return res as T;
}

function getDesktopPath(): string {
  return msgTriggerSync<string>('getPath', { name: 'desktop' });
}

function basenameWinOrMac(p: string): string {
  const seg = p.split(/[/\\]/);
  return seg[seg.length - 1] || '';
}

function isExplorerLikeWindow(fileUrl: string): boolean {
  const name = basenameWinOrMac(fileUrl);
  return EXPLORER_LIKE.includes(name);
}

export function useSuperPanel() {
  const pathMod = getPath();
  const os = getOs();
  const { ipcRenderer, clipboard } = getElectron();
  const { spawn, exec } = getChildProcess();

  const pinned = ref(false);

  const state = reactive({
    translate: null as TranslateState | null,
    loading: false,
    fileUrl: '',
    matchPlugins: [] as MatchPluginItem[],
    userPlugins: [] as UserPluginItem[],
  });

  const commonPlugins: MatchPluginItem[] = [
    {
      type: 'default',
      name: '终端打开',
      logo: '',
      click: () => {
        if (os.type() === 'Windows_NT') {
          spawn(`start cmd.exe /k "cd /d ${state.fileUrl}"`, [], { shell: true });
        } else {
          spawn('open', ['-a', 'Terminal', state.fileUrl]);
        }
      },
    },
    {
      type: 'default',
      name: '新建文件',
      logo: '',
      click: () => {
        ipcRenderer.send('create-file', {
          title: '请选择要保存的文件名',
          buttonLabel: '保存',
          defaultPath: state.fileUrl.replace('file://', ''),
          showsTagField: false,
          nameFieldLabel: '',
        });
      },
    },
    {
      type: 'default',
      name: '复制路径',
      logo: '',
      click: () => {
        clipboard.writeText(state.fileUrl.replace('file://', ''));
      },
    },
  ];

  const selectedPlugins: MatchPluginItem[] = [
    {
      type: 'default',
      name: '复制当前路径',
      logo: '',
      click: () => {
        clipboard.writeText(state.fileUrl.replace('file://', ''));
      },
    },
  ];

  function runTranslate(word: string) {
    const translator = (window as unknown as { translator?: { translate: (w: string) => Promise<string> } }).translator;
    if (!translator) return;
    state.loading = true;
    translator
      .translate(word)
      .then((raw) => {
        state.translate = { ...JSON.parse(raw), src: word };
      })
      .catch(() => {
        state.translate = null;
      })
      .finally(() => {
        state.loading = false;
      });
  }

  function collectTextPlugins(text: string, optionPlugin: OptionPlugin[]) {
    for (const plugin of optionPlugin) {
      for (const feature of plugin.features) {
        for (const cmd of feature.cmds) {
          if (cmd.type === 'regex' && cmd.match && parseCmdRegex(cmd.match).test(text)) {
            state.matchPlugins.push({
              type: 'ext',
              name: cmd.label || feature.code,
              logo: plugin.logo,
              click: () =>
                openPlugin({
                  plugin: plugin as unknown as Record<string, unknown>,
                  feature,
                  cmd,
                  data: text,
                }),
            });
          }
          if (cmd.type === 'over') {
            state.matchPlugins.push({
              type: 'ext',
              name: cmd.label || feature.code,
              logo: plugin.logo,
              click: () =>
                openPlugin({
                  plugin: plugin as unknown as Record<string, unknown>,
                  feature,
                  cmd,
                  data: text,
                }),
            });
          }
        }
      }
    }
  }

  function collectFilePlugins(fileUrl: string, ext: string, optionPlugin: OptionPlugin[]) {
    const imgRe = /\.(png|jpg|gif|jpeg|webp)$/i;
    for (const plugin of optionPlugin) {
      for (const feature of plugin.features) {
        for (const cmd of feature.cmds) {
          if (cmd.type === 'img' && imgRe.test(ext)) {
            state.matchPlugins.unshift({
              type: 'ext',
              name: cmd.label || feature.code,
              logo: plugin.logo,
              click: () => {
                const data = ipcRenderer.sendSync(
                  'get-file-base64',
                  state.fileUrl.replace('file://', '')
                );
                openPlugin({
                  plugin: plugin as unknown as Record<string, unknown>,
                  feature,
                  cmd,
                  data,
                });
              },
            });
          }
          if (cmd.type === 'file' && cmd.match && parseCmdRegex(cmd.match).test(ext)) {
            state.matchPlugins.unshift({
              type: 'ext',
              name: cmd.label || feature.code,
              logo: plugin.logo,
              click: () =>
                openPlugin({
                  plugin: plugin as unknown as Record<string, unknown>,
                  feature,
                  cmd,
                  data: {
                    isFile: true,
                    isDirectory: false,
                    name: pathMod.basename(fileUrl),
                    path: fileUrl,
                  },
                }),
            });
          }
        }
      }
    }
  }

  function refreshUserPlugins() {
    const doc = rubickDb.get('super-panel-user-plugins') as {
      data?: UserPluginItem[];
    } | null;
    if (!doc?.data) {
      state.userPlugins = [];
      return;
    }
    state.userPlugins = doc.data.map((row) => ({
      ...row,
      click: () =>
        openPlugin({
          plugin: row as unknown as Record<string, unknown>,
          feature: row.ext,
          cmd: row.cmd,
        }),
    }));
  }

  function resolveCurrentFolder(cb: (folder: string) => void) {
    if (os.type() === 'Darwin') {
      exec(
        `osascript -e 'tell application "Finder" to get the POSIX path of (target of front window as alias)'`,
        { encoding: 'utf8' },
        (err, stdout) => {
          if (!err && stdout) cb(stdout.trim().replace(/\/$/, ''));
        }
      );
    } else if (os.type() === 'Windows_NT') {
      const data = ipcRenderer.sendSync('get-path') as { stdout: string };
      cb(data.stdout);
    }
  }

  function onTrigger(_e: unknown, payload: TriggerSuperPanelPayload) {
    state.matchPlugins = [];
    state.translate = null;

    const { text, fileUrl, optionPlugin = [] } = payload;
    const ext = pathMod.extname(fileUrl || '');
    state.fileUrl = (fileUrl ?? '') as string;

    if (fileUrl === null) {
      state.matchPlugins = [...commonPlugins];
      state.fileUrl = getDesktopPath();
      return;
    }

    if (!fileUrl && text) {
      collectTextPlugins(text, optionPlugin);
      runTranslate(text);
      return;
    }

    if (fileUrl && isExplorerLikeWindow(String(fileUrl))) {
      state.matchPlugins = [...commonPlugins];
      resolveCurrentFolder((folder) => {
        state.fileUrl = folder;
      });
      return;
    }

    state.matchPlugins = [...selectedPlugins];
    state.fileUrl = String(fileUrl);
    collectFilePlugins(String(fileUrl), ext, optionPlugin);
  }

  function togglePin() {
    pinned.value = !pinned.value;
    ipcRenderer.send('trigger-pin', pinned.value);
  }

  function hidePanel() {
    ipcRenderer.send('superPanel-hidden');
  }

  function showMainWindow() {
    ipcRenderer.send('msg-trigger', { type: 'showMainWindow' });
  }

  function openInstalled() {
    openPlugin({
      plugin: {
        name: 'rubick-system-feature',
        main: 'index.html',
        preload: 'preload.js',
      },
      cmd: '已安装插件',
      feature: {
        code: '已安装插件',
        type: 'text',
        payload: 'rubick 插件市场',
      },
    });
  }

  function runPluginClick(item: MatchPluginItem | UserPluginItem, ev?: Event) {
    hidePanel();
    item.click(ev);
  }

  const translate = computed(() => state.translate);
  const loading = computed(() => state.loading);
  const matchPlugins = computed(() => state.matchPlugins);
  const userPlugins = computed(() => state.userPlugins);

  function reportHeight() {
    const el = document.getElementById('app');
    if (!el) return;
    ipcRenderer.send('superPanel-setSize', parseInt(getComputedStyle(el).height, 10));
  }

  let offTrigger: (() => void) | undefined;

  onMounted(() => {
    refreshUserPlugins();
    const handler = (_e: Electron.IpcRendererEvent, payload: TriggerSuperPanelPayload) =>
      onTrigger(_e, payload);
    ipcRenderer.on('trigger-super-panel', handler);
    offTrigger = () => ipcRenderer.removeListener('trigger-super-panel', handler);
  });

  onUnmounted(() => {
    offTrigger?.();
  });

  watch(
    [matchPlugins, translate],
    () => {
      refreshUserPlugins();
      setTimeout(reportHeight, 50);
    },
    { deep: true }
  );

  return {
    state,
    pinned,
    translate,
    loading,
    matchPlugins,
    userPlugins,
    togglePin,
    showMainWindow,
    openInstalled,
    runPluginClick,
    reportHeight,
  };
}
