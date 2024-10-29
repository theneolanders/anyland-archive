# Anyland Archive

This is an archive of all of the virtual world platform Anyland.

This archive was created with the intent of preserving the legacy of Anyland for its users, past and present, as well as future generations who may take an interest in this unique platform.

The archive is divided into the following sections:

- **Public Worlds** - A list of public worlds that have been created by the community.
- **Steam Client** - The latest release of the Windows Steam client, downloaded via SteamCMD.


## Getting the archive

This repo has a very large history full of old files. I've since reorganized it to try and make it cleaner and easier to manage.

It is reccomended you perform a shallow checkout, or use the download zip option on Github:

```bash
git clone --depth=1 https://github.com/theneolanders/anyland-archive
```

### Unpacking the data

#### Areas

Once you have the archive the actual area data is in a compressed in a multi-part file under `archiver/data.7z.00X`.

Unzip the contents of this folder into `archiver/data`.

#### Images

All of the asset images are compressed in a multi-part file under `old_archiver/images.7z.00X`

Unzip the contents of this folder into `old_archiver/images`.

#### Old Archive data

The old archive data is in the `old_archiver` directory. The data is stored in a format that is not compatible with the current archiver.

You can find the data in a multi-part file under `old_archiver/data.7z.00X`.

Unzip the contents of this folder into `old_archiver/data`.

## Running the server

This repo contains a docker compose file in the `archiver` directory that will start a local development server for the game.

The server contains Bun for running the game server, and Caddy for running the CDN and API reverse proxies.

To run the server, you will need to add the following to your `/etc/hosts` file (or `C:\Windows\System32\drivers\etc\hosts` on Windows):

```
127.0.0.1  app.anyland.com
127.0.0.1  d6ccx151yatz6.cloudfront.net
127.0.0.1  d26e4xubm8adxu.cloudfront.net
127.0.0.1  steamuserimages-a.akamaihd.net
```

This will allow the client to redirect requests for the CDN and API to the local server.

Then, run the server with:

```bash
docker compose up
```

Or using Docker Desktop.