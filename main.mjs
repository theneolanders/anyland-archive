import fs from 'fs';
import path from 'path';
import { queueSearch, startDownloadQueue } from './queue.mjs';

const DEBUG = true;

const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function start() {
  startDownloadQueue();

  let queueResult = await queueSearch("Zeta");

  for (let i = 0; i < 26; i++) {
    await queueSearch((i + 10).toString(36))
    // await delay(500);
  }


  // try {
  //   const files = fs.readdirSync('./wordlists');
  //   for (const file of files) {
  //     const filePath = path.join('./wordlists', file);
  //     const content = fs.readFileSync(filePath, 'utf-8');
  //     const lines = content.split('\n');
  //     console.log(`Processing file: ${file}`);
  //     for (const line of lines) {
  //       await queueSearch(line);
  //       // await delay(500);
  //     }
  //   }
  // } catch (error) {
  //   console.error('Error processing files:', error);
  // }
}

if (fs.existsSync('archived_world_list.csv')) {
  fs.unlinkSync('archived_world_list.csv');
}

if (DEBUG) {
  if (fs.existsSync('archived_world_list.csv')) {
    fs.unlinkSync('archived_world_list.csv');
  }
  if (fs.existsSync('areas')) {
    fs.rmSync('areas', { recursive: true });
    fs.mkdirSync('areas');
  }
}

start();