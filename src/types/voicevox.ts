/** 喋れるキャラクターの情報 */
export interface Speaker {
    /** 名前 */
    name: string;
    /** キャラクターのUUID */
    speaker_uuid: string;
    /** スタイルの一覧 */
    styles: SpeakerStyle[];
}
/** キャラクターのスタイル情報 */
export interface SpeakerStyle {
    /** スタイル名 */
    name: string;
    /** スタイルID */
    id: number;
}

/** 履歴アイテム */
export interface HistoryItem {
    /** 固有ID */
    id: number;
    /** 履歴の内容 */
    text: string;
    /** {@link Speaker} の ID */
    speakerId: number;
    /** {@link Speaker} の名前 */
    speakerName: string;
    /** 使用した音声の URL */
    audioUrl?: string;
    /** エラー */
    error?: string;
}
