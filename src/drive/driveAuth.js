require('dotenv').config()
const { google } = require('googleapis')
const axios = require('axios')
const GD_TOKEN = process.env.GD_TOKEN
const CREDENTIALS = process.env.CREDENTIALS

async function gdriveAuth () {
    //  const SCOPES = ['https://www.googleapis.com/auth/drive']
    const t = await axios.get(GD_TOKEN)
    const c = await axios.get(CREDENTIALS)
    const credentials = c.data
    const token = t.data

    const { client_secret, client_id, redirect_uris } = credentials.web
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    oAuth2Client.setCredentials(token)
    return oAuth2Client
}

module.exports = {
    gdriveAuth
}
