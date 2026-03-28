<template>
  <div class="settings-root">
    <a-alert
      type="info"
      show-icon
      message="温馨提示"
      description="超级面板是系统插件，触发方式修改成功后，请重新启动 rubick 后生效。"
    />
    <div class="form-wrap">
      <a-form
        :model="form"
        name="basic"
        :label-col="{ span: 10 }"
        :wrapper-col="{ span: 14 }"
        autocomplete="off"
        @finish="onSave"
      >
        <a-form-item label="触发方式" name="triggerType">
          <a-select
            v-model:value="triggerSelect"
            class="trigger-select"
            @change="onTriggerTypeChange"
          >
            <a-select-option value="keyboard">键盘组合</a-select-option>
            <a-select-option :value="SP_MOUSE.MIDDLE">鼠标中键</a-select-option>
            <a-select-option :value="SP_MOUSE.LONG_LEFT">长按鼠标左键</a-select-option>
            <a-select-option :value="SP_MOUSE.LONG_RIGHT">长按鼠标右键</a-select-option>
            <a-select-option :value="SP_MOUSE.LONG_MIDDLE">长按鼠标中键</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-show="triggerSelect === 'keyboard'"
          label="键盘快捷键"
          name="superPanelHotKey"
          :rules="[{ required: true, message: '请设置键盘组合或选择鼠标触发方式' }]"
        >
          <a-input
            :value="form.superPanelHotKey"
            read-only
            class="shortcut-input"
            placeholder="点击此处后按下组合键…"
            @focus="onShortcutFocus"
            @blur="onShortcutBlur"
          />
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 10, span: 14 }">
          <a-button type="primary" html-type="submit">保存设置</a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';

const STORE_ID = 'rubick-system-super-panel-store';

const SP_MOUSE = {
  MIDDLE: 'rubick:sp:mouse-middle',
  LONG_LEFT: 'rubick:sp:long-left',
  LONG_RIGHT: 'rubick:sp:long-right',
  LONG_MIDDLE: 'rubick:sp:long-middle',
} as const;

function getRubick() {
  return (window as unknown as { rubick?: { dbStorage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } } }).rubick;
}

const initialRaw = getRubick()?.dbStorage.getItem(STORE_ID) ?? 'Ctrl+W';

const lastKeyboardCombo = ref(
  initialRaw.startsWith('rubick:sp:') ? 'Ctrl+W' : initialRaw
);

const form = reactive({
  superPanelHotKey: initialRaw,
});

const triggerSelect = ref<string>(
  initialRaw.startsWith('rubick:sp:') ? initialRaw : 'keyboard'
);

function onTriggerTypeChange(v: string) {
  if (v === 'keyboard') {
    form.superPanelHotKey = lastKeyboardCombo.value;
  } else {
    if (!form.superPanelHotKey.startsWith('rubick:sp:')) {
      lastKeyboardCombo.value = form.superPanelHotKey;
    }
    form.superPanelHotKey = v;
  }
}

const capturing = ref(false);

function keyFromEvent(e: KeyboardEvent): string | null {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;
  if (e.key === ' ') return 'Space';
  if (e.key.length === 1) return e.key.toUpperCase();
  const map: Record<string, string> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Escape: 'Esc',
    Backspace: 'Backspace',
    Tab: 'Tab',
    Enter: 'Enter',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
  };
  if (map[e.key]) return map[e.key];
  if (/^F\d{1,2}$/.test(e.key)) return e.key;
  if (e.code.startsWith('Key')) return e.code.slice(3);
  if (e.code.startsWith('Digit')) return e.code.slice(5);
  if (e.code.startsWith('Numpad')) return e.code;
  return e.key.length ? e.key : null;
}

function onKeyDownCapture(e: KeyboardEvent) {
  if (triggerSelect.value !== 'keyboard' || !capturing.value) return;
  e.preventDefault();
  e.stopPropagation();

  if (e.key === 'Escape') {
    form.superPanelHotKey = lastKeyboardCombo.value;
    return;
  }

  const mods: string[] = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.shiftKey) mods.push('Shift');
  if (e.altKey) mods.push('Alt');
  if (e.metaKey) mods.push('Command');

  const k = keyFromEvent(e);
  if (!k) return;

  const combo = [...mods, k].join('+');
  form.superPanelHotKey = combo;
  lastKeyboardCombo.value = combo;
}

function onShortcutFocus() {
  if (triggerSelect.value !== 'keyboard') return;
  capturing.value = true;
  window.addEventListener('keydown', onKeyDownCapture, true);
}

function onShortcutBlur() {
  capturing.value = false;
  window.removeEventListener('keydown', onKeyDownCapture, true);
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDownCapture, true);
});

function onSave() {
  const rubick = getRubick();
  if (!rubick) {
    message.warning('请在 Rubick 插件环境内保存（开发时可忽略）');
    return;
  }
  rubick.dbStorage.setItem(STORE_ID, form.superPanelHotKey);
  message.success('保存成功');
}
</script>

<style scoped>
.settings-root {
  padding: 24px;
  max-width: 720px;
}
.form-wrap {
  margin-top: 16px;
}
.trigger-select,
.shortcut-input {
  max-width: 280px;
  width: 100%;
}
.shortcut-input :deep(.ant-input) {
  cursor: pointer;
  font-family: ui-monospace, monospace;
}
</style>
