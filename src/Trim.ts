import TelegramBot from 'node-telegram-bot-api';
import { Timestamp, VideoProcessingConfigByUserId } from './types';
import { isProcessing, hasUrlSet } from './utils/General';
import { parseTimestamp, getDurationBasedOnTimestamp } from './utils/TimestampParser';
import ffmpeg from 'fluent-ffmpeg';

export const handleTrim = (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray,
  processingQueue: VideoProcessingConfigByUserId,
) => {
  if (!hasUrlSet(processingQueue, msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You have to set a video url with /setvideo before using this command.');
  }

  if (isProcessing(processingQueue, msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You already got a video/audio being processed. Please wait until I finish to request another one.');
  }

  const parsedTimestamp = parseTimestamp(match[1]);
  if (!parsedTimestamp) {
    return bot.sendMessage(msg.chat.id, 'Incorrect timestamp format provided. Please use the format mm:ss-mm:ss.');
  }

  processingQueue[msg.from.id].trim = parsedTimestamp;
  bot.sendMessage(msg.chat.id, `Trimming video from ${parsedTimestamp.start} to ${parsedTimestamp.end}.`);
}

export const processWithTrim = (
  mediaType: string,
  fileName: string,
  trimTimestamp: Timestamp
): Promise<string> => {
  return new Promise((resolve) => {
    const newName = `${fileName}-trimmed`;
    let proc = ffmpeg(`./${mediaType}/${fileName}.${mediaType}`)
        .withVideoCodec('copy')
        .withAudioCodec('copy');

    const duration = getDurationBasedOnTimestamp(trimTimestamp);
    proc = proc.seekInput(trimTimestamp.start).setDuration(duration);

    proc
      .on('end', async () => {
        resolve(newName);
      })
      .save(`./${mediaType}/${newName}.${mediaType}`);
  });
}
