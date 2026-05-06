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
    (e: "send", text: string, speakerId: number, skipAudio?: boolean): void;
    (e: "realtime-read", text: string, speakerId: number): void;
}>();

const selectedSpeaker = ref<number>(props.defaultSpeakerId);
const inputText = ref("");
const lastReadText = ref("");
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
    () => props.defaultSpeakerId,
    (newId) => {
        selectedSpeaker.value = newId;
    },
);

const flushRealtimeRead = (currentVal?: string, isForceRead: boolean = false) => {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }

    // NOTE: 処理対象のテキストを決定（引数がなければ現在の inputText）
    const textToProcess = currentVal !== undefined ? currentVal : inputText.value;
    // NOTE: 前回読み上げ済みのテキストと完全に一致する場合は何もしない
    if (textToProcess === lastReadText.value) return;

    let chunkToRead = "";

    // NOTE: 今回のテキストが前回読み上げ済みのテキストから始まっている場合（純粋な追加）
    if (textToProcess.startsWith(lastReadText.value)) {
        // NOTE: 追加された差分を抽出
        chunkToRead = textToProcess.slice(lastReadText.value.length);
    } else {
        // NOTE: 変換による置換やバックスペース等で前方一致しなくなった場合は共通のプレフィックスを探す
        let i = 0;
        const minLen = Math.min(lastReadText.value.length, textToProcess.length);
        // NOTE: 先頭から1文字ずつ比較し、一致する文字数を特定（Longest Common Prefix）
        while (i < minLen && lastReadText.value[i] === textToProcess[i]) {
            i++;
        }
        // NOTE: 共通部分以降のテキストを差分として抽出
        chunkToRead = textToProcess.slice(i);

        if (chunkToRead.length === 0) {
            // NOTE: 文字が削除されただけの場合は状態を同期して終了
            lastReadText.value = textToProcess;
            return;
        }
    }

    // NOTE: 3文字より大きいか、あるいは変換確定(強制読み上げ)の場合は読み上げる
    if (chunkToRead.length > 3 || isForceRead) {
        emit("realtime-read", chunkToRead, selectedSpeaker.value);
        // NOTE: 読み上げ済みテキストの状態を更新
        lastReadText.value = textToProcess;
    }
};

const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const val = target.value;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        flushRealtimeRead(val, false);
    }, 500); // 500msの入力休止でまとまった文字数(>3文字)を読む
};

const handleCompositionEnd = (e: CompositionEvent) => {
    const target = e.target as HTMLInputElement;
    // 変換確定時は短くても（アルファベットや数字等でも）即時読み上げる
    flushRealtimeRead(target.value, true);
};

const handleSend = () => {
    flushRealtimeRead(inputText.value, false);

    const text = inputText.value.trim();
    if (!text || !props.isConnected) return;

    // 全てがリアルタイムで読み上げ済みなら全体の再読み上げをスキップ
    const skipAudio = text !== "" && text === lastReadText.value;

    emit("send", text, selectedSpeaker.value, skipAudio);

    inputText.value = "";
    lastReadText.value = "";
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
            @input="handleInput"
            @compositionend="handleCompositionEnd"
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
    transition:
        background-color 0.2s,
        opacity 0.2s;
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
