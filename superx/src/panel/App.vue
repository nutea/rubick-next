<template>
  <div class="main" id="app">
    <div class="top-menu">
      <div class="logo" @click="showMainWindow">
        <img :src="logoUrl" alt="Rubick" />
      </div>
      <div class="menu">
        <HomeOutlined @click="openInstalled" />
        <PushpinOutlined
          title="钉住"
          :style="{ color: pinned ? '#ff4ea4' : undefined }"
          @click="togglePin"
        />
      </div>
    </div>

    <div v-if="selectedPreview" class="selected-content" :class="`kind-${selectedPreview.kind}`">
      <div class="selected-header">
        <span class="selected-title">当前选中内容</span>
        <span class="selected-type">{{ selectedPreview.typeLabel }}</span>
      </div>
      <div class="selected-main ellpise">{{ selectedPreview.title }}</div>
      <div class="selected-sub ellpise">{{ selectedPreview.subtitle }}</div>
    </div>

    <div v-if="translate || loading" class="translate-content">
      <div v-if="loading" class="spinner">
        <div class="bounce1" />
        <div class="bounce2" />
        <div class="bounce3" />
      </div>
      <template v-else-if="translate">
        <div class="ellpise source">
          {{ translate.src }}
          {{ translate.basic?.phonetic ? `[${translate.basic.phonetic}]` : '' }}
        </div>
        <div v-if="translate.basic?.explains?.length" class="translate-target">
          <div
            v-for="(line, idx) in translate.basic.explains"
            :key="idx"
            class="ellpise"
          >
            {{ line }}
          </div>
        </div>
        <div v-else-if="translate.translation?.length" class="translate-target">
          <div
            v-for="(line, idx) in translate.translation"
            :key="idx"
            class="ellpise"
          >
            {{ line }}
          </div>
        </div>
      </template>
    </div>

    <div v-if="matchPlugins.length" class="plugins-content">
      <div class="plugin-title">匹配插件</div>
      <a-row>
        <a-col
          v-for="(item, idx) in matchPlugins"
          :key="idx"
          :span="8"
          class="plugin-item"
          @click="runPluginClick(item, $event)"
        >
          <component
            :is="iconFor(item)"
            v-if="item.type === 'default'"
            class="plugin-default-icon"
          />
          <img v-else width="30" :src="item.logo" alt="" />
          <div>{{ item.name }}</div>
        </a-col>
      </a-row>
    </div>

    <div v-if="userPlugins.length" class="plugins-content">
      <div class="plugin-title">固定插件</div>
      <a-row>
        <a-col
          v-for="(item, idx) in userPlugins"
          :key="idx"
          :span="8"
          class="plugin-item"
          @click="runPluginClick(item, $event)"
        >
          <img width="30" :src="item.logo" alt="" />
          <div>{{ item.pluginName }}</div>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  HomeOutlined,
  PushpinOutlined,
  CodeOutlined,
  FileAddOutlined,
  CopyOutlined,
} from '@ant-design/icons-vue';
import { useSuperPanel } from './use-super-panel';
import type { MatchPluginItem } from './types';

/** 构建后可换成本地 logo；开发期用 data URL 占位 */
const logoUrl =
  'https://pic1.zhimg.com/80/v2-c4b9ea27fde09f7e985a5fc77d922680_720w.png';

const {
  pinned,
  translate,
  loading,
  selectedText,
  selectedFileUrl,
  matchPlugins,
  userPlugins,
  togglePin,
  showMainWindow,
  openInstalled,
  runPluginClick,
} = useSuperPanel();

const defaultIconByName: Record<string, typeof CodeOutlined> = {
  终端打开: CodeOutlined,
  新建文件: FileAddOutlined,
  复制路径: CopyOutlined,
  复制当前路径: CopyOutlined,
};

function iconFor(item: MatchPluginItem) {
  return defaultIconByName[item.name] || CopyOutlined;
}

