import TelegramBot from 'node-telegram-bot-api';
import { VideoProcessingConfigByUserId } from './types';
import { isProcessing } from './utils/General';

export const handleSetUrl = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray,
  processingQueue: VideoProcessingConfigByUserId,
  ytbDownloader: any
) => {
  if (isProcessing(processingQueue, msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You already got a video/audio being processed. Please wait until I finish to request another one.');
  }

  const isUrlValid = await ytbDownloader.validateURL(match[1]);
  if (!isUrlValid) {
    return bot.sendMessage(msg.chat.id, 'Either this is not a youtube URL or the video is not acessible by me.');
  }

  processingQueue[msg.from.id] = { videoUrl: match[1].trim(), processing: false };
  bot.sendMessage(msg.chat.id, `
Video set. What do you want to do with this video?

Available options:

/trim mm:ss-mm:ss
*This will trim the video using the timestamps provided.*

/removetrim
*This will remove the trimming applied.*

/reverse
*This will apply a reverse filter to the video.*

/removereverse
*This will remove the applied reverse effect.*

/mp3
*This will download the video as a mp3 file with the changes applied.*

/video
*This will download the video with the changes applied.*
  `, { parse_mode: 'Markdown' });
};
