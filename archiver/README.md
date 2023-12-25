### Archiver

This script was written with NodeJS v18.15.0. To run the archiver yourself you will need to NPM install the packages and then login to Anyland to get your session cookie. This cookie can be captured with Wireshark by listening for HTTP requests to `http://app.anyland.com`. The cookie is required to make authenticated requests such as validating your permission to access a world when requesting the `load` or `search` API endpoints.

Once you have the session cookie, set it in the `.env` file and run the `main.mjs` script.

Please do not decrease the delays between queueing and download attempts as to not overload the API with requests.