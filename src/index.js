require('dotenv').config()

const { exec } = require('node:child_process')
const EvenEmitter = require('node:events')
const { main, Link } = require('./db')
const { AriaTools } = require('./dl')
const { directLink } = require('./directLink')
const { AriaDownloadStatus, downloadStatus } = require('./dlStatus')
const { sleep, Message } = require('./msgUtils')
const { download_list, interval, index, parts } = require('./utils')
const { bulkRenamer, archive, clean } = require('./fsUtils')
const { upload } = require('./drive/gdriveTools')
const { search } = require('./drive/search')
const { alive } = require('./alive')
const TelegramBot = require('node-telegram-bot-api')
const Aria2 = require('aria2')
const app = require('express')()
const TOKEN = process.env.TOKEN || null
const IS_DB = process.env.IS_DB || false
const BASE_URL = process.env.BASE_URL
const PORT = process.env.PORT || 2301
const options = { host: 'localhost', port: 6800, secure: false, secret: '', path: '/jsonrpc' }
const bot = new TelegramBot(TOKEN, { polling: true })
const aria2 = new Aria2([options])
const ariaTools = new AriaTools(aria2)
const message = new Message(bot, aria2)
const progress = new EvenEmitter()
const MAX_DOWNLOAD_TASKS = parseInt(process.env.MAX_DOWNLOAD_TASKS) || 4
const QUEUES = []
const ARCHIVE_QUEUES = []
const WAITING = []

if (IS_DB) main()
if (BASE_URL) alive(BASE_URL);

