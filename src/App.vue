<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Settings as SettingsIcon } from "lucide-vue-next";
import { useVoicevox } from "./composables/useVoicevox";
import type { HistoryItem } from "./types/voicevox";

import SettingsDrawer from "./components/SettingsDrawer.vue";
import HistoryArea from "./components/HistoryArea.vue";
import InputArea from "./components/InputArea.vue";

const {
    apiUrl,
    defaultSpeakerId,
    speedScale,
    pitchScale,
    isConnected,
    speakers,
    setApiUrl,
    setDefaultSpeakerId,
    setSpeedScale,
    setPitchScale,
    checkConnection,
    synthesize,
} = useVoicevox();

const isSettingsOpen = ref(false);
const isProcessing = ref(false);
const isPlaying = ref(false);
const queue = ref<HistoryItem[]>([]);
const history = ref<HistoryItem[]>([]);
const historyAreaRef = ref<InstanceType<typeof HistoryArea> | null>(null);

const realTimeQueue = ref<{ text: string; speakerId: number }[]>([]);
const isRealTimePlaying = ref(false);
const realTimeAudio = ref<HTMLAudioElement | null>(null);
let realtimeGenerationId = 0;

const processRealTimeQueue = async () => {
    // NOTE: リアルタイム読み上げが既に実行中か、キューが空の場合は何もしない
    if (isRealTimePlaying.value || realTimeQueue.value.length === 0) return;

    isRealTimePlaying.value = true;
    const item = realTimeQueue.value.shift()!;
    // NOTE: キャンセル判定のために、リクエスト時点での世代IDを保持する
    const currentGenId = realtimeGenerationId;

    // NOTE: Voicevox サーバーへ音声合成をリクエスト
    const audioUrl = await synthesize(item.text, item.speakerId);

    // NOTE: 音声合成の待機中にキャンセル（世代IDの更新）が発生した場合は、再生せずに破棄する
    if (currentGenId !== realtimeGenerationId) {
        return;
    }

    if (audioUrl) {
        // NOTE: 合成された音声 URL を用いて再生を開始
        const audio = new Audio(audioUrl);
        realTimeAudio.value = audio;
        audio.onended = () => {
            isRealTimePlaying.value = false;
            realTimeAudio.value = null;
            // NOTE: 現在の音声が終了したら、次のキューを再帰的に処理
            processRealTimeQueue();
        };
        audio.onerror = () => {
            isRealTimePlaying.value = false;
            realTimeAudio.value = null;
            processRealTimeQueue();
        };
        audio.play().catch(() => {
            isRealTimePlaying.value = false;
            realTimeAudio.value = null;
            processRealTimeQueue();
        });
    } else {
        isRealTimePlaying.value = false;
        processRealTimeQueue();
    }
};

const cancelRealtimeRead = () => {
    // NOTE: 世代IDを更新し、通信中の音声合成リクエストが返ってきても無視するようにする
    realtimeGenerationId++;
    // NOTE: キューを空にして後続の読み上げ予定をクリア
    realTimeQueue.value = [];
    if (realTimeAudio.value) {
        // NOTE: 再生中の HTMLAudioElement を強制停止
        realTimeAudio.value.pause();
        realTimeAudio.value.currentTime = 0;
        realTimeAudio.value = null;
    }
    isRealTimePlaying.value = false;
};

const handleRealtimeRead = (text: string, speakerId: number) => {
    realTimeQueue.value.push({ text, speakerId });
    processRealTimeQueue();
};

let nextId = 1;

onMounted(() => {
    checkConnection();
    setInterval(checkConnection, 5000);
});

const handleSaveSettings = (config: { url: string; speakerId: number; speedScale: number; pitchScale: number }) => {
    setApiUrl(config.url);
    setDefaultSpeakerId(config.speakerId);
    setSpeedScale(config.speedScale);
    setPitchScale(config.pitchScale);
    isSettingsOpen.value = false;
};

const processQueue = async () => {
    if (isPlaying.value || queue.value.length === 0) {
        if (queue.value.length === 0 && !isPlaying.value) {
            isProcessing.value = false;
        }
        return;
    }

    isPlaying.value = true;
    isProcessing.value = true;
    const item = queue.value.shift()!;

    const audioUrl = await synthesize(item.text, item.speakerId);

    const index = history.value.findIndex((h) => h.id === item.id);
    if (index !== -1) {
        if (audioUrl) {
            history.value[index].audioUrl = audioUrl;
            if (item.autoplay === false) {
                isPlaying.value = false;
                processQueue();
            }
        } else {
            history.value[index].error = "音声の合成に失敗しました";
            isPlaying.value = false;
            processQueue();
        }
    } else {
        isPlaying.value = false;
        processQueue();
    }
};

const handleAudioEnded = (_id: number) => {
    isPlaying.value = false;
    processQueue();
};

