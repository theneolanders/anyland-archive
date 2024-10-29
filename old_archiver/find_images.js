const fs = require('fs');
const path = require('path');

let allImages = []; // Global array to hold results from all files
let failedFiles = []; // Array to keep track of files that failed to process

function findImProperties(obj, result = []) {
    // Recursive function to find 'im' properties in an object
    if (obj !== null && typeof obj === 'object') {
        for (const key in obj) {
            if (key === 'im') {
                result.push(obj[key]);
            } else if (typeof obj[key] === 'object') {
                findImProperties(obj[key], result);
            }
        }
    }
    return result;
}

function processFile(filePath) {
  // Function to process each file and extract image properties
  try {
    const jsonString = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonString);
    if (typeof data.thingDefinitions === 'undefined') return;

    for (let i = 0; i < Object.keys(data.thingDefinitions).length; i++) {
        const element = JSON.parse(data.thingDefinitions[i].def);
        if (typeof element.p !== 'undefined') {
            for (let j = 0; j < element.p.length; j++) {
                const part = element.p[j];
                const result = findImProperties(part);
                if (result.length > 0) {
                    allImages = allImages.concat(result);
                }
            }
        }
    }
  } catch (error) {
    // console.error(`Error processing file ${filePath}:`, error);
    failedFiles.push({ file: filePath, error: error.message });
  }
}

function saveResults() {
  // Function to save the results and failed files to JSON files
  fs.writeFileSync('./imagesList.json', JSON.stringify(allImages, null, 2));
  fs.writeFileSync('./imageFailedAreaFiles.json', JSON.stringify(failedFiles, null, 2));
}

const directoryPath = './areas'; // Directory path
const files = fs.readdirSync(directoryPath);

files.forEach(file => {
    if (path.extname(file) === '.json' && !file.endsWith('_areaData.json')) {
        processFile(path.join(directoryPath, file));
    }
});

saveResults(); // Save the results after processing all files

console.log('All Images:', allImages); // Output the combined results
console.log('Failed Files:', failedFiles); // Output the list of failed files