(async () => {
    try {
        await exec('../scripts/aria.sh', { cwd: __dirname })
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

    index.current = start
    index.last = end

    while (index.current <= end) {
        await addDownload(index.current)
        index.current++
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

    index.current = start
    index.last = end

    while (index.current <= start + MAX_DOWNLOAD_TASKS) {
        await addDownload(index.current)
        index.current++
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

        if (index.current !== index.last && QUEUES.length < MAX_DOWNLOAD_TASKS) {
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
    if (QUEUES.length > 0) {
        await ariaTools.cancelAll()
        interval.length = 0
        QUEUES.length = 0
        for (const key of Object.keys(download_list)) {
            delete download_list[key]
        }
        await message.deleteStatusMessage()
        await message.sendMessage(chat_id, 'All tasks canceled')
        console.clear()
    }
}

async function addDownload (start) {
    index.current = start
    console.log(`Index file downloaded: ${index.current}`)
    const db = await Link.find()
    const link = db[start].link

    if (Array.isArray(link)) {
        parts[start] = {}
        for (let i = 0; i < link.length; i++) {
            const { hostname } = new URL(link[i])
            if (hostname === 'www.mediafire.com' || hostname === 'anonfiles.com') {
                const { url, fileName } = await directLink(link[i], hostname)
                const rFileName = fn(fileName)
                const isDuplicate = await search(rFileName)

                if (!isDuplicate) {
                    const gid = await ariaTools.addDownload(url, start)

                    parts[start][gid] = ''
                    download_list[gid] = new AriaDownloadStatus(aria2, gid, rFileName, start, downloadStatus.STATUS_DOWNLOADING, true)

                    QUEUES.push(gid)
                    interval.push(gid)

                    await message.sendStatusMessage()
                    return gid
                } else if (index.current !== index.last && QUEUES.length < MAX_DOWNLOAD_TASKS) {
                    console.log(`${rFileName} already there, Next to ${index.current + 1}`)
                    return addDownload(++index.current)
                }
            } else {
                console.log('Nothing to upload')
            }
        }
    } else {
        const { hostname } = new URL(link)
        if (hostname === 'www.mediafire.com' || hostname === 'anonfiles.com') {
            const { url, fileName } = await directLink(link, hostname)
            const isDuplicate = await search(fileName)

            if (!isDuplicate) {
                const gid = await ariaTools.addDownload(url, start)
                download_list[gid] = new AriaDownloadStatus(aria2, gid, fileName, start, downloadStatus.STATUS_DOWNLOADING)

                QUEUES.push(gid)
                interval.push(gid)

                await message.sendStatusMessage()
                return gid
            } else if (index.current !== index.last && QUEUES.length < MAX_DOWNLOAD_TASKS) {
                console.log(`${fileName} already there, Next to ${index.current + 1}`)
                return addDownload(++index.current)
            } else {
                console.log('Nothing to upload')
            }
        }
    }
}   

function fn (fileName) {
    const str = fileName.split('.')
    const index = str.length - 2

    str.splice(index, 1)
    return str.join('.')
}

function partsUpdateMsg (index, status) {
    for (const key of Object.keys(parts[index])) {
        const dl = download_list[key]
        dl.status = downloadStatus[status]
        message.sendStatusMessage()
    }
}
function partsDeleteMsg (index) {
    for (const key of Object.keys(parts[index])) {
        delete download_list[key]
        message.sendStatusMessage()
    }
}

async function nextStep (GID) {
    if (ARCHIVE_QUEUES.length === 0 && WAITING.length > 0) {
        const { gid, isPart } = WAITING.shift()
        // delete interval
        const intervalId = interval.findIndex(i => i === gid)
        interval.splice(intervalId, 1)
        const dl = download_list[gid]
        const fileName = await dl.name()
        const fName = dl.fileName
        const dir = dl.dir
        const parent = dl.index
        const path = await dl.path()

        if (isPart) {
            partsUpdateMsg(parent, 'STATUS_EXTRACTING')
        } else {
            dl.status = downloadStatus.STATUS_EXTRACTING
            await message.sendStatusMessage()
        }

        const extPath = isPart ? Object.values(parts[parent])[0] : path
        ARCHIVE_QUEUES.push(gid)
        const exc = exec(`../scripts/extract.sh "${extPath}" ${dir}`, { cwd: __dirname })
        console.log(`Extracting ${extPath}`)
        await message.sendStatusMessage()
        exc.stderr.on('data', (data) => {
            console.error(data)
        })
        exc.on('close', async (code) => {
            await clean(path)

            console.log('Extracted: ', fileName, 'Code: ', code)

            if (isPart) {
                partsUpdateMsg(parent, 'STATUS_RENAMING')
            } else {
                dl.status = downloadStatus.STATUS_RENAMING
                await message.sendStatusMessage()
            }

            const fullDirPath = await bulkRenamer(dir, fileName)

            if (isPart) {
                partsUpdateMsg(parent, 'STATUS_ARCHIVING')
            } else {
                dl.status = downloadStatus.STATUS_ARCHIVING
                await message.sendStatusMessage()
            }

            await archive(fName, fullDirPath)

            ARCHIVE_QUEUES.pop()
            if (WAITING.length !== 0) progress.emit('extract', WAITING[0])

            if (isPart) {
                partsUpdateMsg(parent, 'STATUS_UPLOADING')
            } else {
                dl.status = downloadStatus.STATUS_UPLOADING
                await message.sendStatusMessage()
            }

            const fullPath = dir + fName
            console.log('Uploading: ', fName)
            const fileId = await upload(fName, fullPath)
            console.log(`Uploaded: ${fName}, id: ${fileId}`)
            await message.sendStatusMessage()

            index.count += 1
            await message.updateUploadStatusMessage(`<b>Upload Complete: </b>${fName}\n\nTotal Uploaded: ${index.count}`)

            await clean(dir)
            // remove from queue
            if (isPart) {
                partsDeleteMsg(parent)
            } else {
                delete download_list[gid]
            }
            const queuesId = QUEUES.findIndex(i => i === gid)
            QUEUES.splice(queuesId, 1)
            if (QUEUES.length === 0) return message.deleteStatusMessage()

            if (index.current !== index.last && QUEUES.length < MAX_DOWNLOAD_TASKS) {
                console.log(`Next ${index.current + 1}`)
                return addDownload(index.current + 1)
            }
        })
    } else {
        const dl = download_list[GID]
        dl.status = downloadStatus.STATUS_WAITING
        await message.sendStatusMessage()
    }
}

progress.on('extract', nextStep)

aria2.on('onDownloadComplete', async ([data]) => {
    const { gid } = data
    const dl = download_list[gid]
    const part = dl.part
    const parent = dl.index
    const path = await dl.path()

    try {
        if (part) {
            parts[parent][gid] = path
            const isDone = Object.values(parts[parent]).every(isComplete => isComplete)

            if (isDone) {
                WAITING.push({ gid, isPart: true })
                progress.emit('extract', gid)
            }
        } else {
            WAITING.push({ gid, isPart: false })
            progress.emit('extract', gid)
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
