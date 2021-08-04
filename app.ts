import ytbDownloader from 'ytdl-core';
import progress from 'progress-stream';
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { VideoProcessingConfigByUserId } from './src/types';
import { getCachedFileId, cacheFileId, syncCachedFiles, mountCacheKey } from './src/utils/CacheManager';
import { handleSetUrl } from './src/SetVideo';
import { handleTrim, processWithTrim } from './src/Trim';
import { handleReverse, processWithReverse } from './src/Reverse';

const token = 'bot token goes here';
const bot = new TelegramBot(token, { polling: true });

setInterval(() => {
  syncCachedFiles();
}, 20000);

var processingQueue: VideoProcessingConfigByUserId = {};

const isProcessing = (userId: number) => {
  return processingQueue[userId] && processingQueue[userId].processing;
};

const hasUrlSet = (userId: number) => {
  return !!processingQueue[userId];
};

const setupProgressAndDownloadMedia = (
  progressMessage: TelegramBot.Message,
  fileName: string,
  mediaType: 'mp3' | 'mp4',
  stream,
  requesterId: number,
  cacheKey: string,
) => {
  stream.once('response', (response) => {
    const str = progress({
      length: parseInt(response.headers['content-length']),
      time: 1000,
    });

    str.on('progress', (progress) => {
      const percentageLoaded = Math.floor(progress.percentage);
      let loadingBar = '';
      for (let index = 0; index < Math.floor(percentageLoaded / 10); index++) {
        loadingBar += `▣`;
      }

      if (percentageLoaded < 100) {
        bot.editMessageText(`Processing... Please wait\n\n${percentageLoaded}% - ${loadingBar}`, {
          chat_id: progressMessage.chat.id,
          message_id: progressMessage.message_id,
        });
      }
    });

    stream
      .pipe(str)
      .pipe(fs.createWriteStream(`./${mediaType}/${fileName}.${mediaType}`));

    str.on('end',async () => {
      let currentFileName = fileName;
      if (hasUrlSet(requesterId)) {
        if (processingQueue[requesterId].trim) {
          console.log(`currentFileName ${currentFileName}`);
          currentFileName = await processWithTrim(mediaType, currentFileName, processingQueue[requesterId].trim);
        }
      }

      if (hasUrlSet(requesterId)) {
        if (processingQueue[requesterId].reverse) {
          console.log('reversing');
          currentFileName = await processWithReverse(mediaType, currentFileName);
        }
      }

      bot.editMessageText(`Processing finished. Uploading...`, {
        chat_id: progressMessage.chat.id,
        message_id: progressMessage.message_id,
      });

      const sentMediaMessage = 'mp4' === mediaType ?
        await bot.sendVideo(progressMessage.chat.id, `./${mediaType}/${currentFileName}.${mediaType}`) :
        await bot.sendAudio(progressMessage.chat.id, `./${mediaType}/${currentFileName}.${mediaType}`);

      const fileId = sentMediaMessage.audio ? sentMediaMessage.audio.file_id : sentMediaMessage.video.file_id;
      cacheFileId(cacheKey, fileId);

      processingQueue[requesterId].processing = false;
    });
  });
};

bot.onText(/\/start/, () => {
  // TOODO: Think about something to put here
});

bot.onText(/\/setvideo(.+)/, (msg, match) => {
  handleSetUrl(bot, msg, match, processingQueue, ytbDownloader);
});

