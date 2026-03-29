import path from 'path';
import fs from 'fs';
import { PluginHandler } from '@/core';
import { PLUGIN_INSTALL_DIR as baseDir } from '@/common/constans/main';
import API from '@/main/common/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __static: string;

const configPath = path.join(baseDir, './rubick-local-plugin.json');
const BUILTIN_SUPER_PANEL_PKG = path.join(
  __static,
  'superx',
  'package.json'
);

function ensureBuiltinSuperPanelInList(): void {
  try {
    if (!fs.existsSync(BUILTIN_SUPER_PANEL_PKG)) return;
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (Array.isArray(raw) && raw.some((p) => p.name === 'rubick-superx')) {
        const next = raw.filter((p) => p.name !== 'rubick-superx');
        fs.writeFileSync(configPath, JSON.stringify(next));
        global.LOCAL_PLUGINS.PLUGINS = [];
      }
    }
    const plugins = global.LOCAL_PLUGINS.getLocalPlugins();
    if (plugins.some((p) => p.name === 'rubick-system-super-panel')) return;
    const info = JSON.parse(fs.readFileSync(BUILTIN_SUPER_PANEL_PKG, 'utf-8'));
    global.LOCAL_PLUGINS.addPlugin({ ...info, isDev: false });
  } catch (e) {
    console.warn('[rubick] ensureBuiltinSuperPanelInList', e);
  }
}

function pluginNmDir(pluginName: string): string {
  return path.join(baseDir, 'node_modules', ...pluginName.split('/'));
}

/**
 * npm 在 Windows 上常因 .node 被占用报 EPERM；失败时至少从 package.json 与列表中移除，并尽力删目录
 */
function removeInstalledPluginFromDisk(pluginName: string): void {
  const pkgPath = path.join(baseDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    let touched = false;
    for (const key of [
      'dependencies',
      'optionalDependencies',
      'devDependencies',
    ] as const) {
      const block = pkg[key];
      if (block && Object.prototype.hasOwnProperty.call(block, pluginName)) {
        delete block[pluginName];
        touched = true;
      }
    }
    if (touched) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg));
    }
  }
  const modPath = pluginNmDir(pluginName);
  try {
    if (fs.existsSync(modPath)) {
      fs.rmSync(modPath, { recursive: true, force: true });
    }
  } catch {
    // EPERM 等：关闭插件进程或重启应用后再手动删目录
  }
}

let registry;
let pluginInstance;
(async () => {
  try {
    const res = await API.dbGet({
      data: {
        id: 'rubick-localhost-config',
      },
    });

    registry = res && res.data.register;
    pluginInstance = new PluginHandler({
      baseDir,
      registry,
    });
  } catch (e) {
    pluginInstance = new PluginHandler({
      baseDir,
      registry,
    });
  }
})();

global.LOCAL_PLUGINS = {
  PLUGINS: [],
  async downloadPlugin(plugin) {
    await pluginInstance.install([plugin.name], { isDev: plugin.isDev });
    if (plugin.isDev) {
      // 获取 dev 插件信息
      const pluginPath = path.resolve(baseDir, 'node_modules', plugin.name);
      const pluginInfo = JSON.parse(
        fs.readFileSync(path.join(pluginPath, './package.json'), 'utf8')
      );
      plugin = {
        ...plugin,
        ...pluginInfo,
      };
    }
    global.LOCAL_PLUGINS.addPlugin(plugin);
    return global.LOCAL_PLUGINS.PLUGINS;
  },
  refreshPlugin(plugin) {
    // 获取 dev 插件信息
    const pluginPath = path.resolve(baseDir, 'node_modules', plugin.name);
    const pluginInfo = JSON.parse(
      fs.readFileSync(path.join(pluginPath, './package.json'), 'utf8')
    );
    plugin = {
      ...plugin,
      ...pluginInfo,
    };
    // 刷新
    let currentPlugins = global.LOCAL_PLUGINS.getLocalPlugins();

    currentPlugins = currentPlugins.map((p) => {
      if (p.name === plugin.name) {
        return plugin;
      }
      return p;
    });

    // 存入
    global.LOCAL_PLUGINS.PLUGINS = currentPlugins;
    fs.writeFileSync(configPath, JSON.stringify(currentPlugins));
    return global.LOCAL_PLUGINS.PLUGINS;
  },
  getLocalPlugins() {
    try {
      if (!global.LOCAL_PLUGINS.PLUGINS.length) {
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        global.LOCAL_PLUGINS.PLUGINS = (Array.isArray(raw) ? raw : []).filter(
          (p) => p && p.name !== 'rubick-superx'
        );
      }
      return global.LOCAL_PLUGINS.PLUGINS;
    } catch (e) {
      global.LOCAL_PLUGINS.PLUGINS = [];
      return global.LOCAL_PLUGINS.PLUGINS;
    }
  },
  addPlugin(plugin) {
    let has = false;
    const currentPlugins = global.LOCAL_PLUGINS.getLocalPlugins();
    currentPlugins.some((p) => {
      has = p.name === plugin.name;
      return has;
    });
    if (!has) {
      currentPlugins.unshift(plugin);
      global.LOCAL_PLUGINS.PLUGINS = currentPlugins;
      fs.writeFileSync(configPath, JSON.stringify(currentPlugins));
    }
  },
  updatePlugin(plugin) {
    global.LOCAL_PLUGINS.PLUGINS = global.LOCAL_PLUGINS.PLUGINS.map(
      (origin) => {
        if (origin.name === plugin.name) {
          return plugin;
        }
        return origin;
      }
    );
    fs.writeFileSync(configPath, JSON.stringify(global.LOCAL_PLUGINS.PLUGINS));
  },
  async deletePlugin(plugin) {
    if (
      plugin.name === 'rubick-system-feature' ||
      plugin.name === 'rubick-system-super-panel'
    ) {
      return global.LOCAL_PLUGINS.getLocalPlugins();
    }
    try {
      await pluginInstance.uninstall([plugin.name], { isDev: plugin.isDev });
    } catch (_e) {
      removeInstalledPluginFromDisk(plugin.name);
    }
    global.LOCAL_PLUGINS.PLUGINS = global.LOCAL_PLUGINS.PLUGINS.filter(
      (p) => plugin.name !== p.name
    );
    fs.writeFileSync(configPath, JSON.stringify(global.LOCAL_PLUGINS.PLUGINS));
    return global.LOCAL_PLUGINS.PLUGINS;
  },
  reloadPluginsFromDisk() {
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      global.LOCAL_PLUGINS.PLUGINS = (Array.isArray(raw) ? raw : []).filter(
        (p) => p && p.name !== 'rubick-superx'
      );
    } catch (e) {
      global.LOCAL_PLUGINS.PLUGINS = [];
    }
    ensureBuiltinSuperPanelInList();
    return global.LOCAL_PLUGINS.PLUGINS;
  },
};

ensureBuiltinSuperPanelInList();
