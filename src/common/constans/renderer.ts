const { app } = window.require('@electron/remote');
const path = window.require('path');

const appPath = app.getPath('userData');

const PLUGIN_INSTALL_DIR = path.join(appPath, './rubick-plugins-new');
const PLUGIN_HISTORY = 'rubick-plugin-history';

export { PLUGIN_INSTALL_DIR, PLUGIN_HISTORY };
