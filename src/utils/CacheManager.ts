import { VideoProcessingConfig } from '../types';
import fs from 'fs';
// Workaround. If I don't import ts will not send this to the dist file
import importedCachedFiles from './cachedFiles.json';

const cache = JSON.parse(fs.readFileSync(`${__dirname}/cachedFiles.json`, 'utf8'));

export const getCachedFileId = (cacheKey: string): string => {
  return cache[cacheKey] || null;
};

export const mountCacheKey = (videoUrl: string, mediaType: string, mods?: VideoProcessingConfig): string => {
  return mods ? `${mediaType}+${JSON.stringify(mods)}` : videoUrl;
};

export const cacheFileId = (cacheKey: string, fileId: string): void => {
  cache[cacheKey] = fileId;
};

export const syncCachedFiles = (): void => {
  fs.writeFileSync(`${__dirname}/cachedFiles.json`, JSON.stringify(cache));
};