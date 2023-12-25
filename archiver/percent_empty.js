const fs = require('fs');
const path = require('path');

const directoryPath = './areas'; // path to the directory you want to search in

let totalFiles = 0;
let matchedFiles = 0;

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.error('Error reading directory: ' + err);
    }

    totalFiles = files.length;

    files.forEach(file => {
        if (!file.includes('_areaData')) {
            fs.readFile(path.join(directoryPath, file), 'utf8', (err, contents) => {
                if (err) {
                    return console.error('Error reading file: ' + err);
                }

                if (contents.includes('{"thingDefinitions":[],')) {
                    matchedFiles++;
                }

                // Check if it's the last file
                if (--totalFiles === 0) {
                    console.log(`Total empty areas: ${matchedFiles}`);
                    console.log(`Percentage empty: ${(matchedFiles / files.length) * 100}%`);
                }
            });
        } else {
            totalFiles--;
        }
    });
});
