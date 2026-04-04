<script setup lang="ts">
import { ref, watch } from "vue";
import { Send as SendIcon, User as UserIcon } from "lucide-vue-next";
import type { Speaker } from "../types/voicevox";

const props = defineProps<{
    isConnected: boolean;
    speakers: Speaker[];
    defaultSpeakerId: number;
}>();

const emit = defineEmits<{
    (e: 'send', text: string, speakerId: number): void;
}>();

const selectedSpeaker = ref<number>(props.defaultSpeakerId);
const inputText = ref("");

watch(() => props.defaultSpeakerId, (newId) => {
    selectedSpeaker.value = newId;
});

const handleSend = () => {
    const text = inputText.value.trim();
    if (!text || !props.isConnected) return;
    
    emit('send', text, selectedSpeaker.value);
    inputText.value = "";
};

const handleKeydownEnter = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    e.preventDefault();
    handleSend();
};
</script>

<template>
    <div :class="$style.inputArea">
        <div :class="$style.speakerSelectWrapper">
            <button :class="$style.speakerIconBtn" title="モデル選択">
                <UserIcon :size="20" />
            </button>
            <select v-model="selectedSpeaker" :class="$style.hiddenSelect">
                <option v-if="speakers.length === 0" value="0">読み込み中...</option>
                <optgroup v-for="speaker in speakers" :key="speaker.speaker_uuid" :label="speaker.name">
                    <option v-for="style in speaker.styles" :key="style.id" :value="style.id">
                        {{ style.name }}
                    </option>
                </optgroup>
            </select>
        </div>
        <input 
            v-model="inputText" 
            type="text" 
            :class="$style.textInputMain" 
            placeholder="テキストを入力..." 
            @keydown.enter="handleKeydownEnter"
            :disabled="!isConnected"
        />
        <button :class="$style.sendButton" @click="handleSend" :disabled="!inputText.trim() || !isConnected">
            <SendIcon :size="20" />
        </button>
    </div>
</template>

<style module>
.inputArea {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 20px;
}

.speakerSelectWrapper {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.speakerIconBtn {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: var(--color-surface-variant);
    color: var(--color-text-secondary);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s;
}

.speakerSelectWrapper:hover .speakerIconBtn {
    background-color: var(--color-surface-secondary);
}

.hiddenSelect {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
}

.textInputMain {
    flex: 1;
    padding: 10px 15px;
    border: 1px solid var(--color-border);
    background: none;
    backdrop-filter: blur(3px);
    border-radius: 20px;
    font-size: 1rem;
    outline: none;
    color: var(--color-text-accent);
}

.textInputMain:focus {
    border-color: var(--color-border-focus);
}

.sendButton {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--color-accent);
    color: var(--color-on-accent);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s, opacity 0.2s;
}

.sendButton:hover:not(:disabled) {
    background-color: var(--color-accent-hover);
}

.sendButton:disabled {
    background-color: var(--color-disabled);
    cursor: not-allowed;
    opacity: 0.7;
}
</style>
