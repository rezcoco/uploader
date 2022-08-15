require('dotenv').config()
const { createReadStream } = require('fs');
const { stat } = require('node:fs/promises');
const mime = require('mime');
const { google } = require('googleapis');
const { gdriveAuth } = require('./driveAuth')
const { GdriveDownloadStatus, downloadStatus } = require('../dlStatus')
const teamDriveID = process.env.TD_ID


async function upload(fileName, filePath, gid) {
  const auth = await gdriveAuth()
  const drive = google.drive({ version: 'v3', auth });
  
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
    });
    
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