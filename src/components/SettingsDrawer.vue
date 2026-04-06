<script setup lang="ts">
import { ref, watch } from "vue";
import { X as XIcon } from "lucide-vue-next";
import type { Speaker } from "../types/voicevox";

const props = defineProps<{
    isOpen: boolean;
    apiUrl: string;
    defaultSpeakerId: number;
    speedScale: number;
    pitchScale: number;
    speakers: Speaker[];
}>();

const emit = defineEmits<{
    (e: 'update:isOpen', value: boolean): void;
    (e: 'save', config: { url: string; speakerId: number; speedScale: number; pitchScale: number }): void;
}>();

const tempUrl = ref(props.apiUrl);
const tempDefaultSpeakerId = ref<number>(props.defaultSpeakerId);
const tempSpeedScale = ref<number>(props.speedScale);
const tempPitchScale = ref<number>(props.pitchScale);

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        tempUrl.value = props.apiUrl;
        tempDefaultSpeakerId.value = props.defaultSpeakerId;
        tempSpeedScale.value = props.speedScale;
        tempPitchScale.value = props.pitchScale;
    }
});

const close = () => {
    emit('update:isOpen', false);
};

const save = () => {
    emit('save', { 
        url: tempUrl.value, 
        speakerId: tempDefaultSpeakerId.value,
        speedScale: tempSpeedScale.value,
        pitchScale: tempPitchScale.value
    });
};

const resetToDefault = () => {
    tempUrl.value = "http://127.0.0.1:50021";
    tempDefaultSpeakerId.value = 3;
    tempSpeedScale.value = 1.0;
    tempPitchScale.value = 0.0;
};
</script>

<template>
    <transition name="fade">
        <div v-if="isOpen" :class="$style.drawerOverlay" @click.self="close"></div>
    </transition>

    <div :class="[$style.settingsDrawer, { [$style.drawerOpen]: isOpen }]">
        <div :class="$style.drawerHeader">
            <h2>設定</h2>
            <button :class="$style.closeBtn" @click="close"><XIcon :size="24" /></button>
        </div>
        <div :class="$style.drawerBody">
            <div :class="$style.inputGroup">
                <label>API URL</label>
                <input v-model="tempUrl" type="text" :class="$style.textInput" />
            </div>
            <div :class="$style.inputGroup">
                <label>デフォルトモデル</label>
                <select v-model="tempDefaultSpeakerId" :class="$style.textInput">
                    <option v-if="speakers.length === 0" value="3">読み込み中...</option>
                    <optgroup v-for="speaker in speakers" :key="speaker.speaker_uuid" :label="speaker.name">
                        <option v-for="style in speaker.styles" :key="style.id" :value="style.id">
                            {{ style.name }}
                        </option>
                    </optgroup>
                </select>
            </div>
            <div :class="$style.inputGroup">
                <label>話速 ({{ tempSpeedScale }})</label>
                <input v-model.number="tempSpeedScale" type="range" min="0.5" max="2.0" step="0.01" :class="$style.rangeInput" />
            </div>
            <div :class="$style.inputGroup">
                <label>ピッチ ({{ tempPitchScale }})</label>
                <input v-model.number="tempPitchScale" type="range" min="-0.15" max="0.15" step="0.01" :class="$style.rangeInput" />
            </div>
        </div>
        <div :class="$style.drawerFooter">
            <button @click="resetToDefault" :class="$style.secondaryBtn">デフォルト</button>
            <button @click="save" :class="$style.accentBtn">保存</button>
        </div>
    </div>
</template>

<style module>
.drawerOverlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: var(--color-overlay);
    z-index: 200;
}

.settingsDrawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 320px;
    height: 100vh;
    background-color: var(--color-surface);
    box-shadow: -4px 0 15px rgba(0, 0, 0, 0.1);
    z-index: 210;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawerOpen {
    transform: translateX(0);
}

.drawerHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--color-border-light);
}

.drawerHeader h2 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--color-text-accent);
}

.closeBtn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 50%;
    transition: background-color 0.2s;
}

.closeBtn:hover {
    background-color: var(--color-surface-variant);
}

.drawerBody {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
}

.drawerFooter {
    padding: 20px;
    border-top: 1px solid var(--color-border-light);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.inputGroup {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 25px;
}

.inputGroup label {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    font-weight: bold;
}

.textInput {
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
    color: var(--color-text-accent);
    background-color: transparent;
    backdrop-filter: blur(3px);
}

.rangeInput {
    width: 100%;
    margin-top: 5px;
    cursor: pointer;
}

.accentBtn, .secondaryBtn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    border: none;
}

.accentBtn {
    background-color: var(--color-accent);
    color: var(--color-on-accent);
}

.accentBtn:hover {
    background-color: var(--color-accent-hover);
}

.secondaryBtn {
    background-color: var(--color-surface-secondary);
    color: var(--color-text-accent);
}

.secondaryBtn:hover {
    background-color: var(--color-surface-secondary-hover);
}
</style>
