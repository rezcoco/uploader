const fs = require('fs')
const msgUtils = require('./msgUtils');
const { vars } = require('./utils')

class AriaTools {
  constructor(bot, aria2) {
    this.botStatusMsg = null
    this.botCompleteMsg = null
    this.aria2 = aria2
    this.status = ''
    this.info = []
  }
  async clean(gid) {
    const index = this.info.findIndex((obj) => obj.gid === gid)
    const dir = __dirname+'/downloads/'+index
    if (index !== -1) {
      fs.rm(dir, { force: true, recursive: true }, (err) => {
        if (err) {
          console.log(`Can't remove directory ${dir}`)
        } else {
          console.log(`${dir} successfully removed`)
        }
      })
    } else {
      console.log(`${gid} not found`)
    }
  }
  async stop() {
    try {
      this.aria2.call('forceShutdown')
    } catch (e) {
      console.log(e)
    }
  }
  async cancel(gid) {
    try {
      return await this.aria2.call('remove', gid)
    } catch (e) {
      console.log(e)
    }
  }
  async getStatus(gid) {
    try {
      return this.aria2.call('tellStatus', gid)
    } catch (e) {
      console.log(e)
    }
  }
  
  async addDownload(url, dir) {
    try {
      const uri = await url
      return this.aria2.call('addUri', [uri], { dir: __dirname + '/downloads/' + dir })
    } catch (e) {
      console.log(e)
    }
  }
  async getFiles(gid) {
    return this.aria2.call('getFiles', gid)
  }
}

module.exports.AriaTools = AriaTools




