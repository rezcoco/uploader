require('dotenv').config()

const { exec } = require('node:child_process')
const { main, Link } = require('./db')
const { AriaTools } = require('./dl')
const { directLink } = require('./directLink')
const { AriaDownloadStatus, downloadStatus } = require('./dlStatus')
const { sleep, Message } = require('./msgUtils')
const { download_list, interval, index, parts } = require('./utils')
const { bulkRenamer, archive, clean } = require('./fsUtils')
const { upload } = require('./drive/gdriveTools')
const TelegramBot = require('node-telegram-bot-api')
const Aria2 = require('aria2')
const app = require('express')()
const TOKEN = process.env.TOKEN || null
const IS_DB = process.env.IS_DB || false
const PORT = process.env.PORT || 2301
const options = { host: 'localhost', port: 6800, secure: false, secret: '', path: '/jsonrpc' }
const bot = new TelegramBot(TOKEN, { polling: true })
const aria2 = new Aria2([options])
const ariaTools = new AriaTools(aria2)
const message = new Message(bot, aria2)
const MAX_QUEUES = 4
const QUEUES = []

if (IS_DB) main();
(async () => {
  try {
    await exec('../aria.sh', { cwd: __dirname })
    console.log('Aria2 running')
    await sleep(1000)
    await aria2.open()
    console.log('Websocket opened')
    index.total = (await Link.find()).length
  } catch (e) {
    console.log(e)
  }
})()

async function uploadCmdHandler (msg, match) {
  const chatId = msg.chat.id
  const resp = match[1]

  message.sendMessage(chatId, '<i>Uploading...</i>')

  const sRegex = resp.match(/start\s\d+/)
  const eRegex = resp.match(/end\s\d+/)
  const start = sRegex ? Number(sRegex[0].split(' ')[1]) : 0
  const end = eRegex ? Number(eRegex[0].split(' ')[1]) : 4
  index.last = end

  for (let i = start; i <= end; i++) {
    await addDownload(i)
  }

  message.sendUploadMessage(chatId, '<b>Upload Complete: \n</b>')
};

async function uploadAll (msg, match) {
  const chatId = msg.chat.id
  const resp = match[1]

  message.sendMessage(chatId, '<i>Uploading...</i>')

  const sRegex = resp.match(/start\s\d+/)
  const eRegex = resp.match(/end\s\d+/)
  const start = sRegex ? Number(sRegex[0].split(' ')[1]) : 0
  const end = eRegex ? Number(eRegex[0].split(' ')[1]) : index.total
  index.last = end

  for (let i = start; i < start + 4; i++) {
    await addDownload(i)
  }
  message.sendUploadMessage(chatId, '<b>Upload Complete: \n</b>')
}

async function cancelHandler (msg, match) {
  const chat_id = msg.chat.id
  const gid = match[1]

  const clMsg = await bot.sendMessage(chat_id, `Canceling <i>${gid}...</i>`, { parse_mode: 'HTML' })
  const { message_id } = clMsg
  const cancel = await ariaTools.cancel(gid)

  if (cancel === gid) {
    const intervalId = interval.findIndex(i => i === gid)
    const queuesId = QUEUES.findIndex(i => i === gid)
    interval.splice(intervalId, 1)
    QUEUES.splice(queuesId, 1)
    delete download_list[gid]

    console.log('Deleted: ', cancel)
    bot.editMessageText(`<i>${gid}</i> deleted`, { chat_id, message_id, parse_mode: 'HTML' })
      .then((msg) => {
        setTimeout(() => bot.deleteMessage(chat_id, msg.message_id), 5000)
      })

    if (index.current !== index.last && QUEUES.length < MAX_QUEUES) {
      console.log(`Next ${index.current + 1}`)
      return addDownload(index.current + 1)
    }
    return
  }
  bot.editMessageText(`Failed to delete <i>${gid}</i>`, { chat_id, message_id, parse_mode: 'HTML' })
    .then((msg) => {
      setTimeout(() => bot.deleteMessage(chat_id, msg.message_id), 5000)
    })
}

async function cancelAllHandler (msg) {
  const chat_id = msg.chat.id
  await ariaTools.cancelAll()
  interval.length = 0
  QUEUES.length = 0
  for (key of Object.keys(download_list)) {
    delete download_list[key]
  }
  await message.deleteStatusMessage()
  await message.sendMessage(chat_id, 'All tasks canceled')
  console.clear()
}

