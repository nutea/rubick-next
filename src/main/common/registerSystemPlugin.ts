/* eslint-disable */
import path from 'path';
import fs from 'fs';
import { PLUGIN_INSTALL_DIR } from '@/common/constans/main';

declare const __static: string;

function systemPluginDiskRoot(plugin: { name: string }): string {
  if (plugin.name === 'rubick-system-super-panel') {
    return path.join(__static, 'superx');
  }
  return path.resolve(PLUGIN_INSTALL_DIR, 'node_modules', plugin.name);
}

export default () => {
  // 读取所有插件
  const totalPlugins = global.LOCAL_PLUGINS.getLocalPlugins();
  let systemPlugins = totalPlugins.filter(
    (plugin) => plugin.pluginType === 'system'
  );
  systemPlugins = systemPlugins
    .map((plugin) => {
      try {
        const pluginPath = systemPluginDiskRoot(plugin);
        return {
          ...plugin,
          indexPath: path.join(pluginPath, './', plugin.entry),
        };
      } catch (e) {
        return false;
      }
    })
    .filter(Boolean);

  const hooks = {
    onReady: [],
  };

  systemPlugins.forEach((plugin) => {
    if (fs.existsSync(plugin.indexPath)) {
      // Electron-vite runtime uses native Node require, no webpack helper.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pluginModule = require(plugin.indexPath)();
      // @ts-ignore
      hooks.onReady.push(pluginModule.onReady);
    }
  });

  const triggerReadyHooks = (ctx) => {
    // @ts-ignore
    hooks.onReady.forEach((hook: any) => {
      try {
        hook && hook(ctx);
      } catch (e) {
        console.log(e);
      }
    });
  };

  return {
    triggerReadyHooks,
  };
};
