import dayjs from 'dayjs';
import { Timestamp } from '../types';

export const parseTimestamp = (timestampMatch: string): Timestamp => {
  const trimmedTimestamp = timestampMatch.trim();
  if (!/\d\d:\d\d-\d\d:\d\d/.test(trimmedTimestamp)) {
    return null;
  }

  return { start: trimmedTimestamp.split('-')[0].trim(), end: trimmedTimestamp.split('-')[1].trim() };
}

export const getDurationBasedOnTimestamp = (timestamp: Timestamp): number => {
  const timestampStart = dayjs(`2000-01-01 00:${timestamp.start}`);
  const timestampEnd = dayjs(`2000-01-01 00:${timestamp.end}`);

  return timestampEnd.diff(timestampStart, 'seconds');
}