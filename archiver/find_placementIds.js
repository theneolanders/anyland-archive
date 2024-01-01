const fs = require('fs');
const path = require('path');

const placementIds = [];
const areaIds = [];
const failedFiles = [];


function processFile(filePath) {
  try {
    const jsonString = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonString);

    // Look like subareas have a slightly different shape
    const areaId = data.areaId || data.areaData.areaId;
    const placements = data.placements || data.areaData.placements;

    areaIds.push(areaId)
    for (const placement of placements) {
        // a bit dirty but this is the simplest thing
        placementIds.push(areaId + "," + placement.Id)
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    failedFiles.push({ file: filePath, error: error.message });
  }
}

const directoryPath = './areas'; // Directory path
const files = fs.readdirSync(directoryPath);


for (let i = 0; i <= files.length; i++) {
    const file = files[i];
    console.log(i, "/", files.length, file);

    if (path.extname(file) === '.json' && file.endsWith('_areaData.json')) {
        processFile(path.join(directoryPath, file));
    }
}

fs.writeFileSync('./placementIds.txt', placementIds.join('\n'));
fs.writeFileSync('./areaIds.txt', areaIds.join('\n'));
console.log('Failed Files:', failedFiles);
