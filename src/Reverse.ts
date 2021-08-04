import TelegramBot from 'node-telegram-bot-api';
import { isProcessing, hasUrlSet } from './utils/General';
import { VideoProcessingConfigByUserId } from './types';
import ffmpeg from 'fluent-ffmpeg';

export const handleReverse = (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  processingQueue: VideoProcessingConfigByUserId
) => {
  if (!hasUrlSet(processingQueue, msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You have to set a video url with /setvideo before using this command.');
  }

  if (isProcessing(processingQueue, msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You already got a video/audio being processed. Please wait until I finish to request another one.');
  }

  processingQueue[msg.from.id].reverse = true;
  bot.sendMessage(msg.chat.id, 'Added reverse filter.');
};

export const processWithReverse = (
  mediaType: string,
  fileName: string,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const newName = `${fileName}-reversed`;
    let reversingProc = ffmpeg(`./${mediaType}/${fileName}.${mediaType}`);

    reversingProc
      .outputOptions([
        '-vf reverse',
        '-af areverse',
      ])
      .on('end', async () => {
        resolve(newName);
      })
      .save(`./${mediaType}/${newName}.${mediaType}`);
  });
};
