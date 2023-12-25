const fs = require('fs');
const path = require('path');

// Function to get the list of files from a directory
const getFilesFromDirectory = (dir) => {
    return fs.readdirSync(dir).filter(file => {
        // Ignore files ending with _areaData
        return !file.endsWith('_areaData');
    });
}

const compareDirectories = (dir1, dir2) => {
    const filesDir1 = getFilesFromDirectory(dir1);
    const filesDir2 = getFilesFromDirectory(dir2);

    // Filter the list to get files that are unique to dir2
    const uniqueFilesDir2 = filesDir2.filter(file => !filesDir1.includes(file));

    return uniqueFilesDir2;
}

const extractStrings = (filename) => {
    const regex = /^(.*?)__(.*?)_(.*?)\.json$/;
    const matches = filename.match(regex);

    if (matches) {
        return {
            name: matches[1],
            id: matches[2],
            key: matches[3]
        };
    }
    return null;
}

const writeToFile = (filenames, outputPath) => {
    const data = filenames.map(filename => {
        return extractStrings(filename);
    }).filter(Boolean);

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}

// The paths to the directories to compare
const dir1 = path.join(__dirname, './areas');  // Replace 'folder1' with your first folder name
const dir2 = path.join(__dirname, '../anyland-archive/areas');  // Replace 'folder2' with your second folder name

const uniqueFiles = compareDirectories(dir1, dir2);

// Write the extracted strings as JSON objects to a file named 'output.json'
writeToFile(uniqueFiles, path.join(__dirname, 'areaDiff.json'));
console.log('Written unique filenames data to areaDiff.json');
