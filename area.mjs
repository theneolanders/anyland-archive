import request from 'request';
import fs from 'fs';
import { headers } from "./utils.mjs";

/**
 * Get area id and key
 * @param {string} areaValue
 * @param {boolean} isName If false searches by area name isntead of areaId
 * @returns {Promise}
 */
export function getAreaIdentifiers(areaValue, isName = true) {
  return new Promise((resolve, reject) => {
    const options = {
      'method': 'POST',
      'url': 'http://app.anyland.com/area/load',
      'headers': headers,
    };

    if (isName) options.form = { 'areaUrlName': areaName.replace(/[(\ )(')(,)(&)]/g, '') };
    else options.form = { 'areaId': areaValue };
    request(options, function (error, response) {
      if (error) reject(error);
      if (typeof response === 'undefined' || typeof response.body === 'undefined') reject('Missing response');
      const areaData = JSON.parse(response.body);
      if (typeof areaData.areaId === 'undefined' || typeof areaData.areaKey === 'undefined') reject('Undefined keys, probably area name');
      resolve({ id: areaData.areaId, key: areaData.areaKey });
    });
  });
}

/**
 * Get subareas for a given area, including identifiers
 * @param {string} areaId
 * @returns {Promise}
 */
export function getSubAreas(areaId) {
  return new Promise((resolve, reject) => {
    const options = {
      'method': 'POST',
      'url': 'http://app.anyland.com/area/getsubareas',
      'headers': headers,
      form: { 'areaId': areaId }
    };
    request(options, async function (error, response) {
      if (error) reject(error);
      if (typeof response === 'undefined' || typeof response.body === 'undefined') reject('Missing response');
      try {
        const areaData = JSON.parse(response.body);
        if (typeof areaData.subAreas === 'undefined' || !areaData.subAreas.length) resolve([]);
        let subAreas = [];
        for (let i = 0; i < areaData.subAreas.length; i++) {
          const identifiers = await getAreaIdentifiers(areaData.subAreas[i].id, false);
          subAreas.push({
            name: areaData.subAreas[i].name,
            id: identifiers.id,
            key: identifiers.key,
            subArea: true,
            parentId: areaId
          });
        }
        resolve(subAreas);
      } catch (e) {
        console.error(e);
        reject(e);
      }
    });
  });
}

/**
 * Gets an areas JSON from the CDN
 * @param {string} areaId
 * @param {string} areaKey
 * @returns {Object} the JSON of an area from the CDN
 */
function getAreaBundle(areaId, areaKey) {
  return new Promise((resolve, reject) => {
    const options = {
      'method': 'GET',
      'url': `http://d26e4xubm8adxu.cloudfront.net/${areaId}/${areaKey}`,
      'headers': headers
    };
    request(options, function (error, response) {
      if (error) reject(error);
      if (typeof response === 'undefined' || typeof response.body === 'undefined') {
        reject('Missing response');
      } else {
        resolve(response.body);
      }
    });
  });
}

/**
 * Saves an area JSON bundle to disk
 * @param {string} areaName
 * @param {string} areaId
 * @param {string} areaKey
 * @param {string} bundle Area JSON
 * @returns
 */
function saveAreaBundle(areaName, areaId, areaKey, bundle) {
  return new Promise((resolve, reject) => {
    fs.writeFile(`areas/${areaName}__${areaId}_${areaKey}.json`, bundle, function (err) {
      if (err) reject(err)
      resolve();
    });
  });
}

/**
 * Archives an area by getting its bundle and saving it to disk
 * @param {string} areaName
 * @param {string} areaId
 * @param {string} areaKey
 * @returns
 */
export function archiveArea(areaName, areaId, areaKey) {
  return new Promise((resolve, reject) => {
    getAreaBundle(areaId, areaKey).then((bundle) => {
      saveAreaBundle(areaName, areaId, areaKey, bundle).then(() => {
        resolve({ success: true, msg: `Successfully archived area (${areaName})`});
      }).catch((err) => {
        reject({ success: false, msg: `Failed to save file (${areaName}) - ${err}`});
      });
    }).catch((err) => {
      reject({ success: false, msg: `Failed to get area bundle (${areaName}) - ${err}`});
    });
  }).catch((err) => {
    reject({ success: false, msg: `Failed to get area identifiers (${areaName}) - ${err}`});
  });
}