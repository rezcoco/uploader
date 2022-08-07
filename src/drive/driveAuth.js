const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const credentials = require('./credentials.json')
const token = require('./token.json')

function gdriveAuth() {
  const SCOPES = ['https://www.googleapis.com/auth/drive'];
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token)
  return oAuth2Client
}

module.exports = {
  gdriveAuth
};