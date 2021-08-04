export interface Timestamp {
  start: string;
  end: string;
}

export type VideoProcessingConfigByUserId = { [userId: string]: VideoProcessingConfig };

export interface VideoProcessingConfig {
  trim?: Timestamp;
  reverse?: boolean;
  videoUrl: string;
  processing: boolean;
};