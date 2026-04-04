<template>
  <div class="super-panel-settings">
    <div class="view-title">{{ $t('feature.market.superPanelSettings') }}</div>
    <div class="view-container">
      <a-menu v-model:selectedKeys="activeTab" mode="horizontal">
        <a-menu-item key="shortcut">
          {{ $t('feature.superPanelShortcut.tabShortcut') }}
        </a-menu-item>
        <a-menu-item key="translate">
          {{ $t('feature.superPanelShortcut.tabTranslate') }}
        </a-menu-item>
      </a-menu>
      <div class="settings-detail">
        <template v-if="activeTab[0] === 'shortcut'">
          <a-alert
            type="info"
            show-icon
            :message="$t('feature.superPanelShortcut.tipTitle')"
            :description="$t('feature.superPanelShortcut.tipDesc')"
            class="tip-alert"
          />
          <a-form
            class="shortcut-form"
            :model="form"
            :label-col="{ span: 10 }"
            :wrapper-col="{ span: 14 }"
            name="superPanelHotkey"
            autocomplete="off"
            @finish="onSave"
          >
            <a-form-item
              :label="$t('feature.superPanelShortcut.triggerType')"
              name="triggerType"
            >
              <a-select
                v-model:value="triggerSelect"
                class="trigger-select"
                @change="onTriggerTypeChange"
              >
                <a-select-option value="keyboard">
                  {{ $t('feature.superPanelShortcut.modeKeyboard') }}
                </a-select-option>
                <a-select-option :value="SP_MOUSE.MIDDLE">
                  {{ $t('feature.superPanelShortcut.modeMouseMiddle') }}
                </a-select-option>
                <a-select-option :value="SP_MOUSE.LONG_LEFT">
                  {{ $t('feature.superPanelShortcut.modeLongLeft') }}
                </a-select-option>
                <a-select-option :value="SP_MOUSE.LONG_RIGHT">
                  {{ $t('feature.superPanelShortcut.modeLongRight') }}
                </a-select-option>
                <a-select-option :value="SP_MOUSE.LONG_MIDDLE">
                  {{ $t('feature.superPanelShortcut.modeLongMiddle') }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item
              v-show="triggerSelect === 'keyboard'"
              :label="$t('feature.superPanelShortcut.hotkeyLabel')"
              name="superPanelHotKey"
              :rules="[
                {
                  required: true,
                  message: $t('feature.superPanelShortcut.required'),
                },
              ]"
            >
              <a-input
                :value="form.superPanelHotKey"
                read-only
                autocomplete="off"
                class="shortcut-input"
                :placeholder="$t('feature.superPanelShortcut.captureHint')"
                @focus="onShortcutFocus"
                @blur="onShortcutBlur"
                @keydown.capture="onShortcutInputBlock"
                @paste.prevent
                @drop.prevent
                @compositionstart.prevent
                @compositionupdate.prevent
                @compositionend.prevent
              />
            </a-form-item>
            <a-form-item :wrapper-col="{ offset: 10, span: 14 }">
              <a-button type="primary" html-type="submit">
                {{ $t('feature.superPanelShortcut.save') }}
              </a-button>
            </a-form-item>
          </a-form>
        </template>

        <template v-else>
          <div class="setting-item">
            <div class="title">{{ $t('feature.superPanelShortcut.translateTitle') }}</div>
            <div class="settings-item-li">
              <div class="label">
                {{ $t('feature.superPanelShortcut.autoTranslateLabel') }}
              </div>
              <a-switch
                v-model:checked="translateForm.autoTranslate"
                :checked-children="$t('feature.superPanelShortcut.on')"
                :un-checked-children="$t('feature.superPanelShortcut.off')"
              />
            </div>
            <div class="settings-item-li desc">
              {{ $t('feature.superPanelShortcut.autoTranslateDesc') }}
            </div>
            <div class="settings-item-li action">
              <a-button type="primary" @click="onSaveTranslate">
                {{ $t('feature.superPanelShortcut.save') }}
              </a-button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const SUPER_PANEL_HOTKEY_DB_ID = 'rubick-system-super-panel-store';
const SUPER_PANEL_PREF_DB_ID = 'rubick-system-super-panel-preferences';

