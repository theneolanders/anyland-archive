import fs from 'fs';
import path from 'path';
import { queueSearch, startDownloadQueue } from './queue.mjs';
import { addArchiveLog } from './utils.mjs';
import { Worker } from 'worker_threads';

const worker = new Worker('./poll_token.mjs');

const DEBUG = false;

/**
 * Used to add a delay between requests
 * @param {Number} ms
 * @returns {Promise}
 */
const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

function stripNewline(str) {
  if (str.endsWith('\r') || str.endsWith('\n')) {
      return str.slice(0, -1);
  }
  return str;
}


async function start() {
  startDownloadQueue();

  // let queueResult = await queueSearch("jukebox");

  // Start by doing a search for every letter in the alphabet
  for (let i = 0; i < 26; i++) {
    await queueSearch((i + 10).toString(36))
    await delay(500);
  }

  // Now iterate through every file in the wordlists directory
  let currentFile = '';
  try {
    const files = fs.readdirSync('./wordlists');
    files.sort();
    for (const file of files) {
      currentFile = file;
      addArchiveLog(`[--Processing wordlist: ${file}---]`, '', '', false, '');
      const filePath = path.join('./wordlists', file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      console.log(`Processing file: ${file}`);
      for (const line of lines) {
        await queueSearch(stripNewline(line));
        await delay(500);
      }
    }
  } catch (error) {
    console.error('Error processing files:', currentFile, error);
  }
}


// Delete everything for debugging
if (DEBUG) {
  // Remove the existing archived worlds list
  if (fs.existsSync('archived_world_list.csv')) {
    fs.unlinkSync('archived_world_list.csv');
  }

  // Remove the existing areas archive
  if (fs.existsSync('areas')) {
    fs.rmSync('areas', { recursive: true });
    fs.mkdirSync('areas');
  }
}

start();