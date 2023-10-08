import request from 'request';
import { headers } from './utils.mjs';

const options = {
  url: 'http://app.anyland.com/p',
  method: 'POST',
  headers: headers
};

function pollServer() {
  request(options, (error, response, body) => {
    if (error) console.error('Error polling session token:', error);
    else if (response.statusCode !== 200) console.log('Token response:', response.statusCode, body);
  });
}

setInterval(pollServer, 30000);