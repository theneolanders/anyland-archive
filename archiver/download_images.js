const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const util = require('util');

const delay = util.promisify(setTimeout); // Convert setTimeout into a promise

// Ensure the images directory exists
const imagesDir = 'images';
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// Function to log errors to a file
function logError(message) {
  const logFile = 'images_error_log.txt';
  fs.appendFile(logFile, message + '\n', (err) => {
    if (err) console.error('Error writing to log file:', err);
  });
}

// Function to download the image from a URL
async function downloadImage(url, filename) {
  // Ensure the filename ends with .png
  if (!filename.endsWith('.png')) {
    filename += '.png';
  }

  const filePath = path.join(imagesDir, filename);

  // Check if the file already exists
  if (fs.existsSync(filePath)) {
    // console.log('File already exists, skipping:', filePath);
    return;
  }

  const file = fs.createWriteStream(filePath);

  // Choose the correct module based on the protocol
  const protocol = url.startsWith('https') ? https : http;

  await new Promise((resolve, reject) => {
    protocol.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close();
        console.log('Downloaded:', filePath);
        resolve();
      });
    }).on('error', function(err) {
      fs.unlink(filePath, () => { /* Ignore unlink errors */ });
      const errorMessage = `Error downloading ${filePath}: ${err.message}`;
      console.error(errorMessage);
      logError(errorMessage);
      reject(err);
    });
  });
}

// Function to process each line in the JSON
function processLine(line) {
  const baseUrl = 'https://steamuserimages-a.akamaihd.net/ugc/';

  let url, filename;

  if (line.startsWith('http')) {
    // For complete URLs
    url = line;
    filename = path.basename(url).split('.')[0]; // Remove extension from URL
  } else {
    // For partial URLs
    const parts = line.split('/');
    filename = (parts.length > 1) ? parts[0] + '_' + parts[1] : parts[0];
    url = baseUrl + line;
  }

  downloadImage(url, filename);
}

// Main function to read the JSON file and process each line
async function main() {
  try {
    const data = fs.readFileSync('imagesList.json', 'utf8');
    const lines = JSON.parse(data);

    for (const line of lines) {
      await processLine(line);
      await delay(100); // Wait for 100ms before processing the next image
    }

  } catch (e) {
    console.error('Error:', e);
    logError('Error: ' + e.message);
  }
}

main();
