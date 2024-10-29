# Anyland Archive

This is an archive of all of the virtual world platform Anyland.

This archive was created with the intent of preserving the legacy of Anyland for its users, past and present, as well as future generations who may take an interest in this unique platform.

The archive is divided into the following sections:

- **Public Worlds** - A list of public worlds that have been created by the community.
- **Steam Client** - The latest release of the Windows Steam client, downloaded via SteamCMD.
- **Website** - The Anyland.com website.


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

Unzip the contents of this folder into `old_archiver/data`.
