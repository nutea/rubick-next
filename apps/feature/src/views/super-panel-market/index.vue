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
            <a-alert
              type="info"
              show-icon
              :message="$t('feature.superPanelShortcut.translateConfigHint')"
              class="tip-alert translate-tip"
            />
            <div class="profile-toolbar">
              <div class="profile-toolbar-row">
                <span class="profile-toolbar-label">{{ $t('feature.superPanelShortcut.profileSelect') }}</span>
                <a-select
                  :value="selectedProfileId"
                  class="profile-select"
                  :disabled="translateProfiles.length === 0"
                  :placeholder="$t('feature.superPanelShortcut.translateProfilesEmpty')"
                  @change="onProfileSelectChange"
                >
                  <a-select-option v-for="p in translateProfiles" :key="p.id" :value="p.id">
                    {{ p.name }}
                  </a-select-option>
                </a-select>
                <a-button @click="onAddProfile">{{ $t('feature.superPanelShortcut.addProfile') }}</a-button>
                <a-popconfirm
                  :title="$t('feature.superPanelShortcut.deleteProfileConfirm')"
                  @confirm="onDeleteProfile"
                >
                  <a-button danger :disabled="!selectedProfileId">
                    {{ $t('feature.superPanelShortcut.deleteProfile') }}
                  </a-button>
                </a-popconfirm>
                <a-button :loading="testLoading" @click="onTestConnection">
                  {{ $t('feature.superPanelShortcut.testConnection') }}
                </a-button>
              </div>
            </div>

            <div v-if="translateProfiles.length === 0" class="translate-empty">
              {{ $t('feature.superPanelShortcut.translateProfilesEmpty') }}
            </div>

            <a-form v-else layout="vertical" class="translate-form">
              <a-form-item :label="$t('feature.superPanelShortcut.profileName')">
                <a-input v-model:value="translateForm.profileName" autocomplete="off" />
              </a-form-item>
              <a-form-item :label="$t('feature.superPanelShortcut.translateProvider')">
                <a-select v-model:value="translateForm.translateProvider" class="translate-provider-select">
                  <a-select-option value="openai_chat">
                    {{ $t('feature.superPanelShortcut.providerOpenaiChat') }}
                  </a-select-option>
                  <a-select-option value="anthropic_messages">
                    {{ $t('feature.superPanelShortcut.providerAnthropic') }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item :label="$t('feature.superPanelShortcut.llmBaseUrl')">
                <a-input
                  v-model:value="translateForm.llmBaseUrl"
                  :placeholder="
                    translateForm.translateProvider === 'anthropic_messages'
                      ? $t('feature.superPanelShortcut.anthropicUrlPh')
                      : $t('feature.superPanelShortcut.llmBaseUrlPh')
                  "
                />
              </a-form-item>
              <a-form-item
                :label="
                  translateForm.translateProvider === 'anthropic_messages'
                    ? $t('feature.superPanelShortcut.anthropicApiKey')
                    : $t('feature.superPanelShortcut.llmApiKey')
                "
              >
                <a-input-password v-model:value="translateForm.llmApiKey" autocomplete="off" />
              </a-form-item>
              <a-form-item :label="$t('feature.superPanelShortcut.llmModel')">
                <a-input v-model:value="translateForm.llmModel" />
              </a-form-item>

              <template v-if="translateForm.translateProvider === 'anthropic_messages'">
                <a-form-item :label="$t('feature.superPanelShortcut.anthropicApiVersion')">
                  <a-input v-model:value="translateForm.anthropicApiVersion" />
                </a-form-item>
                <a-form-item :label="$t('feature.superPanelShortcut.anthropicMaxTokens')">
                  <a-input-number
                    v-model:value="translateForm.anthropicMaxTokens"
                    :min="1"
                    :max="200000"
                    class="anthropic-max-tokens"
                  />
                </a-form-item>
              </template>

              <a-form-item :label="$t('feature.superPanelShortcut.llmSystemPrompt')">
                <a-textarea
                  v-model:value="translateForm.llmSystemPrompt"
                  :rows="3"
                  :placeholder="$t('feature.superPanelShortcut.llmSystemPromptPh')"
                />
              </a-form-item>
              <a-form-item :label="$t('feature.superPanelShortcut.llmExtraHeaders')">
                <a-textarea
                  v-model:value="translateForm.llmExtraHeaders"
                  :rows="2"
                  :placeholder="$t('feature.superPanelShortcut.llmExtraHeadersPh')"
                />
              </a-form-item>
            </a-form>

            <div class="settings-item-li">
              <div class="label">
                {{ $t('feature.superPanelShortcut.autoTranslateLabel') }}
              </div>
              <a-tooltip :title="translateSwitchDisabled ? $t('feature.superPanelShortcut.switchNeedConfig') : ''">
                <span class="switch-wrap">
                  <a-switch
                    v-model:checked="translateForm.autoTranslate"
                    :disabled="translateSwitchDisabled"
                    :checked-children="$t('feature.superPanelShortcut.on')"
                    :un-checked-children="$t('feature.superPanelShortcut.off')"
                  />
                </span>
              </a-tooltip>
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
import { computed, reactive, ref, watch, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import { nanoid } from 'nanoid';
import {
  emptyProfile,
  formToProfile,
  isTranslateConfigured,
  LEGACY_TRANSLATE_FLAT_KEYS,
  loadProfilesFromDoc,
  type SuperPanelTranslateProvider,
  type TranslateProfile,
} from '@/utils/superPanelTranslatePrefs';
import { testTranslateConnection } from '@/utils/translateConnectionTest';

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
  (window as unknown as {
    rubick?: { db?: { get: (id: string) => { data?: Record<string, unknown> } | null } };
  }).rubick?.db?.get(SUPER_PANEL_PREF_DB_ID) || { data: {} };

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

type TranslateEditorForm = {
  profileId: string;
  profileName: string;
  translateProvider: SuperPanelTranslateProvider;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmSystemPrompt: string;
  llmExtraHeaders: string;
  anthropicApiVersion: string;
  anthropicMaxTokens: number;
  autoTranslate: boolean;
};

function blankEditor(): Omit<TranslateEditorForm, 'autoTranslate'> {
  return {
    profileId: '',
    profileName: '',
    translateProvider: 'openai_chat',
    llmBaseUrl: '',
    llmApiKey: '',
    llmModel: '',
    llmSystemPrompt: '',
    llmExtraHeaders: '',
    anthropicApiVersion: '2023-06-01',
    anthropicMaxTokens: 1024,
  };
}

const loadedProfiles = loadProfilesFromDoc(initialPref?.data as Record<string, unknown> | undefined);
const translateProfiles = ref<TranslateProfile[]>(loadedProfiles.profiles);
const selectedProfileId = ref<string | null>(loadedProfiles.activeProfileId);

const translateForm = reactive<TranslateEditorForm>({
  ...blankEditor(),
  autoTranslate: false,
});

const testLoading = ref(false);
const desiredAutoTranslate = ref(false);

function applyEditorFromProfile(p: TranslateProfile | null) {
  if (!p) {
    Object.assign(translateForm, blankEditor(), { autoTranslate: false });
    return;
  }
  Object.assign(translateForm, {
    profileId: p.id,
    profileName: p.name,
    translateProvider: p.translateProvider,
    llmBaseUrl: p.llmBaseUrl,
    llmApiKey: p.llmApiKey,
    llmModel: p.llmModel,
    llmSystemPrompt: p.llmSystemPrompt,
    llmExtraHeaders: p.llmExtraHeaders,
    anthropicApiVersion: p.anthropicApiVersion,
    anthropicMaxTokens: p.anthropicMaxTokens,
    autoTranslate: desiredAutoTranslate.value && isTranslateConfigured(p),
  });
}

function commitEditorToProfiles() {
  const id = translateForm.profileId?.trim();
  if (!id) return;
  const next = formToProfile(translateForm);
  const idx = translateProfiles.value.findIndex((x) => x.id === id);
  if (idx >= 0) {
    translateProfiles.value.splice(idx, 1, next);
  }
}

const initialWantOn = initialPref?.data?.autoTranslate !== false;
desiredAutoTranslate.value = initialWantOn;
if (selectedProfileId.value) {
  const p = translateProfiles.value.find((x) => x.id === selectedProfileId.value);
  applyEditorFromProfile(p ?? null);
}
translateForm.autoTranslate = initialWantOn && isTranslateConfigured(translateForm);

const translateSwitchDisabled = computed(
  () => !translateForm.profileId || !isTranslateConfigured(translateForm)
);

watch(translateSwitchDisabled, (off) => {
  if (off) {
    translateForm.autoTranslate = false;
    return;
  }
  translateForm.autoTranslate = desiredAutoTranslate.value;
});

watch(
  () => translateForm.autoTranslate,
  (on) => {
    if (!translateSwitchDisabled.value) {
      desiredAutoTranslate.value = on;
    }
  }
);

watch(
  () => translateForm.profileName,
  (nm) => {
    const id = translateForm.profileId;
    if (!id) return;
    const ix = translateProfiles.value.findIndex((p) => p.id === id);
    if (ix < 0) return;
    const cur = translateProfiles.value[ix];
    const label = String(nm || '').trim() || '—';
    if (cur.name === label) return;
    translateProfiles.value.splice(ix, 1, { ...cur, name: label });
  }
);

function onProfileSelectChange(newId: string) {
  commitEditorToProfiles();
  selectedProfileId.value = newId;
  const p = translateProfiles.value.find((x) => x.id === newId);
  applyEditorFromProfile(p ?? null);
}

function onAddProfile() {
  commitEditorToProfiles();
  const id = nanoid();
  const p = emptyProfile(
    id,
    `${t('feature.superPanelShortcut.defaultProfileName')} ${translateProfiles.value.length + 1}`
  );
  translateProfiles.value = [...translateProfiles.value, p];
  selectedProfileId.value = id;
  applyEditorFromProfile(p);
}

function onDeleteProfile() {
  const id = selectedProfileId.value;
  if (!id) return;
  commitEditorToProfiles();
  translateProfiles.value = translateProfiles.value.filter((x) => x.id !== id);
  selectedProfileId.value = translateProfiles.value[0]?.id ?? null;
  applyEditorFromProfile(translateProfiles.value[0] ?? null);
  if (!translateProfiles.value.length) {
    desiredAutoTranslate.value = false;
    translateForm.autoTranslate = false;
  }
}

async function onTestConnection() {
  if (!isTranslateConfigured(translateForm)) {
    message.warning(t('feature.superPanelShortcut.switchNeedConfig'));
    return;
  }
  testLoading.value = true;
  try {
    const r = await testTranslateConnection({
      translateProvider: translateForm.translateProvider,
      llmBaseUrl: translateForm.llmBaseUrl,
      llmApiKey: translateForm.llmApiKey,
      llmModel: translateForm.llmModel,
      llmSystemPrompt: translateForm.llmSystemPrompt,
      llmExtraHeaders: translateForm.llmExtraHeaders,
      anthropicApiVersion: translateForm.anthropicApiVersion,
      anthropicMaxTokens: translateForm.anthropicMaxTokens,
    });
    if (r.message === 'missing_fields') {
      message.warning(t('feature.superPanelShortcut.switchNeedConfig'));
      return;
    }
    if (r.ok) {
      message.success(`${t('feature.superPanelShortcut.testConnectionOk')}: ${r.message}`);
    } else {
      message.error(`${t('feature.superPanelShortcut.testConnectionFail')}: ${r.message}`);
    }
  } finally {
    testLoading.value = false;
  }
}

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
  commitEditorToProfiles();
  if (translateForm.autoTranslate && !isTranslateConfigured(translateForm)) {
    message.warning(t('feature.superPanelShortcut.switchNeedConfig'));
    return;
  }
  const oldDoc = rubick.db.get(SUPER_PANEL_PREF_DB_ID) || {};
  const oldData = { ...(oldDoc.data as Record<string, unknown> | undefined) };
  for (const k of LEGACY_TRANSLATE_FLAT_KEYS) {
    delete oldData[k];
  }

  let autoTranslate = false;
  let activeId: string | null = null;
  let profilesOut: TranslateProfile[] = [];

  if (!translateProfiles.value.length) {
    autoTranslate = false;
    activeId = null;
    profilesOut = [];
  } else {
    profilesOut = translateProfiles.value.map((x) => ({ ...x }));
    activeId = selectedProfileId.value;
    if (activeId && !profilesOut.some((p) => p.id === activeId)) {
      activeId = profilesOut[0]?.id ?? null;
    }
    if (!activeId) {
      activeId = profilesOut[0].id;
    }
    selectedProfileId.value = activeId;
    const active = profilesOut.find((p) => p.id === activeId);
    autoTranslate = !!desiredAutoTranslate.value && !!active && isTranslateConfigured(active);
  }

  oldData.translateProfiles = profilesOut;
  oldData.activeTranslateProfileId = activeId;
  oldData.autoTranslate = autoTranslate;

  rubick.db.put({
    ...oldDoc,
    _id: SUPER_PANEL_PREF_DB_ID,
    data: oldData,
  });
  desiredAutoTranslate.value = autoTranslate;
  translateForm.autoTranslate = autoTranslate;
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

  .translate-tip {
    margin-bottom: 16px;
  }

  .translate-form {
    max-width: 560px;
    margin-bottom: 8px;
  }

  .translate-provider-select {
    max-width: 360px;
    width: 100%;
  }

  .switch-wrap {
    display: inline-block;
  }

  .anthropic-max-tokens {
    width: 100%;
    max-width: 200px;
  }

  .profile-toolbar {
    margin-bottom: 16px;
    max-width: 720px;
  }

  .profile-toolbar-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .profile-toolbar-label {
    color: var(--color-text-content);
    flex-shrink: 0;
  }

  .profile-select {
    min-width: 200px;
    max-width: 280px;
    flex: 1;
  }

  .translate-empty {
    color: var(--color-text-desc);
    padding: 8px 0 16px;
    max-width: 560px;
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
