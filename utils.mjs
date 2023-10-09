import fs from 'fs';
import 'dotenv/config'

/**
 * This is used by all network requests to mimic the Anyland client and include the session cookie
 */
export const headers = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'UnityPlayer/2018.1.0f2 (UnityWebRequest/1.0, libcurl/7.51.0-DEV)',
  'Accept': '*/*',
  'Accept-Encoding': 'identity',
  'X-Unity-Version': '2018.1.0f2',
  'Cookie': process.env.ANYLAND_COOKIE
};

/**
 * Check if an area has been archived
 * @param {string} areaName
 * @param {string} areaId
 * @param {string} areaKey
 * @returns {boolean}
 */
export function isAreaArchived(areaName, areaId, areaKey) {
  return fs.existsSync(`areas/${areaName}__${areaId}_${areaKey}.json`) && fs.existsSync(`areas/${areaName}__${areaId}_${areaKey}_areaData.json`);
}

/**
 * Log a failed download
 * @param {string} areaName
 * @param {string} areaId
 * @param {string} areaKey
 * @param {string} error
 * @returns {Promise}
 */
export function logFailedArchive(areaName, areaId, areaKey, error) {
  return new Promise((resolve, reject) => {
    areaName = areaName.replace(/,/g, '');
    const logData = `${areaName},${areaId},${areaKey},${error}\n`;
    fs.appendFile(`failed_logs/failedDownloads.csv`, logData, function (err) {
      if (err) reject(err)
      resolve();
    });
  });
}

/**
 * Rotate the failed download log
 * Moves the old log to failedDownlods.N.csv where N is the number of old logs ie: failedDownloads.1.csv
 */
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

/**
 * Initialize the archive log csv
 */
export function createArchiveLog() {
  if (!fs.existsSync('archived_world_list.csv')) {
    const headers = 'areaName,areaId,areaKey,subArea,parentAreaId\n';
    fs.writeFileSync('archived_world_list.csv', headers);
  }
}

/**
 * Add an archive log entry
 * @param {string}} areaName
 * @param {string}} areaId
 * @param {string}} areaKey
 * @param {string}} subArea
 * @param {string}} parentId
 */
export function addArchiveLog(areaName, areaId, areaKey, subArea = false, parentId = '') {
  areaName = areaName.replace(/,/g, '');
  const row = `${areaName},${areaId},${areaKey},${subArea ? 'Y' : 'N'},${subArea ? parentId : '-'}\n`;
  fs.appendFileSync('archived_world_list.csv', row);
}

/**
 * Rotate the run output log
 * Moves the old log to runOutput.N.csv where N is the number of old logs ie: runOutput.1.csv
 */
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