bot.onText(/\/removetrim/, (msg)=> {
  if (!hasUrlSet(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You have to set a video url with /setvideo before using this command.');
  }

  if (isProcessing(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You already got a video/audio being processed. Please wait until I finish to request another one.');
  }

  delete processingQueue[msg.from.id].trim;
  bot.sendMessage(msg.chat.id, 'Media will no longer be trimmed.');
});

bot.onText(/\/trim(.+)/, (msg, match)=> {
  handleTrim(bot, msg, match, processingQueue);
});

bot.onText(/\/removereverse/, (msg)=> {
  if (!hasUrlSet(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You have to set a video url with /setvideo before using this command.');
  }

  if (isProcessing(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You already got a video/audio being processed. Please wait until I finish to request another one.');
  }

  delete processingQueue[msg.from.id].reverse;
  bot.sendMessage(msg.chat.id, 'Reverse filter removed.');
});

bot.onText(/\/reverse/, (msg)=> {
  handleReverse(bot, msg, processingQueue);
});

bot.onText(/\/mp3(.+)?/, async (msg, match) => {
  if (isProcessing(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You already got a video/audio being processed. Please wait until I finish to request another one.');
  }

  if (!hasUrlSet(msg.from.id) && !match[1]) {
    return bot.sendMessage(msg.chat.id, 'To use this command either set an url with /setvideo or send me the video link like /mp3 url_to_youtube_video');
  }

  if (!hasUrlSet(msg.from.id) && match[1] && !ytbDownloader.validateURL(match[1])) {
    return bot.sendMessage(msg.chat.id, 'Either this is not a youtube URL or the video is not acessible by me.');
  }

  let videoUrl = (match[1] || processingQueue[msg.from.id].videoUrl).trim();

  const cacheKey = mountCacheKey(videoUrl, 'mp3', processingQueue[msg.from.id]);
  const cachedFileId = getCachedFileId(cacheKey);

  const info = await ytbDownloader.getInfo(videoUrl);
  if (parseInt(info.videoDetails.lengthSeconds) > 3000) {
    return bot.sendMessage(msg.chat.id, `Sorry, I cannot process mp3s of more than 50 minutes`);
  }

  if (cachedFileId) {
    return bot.sendAudio(msg.chat.id, cachedFileId);
  }

  const progressMessage = await bot.sendMessage(msg.chat.id, `
Processing... Please wait

0%
  `);

  if (match[1]) {
    processingQueue[msg.from.id] = { videoUrl, processing: true };
  }
  processingQueue[msg.from.id].processing = true;

  const stream = ytbDownloader(videoUrl, { filter: 'audioonly' });

  return setupProgressAndDownloadMedia(progressMessage, info.videoDetails.title.replace(/[^a-z0-9\_\-\.]/ig, ''), 'mp3', stream, msg.from.id, cacheKey);
});

bot.onText(/\/video(.+)?/, async (msg, match) => {
  if (isProcessing(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, 'You already got a video/audio being processed. Please wait until I finish to request another one.');
  }

  if (!hasUrlSet(msg.from.id) && !match[1]) {
    return bot.sendMessage(msg.chat.id, 'To use this command either set an url with /setvideo or send me the video link like /mp3 url_to_youtube_video');
  }

  if (!hasUrlSet(msg.from.id) && match[1] && !ytbDownloader.validateURL(match[1])) {
    return bot.sendMessage(msg.chat.id, 'Either this is not a youtube URL or the video is not acessible by me.');
  }

  let videoUrl = (match[1] || processingQueue[msg.from.id].videoUrl).trim();

  const cacheKey = mountCacheKey(videoUrl, 'mp4', processingQueue[msg.from.id]);
  const cachedFileId = getCachedFileId(cacheKey);

  const info = await ytbDownloader.getInfo(videoUrl);
  if (parseInt(info.videoDetails.lengthSeconds) > 1800) {
    return bot.sendMessage(msg.chat.id, `Sorry, I cannot process videos of more than 30 minutes`);
  }

  if (cachedFileId) {
    return bot.sendVideo(msg.chat.id, cachedFileId);
  }

  const progressMessage = await bot.sendMessage(msg.chat.id, `
Processing... Please wait

0%
  `);

  if (match[1]) {
    processingQueue[msg.from.id] = { videoUrl, processing: true };
  }
  processingQueue[msg.from.id].processing = true;

  const stream = ytbDownloader(videoUrl, { quality: 'highest' });

  return setupProgressAndDownloadMedia(progressMessage, info.videoDetails.title.replace(/[^a-z0-9\_\-\.]/ig, ''), 'mp4', stream, msg.from.id, cacheKey);
});
