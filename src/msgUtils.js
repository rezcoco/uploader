const { download_list, interval, index } = require('./utils');
const { downloadStatus } = require('./dlStatus');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class Message {
  constructor(bot, aria2) {
    this.bot = bot
    this.botStatusMsg = null
    this.botCompleteMsg = null
    this.aria2 = aria2
  }
  
  async generateStatusMessage() {
    const t = new Date()
    const minutes = t.getMinutes(), seconds = t.getSeconds()
    let msg = ''
    for (const id in download_list) {
      const dl = download_list[id],
      name = await dl.name(),
      status = await dl.status,
      progress = await dl.progress(),
      downloaded = await dl.downloaded(),
      total = await dl.total(),
      speed = await dl.speed(),
      time = await dl.time(),
      gid = dl.gid
      if (status === downloadStatus['STATUS_DOWNLOADING']) {
        msg += `<b>Name: </b>${name}\n<b>Status: </b>${status}\n${progress}\n<b>Downloaded: </b>${downloaded} of ${total}\n<b>Speed: </b>${speed} | <b>ETA: </b>${time}\n<code>/cancel ${gid}</code>\n\n`
      } else {
        msg += `<b>Name: </b>${name}\n<b>Status: </b>${status}\n\n`
      }
    }
    msg+= `<b>Index: ${index}</b>\n`
    msg+= `${minutes+7}:${seconds}`
    return msg
}
  
  async updateStatusMessage() {
    try {
      const { message_id } = this.botStatusMsg
      const chat_id = this.botStatusMsg.chat.id
      while(interval.length !== 0) {
        const msg = await this.generateStatusMessage()
        await sleep(10000)
        this.botStatusMsg = await this.bot.editMessageText(msg, { chat_id, message_id, parse_mode: 'HTML' })
      }
    } catch (e) {
      console.log(e)
    }
  }
  async sendStatusMessage() {
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
  async sendMessage(chatId, msg) {
    this.botStatusMsg = await this.bot.sendMessage(chatId, msg, { parse_mode: 'HTML' })
    return
  }
  async editMessage(msg) {
    const { message_id } = this.botStatusMsg
    const chat_id = this.botStatusMsg.chat.id
    this.botStatusMsg = await this.bot.editMessageText(msg, { chat_id, message_id, parse_mode: 'HTML' })
  }
}

module.exports = {
  Message, sleep
}
