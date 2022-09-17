const path = require('path')
const { clean } = require('./fsUtils')
const { download_list } = require('./utils')

class AriaTools {
  constructor (aria2) {
    this.botStatusMsg = null
    this.botCompleteMsg = null
    this.aria2 = aria2
    this.status = ''
  }

  async stop () {
    try {
      this.aria2.call('forceShutdown')
    } catch (e) {
      console.log(e)
    }
  }

  async cancel (gid) {
    try {
      const GID = await this.aria2.call('remove', gid)
      const dir = download_list[gid].dir
      await clean(dir)
      return GID
    } catch (e) {
      console.log(e)
    }
  }

  async getStatus (gid) {
    try {
      return this.aria2.call('tellStatus', gid)
    } catch (e) {
      console.log(e)
    }
  }

  async addDownload (url, dir) {
    try {
      const uri = await url
      return this.aria2.call('addUri', [uri], { dir: path.join(__dirname, 'downloads', String(dir)) })
    } catch (e) {
      console.log(e)
    }
  }

  async getFiles (gid) {
    return this.aria2.call('getFiles', gid)
  }
}

module.exports.AriaTools = AriaTools
