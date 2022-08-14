const { readFile } = require('node:fs/promises');
const {google} = require('googleapis');

async function gdriveAuth() {
  const SCOPES = ['https://www.googleapis.com/auth/drive'];
  const credentials = await readFile('../../credentials.json')
  const token = await readFile('../../token.json')
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token)
  return oAuth2Client
}

module.exports = {
  gdriveAuth
};