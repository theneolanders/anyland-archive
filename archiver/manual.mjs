import fs from 'fs';
import path from 'path';
import { startDownloadQueue, appendDownloadQueue } from './queue.mjs';
import { getAreaIdentifiers, getSubAreas } from './area.mjs';
import { logFailedArchive } from './utils.mjs';
import { Worker } from 'worker_threads';

const worker = new Worker('./poll_token.mjs');

function stripNewline(str) {
  if (str.endsWith('\r') || str.endsWith('\n')) {
      return str.slice(0, -1);
  }
  return str;
}

async function start() {
  startDownloadQueue();

  const data = fs.readFileSync('./areaDiff.json', 'utf-8');

  // Parse the JSON content
  const parsedData = JSON.parse(data);

  // Process each entry
  parsedData.forEach(async entry => {
    try {
      let newArea = entry
      entry.subArea = false;
      entry.parentId = null;
      const identifiers = await getAreaIdentifiers(entry.id, false)
      console.log('Queueing', entry.name);
      entry.areaData = identifiers.areaData;

      appendDownloadQueue([entry]);

      const subAreas = await getSubAreas(identifiers.id);
      if (subAreas.length) {
        queueAreas = appendDownloadQueue(subAreas);
        console.log(`Queued ${subAreas.length} new subareas for download.`);
      }
    } catch (e) {
      console.log(`Failure logged for ${entry.name}`, e.msg);
      logFailedArchive(entry.name, 'Unobtained', 'Unobtained', e.msg);
    }
  });

}

start();