async function addDownload (start) {
  index.current = start
  console.log(`Index file downloaded: ${index.current}`)
  const db = await Link.find()
  const link = db[start].link
  if (Array.isArray(link)) {
    parts[start] = []
    for (let i = 0; i < link.length; i++) {
      const { hostname } = new URL(link[i])
      if (hostname === 'www.mediafire.com' || hostname === 'anonfiles.com') {
        parts[start].push(false)

        const uri = await directLink(link[i])
        const gid = await ariaTools.addDownload(uri, start)
        download_list[gid] = new AriaDownloadStatus(aria2, gid, start, downloadStatus.STATUS_DOWNLOADING, { parent: start, order: i })

        QUEUES.push(gid)
        interval.push(gid)

        await message.sendStatusMessage()
      }
    }
  } else {
    const { hostname } = new URL(link)
    if (hostname === 'www.mediafire.com' || hostname === 'anonfiles.com') {
      const uri = await directLink(link)
      const gid = await ariaTools.addDownload(uri, start)
      download_list[gid] = new AriaDownloadStatus(aria2, gid, start, downloadStatus.STATUS_DOWNLOADING)

      QUEUES.push(gid)
      interval.push(gid)

      await message.sendStatusMessage()
    }
  }
}

function fn (fileName) {
  const str = fileName.split('.')
  str.splice(1, 1)
  return str.join('.')
}

async function nextStep (gid, isPart = false) {
  // delete interval
  const intervalId = interval.findIndex(i => i === gid)
  interval.splice(intervalId, 1)
  const dl = download_list[gid]
  dl.status = downloadStatus.STATUS_EXTRACTING
  await message.sendStatusMessage()
  let fileName = await dl.name()
  const part = dl.part
  const dir = dl.dir
  const path = await dl.path()
  const { parent } = part

  const extPath = isPart ? parts[parent][0] : path
  const exc = exec(`../extract.sh "${extPath}" ${dir}`, { cwd: __dirname })
  console.log(`Extracting ${extPath}`)
  await message.sendStatusMessage()
  exc.stderr.on('data', (data) => {
    console.error(data)
  })
  exc.on('close', async (code) => {
    await clean(path)
    console.log('Extracted: ', code)
    dl.status = downloadStatus.STATUS_RENAMING
    await message.sendStatusMessage()
    const fullDirPath = await bulkRenamer(dir, fileName)

    dl.status = downloadStatus.STATUS_ARCHIVING
    await message.sendStatusMessage()
    fileName = isPart ? fn(fileName) : fileName
    await archive(fileName, fullDirPath)

    dl.status = downloadStatus.STATUS_UPLOADING
    await message.sendStatusMessage()
    const fullPath = dir + fileName
    await upload(fileName, fullPath)
    await message.sendStatusMessage()

    index.count += 1
    await message.updateUploadStatusMessage(`<b>Upload Complete: </b>${fileName}\n\nTotal Uploaded: ${index.count}`)

    await clean(dir)
    // remove from queue
    delete download_list[gid]
    const queuesId = QUEUES.findIndex(i => i === gid)
    QUEUES.splice(queuesId, 1)
    if (QUEUES.length === 0) return message.deleteStatusMessage()

    if (index.current !== index.last && QUEUES.length < MAX_QUEUES) {
      console.log(`Next ${index.current + 1}`)
      return addDownload(index.current + 1)
    }
  })
}

aria2.on('onDownloadComplete', async ([data]) => {
  const { gid } = data
  const dl = download_list[gid]
  const part = dl.part
  const path = await dl.path()

  try {
    if (part) {
      const { parent, order } = part
      parts[parent][order] = path
      const isDone = parts[parent].every(e => e)

      if (isDone) {
        await nextStep(gid, true)
      }
    } else {
      await nextStep(gid)
    }
  } catch (e) {
    console.log(e)
  }
})

app.get('/', async (req, res) => {
  res.send('Running smooth like butter!')
})
app.listen(PORT, '0.0.0.0', () => console.log(`Listening on port ${PORT}`))

process.on('exit', () => {
  ariaTools.stop()
})

bot.onText(/\/upload (.+)/, uploadCmdHandler)
bot.onText(/\/uploadall (.+)/, uploadAll)
bot.onText(/\/cancel (.+)/, cancelHandler)
bot.onText(/\/cancelall/, cancelAllHandler)
