require('dotenv').config()
const { createReadStream } = require('fs');
const { stat } = require('node:fs/promises');
const mime = require('mime');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const { gdriveAuth } = require('./driveAuth')
const { GdriveDownloadStatus, downloadStatus } = require('../dlStatus')
const { download_list, interval } = require('../utils')
const teamDriveID = process.env.TD_ID


async function upload(fileName, filePath, gid) {
  const auth = gdriveAuth()
  const drive = google.drive({ version: 'v3', auth });
  const f = await stat(filePath)
  
  const media = {
    body: createReadStream(filePath),
    mimeType: mime.getType(filePath),
  }
  
  try {
    const file = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [teamDriveID],
        description: 'Uploded by rezcoco'
      },
      media
    }, {
      onUploadProgress: function(c) {
        const completed = Number(c.bytesRead.toString())
        download_list[gid] = new GdriveDownloadStatus(fileName, downloadStatus['STATUS_UPLOADING'], f.size, completed)
        
      }
    });
    const intervalId = interval.findIndex((i) => i == gid )
    interval.splice(intervalId, 1)
    delete download_list[gid]
    
    await drive.permissions.create({
      fileId: file.data.id,
      supportsAllDrives: true,
      requestBody: {
        role: 'reader',
        type: 'anyone',
        withLink: true
      }
    })
    console.log('File Id:', file.data.id);
    return file.data.id;
  } catch (err) {
    // TODO(developer) - Handle error
    throw err;
  }
}

module.exports.upload = upload
