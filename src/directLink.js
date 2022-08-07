const https = require('node:https');
const axios = require('axios');
const cheerio = require('cheerio');

const agent = new https.Agent({  
  rejectUnauthorized: false
});

async function directLink(url) {
  const { data } = await axios.get(url, {httpsAgent: agent})
  const $ = cheerio.load(data)
  const link = $('#downloadButton').attr('href')
  return link
}

module.exports.directLink = directLink
