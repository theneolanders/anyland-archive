import glob from 'glob';
import fs from 'fs';
import 'dotenv/config'

export const headers = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'UnityPlayer/2018.1.0f2 (UnityWebRequest/1.0, libcurl/7.51.0-DEV)',
  'Accept': '*/*',
  'Accept-Encoding': 'identity',
  'X-Unity-Version': '2018.1.0f2',
  'Cookie': process.env.ANYLAND_COOKIE
};

export function isAreaArchived(areaName, areaId, areaKey) {
  return glob.sync(`areas/${areaName}__${areaId}_${areaKey}.json`).length > 0;
}

export function logFailedArchive(areaName, areaId, areaKey, error) {
  return new Promise((resolve, reject) => {
    const logData = `${areaName},${areaId},${areaKey},${error}\n`;
    fs.appendFile(`failed_logs/failedDownloads.csv`, logData, function (err) {
      if (err) reject(err)
      resolve();
    });
  });
}

export function rotateFailedDownloadsLog() {
  const basePath = 'failed_logs/failedDownloads';
  const csvExtension = '.csv';
  const csvPath = `${basePath}${csvExtension}`;
  const headers = 'areaName,areaId,areaKey,error\n';

  if (fs.existsSync(csvPath)) {
      const contents = fs.readFileSync(csvPath, 'utf8');
      if (contents.trim() !== "areaName,areaId,areaKey,error") {
          let counter = 1;
          while (fs.existsSync(`${basePath}.${counter}${csvExtension}`)) {
              counter++;
          }
          fs.renameSync(csvPath, `${basePath}.${counter}${csvExtension}`);
          fs.writeFileSync(csvPath, headers);
      }
  } else {
      fs.writeFileSync(csvPath, headers);
  }
}

export function createArchiveLog() {
  if (!fs.existsSync('archived_world_list.csv')) {
    const headers = 'areaName,areaId,areaKey,subArea,parentAreaId\n';
    fs.writeFileSync('archived_world_list.csv', headers);
  }
}

export function addArchiveLog(areaName, areaId, areaKey, subArea = false, parentId = '') {
  const row = `${areaName},${areaId},${areaKey},${subArea ? 'Y' : 'N'},${subArea ? parentId : '-'}\n`;
  fs.appendFileSync('archived_world_list.csv', row);
}

export function rotateRunOutputLog() {
  const basePath = 'run_logs/runOutput';
  const logExtension = '.log';
  const logPath = `${basePath}${logExtension}`;

  if (fs.existsSync(logPath)) {
      const contents = fs.readFileSync(logPath, 'utf8');
      if (contents.trim() !== "") {
          let counter = 1;
          while (fs.existsSync(`${basePath}.${counter}${logExtension}`)) {
              counter++;
          }
          fs.renameSync(logPath, `${basePath}.${counter}${logExtension}`);
          fs.writeFileSync(logPath, '');
      }
  } else {
      fs.writeFileSync(logPath, '');
  }
}