function normalizePath(raw: string): string {
  return raw.replace(/^file:\/\//, '');
}

const selectedPreview = computed(() => {
  const text = selectedText.value.trim();
  if (text) {
    return {
      kind: 'text',
      typeLabel: '文本',
      title: text,
      subtitle: `长度 ${text.length}`,
    };
  }

  const rawPath = selectedFileUrl.value.trim();
  if (!rawPath) return null;

  const fullPath = normalizePath(rawPath);
  const seg = fullPath.split(/[/\\]/).filter(Boolean);
  const filename = seg[seg.length - 1] || fullPath;
  const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() || '' : '';
  const imageSet = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico']);
  const videoSet = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv']);
  const audioSet = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']);
  const archiveSet = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']);
  const codeSet = new Set([
    'ts',
    'tsx',
    'js',
    'jsx',
    'vue',
    'py',
    'java',
    'go',
    'rs',
    'c',
    'cpp',
    'h',
    'hpp',
    'json',
    'yml',
    'yaml',
    'md',
    'xml',
    'html',
    'css',
    'scss',
    'less',
  ]);
  const docSet = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf']);

  let kind = 'file';
  let typeLabel = ext ? `${ext.toUpperCase()} 文件` : '文件夹';
  if (!ext) {
    kind = 'folder';
    typeLabel = '文件夹';
  } else if (imageSet.has(ext)) {
    kind = 'image';
    typeLabel = '图片';
  } else if (videoSet.has(ext)) {
    kind = 'video';
    typeLabel = '视频';
  } else if (audioSet.has(ext)) {
    kind = 'audio';
    typeLabel = '音频';
  } else if (archiveSet.has(ext)) {
    kind = 'archive';
    typeLabel = '压缩包';
  } else if (codeSet.has(ext)) {
    kind = 'code';
    typeLabel = '代码/配置';
  } else if (docSet.has(ext)) {
    kind = 'doc';
    typeLabel = '文档';
  }

  return {
    kind,
    typeLabel,
    title: filename,
    subtitle: fullPath,
  };
});
</script>

<style>
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
::-webkit-scrollbar {
  display: none;
}
</style>

<style scoped>
.main {
  min-height: 100%;
  box-sizing: border-box;
}
.top-menu {
  padding: 0 10px;
  width: 100%;
  height: 46px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  width: 26px;
  height: 26px;
  border-radius: 100%;
  background: #574778;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.logo img {
  width: 20px;
}
.menu {
  color: #999;
  width: 46px;
  display: flex;
  justify-content: space-between;
  font-size: 18px;
}
.menu :deep(.anticon) {
  cursor: pointer;
}
.translate-content {
  padding: 4px 10px;
  font-size: 12px;
  color: #ff4ea4;
  box-sizing: border-box;
  background: #f5f5f5;
}
.selected-content {
  margin: 0 10px 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  background: #f7f9fc;
}
.selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.selected-title {
  color: #5f6470;
  font-size: 12px;
}
.selected-type {
  font-size: 11px;
  line-height: 18px;
  border-radius: 10px;
  padding: 0 8px;
  background: #e8f3ff;
  color: #2563eb;
}
.selected-main {
  font-size: 13px;
  color: #1f2937;
  font-weight: 500;
}
.selected-sub {
  margin-top: 2px;
  font-size: 11px;
  color: #6b7280;
}
.kind-text {
  background: #fff7ed;
  border-color: #fed7aa;
}
.kind-text .selected-type {
  background: #ffedd5;
  color: #c2410c;
}
.kind-image {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.kind-image .selected-type {
  background: #dbeafe;
  color: #1d4ed8;
}
.kind-video,
.kind-audio {
  background: #f5f3ff;
  border-color: #ddd6fe;
}
.kind-video .selected-type,
.kind-audio .selected-type {
  background: #ede9fe;
  color: #6d28d9;
}
.kind-code {
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.kind-code .selected-type {
  background: #d1fae5;
  color: #047857;
}
.kind-doc {
  background: #fefce8;
  border-color: #fde68a;
}
.kind-doc .selected-type {
  background: #fef08a;
  color: #a16207;
}
.kind-archive,
.kind-folder,
.kind-file {
  background: #f8fafc;
  border-color: #e2e8f0;
}
.kind-archive .selected-type,
.kind-folder .selected-type,
.kind-file .selected-type {
  background: #e2e8f0;
  color: #334155;
}
.source {
  margin-bottom: 4px;
}
.translate-target {
  color: #574778;
}
.ellpise {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.plugin-item {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  font-size: 12px;
  cursor: pointer;
}
.plugin-item img,
.plugin-default-icon {
  padding-bottom: 6px;
}
.plugin-default-icon {
  font-size: 28px;
  color: #574778;
}
.plugin-item div {
  width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.plugin-title {
  font-size: 12px;
  width: 100%;
  padding: 4px 10px;
  background-color: #fff1f0;
  color: #574778;
  box-sizing: border-box;
}
.spinner > div {
  width: 10px;
  height: 10px;
  background-color: #ddd;
  border-radius: 100%;
  display: inline-block;
  animation: bouncedelay 1.4s ease-in-out infinite;
  animation-fill-mode: both;
}
.spinner .bounce1 {
  animation-delay: -0.32s;
}
.spinner .bounce2 {
  animation-delay: -0.16s;
}
@keyframes bouncedelay {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
