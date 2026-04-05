import { PLUGIN_INSTALL_DIR as baseDir } from '@/common/constans/renderer';
import { toRaw } from 'vue';

const path = window.require('path');

export default function pluginClickEvent({
  plugin,
  fe,
  cmd,
  ext,
  openPlugin,
  option,
}) {
  const pluginPath = path.resolve(baseDir, 'node_modules', plugin.name);
  const pluginDist = {
    ...toRaw(plugin),
    indexPath: `file://${path.join(pluginPath, './', plugin.main || '')}`,
    cmd: cmd.label || cmd,
    feature: fe,
    ext,
  };
  // 模板文件
  if (!plugin.main) {
    pluginDist.tplPath = `file://${__static}/tpl/index.html`;
  }
  // 插件市场
  if (plugin.name === 'rubick-system-feature') {
    pluginDist.indexPath = `file://${__static}/feature/index.html`;
  }
  if (plugin.name === 'rubick-system-super-panel') {
    pluginDist.indexPath = `file://${path.join(__static, 'superx', 'main.html')}`;
  }
  openPlugin(pluginDist, option);
}
