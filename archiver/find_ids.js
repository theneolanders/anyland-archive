const fs = require('fs');
const path = require('path');

const thingIds = new Set();
const failedFiles = [];


function processFile(filePath) {
  try {
    const jsonString = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonString);
    if (typeof data.thingDefinitions === 'undefined') return;

    for (let i = 0; i < Object.keys(data.thingDefinitions).length; i++) {
        thingIds.add(data.thingDefinitions[i].id)
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

    if (path.extname(file) === '.json' && !file.endsWith('_areaData.json')) {
        processFile(path.join(directoryPath, file));
    }
}

fs.writeFileSync('./thingIds.txt', [...thingIds].join('\n'));
console.log('Failed Files:', failedFiles);
