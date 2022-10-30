const https = require('node:https')
const axios = require('axios')
const cheerio = require('cheerio')

const agent = new https.Agent({
    rejectUnauthorized: false
})

async function mediafire (uri) {
    const { data } = await axios.get(uri, { httpsAgent: agent })
    const $ = cheerio.load(data)
    const url = $('#downloadButton').attr('href')
    const fileName = $('.dl-btn-label').attr('title')
    return { url, fileName }
}
async function anonfiles (uri) {
    const { data } = await axios.get(uri, { httpsAgent: agent })
    const $ = cheerio.load(data)
    const url = $('#download-url').attr('href')
    const fileName = $('#site-wrapper > div.row.top-wrapper > div.col-xs-12.col-md-6 > h1').text()
    return { url, fileName }
}

async function directLink (url, hostname) {
    if (hostname === 'www.mediafire.com') {
        return (await mediafire(url))
    }
    return (await anonfiles(url))
}

module.exports.directLink = directLink
