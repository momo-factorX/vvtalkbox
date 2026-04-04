import { ref } from "vue";
import type { Speaker } from "../types/voicevox";

const audioCache = new Map<string, string>();

export function useVoicevox() {
    const apiUrl = ref(localStorage.getItem("vv_api_url") || "http://127.0.0.1:50021");
    const defaultSpeakerId = ref<number>(parseInt(localStorage.getItem("vv_default_speaker_id") || "3", 10));
    const isConnected = ref(true);
    const speakers = ref<Speaker[]>([]);

    const checkConnection = async () => {
        try {
            const res = await fetch(`${apiUrl.value}/version`, { method: "GET" });
            if (res.ok) {
                if (!isConnected.value) {
                    isConnected.value = true;
                }
                await fetchSpeakers();
            } else {
                isConnected.value = false;
            }
        } catch (e) {
            isConnected.value = false;
        }
    };

    const fetchSpeakers = async () => {
        if (speakers.value.length > 0) return; // Prevent unnecessary refetching
        try {
            const res = await fetch(`${apiUrl.value}/speakers`, { method: "GET" });
            if (res.ok) {
                speakers.value = await res.json();
            }
        } catch (e) {
            console.error("Failed to fetch speakers", e);
        }
    };

    const setApiUrl = (url: string) => {
        apiUrl.value = url;
        localStorage.setItem("vv_api_url", url);
        speakers.value = []; // Reset speakers
        checkConnection();
    };

    const setDefaultSpeakerId = (id: number) => {
        defaultSpeakerId.value = id;
        localStorage.setItem("vv_default_speaker_id", id.toString());
    };

    const synthesize = async (text: string, speakerId: number): Promise<string | null> => {
        const cacheKey = `${speakerId}:${text}`;
        if (audioCache.has(cacheKey)) {
            return audioCache.get(cacheKey)!;
        }

        try {
            // NOTE: AudioQuery を作成
            const queryRes = await fetch(`${apiUrl.value}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`, {
                method: "POST"
            });
            if (!queryRes.ok) return null;
            const queryJson = await queryRes.json();

            // NOTE: 音声合成
            const synthRes = await fetch(`${apiUrl.value}/synthesis?speaker=${speakerId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "audio/wav"
                },
                body: JSON.stringify(queryJson)
            });
            if (!synthRes.ok) return null;

            const blob = await synthRes.blob();
            const url = URL.createObjectURL(blob);
            audioCache.set(cacheKey, url);
            return url;
        } catch (e) {
            console.error("Synthesis error", e);
            return null;
        }
    };

    return {
        apiUrl,
        defaultSpeakerId,
        isConnected,
        speakers,
        setApiUrl,
        setDefaultSpeakerId,
        checkConnection,
        synthesize
    };
}
