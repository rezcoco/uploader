require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const Aria2 = require("aria2");
const app = require('express')();
const { exec } = require('node:child_process');
const { readdir } = require('fs');
const TOKEN = process.env.TOKEN || null
const IS_DB = process.env.IS_DB || false
const PORT = process.env.PORT || 2301
const { main, Link } = require('./db');
const { AriaTools } = require('./dl');
const { directLink } = require('./directLink');
const { AriaDownloadStatus, downloadStatus } = require('./dlStatus');
const { sleep, Message } = require('./msgUtils');
const { download_list, interval } = require('./utils');
const { bulkRenamer, archive, clean } = require('./fsUtils');
const { upload } = require('./drive/gdriveTools');

const options = {
  host: 'localhost',
  port: 6800,
  secure: false,
  secret: '',
  path: '/jsonrpc'
}

const bot = new TelegramBot(TOKEN, {polling: true});
const aria2 = new Aria2([options])
const ariaTools = new AriaTools(bot, aria2)
const message = new Message(bot, aria2)
if (IS_DB) main();
(async () => {
try {
  await exec('../aria.sh', { cwd: __dirname })
  console.log('Aria2 running')
  await sleep(1000)
  await aria2.open()
  console.log('Websocket opened')
} catch (e) {
  console.log(e)
}
})()

async function uploadCmdHandler(msg, match) {
  const chatId = msg.chat.id;
  const resp = match[1];
  
  message.sendMessage(chatId, '<i>Uploading...</i>')
  //const start = resp.match(/start\s\d+/) ? Number(startRegex[0].split(' ')[1]) : 0
  //const end = resp.match(/end\s\d+/) ? Number(endRegex[0].split(' ')[1]) : db.length
  
  const db = await Link.find()
 
  for (let i = 0; i < 3; i++) {
    const link = db[i].link
    if (Array.isArray(link)) {
      for (const l of link) {
        const uri = await directLink(l)
        const gid = await ariaTools.addDownload(uri, i)
        download_list[gid] = new AriaDownloadStatus(aria2, gid, i, downloadStatus['STATUS_DOWNLOADING'], link.length)
        interval.push(gid)
        await message.sendStatusMessage()
      }
    } else {
      const uri = await directLink(link)
      const gid = await ariaTools.addDownload(uri, i)
      download_list[gid] = new AriaDownloadStatus(aria2, gid, i, downloadStatus['STATUS_DOWNLOADING'])
      interval.push(gid)
      await message.sendStatusMessage()
    }
  }
  //message.sendMessage(chatId, '<b>Upload Complete: \n</b>')
};

async function cancelHandler(msg, match) {
  const chatId = msg.chat.id;
  const resp = match[1]
  
  await message.sendMessage(chatId, `Canceling <i>${resp}...</i>`)
  
  const { files } = await ariaTools.getStatus(resp)
  const fileName = getFileName(files[0])
  const cancel = await ariaTools.cancel(resp)
  
  if (cancel == 'OK') {
    await message.editMessage(`<i>${fileName}</i> deleted`)
  } else {
    await message.editMessage(`Failed to delete <i>${fileName}</i>`)
  }
}

aria2.on('onDownloadComplete', async ([data]) => {
  const { gid } = data
  // delete interval
  const intervalId = interval.findIndex((i) => i == gid )
  interval.splice(intervalId, 1)

  const dl = download_list[gid]
  dl.status = downloadStatus['STATUS_EXTRACTING']
  await message.sendStatusMessage()
  const fileName = await dl.name()
  const part = dl.part
  const dir = dl.dir
  const path = await dl.path()
  
  async function rd(err, files) {
    if (err) console.log(err)
    try {
      if (part > 0) {
        if (files.length === part) {
          const exc = exec(`../extract.sh "${path}" ${dir}`, { cwd: __dirname })
          exc.stderr.on('data', (data) => {
            console.error(data);
          });
          exc.on('close', (code) => {
            console.log('Closed: ', code)
            dl.status = downloadStatus['STATUS_RENAMING']
            bulkRenamer(dir, fileName)
          })
        }
      } else {
        console.log(`Extracting ${path}`)
        const exc = exec(`../extract.sh "${path}" ${dir}`, { cwd: __dirname })
        await message.sendStatusMessage()
        exc.stderr.on('data', (data) => {
          console.error(data);
        });
        exc.on('close', async (code) => {
          console.log('Extracted: ', code)
          await clean(path)
          dl.status = downloadStatus['STATUS_RENAMING']
          await message.sendStatusMessage()
          const fullDirPath = await bulkRenamer(dir, fileName)
          
          dl.status = downloadStatus['STATUS_ARCHIVING']
          await message.sendStatusMessage()
          await archive(fileName, fullDirPath)
          
          dl.status = downloadStatus['STATUS_UPLOADING']
          await message.sendStatusMessage()
          const fullPath = dir+fileName
          await upload(fileName, fullPath)
          await clean(dir)
          delete download_list[gid]
        })
      }
    } catch (e) {
      console.log(e)
    }
  }
  readdir(dir, rd)
});

app.get('/', (req, res) => {
  res.send('Running smooth like butter !')
})
app.listen(PORT, () => console.log(`Listening on port ${PORT}`))

process.on('exit', () => {
  ariaTools.stop()
});

bot.onText(/\/upload (.+)/, uploadCmdHandler)
bot.onText(/\/cancel (.+)/, cancelHandler)
