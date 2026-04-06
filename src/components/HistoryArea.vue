<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { HistoryItem } from "../types/voicevox";

const props = defineProps<{
    history: HistoryItem[];
}>();

const emit = defineEmits<{
    (e: "audio-ended", id: number): void;
}>();

const historyAreaRef = ref<HTMLElement | null>(null);

const scrollToBottom = () => {
    nextTick(() => {
        if (historyAreaRef.value) {
            historyAreaRef.value.scrollTop = historyAreaRef.value.scrollHeight;
        }
    });
};

watch(() => props.history.length, scrollToBottom);
watch(() => props.history.map((h) => h.audioUrl), scrollToBottom, { deep: true });

defineExpose({ scrollToBottom });
</script>

<template>
    <div :class="$style.historyArea" ref="historyAreaRef">
        <div v-if="history.length === 0" :class="$style.emptyMessage">
            まだ履歴がありません。<br />下のテキストボックスから音声を合成してください。
        </div>
        <div v-for="item in history" :key="item.id" :class="$style.historyItem">
            <div :class="[$style.historyText, { [$style.queuedText]: !item.audioUrl && !item.error }]">
                {{ item.text }}
            </div>
            <div :class="$style.historyMeta">{{ item.speakerName }}</div>
            <audio
                v-if="item.audioUrl"
                :src="item.audioUrl"
                controls
                autoplay
                @ended="$emit('audio-ended', item.id)"
            ></audio>
            <div v-if="item.error" :class="$style.errorText">{{ item.error }}</div>
        </div>
    </div>
</template>

<style module>
.historyArea {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    padding-top: 80px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.emptyMessage {
    text-align: center;
    color: var(--color-text-tertiary);
    margin-top: auto;
    margin-bottom: auto;
    font-size: 0.9rem;
    height: 1em;
    line-height: 1.5;
}

.historyItem {
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1;

    audio {
        width: 20em;
        height: 1em;
        margin-top: 5px;
    }
}

.historyMeta {
    font-size: 0.75rem;
    color: var(--color-text-tertiary-alpha);
}

.historyText {
    flex: 1;
    font-size: 1rem;
    color: var(--color-text-accent);
}

.queuedText {
    color: var(--color-text-tertiary);
}

.errorText {
    color: var(--color-error);
    font-size: 0.8rem;
    font-weight: bold;
}
</style>
