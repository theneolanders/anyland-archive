const fs = require('fs');
const path = require('path');

const directoryPath = './failed_logs'; // Set your directory path
const outputFile = 'uniqueFailedEntries.csv';
const uniqueEntries = new Set();

// Read the directory
fs.readdir(directoryPath, (err, files) => {
  if (err) {
    return console.error('Unable to read directory: ' + err);
  }

  let filesProcessed = 0;
  files.forEach(file => {
    fs.readFile(path.join(directoryPath, file), 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading file: ' + file, err);
        return;
      }

      // Assuming each line in the file is an entry
      data.split('\n').forEach(entry => {
        uniqueEntries.add(entry.trim());
      });

      filesProcessed++;
      if (filesProcessed === files.length) {
        // All files processed, write to new file
        fs.writeFileSync(outputFile, Array.from(uniqueEntries).join('\n'));
        console.log('Unique entries saved to ' + outputFile);
      }
    });
  });
});
