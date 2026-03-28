// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
  // transpileDependencies: ["fix-path"],
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.join(__dirname, './src'),
        // Electron / asar 场景下与 fs 一致，避免 webpack 无法解析 original-fs
        'original-fs': 'fs',
      },
    },
    // 原生 .node 模块，不应打进 renderer bundle（运行时由 Node require）
    externals: {
      'extract-file-icon': 'commonjs extract-file-icon',
    },
  },
  pages: {
    index: {
      entry: 'src/renderer/main.ts',
    },
  },
  productionSourceMap: false,
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      mainProcessFile: 'src/main/index.ts',
      mainProcessWatch: ['src/main'],
      externals: [
        'pouchdb',
        'extract-file-icon',
        'npm',
        'electron-screenshots',
        '@electron/remote',
      ],
      // Use this to change the entry point of your app's render process. default src/[main|index].[js|ts]
      builderOptions: {
        productName: 'rubick',
        appId: 'com.muwoo.rubick',
        compression: 'maximum',
        // afterPack: './release.js',
        // afterAllArtifactBuild: () => {
        //   return ['./build/app.asar.gz'];
        // },
        directories: {
          output: 'build',
        },
        releaseInfo: {
          releaseName: 'normal', // normal 弹窗 / major 强制更新
          releaseNotesFile: './release/releaseNotes.md',
        },
        publish: [
          {
            provider: 'github',
            owner: 'rubickCenter',
            repo: 'rubick',
          },
        ],
        // files: ["dist_electron/**/*"],
        dmg: {
          contents: [
            {
              x: 410,
              y: 150,
              type: 'link',
              path: '/Applications',
            },
            {
              x: 130,
              y: 150,
              type: 'file',
            },
          ],
        },
        mac: {
          icon: 'public/icons/icon.icns',
          target: [
            {
              target: 'dmg',
              arch: ['x64', 'arm64'],
            },
          ],
          artifactName: 'rubick-${version}-${arch}.dmg',
          gatekeeperAssess: false,
          entitlementsInherit: './release/entitlements.mac.plist',
          entitlements: './release/entitlements.mac.plist',
          hardenedRuntime: true,
          category: 'public.app-category.developer-tools',
          extendInfo: {
            LSUIElement: 1,
          },
        },
        win: {
          icon: 'public/icons/icon.ico',
          artifactName: 'rubick-Setup-${version}-${arch}.exe',
          target: [
            {
              target: 'nsis',
              arch: ['x64', 'ia32'],
            },
          ],
        },
        nsis: {
          shortcutName: 'rubick',
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          include: 'public/installer.nsh',
        },
        linux: {
          icon: 'public/icons/',
          publish: ['github'],
          target: 'deb',
        },
      },
    },
  },
};