const handleSend = async (text: string, speakerId: number, skipAudioFlagFromInput?: boolean) => {
    // NOTE: リアルタイム読み上げがまだ終わっていない（再生中・待機中）かどうかを判定
    const wasRealTimeActive = isRealTimePlaying.value || realTimeQueue.value.length > 0;

    let shouldCancelRealTime = false;

    if (wasRealTimeActive) {
        let remainingTime = Infinity;

        // NOTE: キューが空（＝最後のチャンク）の場合のみ、残り時間を計算
        if (realTimeQueue.value.length === 0) {
            if (realTimeAudio.value) {
                // NOTE: duration (総再生時間) と currentTime (現在の再生位置) から残り時間を算出
                const duration = realTimeAudio.value.duration;
                if (!isNaN(duration)) {
                    remainingTime = duration - realTimeAudio.value.currentTime;
                } else {
                    // NOTE: 音声がロードされた直後でdurationが取れない場合は短いと仮定
                    remainingTime = 0;
                }
            } else {
                // NOTE: 最後のチャンクを合成リクエスト中の場合も、間もなく終わると仮定
                remainingTime = 0;
            }
        }

        // NOTE: 残り時間が2秒より長い（またはキューがまだ残っている）場合のみキャンセルする
        if (remainingTime > 2.0) {
            shouldCancelRealTime = true;
        }
    }

    // NOTE: キャンセル条件を満たす場合、リアルタイム読み上げを即時停止・破棄する
    if (shouldCancelRealTime) {
        cancelRealtimeRead();
    }

    // NOTE: skipAudio は、
    // 1. InputArea が「すべてリアルタイムに送信した(差分なし)」と判定しており、かつ
    // 2. リアルタイム読み上げが動いていなかった、または「残り時間が少ないのでキャンセルせず最後まで任せた」場合
    // に true になり、全体読み上げをスキップする
    const skipAudio = skipAudioFlagFromInput && (!wasRealTimeActive || !shouldCancelRealTime);

    let speakerName = "Unknown";

    for (const s of speakers.value) {
        const style = s.styles.find((st) => st.id === speakerId);
        if (style) {
            speakerName = `${s.name} (${style.name})`;
            break;
        }
    }

    const item: HistoryItem = {
        id: nextId++,
        text,
        speakerId,
        speakerName,
        autoplay: !skipAudio,
    };

    history.value.push(item);
    queue.value.push(item);

    historyAreaRef.value?.scrollToBottom();
    processQueue();
};
</script>

<template>
    <div :class="[$style.appContainer, { [$style.errorBackground]: !isConnected }]">
        <transition name="fade">
            <div v-if="!isConnected" :class="$style.toast">VOICEVOX サーバーに接続できません ({{ apiUrl }})</div>
        </transition>

        <button :class="$style.fab" @click="isSettingsOpen = true" title="設定">
            <SettingsIcon :size="20" />
        </button>

        <SettingsDrawer
            v-model:isOpen="isSettingsOpen"
            :apiUrl="apiUrl"
            :defaultSpeakerId="defaultSpeakerId"
            :speedScale="speedScale"
            :pitchScale="pitchScale"
            :speakers="speakers"
            @save="handleSaveSettings"
        />

        <HistoryArea ref="historyAreaRef" :history="history" @audio-ended="handleAudioEnded" />

        <InputArea
            :isConnected="isConnected"
            :speakers="speakers"
            :defaultSpeakerId="defaultSpeakerId"
            @send="handleSend"
            @realtime-read="handleRealtimeRead"
        />
    </div>
</template>

<style module>
.appContainer {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: var(--color-bg-base);
    transition: background-color 0.3s ease;
    font-family: sans-serif;
    overflow: hidden;
    position: relative;
}

.errorBackground {
    background-color: var(--color-bg-error);
}

.toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--color-error);
    color: var(--color-on-error);
    padding: 10px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 100;
    font-size: 0.9rem;
    font-weight: bold;
}

.fab {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-light-2);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 50;
    color: var(--color-text-secondary);
    transition: background-color 0.2s;
}

.fab:hover {
    background-color: var(--color-surface-hover);
}

/* Global fade transition for overlay/toast */
:global(.fade-enter-active),
:global(.fade-leave-active) {
    transition: opacity 0.3s ease;
}

:global(.fade-enter-from),
:global(.fade-leave-to) {
    opacity: 0;
}
</style>

<style>
:root {
    --color-bg-base: #f5f5f5;
    --color-bg-error: #ffeaea;
    --color-surface: #ffffff;
    --color-surface-variant: #f0f0f0;
    --color-surface-hover: #eeeeee;
    --color-surface-secondary: #e0e0e0;
    --color-surface-secondary-hover: #d5d5d5;
    --color-overlay: rgba(0, 0, 0, 0.4);
    --color-disabled: #cccccc;

    --color-text-accent: #333333;
    --color-text-secondary: #555555;
    --color-text-tertiary: #888888;
    --color-text-tertiary-alpha: #80808080;

    --color-border: #cccccc;
    --color-border-light: #eeeeee;
    --color-border-light-2: #dddddd;
    --color-border-focus: #888888;

    --color-accent: #4caf50;
    --color-accent-hover: #43a047;
    --color-on-accent: #ffffff;

    --color-error: #e53935;
    --color-on-error: #ffffff;
}

@media (prefers-color-scheme: dark) {
    :root {
        --color-bg-base: #121212;
        --color-bg-error: #3a1515;
        --color-surface: #1e1e1e;
        --color-surface-variant: #2a2a2a;
        --color-surface-hover: #333333;
        --color-surface-secondary: #3a3a3a;
        --color-surface-secondary-hover: #4a4a4a;
        --color-overlay: rgba(0, 0, 0, 0.6);
        --color-disabled: #444444;

        --color-text-accent: #e0e0e0;
        --color-text-secondary: #aaaaaa;
        --color-text-tertiary: #777777;
        --color-text-tertiary-alpha: rgba(128, 128, 128, 0.5);

        --color-border: #444444;
        --color-border-light: #333333;
        --color-border-light-2: #444444;
        --color-border-focus: #777777;

        --color-accent: #66bb6a;
        --color-accent-hover: #4caf50;
        --color-on-accent: #000000;

        --color-error: #ef5350;
        --color-on-error: #ffffff;
    }
}

/* Reset container styling inherited from original setup */
body,
html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
}
#app {
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    max-width: none;
}
</style>
