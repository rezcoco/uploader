const os = require('os')
const { download_list, interval } = require('./utils')
const { downloadStatus, formatSize } = require('./dlStatus')

function sleep (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

class Message {
    constructor (bot, aria2) {
        this.bot = bot
        this.botStatusMsg = null
        this.botCompleteMsg = null
        this.aria2 = aria2
    }

    async generateStatusMessage () {
        const t = new Date()
        const minutes = t.getMinutes()
        const seconds = t.getSeconds()
        const milliseconds = t.getMilliseconds()
        const freemem = formatSize(os.freemem())
        const totalmem = formatSize(os.totalmem())

        let msg = ''
        for (const id in download_list) {
            const dl = download_list[id]
            const name = await dl.name()
            const status = await dl.status
            const index = dl.index
            const progress = await dl.progress()
            const downloaded = await dl.downloaded()
            const total = await dl.total()
            const speed = await dl.speed()
            const time = await dl.time()
            const gid = dl.gid
            if (status === downloadStatus.STATUS_DOWNLOADING) {
                msg += `<b>Name: </b>${name}\n<b>Status: </b>${status}\n<b>Index: ${index}</b>\n${progress}\n<b>Downloaded: </b>${downloaded} of ${total}\n<b>Speed: </b>${speed} | <b>ETA: </b>${time}\n<code>/cancel ${gid}</code>\n\n`
            } else {
                msg += `<b>Name: </b>${name}\n<b>Status: </b>${status}\n<b>Index: ${index}</b>\n\n`
            }
        }
        msg += `<b>RAM:</b> ${freemem} <b>OF</b> ${totalmem}\n`
        msg += `${minutes}:${seconds}:${milliseconds}`
        return msg
    }

    async updateStatusMessage () {
        try {
            const { message_id } = this.botStatusMsg
            const chat_id = this.botStatusMsg.chat.id
            while (interval.length !== 0) {
                const msg = await this.generateStatusMessage()
                this.botStatusMsg = await this.bot.editMessageText(msg, { chat_id, message_id, parse_mode: 'HTML' })
                await sleep(10000)
            }
        } catch (e) {
            console.log(e)
        }
    }

    async sendStatusMessage () {
        try {
            const { message_id } = this.botStatusMsg
            const chatId = this.botStatusMsg.chat.id
            const msg = await this.generateStatusMessage()
            this.botStatusMsg = await this.bot.editMessageText(msg, { chat_id: chatId, message_id, parse_mode: 'HTML' })
            this.updateStatusMessage()
        } catch (e) {
            console.log(e)
        }
    }

    async updateUploadStatusMessage (msg) {
        const { message_id } = this.botCompleteMsg
        const chat_id = this.botCompleteMsg.chat.id
        this.botCompleteMsg = await this.bot.editMessageText(msg, { chat_id, message_id, parse_mode: 'HTML' })
    }

    async sendUploadMessage (chatId, msg) {
        this.botCompleteMsg = await this.bot.sendMessage(chatId, msg, { parse_mode: 'HTML' })
    }

    async sendMessage (chatId, msg) {
        this.botStatusMsg = await this.bot.sendMessage(chatId, msg, { parse_mode: 'HTML' })
    }

    async editMessage (msg) {
        const { message_id } = this.botStatusMsg
        const chat_id = this.botStatusMsg.chat.id
        this.botStatusMsg = await this.bot.editMessageText(msg, { chat_id, message_id, parse_mode: 'HTML' })
    }

    async deleteStatusMessage () {
        const { message_id } = this.botStatusMsg
        const chat_id = this.botStatusMsg.chat.id
        await this.bot.deleteMessage(chat_id, message_id)
    }
}

module.exports = {
    Message, sleep
}
