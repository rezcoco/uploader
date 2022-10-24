require('dotenv').config()
const { google } = require('googleapis')
const { gdriveAuth } = require('./driveAuth')
const teamDriveID = process.env.TD_ID

async function listFiles (pageToken) {
    const auth = await gdriveAuth()
    const drive = google.drive({ version: 'v3', auth })
    const res = await drive.files.list({
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        q: `"${teamDriveID}" in parents`,
        pageToken,
        pageSize: 1000,
        orderBy: 'name',
        fields: 'nextPageToken, files(name)'
    })
    const files = res.data.files
    if (files.length === 0) {
        console.log('No files found.')
        return undefined
    }
    return res
}

async function search (fileName, pageToken='') {
    const { data } = await listFiles(pageToken)
    const { nextPageToken, files } = data

    const isFound = binarySearch(fileName, files)

    if (nextPageToken) return search(fileName, nextPageToken)
    return isFound
}

function binarySearch (value, input) {
    let lower = 0
    let upper = input.length - 1
    let result = false

    while (upper >= lower) {
        let mid = Math.floor((upper + lower) /2)
        if (value === input[mid].name) {
            result = true
            break
        } else if (value.toLowerCase() < input[mid].name.toLowerCase()) {
            upper = --mid
        } else {
            lower = ++mid
        }
    }
    return result
}

module.exports.search = search