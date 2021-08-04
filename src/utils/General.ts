import { VideoProcessingConfigByUserId } from '../types';

export const isProcessing = (processingQueue: VideoProcessingConfigByUserId, userId: number) => {
  return processingQueue[userId] && processingQueue[userId].processing;
};

export const hasUrlSet = (processingQueue: VideoProcessingConfigByUserId, userId: number) => {
  return !!processingQueue[userId];
};