/** 与主进程 main.js / superx 约定一致 */
const SP_MOUSE = {
  MIDDLE: 'rubick:sp:mouse-middle',
  LONG_LEFT: 'rubick:sp:long-left',
  LONG_RIGHT: 'rubick:sp:long-right',
  LONG_MIDDLE: 'rubick:sp:long-middle',
} as const;

function getRubick() {
  return (window as unknown as { rubick?: { dbStorage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } } }).rubick;
}

const initialRaw =
  getRubick()?.dbStorage.getItem(SUPER_PANEL_HOTKEY_DB_ID) || 'Ctrl+W';
const initialPref =
  (window as unknown as { rubick?: { db?: { get: (id: string) => { data?: { autoTranslate?: boolean } } | null } } })
    .rubick?.db?.get(SUPER_PANEL_PREF_DB_ID) || { data: {} };

const lastKeyboardCombo = ref(
  initialRaw.startsWith('rubick:sp:') ? 'Ctrl+W' : initialRaw
);

const form = reactive({
  superPanelHotKey: initialRaw,
});

const triggerSelect = ref<string>(
  initialRaw.startsWith('rubick:sp:') ? initialRaw : 'keyboard'
);
const activeTab = ref<string[]>(['shortcut']);
const translateForm = reactive({
  autoTranslate: initialPref?.data?.autoTranslate !== false,
});

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

/** 禁止在框内直接键入；Tab 交给系统以移出焦点 */
function onShortcutInputBlock(e: KeyboardEvent) {
  if (e.key === 'Tab') return;
  e.preventDefault();
  e.stopPropagation();
}

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

  if (e.key === 'Tab') {
    capturing.value = false;
    window.removeEventListener('keydown', onKeyDownCapture, true);
    return;
  }

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
    message.warning(t('feature.superPanelShortcut.saveDevHint'));
    return;
  }
  rubick.dbStorage.setItem(SUPER_PANEL_HOTKEY_DB_ID, form.superPanelHotKey);
  message.success(t('feature.superPanelShortcut.saveOk'));
}

function onSaveTranslate() {
  const rubick = getRubick() as unknown as {
    db?: { get: (id: string) => { _id?: string; _rev?: string; data?: unknown } | null; put: (doc: unknown) => unknown };
  };
  if (!rubick?.db) {
    message.warning(t('feature.superPanelShortcut.saveDevHint'));
    return;
  }
  const oldDoc = rubick.db.get(SUPER_PANEL_PREF_DB_ID) || {};
  rubick.db.put({
    ...oldDoc,
    _id: SUPER_PANEL_PREF_DB_ID,
    data: {
      ...(oldDoc.data || {}),
      autoTranslate: !!translateForm.autoTranslate,
    },
  });
  message.success(t('feature.superPanelShortcut.saveOk'));
}
</script>

<style lang="less" scoped>
.super-panel-settings {
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
  background: var(--color-body-bg2);
  min-height: 100%;

  .view-title {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 16px;
    color: var(--color-text-primary);
  }

  .view-container {
    border-radius: 8px;
    background: var(--color-body-bg);
    overflow: hidden;
  }

  .ant-menu-horizontal {
    border-bottom: 1px solid var(--color-border-light);
  }

  .ant-menu {
    background: var(--color-body-bg) !important;
    color: var(--color-text-content) !important;
  }

  .settings-detail {
    padding: 20px;
    box-sizing: border-box;
    background: var(--color-body-bg);
    color: var(--color-text-content);
  }

  .tip-alert {
    margin-bottom: 20px;
  }

  .shortcut-form {
    max-width: 640px;
  }

  /* 与触发方式下拉同宽 */
  .trigger-select,
  .shortcut-input {
    max-width: 280px;
    width: 100%;
  }

  .shortcut-input :deep(.ant-input) {
    cursor: pointer;
    font-family: ui-monospace, monospace;
    user-select: none;
    caret-color: transparent;
  }

  .setting-item {
    margin-bottom: 20px;
  }

  .title {
    color: var(--ant-primary-color);
    font-size: 14px;
    margin-bottom: 10px;
  }

  .settings-item-li {
    padding-left: 20px;
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .settings-item-li .label {
    color: var(--color-text-content);
  }

  .settings-item-li.desc {
    color: var(--color-text-desc);
    justify-content: flex-start;
    line-height: 1.6;
  }

  .settings-item-li.action {
    justify-content: flex-end;
  }
}
</style>
