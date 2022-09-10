require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const Aria2 = require("aria2");
const app = require('express')();
const { exec } = require('node:child_process');
const { writeFile } = require('node:fs/promises');
const { readdir } = require('fs');
const TOKEN = process.env.TOKEN || null
const IS_DB = process.env.IS_DB || false
const PORT = process.env.PORT || 2301
const { main, Link } = require('./db');
const { AriaTools } = require('./dl');
const { directLink } = require('./directLink');
const { AriaDownloadStatus, downloadStatus } = require('./dlStatus');
const { sleep, Message } = require('./msgUtils');
const { download_list, interval, index, parts } = require('./utils');
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
  index.total = await Link.find()
} catch (e) {
  console.log(e)
}
})()

async function uploadCmdHandler(msg, match) {
  const chatId = msg.chat.id;
  const resp = match[1];

  message.sendMessage(chatId, '<i>Uploading...</i>')
  
  const sRegex = resp.match(/start\s\d+/)
  const eRegex = resp.match(/end\s\d+/)
  const start = sRegex ? Number(sRegex[0].split(' ')[1]) : 0
  const end = eRegex ? Number(eRegex[0].split(' ')[1]) : 4
  index.last = end

  for (let i=start; i<=end; i++) {
    await addDownload(i)
  }
  
  //message.sendMessage(chatId, '<b>Upload Complete: \n</b>')
};

async function uploadAll(msg, match) {
  const chatId = msg.chat.id;
  const resp = match[1];

  message.sendMessage(chatId, '<i>Uploading...</i>')
  
  const sRegex = resp.match(/start\s\d+/)
  const eRegex = resp.match(/end\s\d+/)
  const start = sRegex ? Number(sRegex[0].split(' ')[1]) : 0
  const end = eRegex ? Number(eRegex[0].split(' ')[1]) : index.total
  index.last = end

  for (let i=start; i<start+4; i++) {
    await addDownload(i)
  }
}

async function cancelHandler(msg, match) {
  const chatId = msg.chat.id;
  const resp = match[1]
  
  await message.sendMessage(chatId, `Canceling <i>${resp}...</i>`)
  
  const { files } = await ariaTools.getStatus(resp)
  const fileName = getFileName(files[0])
  const cancel = await ariaTools.cancel(resp)
  
  // if (cancel == 'OK') {
  //   await message.editMessage(`<i>${fileName}</i> deleted`)
  // } else {
  //   await message.editMessage(`Failed to delete <i>${fileName}</i>`)
  // }
  console.log(cancel)
}

async function addDownload(start) {
  index.current = start
  console.log(`Index file downloaded: ${index.current}`)
  const db = await Link.find()
  const link = db[start].link
  if (Array.isArray(link)) {
    parts[start] = []
    for (let i=0; i<link.length; i++) {
      parts[start].push(false)
      const uri = await directLink(link[i])
      const gid = await ariaTools.addDownload(uri, start)
      download_list[gid] = new AriaDownloadStatus(aria2, gid, start, downloadStatus['STATUS_DOWNLOADING'], { parent: start,  order: i})
      interval.push(gid)
      await message.sendStatusMessage()
    }
  } else {
    const uri = await directLink(link)
    const gid = await ariaTools.addDownload(uri, start)
    download_list[gid] = new AriaDownloadStatus(aria2, gid, start, downloadStatus['STATUS_DOWNLOADING'])
    interval.push(gid)
    await message.sendStatusMessage()
    return
  }
}

async function nextStep(gid, isPart=false) {
  const dl = download_list[gid]
  dl.status = downloadStatus['STATUS_EXTRACTING']
  await message.sendStatusMessage()
  const fileName = await dl.name()
  const part = dl.part
  const dir = dl.dir
  const path = await dl.path()

  console.log(`Extracting ${path}`)

  let exc 
  if (isPart) {
    exc = exec(`../extract.sh "${dir}"`, { cwd: __dirname })
  } else {
    exc = exec(`../extract.sh "${path}" ${dir}`, { cwd: __dirname })
  }
  await message.sendStatusMessage()
  exc.stderr.on('data', (data) => {
    console.error(data);
  });
  exc.on('close', async (code) => {
    await clean(path)
    console.log('Extracted: ', code)
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
    // delete interval
    const intervalId = interval.findIndex((i) => i == gid )
    interval.splice(intervalId, 1)
    delete download_list[gid]
    return
  })
}


aria2.on('onDownloadComplete', async ([data]) => {
  const { gid } = data
  const dl = download_list[gid]
  const part = dl.part
  
  try {
    if (part) {
      const { parent, order } = part
      parts[parent][order] = true
      const isDone = parts[parent].every(e => e)

      if (isDone) {
        await nextStep(gid, true)
      }
    } else {
      await nextStep(gid)
    }
    if (index.current !== index.last) return addDownload(index.current+1)
  } catch (e) {
    console.log(e)
  }
});

app.get('/', (req, res) => {
  res.send('Running smooth like butter !')
})
app.listen(PORT, () => console.log(`Listening on port ${PORT}`))

process.on('exit', () => {
  ariaTools.stop()
  clean(__dirname+'/downloads')
});

bot.onText(/\/upload (.+)/, uploadCmdHandler)
bot.onText(/\/uploadall (.+)/, uploadAll)
bot.onText(/\/cancel (.+)/, cancelHandler)
