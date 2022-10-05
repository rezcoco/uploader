require('dotenv').config()
const { createReadStream } = require('fs')
const mime = require('mime')
const { google } = require('googleapis')
const { gdriveAuth } = require('./driveAuth')
const teamDriveID = process.env.TD_ID

async function upload (fileName, filePath) {
  const auth = await gdriveAuth()
  const drive = google.drive({ version: 'v3', auth })

  const media = {
    body: createReadStream(filePath),
    mimeType: mime.getType(filePath)
  }

  const file = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: fileName,
      parents: [teamDriveID],
      description: 'Uploded by rezcoco'
    },
    media
  })

  await drive.permissions.create({
    fileId: file.data.id,
    supportsAllDrives: true,
    requestBody: {
      role: 'reader',
      type: 'anyone',
      withLink: true
    }
  })
  return file.data.id
}

module.exports.upload = upload
