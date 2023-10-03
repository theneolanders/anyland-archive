import request from 'request';
import { isAreaArchived, createArchiveLog, logFailedArchive, rotateFailedDownloadsLog, rotateRunOutputLog, addArchiveLog, headers } from './utils.mjs';
import { archiveArea, getAreaIdentifiers, getSubAreas } from './area.mjs';

let downloadQueue = [];
let failedAreas = [];
let downloadTimer = null;
const downloadDelay = 1; // How long in seconds between getting each area

export function queueSearch(query) {
  return new Promise((resolve, reject) => {
    const options = {
      'method': 'POST',
      'url': 'http://app.anyland.com/area/search',
      'headers': headers,
      form: { 'term': query.toLowerCase() }
    };
    request(options, async function (error, response) {
      try {
        if (error) reject(error);
        if (typeof response === 'undefined' || typeof response.body === 'undefined') reject('Missing body');
        const results = JSON.parse(response.body);
        if (results['error']) reject('Missing body');
        if (typeof results.areas === 'undefined' || typeof results.areas.length === 'undefined') reject('No areas found in response');
        let queueAreas = [];
        for (let i = 0; i < results.areas.length; i++) {
          try {
            const identifiers = await getAreaIdentifiers(results.areas[i].id, false)
            // console.log('Identifying', results.areas[i].name);
            // console.log('Archived', isAreaArchived(results.areas[i].name, identifiers.id, identifiers.key));
            // console.log('Downloaded', isInDownloadQueue(results.areas[i].areaId, results.areas[i].areaKey));
            // console.log('Failed', isInFailedAreas(results.areas[i].areaId, results.areas[i].areaKey));
            if (isAreaArchived(results.areas[i].name, identifiers.id, identifiers.key) || isInDownloadQueue(results.areas[i].name, identifiers.id, identifiers.key) || isInFailedAreas(results.areas[i].name, identifiers.id, identifiers.key)) continue;
            console.log('Queueing', results.areas[i].name);
            queueAreas.push({
              name: results.areas[i].name,
              id: identifiers.id,
              key: identifiers.key,
              subArea: false,
              parentId: null
            });

            const subAreas = await getSubAreas(identifiers.id);
            if (subAreas.length) {
              queueAreas = queueAreas.concat(subAreas);
              console.log(`Queued ${subAreas.length} new subareas for download.`);
            }
          } catch (e) {
            console.error(e);
            logFailedArchive(results.areas[i].name, results.areas[i].areaId, results.areas[i].areaKey, e);
          }
        }
        if (queueAreas.length) {
          downloadQueue = downloadQueue.concat(queueAreas);
          console.log(`Queued ${queueAreas.length} new areas for download. Queue contains ${downloadQueue.length} areas`);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function startDownloadQueue(delay = downloadDelay) {
  createArchiveLog();
  rotateRunOutputLog();
  rotateFailedDownloadsLog();
  console.log(`Download queue started with ${delay} second download delay`);
  downloadTimer = setInterval(processQueueStep, delay * 1000);
}

function isInDownloadQueue(areaId, areaKey) {
  return downloadQueue.some(area =>
    area.areaId === areaId && area.areaKey === areaKey
  );
}

function isInFailedAreas(areaId, areaKey) {
  return failedAreas.some(area =>
    area.areaId === areaId && area.areaKey === areaKey
  );
}

async function processQueueStep() {
  if (!downloadQueue.length) return;
  try {
    const areaData = downloadQueue.shift();

    const status = await archiveArea(areaData.name, areaData.id, areaData.key);
    if (status.success) {
      console.log(status.msg);
      addArchiveLog(areaData.name, areaData.id, areaData.key, areaData.subArea, areaData.parentId);
    } else {
      failedAreas.push(areaName);
      logFailedArchive(areaData.name, areaData.id, areaData.key, status.msg);
    }
  } catch (e) {
    console.log(`Failure logged for ${areaName}`, e.msg);
    failedAreas.push(areaName);
    logFailedArchive(areaName, 'Unobtained', 'Unobtained', e.msg);
  }
}
